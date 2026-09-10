from __future__ import annotations

from decimal import Decimal, InvalidOperation
import hashlib
import hmac

import requests
from fastapi import HTTPException

from .config import settings


def safepay_setup_issues() -> list[str]:
    issues: list[str] = []

    env = (settings.safepay_env or "").strip().lower()

    if env not in {"sandbox", "production"}:
        issues.append(
            "SAFEPAY_ENV must be sandbox or production"
        )

    if not (settings.safepay_public_key or "").strip():
        issues.append(
            "SAFEPAY_PUBLIC_KEY is missing"
        )

    if not (settings.safepay_secret_key or "").strip():
        issues.append(
            "SAFEPAY_SECRET_KEY is missing"
        )

    if not (settings.safepay_webhook_secret or "").strip():
        issues.append(
            "SAFEPAY_WEBHOOK_SECRET is missing"
        )

    if (
        settings.safepay_currency or ""
    ).upper() not in {"USD", "PKR"}:
        issues.append(
            "SAFEPAY_CURRENCY must be USD or PKR"
        )

    return issues


def safepay_sdk():
    issues = safepay_setup_issues()

    if issues:
        raise HTTPException(
            503,
            "Safepay configuration incomplete: "
            + "; ".join(issues),
        )

    try:
        from safepay_python.safepay import Safepay

    except ImportError:
        raise HTTPException(
            503,
            "Safepay Python SDK is not installed. "
            "Run: python -m pip install -r requirements.txt",
        )

    return Safepay(
        {
            "environment":
                settings.safepay_env.strip().lower(),
            "apiKey":
                settings.safepay_public_key.strip(),
            "v1Secret":
                settings.safepay_secret_key.strip(),
            "webhookSecret":
                settings.safepay_webhook_secret.strip(),
        }
    )


def create_tracker(
    amount_minor: int,
    currency: str,
    metadata: dict | None = None,
) -> tuple[str, dict]:

    client = safepay_sdk()

    # Safepay API expects standard major currency units (e.g. 99.68), not minor cents (9968).
    amount_major = round(float(amount_minor) / 100.0, 2)

    try:
        response = client.set_payment_details(
            {
                "amount": amount_major,
                "currency": currency.upper(),
            }
        )

    except Exception as exc:
        raise HTTPException(
            502,
            "Safepay could not create payment tracker: "
            + str(exc)[:300],
        )

    if not isinstance(response, dict):
        raise HTTPException(
            502,
            "Safepay returned an invalid payment response",
        )

    data = response.get("data") or {}

    if not isinstance(data, dict):
        raise HTTPException(
            502,
            "Safepay payment response has no data object",
        )

    tracker = str(data.get("token") or "")

    if not tracker:
        raise HTTPException(
            502,
            "Safepay payment response did not contain "
            "a tracker token",
        )

    return tracker, response


def checkout_url(
    tracker: str,
    order_id: str,
    success_url: str,
    cancel_url: str,
) -> str:

    client = safepay_sdk()

    try:
        url = client.get_checkout_url(
            {
                "beacon": tracker,
                "cancelUrl": cancel_url,
                "orderId": order_id,
                "redirectUrl": success_url,
                "source": "custom",
                "webhooks": True,
            }
        )

    except Exception as exc:
        raise HTTPException(
            502,
            "Safepay could not generate checkout URL: "
            + str(exc)[:300],
        )

    if not url:
        raise HTTPException(
            502,
            "Safepay returned an empty checkout URL",
        )

    return str(url)


def verify_webhook(
    signature: str,
    raw_body: bytes | str,
    payload: dict | None = None,
) -> bool:
    """
    Verify Safepay signature against payload['data'] (Safepay standard) or raw body.
    """

    if not signature:
        return False

    secret = (settings.safepay_webhook_secret or "").strip()
    if not secret:
        return False

    provided = signature.strip()
    if provided.lower().startswith("sha512="):
        provided = provided.split("=", 1)[1].strip()

    # 1. Safepay standard signature: HMAC-SHA512 over json.dumps(data, separators=(',', ':'))
    if payload and isinstance(payload, dict):
        data = payload.get("data")
        target_obj = data if isinstance(data, dict) else payload
        try:
            canonical_json = json.dumps(target_obj, separators=(",", ":"))
            expected_sig = hmac.new(
                secret.encode("utf-8"),
                canonical_json.encode("utf-8"),
                hashlib.sha512,
            ).hexdigest()
            if hmac.compare_digest(expected_sig.lower(), provided.lower()):
                return True
        except Exception:
            pass

    # 2. Raw body fallback: HMAC-SHA512 over exact raw bytes
    if raw_body not in (None, b"", ""):
        try:
            body = (
                raw_body.encode("utf-8")
                if isinstance(raw_body, str)
                else bytes(raw_body)
            )
            expected = hmac.new(
                secret.encode("utf-8"),
                body,
                hashlib.sha512,
            ).hexdigest()
            if hmac.compare_digest(expected.lower(), provided.lower()):
                return True
        except Exception:
            pass

    # 3. Safepay SDK is_webhook_valid fallback
    try:
        client = safepay_sdk()
        headers_dict = {"x-sfpy-signature": signature}
        body_dict = payload if isinstance(payload, dict) else {"data": {}}
        if client.is_webhook_valid(headers_dict, body_dict):
            return True
    except Exception:
        pass

    return False


def verify_tracker_payment(
    tracker: str,
    expected_amount_minor: int,
    expected_currency: str,
) -> tuple[bool, dict]:
    """
    Read-only server-side Safepay reconciliation.

    Payment is accepted only when:
    exact tracker completes,
    a charge / transaction exists,
    amount matches,
    currency matches.
    """

    tracker = str(tracker or "").strip()

    if not tracker:
        return False, {
            "reason": "missing_tracker"
        }

    base = (
        "https://sandbox.api.getsafepay.com"
        if (
            settings.safepay_env or ""
        ).strip().lower() == "sandbox"
        else "https://api.getsafepay.com"
    )

    response = None
    last_error = ""

    # Query canonical /order/v1/{tracker} endpoint, with fallback to /reporter/api/v1/payments/{tracker}
    for path in (f"/order/v1/{tracker}", f"/reporter/api/v1/payments/{tracker}"):
        try:
            r = requests.get(
                f"{base}{path}",
                headers={
                    "X-SFPY-MERCHANT-SECRET":
                        settings.safepay_secret_key.strip(),
                    "Accept": "application/json",
                },
                timeout=10,
            )
            if r.status_code == 200:
                response = r
                break
            else:
                last_error = f"HTTP {r.status_code}: {r.text[:200]}"
        except requests.RequestException as exc:
            last_error = str(exc)[:200]
            continue

    if response is None or response.status_code != 200:
        return False, {
            "reason": "remote_http_error",
            "error": last_error,
        }

    try:
        body = response.json()
    except ValueError:
        return False, {
            "reason": "invalid_remote_json"
        }

    data = body.get("data") or {}

    remote = (
        data.get("tracker")
        if (
            isinstance(data, dict)
            and isinstance(
                data.get("tracker"),
                dict,
            )
        )
        else data
    )

    if not isinstance(remote, dict):
        return False, {
            "reason": "invalid_remote_shape"
        }

    remote_token = str(
        remote.get("token")
        or remote.get("tracker")
        or ""
    ).strip()

    if (
        remote_token
        and remote_token != tracker
    ):
        return False, {
            "reason": "tracker_mismatch"
        }

    state = str(
        remote.get("state") or ""
    ).upper()

    has_charge = bool(
        remote.get("charge")
        or remote.get("transaction")
    )

    events = {
        str(item.get("type") or "").upper()
        for item in (
            remote.get("events") or []
        )
        if isinstance(item, dict)
    }

    has_capture = (
        "CAPTURE" in events
        or bool(remote.get("transaction"))
    )

    tx = (
        remote.get("transaction")
        if isinstance(remote.get("transaction"), dict)
        else {}
    )
    charge_id = str(tx.get("token") or remote.get("charge") or "")
    reference = str(tx.get("reference") or remote.get("reference") or "")

    amounts: list[object] = []
    currencies: list[str] = []

    def walk(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                key_lower = str(key).lower()
                if (
                    key_lower == "amount"
                    and not isinstance(
                        value,
                        (dict, list),
                    )
                ):
                    amounts.append(value)
                elif (
                    key_lower == "currency"
                    and not isinstance(
                        value,
                        (dict, list),
                    )
                ):
                    currencies.append(
                        str(value).upper()
                    )
                walk(value)
        elif isinstance(obj, list):
            for value in obj:
                walk(value)

    walk(body)

    expected_currency = str(
        expected_currency or ""
    ).upper()

    expected_minor = Decimal(
        str(int(expected_amount_minor))
    )

    expected_major = (
        expected_minor / Decimal("100")
    )

    amount_ok = False

    for value in amounts:
        try:
            parsed = Decimal(str(value))
        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):
            continue

        if parsed in {
            expected_minor,
            expected_major,
        }:
            amount_ok = True
            break

    currency_ok = (
        expected_currency in currencies
    )

    ok = (
        state in {
            "TRACKER_ENDED",
            "PAID",
            "COMPLETE",
            "COMPLETED",
            "CAPTURED",
            "SUCCESS",
            "SUCCEEDED",
        }
        and has_charge
        and has_capture
        and amount_ok
        and currency_ok
    )

    return ok, {
        "state": state,
        "has_charge": has_charge,
        "charge_id": charge_id,
        "reference": reference,
        "events": sorted(events),
        "amount_ok": amount_ok,
        "currency_ok": currency_ok,
    }

