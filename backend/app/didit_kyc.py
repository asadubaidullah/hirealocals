from __future__ import annotations

import json
from typing import Annotated
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request as UrlRequest, urlopen

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from .config import settings
from .database import get_session
from .models import LocalProfile, User
from .security import current_user


router = APIRouter(
    prefix="/api/local/kyc/didit",
    tags=["local-kyc"],
)


class DiditStartInput(BaseModel):
    consent: bool = False


def _profile_for_user(
    user: User,
    session: Session,
) -> LocalProfile:
    if user.role != "local":
        raise HTTPException(
            status_code=403,
            detail="Local account required",
        )

    profile = session.exec(
        select(LocalProfile).where(
            LocalProfile.user_id == user.id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Local profile not found",
        )

    return profile


def _require_configuration() -> None:
    if not settings.didit_api_key.strip():
        raise HTTPException(
            status_code=503,
            detail="Automatic identity verification is not configured yet.",
        )

    if not settings.didit_workflow_id.strip():
        raise HTTPException(
            status_code=503,
            detail="Automatic identity verification workflow is not configured yet.",
        )


def _didit_request(
    method: str,
    path: str,
    payload: dict | None = None,
) -> dict:
    _require_configuration()

    url = (
        settings.didit_base_url.rstrip("/")
        + "/"
        + path.lstrip("/")
    )

    body = (
        json.dumps(payload).encode("utf-8")
        if payload is not None
        else None
    )

    request = UrlRequest(
        url,
        data=body,
        method=method,
        headers={
            "x-api-key": settings.didit_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}

    except HTTPError as exc:
        raw = exc.read().decode(
            "utf-8",
            errors="replace",
        )

        try:
            error_data = json.loads(raw)
            detail = (
                error_data.get("detail")
                or error_data.get("message")
                or raw
            )
        except Exception:
            detail = raw or f"Didit returned HTTP {exc.code}"

        raise HTTPException(
            status_code=502,
            detail=f"Identity provider error: {detail}",
        ) from exc

    except (URLError, TimeoutError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to the identity verification provider.",
        ) from exc


def _vendor_data(user: User) -> str:
    # Stable internal identifier. Do not expose email/CNIC/passport.
    return f"hirealocals-local-{user.id}"


def _map_status(provider_status: str) -> str:
    if provider_status == "Approved":
        return "approved"

    if provider_status == "In Review":
        return "in_review"

    if provider_status == "Declined":
        return "declined"

    if provider_status in {
        "Expired",
        "Abandoned",
        "Kyc Expired",
    }:
        return "retry_required"

    if provider_status in {
        "Not Started",
        "In Progress",
        "Resubmitted",
        "Awaiting User",
    }:
        return "in_progress"

    return "unknown"


@router.post("/start")
def start_didit_verification(
    payload: DiditStartInput,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = _profile_for_user(user, session)

    if profile.verified:
        return {
            "ok": True,
            "already_verified": True,
            "verified": True,
            "status": "approved",
        }

    if not payload.consent:
        raise HTTPException(
            status_code=400,
            detail="Consent is required before identity verification.",
        )

    callback = (
        settings.frontend_url.rstrip("/")
        + "/kyc/return"
    )

    request_payload = {
        "workflow_id": settings.didit_workflow_id,
        "vendor_data": _vendor_data(user),
        "callback": callback,

        # localhost development should return the device that
        # initiated verification. Production can use both.
        "callback_method": (
            "both"
            if settings.is_production
            else "initiator"
        ),

        "language": "en",

        "metadata": {
            "platform": "hirealocals",
            "user_role": "local",
            "local_profile_id": profile.id,
            "consent_acknowledged": True,
        },

        "contact_details": {
            "email": user.email,
            "send_notification_emails": False,
            "email_lang": "en",
        },

        # IMPORTANT:
        # Do NOT provide expected_document_types here.
        # Passport must not be mandatory.
    }

    data = _didit_request(
        "POST",
        "/v3/session/",
        request_payload,
    )

    session_id = str(
        data.get("session_id") or ""
    ).strip()

    verification_url = str(
        data.get("url")
        or data.get("verification_url")
        or data.get("session_url")
        or ""
    ).strip()

    if not session_id or not verification_url:
        raise HTTPException(
            status_code=502,
            detail="Identity provider returned an incomplete verification session.",
        )

    return {
        "ok": True,
        "provider": "didit",
        "session_id": session_id,
        "url": verification_url,
        "provider_status": data.get("status", "Not Started"),
        "status": _map_status(
            str(data.get("status") or "")
        ),
    }


@router.get("/status")
def didit_verification_status(
    session_id: str,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = _profile_for_user(user, session)

    clean_session_id = session_id.strip()

    if not clean_session_id:
        raise HTTPException(
            status_code=400,
            detail="Verification session ID is required.",
        )

    data = _didit_request(
        "GET",
        f"/v3/session/{quote(clean_session_id, safe='')}/decision/",
    )

    # Never allow one Local to submit another person's
    # Didit session ID.
    if str(data.get("vendor_data") or "") != _vendor_data(user):
        raise HTTPException(
            status_code=403,
            detail="This verification session does not belong to your account.",
        )

    provider_status = str(
        data.get("status") or ""
    )

    status = _map_status(provider_status)

    # Only a server-to-server Approved decision can
    # automatically verify the Local.
    if status == "approved" and not profile.verified:
        profile.verified = True
        session.add(profile)
        session.commit()
        session.refresh(profile)

    # IMPORTANT:
    # Declined / expired does NOT automatically unverify a
    # Local already approved through the manual fallback.
    return {
        "ok": True,
        "provider": "didit",
        "session_id": clean_session_id,
        "provider_status": provider_status,
        "status": status,
        "verified": profile.verified,
    }
