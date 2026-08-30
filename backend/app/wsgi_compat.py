from __future__ import annotations

"""WSGI compatibility runtime for HireALocals on cPanel/Passenger.

The project remains FastAPI-based.  This module does *not* run the ASGI app through
an ASGI-to-WSGI background-loop adapter.  Instead it invokes the already-defined
FastAPI route endpoint functions synchronously from a native WSGI dispatcher.

That keeps all business logic/models/schemas intact while avoiding the event-loop
bridge that hangs under this shared-hosting Passenger environment.
"""

import asyncio
import inspect
import io
import json
import mimetypes
import os
import types
import uuid
from datetime import date, datetime, time
from pathlib import Path
from typing import Annotated, Any, Union, get_args, get_origin
from urllib.parse import parse_qs

from fastapi import HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.params import Depends as DependsParam, File as FileParam
from fastapi.routing import APIRoute
from pydantic import BaseModel, TypeAdapter, ValidationError
from sqlmodel import Session
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.responses import FileResponse, Response

from .config import settings
from .database import create_db_and_tables, engine, get_session
from .security import admin_user, current_user
from .seed import seed_if_empty


BACKEND_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_UPLOAD_ROOT = BACKEND_ROOT / "uploads"
PRIVATE_UPLOAD_ROOT = BACKEND_ROOT / "private_uploads"


class WSGICompatibilityError(RuntimeError):
    pass


def _run_async(awaitable):
    """Run one async operation in a short-lived loop inside a WSGI request."""

    async def runner():
        return await awaitable

    return asyncio.run(runner())


def _base_annotation(annotation: Any) -> Any:
    if get_origin(annotation) is Annotated:
        args = get_args(annotation)
        return args[0] if args else annotation
    return annotation


def _dependency(param: inspect.Parameter):
    default = param.default
    if isinstance(default, DependsParam):
        return default.dependency
    annotation = param.annotation
    if get_origin(annotation) is Annotated:
        for item in get_args(annotation)[1:]:
            if isinstance(item, DependsParam):
                return item.dependency
    return None


def _is_file_param(param: inspect.Parameter) -> bool:
    if isinstance(param.default, FileParam):
        return True
    annotation = _base_annotation(param.annotation)
    try:
        return annotation is UploadFile or (inspect.isclass(annotation) and issubclass(annotation, UploadFile))
    except TypeError:
        return False


def _is_pydantic_model(annotation: Any) -> bool:
    annotation = _base_annotation(annotation)
    try:
        return inspect.isclass(annotation) and issubclass(annotation, BaseModel)
    except TypeError:
        return False


def _is_optional(annotation: Any) -> bool:
    annotation = _base_annotation(annotation)
    origin = get_origin(annotation)
    if origin in (Union, types.UnionType):
        return type(None) in get_args(annotation)
    return False


def _coerce_scalar(raw: str, annotation: Any):
    annotation = _base_annotation(annotation)
    origin = get_origin(annotation)
    if origin in (Union, types.UnionType):
        choices = [item for item in get_args(annotation) if item is not type(None)]
        if not choices:
            return raw
        return _coerce_scalar(raw, choices[0])

    if annotation in (inspect._empty, Any, str):
        return raw
    if annotation is bool:
        value = raw.strip().lower()
        if value in {"1", "true", "yes", "on"}:
            return True
        if value in {"0", "false", "no", "off"}:
            return False
        raise ValueError("Expected a boolean value")
    if annotation is int:
        return int(raw)
    if annotation is float:
        return float(raw)
    if annotation is date:
        return date.fromisoformat(raw)
    if annotation is datetime:
        return datetime.fromisoformat(raw)
    if annotation is time:
        return time.fromisoformat(raw)
    return raw


def _header_items(environ: dict[str, Any]) -> list[tuple[bytes, bytes]]:
    items: list[tuple[bytes, bytes]] = []
    for key, value in environ.items():
        if key.startswith("HTTP_"):
            name = key[5:].replace("_", "-").lower().encode("latin-1")
            items.append((name, str(value).encode("latin-1")))
    if environ.get("CONTENT_TYPE"):
        items.append((b"content-type", str(environ["CONTENT_TYPE"]).encode("latin-1")))
    if environ.get("CONTENT_LENGTH"):
        items.append((b"content-length", str(environ["CONTENT_LENGTH"]).encode("latin-1")))
    return items


def _read_wsgi_body(environ: dict[str, Any]) -> bytes:
    stream = environ.get("wsgi.input")
    if stream is None:
        return b""
    length_raw = environ.get("CONTENT_LENGTH") or ""
    try:
        length = int(length_raw)
    except (TypeError, ValueError):
        length = 0
    if length > 0:
        return stream.read(length)
    # For methods that can carry a body, read whatever the server supplied.
    if str(environ.get("REQUEST_METHOD", "GET")).upper() in {"POST", "PUT", "PATCH", "DELETE"}:
        return stream.read()
    return b""


def _make_request(environ: dict[str, Any], body: bytes) -> Request:
    scheme = str(environ.get("wsgi.url_scheme") or "http")
    forwarded_proto = str(environ.get("HTTP_X_FORWARDED_PROTO") or "").split(",")[0].strip()
    if forwarded_proto in {"http", "https"}:
        scheme = forwarded_proto

    host = str(environ.get("HTTP_HOST") or environ.get("SERVER_NAME") or "localhost")
    server_name = host.split(":", 1)[0]
    try:
        server_port = int(environ.get("SERVER_PORT") or (443 if scheme == "https" else 80))
    except (TypeError, ValueError):
        server_port = 443 if scheme == "https" else 80

    headers = _header_items(environ)
    path = str(environ.get("PATH_INFO") or "/")
    raw_path = path.encode("utf-8", "surrogatepass")
    query_string = str(environ.get("QUERY_STRING") or "").encode("latin-1")
    client_ip = str(environ.get("REMOTE_ADDR") or "unknown")
    try:
        client_port = int(environ.get("REMOTE_PORT") or 0)
    except (TypeError, ValueError):
        client_port = 0

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": str(environ.get("SERVER_PROTOCOL") or "HTTP/1.1").replace("HTTP/", ""),
        "method": str(environ.get("REQUEST_METHOD") or "GET").upper(),
        "scheme": scheme,
        "path": path,
        "raw_path": raw_path,
        "root_path": str(environ.get("SCRIPT_NAME") or ""),
        "query_string": query_string,
        "headers": headers,
        "client": (client_ip, client_port),
        "server": (server_name, server_port),
    }

    sent = False

    async def receive():
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        return {"type": "http.request", "body": b"", "more_body": False}

    request = Request(scope, receive=receive)
    request.state.request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    return request


def _json_body(body: bytes) -> Any:
    if not body:
        return {}
    try:
        return json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON body") from exc


def _extract_bearer(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


def _status_text(code: int) -> str:
    from http import HTTPStatus

    try:
        return f"{code} {HTTPStatus(code).phrase}"
    except ValueError:
        return str(code)


def _response_headers(request: Request, extra: list[tuple[str, str]] | None = None) -> list[tuple[str, str]]:
    headers: list[tuple[str, str]] = []
    if extra:
        headers.extend(extra)

    lower_names = {name.lower() for name, _ in headers}
    request_id = getattr(request.state, "request_id", "")
    security = {
        "X-Request-ID": request_id,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    }
    if settings.is_production:
        security["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    for name, value in security.items():
        if name.lower() not in lower_names:
            headers.append((name, value))

    origin = request.headers.get("origin", "").strip()
    if origin and origin in settings.cors_list:
        headers.append(("Access-Control-Allow-Origin", origin))
        headers.append(("Access-Control-Allow-Credentials", "true"))
        headers.append(("Vary", "Origin"))
    return headers


def _plain_wsgi_response(start_response, request: Request, code: int, body: bytes, content_type: str, headers=None):
    outgoing = list(headers or [])
    if not any(name.lower() == "content-type" for name, _ in outgoing):
        outgoing.append(("Content-Type", content_type))
    if not any(name.lower() == "content-length" for name, _ in outgoing):
        outgoing.append(("Content-Length", str(len(body))))
    outgoing = _response_headers(request, outgoing)
    start_response(_status_text(code), outgoing)
    return [body]


def _json_wsgi_response(start_response, request: Request, code: int, value: Any, headers=None):
    encoded = jsonable_encoder(value)
    body = json.dumps(encoded, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return _plain_wsgi_response(start_response, request, code, body, "application/json; charset=utf-8", headers)


def _handle_starlette_response(start_response, request: Request, response: Response):
    code = int(response.status_code)
    headers = [(k.decode("latin-1"), v.decode("latin-1")) for k, v in response.raw_headers]

    if isinstance(response, FileResponse):
        path = Path(response.path)
        if not path.is_file():
            raise HTTPException(404, "Stored file not found")
        body = path.read_bytes()
        content_type = response.media_type or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        return _plain_wsgi_response(start_response, request, code, body, content_type, headers)

    body = getattr(response, "body", b"")
    if isinstance(body, str):
        body = body.encode("utf-8")
    content_type = response.media_type or "application/octet-stream"
    if response.charset and "charset=" not in content_type.lower() and content_type.startswith("text/"):
        content_type = f"{content_type}; charset={response.charset}"
    return _plain_wsgi_response(start_response, request, code, body, content_type, headers)


def _validate_host(request: Request):
    if not settings.is_production or not settings.trusted_hosts_list:
        return
    host = request.headers.get("host", "").split(":", 1)[0].lower()
    allowed = {item.lower() for item in settings.trusted_hosts_list}
    if "*" not in allowed and host not in allowed:
        raise HTTPException(400, "Invalid host header")


def _match_route(routes: list[APIRoute], path: str, method: str):
    method_mismatch = False
    for route in routes:
        match = route.path_regex.fullmatch(path)
        if not match:
            continue
        if method not in (route.methods or set()):
            method_mismatch = True
            continue
        path_params = match.groupdict()
        converted: dict[str, Any] = {}
        for key, raw in path_params.items():
            convertor = route.param_convertors.get(key)
            converted[key] = convertor.convert(raw) if convertor else raw
        return route, converted
    if method_mismatch:
        raise HTTPException(405, "Method Not Allowed")
    raise HTTPException(404, "Not Found")


def _serve_public_upload(path: str, start_response, request: Request):
    rel = path[len("/uploads/") :]
    candidate = (PUBLIC_UPLOAD_ROOT / rel).resolve()
    root = PUBLIC_UPLOAD_ROOT.resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise HTTPException(404, "Not Found") from exc
    if not candidate.is_file():
        raise HTTPException(404, "Not Found")
    body = candidate.read_bytes()
    content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
    return _plain_wsgi_response(start_response, request, 200, body, content_type)


class HireALocalsWSGI:
    def __init__(self):
        # Import route definitions only after the WSGI process has its cPanel
        # environment variables. Importing main does not execute FastAPI lifespan.
        from .main import app as fastapi_app

        if settings.is_production and settings.strict_production_checks:
            issues = settings.production_issues()
            if issues:
                raise WSGICompatibilityError("Production preflight failed: " + "; ".join(issues))

        create_db_and_tables()
        seed_if_empty(seed_demo_data=settings.seed_demo_data)
        PUBLIC_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
        PRIVATE_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

        self.fastapi_app = fastapi_app
        self.routes = [route for route in fastapi_app.routes if isinstance(route, APIRoute)]

    def _build_kwargs(
        self,
        route: APIRoute,
        endpoint,
        path_params: dict[str, Any],
        request: Request,
        body: bytes,
        session: Session,
    ) -> tuple[dict[str, Any], Any | None]:
        signature = inspect.signature(endpoint)
        query = parse_qs(request.url.query, keep_blank_values=True)
        payload_cache: Any = None
        form_cache = None
        kwargs: dict[str, Any] = {}

        for name, param in signature.parameters.items():
            dependency = _dependency(param)
            if dependency is get_session:
                kwargs[name] = session
                continue
            if dependency is current_user:
                kwargs[name] = current_user(token=_extract_bearer(request), session=session)
                continue
            if dependency is admin_user:
                user = current_user(token=_extract_bearer(request), session=session)
                kwargs[name] = admin_user(user)
                continue

            annotation = _base_annotation(param.annotation)
            if annotation is Request or name == "request":
                kwargs[name] = request
                continue

            if name in path_params:
                kwargs[name] = path_params[name]
                continue

            if _is_file_param(param):
                if form_cache is None:
                    form_cache = _run_async(request.form())
                upload = form_cache.get(name)
                if upload is None or not hasattr(upload, "read"):
                    raise HTTPException(422, f"Missing upload field: {name}")
                kwargs[name] = upload
                continue

            if _is_pydantic_model(annotation):
                if payload_cache is None:
                    payload_cache = _json_body(body)
                kwargs[name] = annotation.model_validate(payload_cache)
                continue

            if name in query:
                raw = query[name][-1]
                try:
                    kwargs[name] = _coerce_scalar(raw, annotation)
                except (TypeError, ValueError) as exc:
                    raise HTTPException(422, f"Invalid query parameter: {name}") from exc
                continue

            if param.default is not inspect._empty and not isinstance(param.default, (DependsParam, FileParam)):
                kwargs[name] = param.default
                continue

            if _is_optional(annotation):
                kwargs[name] = None
                continue

            raise HTTPException(422, f"Missing required parameter: {name}")

        return kwargs, form_cache

    def _invoke(self, route: APIRoute, path_params: dict[str, Any], request: Request, body: bytes):
        endpoint = route.endpoint
        form_cache = None
        with Session(engine) as session:
            kwargs, form_cache = self._build_kwargs(route, endpoint, path_params, request, body, session)
            result = endpoint(**kwargs)
            if inspect.isawaitable(result):
                result = _run_async(result)

            # Preserve FastAPI response-model filtering for the auth endpoints.
            if route.response_model is not None and not isinstance(result, Response):
                adapter = TypeAdapter(route.response_model)
                validated = adapter.validate_python(result)
                result = adapter.dump_python(validated, mode="json")

        if form_cache is not None:
            try:
                _run_async(form_cache.close())
            except Exception:
                pass
        return result

    def __call__(self, environ, start_response):
        body = _read_wsgi_body(environ)
        request = _make_request(environ, body)

        try:
            _validate_host(request)

            method = request.method.upper()
            if method == "OPTIONS":
                origin = request.headers.get("origin", "")
                headers = [
                    ("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS"),
                    ("Access-Control-Allow-Headers", request.headers.get("access-control-request-headers", "Authorization, Content-Type, X-Request-ID")),
                    ("Access-Control-Max-Age", "600"),
                ]
                if origin and origin in settings.cors_list:
                    headers.extend([
                        ("Access-Control-Allow-Origin", origin),
                        ("Access-Control-Allow-Credentials", "true"),
                        ("Vary", "Origin"),
                    ])
                return _plain_wsgi_response(start_response, request, 204, b"", "text/plain", headers)

            if request.url.path.startswith("/uploads/"):
                return _serve_public_upload(request.url.path, start_response, request)

            route, path_params = _match_route(self.routes, request.url.path, method)
            result = self._invoke(route, path_params, request, body)

            if isinstance(result, Response):
                return _handle_starlette_response(start_response, request, result)

            code = int(route.status_code or 200)
            return _json_wsgi_response(start_response, request, code, result)

        except HTTPException as exc:
            headers = list((exc.headers or {}).items())
            return _json_wsgi_response(start_response, request, int(exc.status_code), {"detail": exc.detail}, headers)
        except ValidationError as exc:
            return _json_wsgi_response(start_response, request, 422, {"detail": exc.errors(include_url=False)})
        except Exception as exc:
            # Keep internal details out of HTTP responses. Passenger will capture the
            # traceback in stderr.log for diagnosis.
            import traceback

            traceback.print_exc()
            return _json_wsgi_response(start_response, request, 500, {"detail": "Internal Server Error"})
