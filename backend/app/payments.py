from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Annotated
import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from .config import settings
from .database import get_session
from .models import (
    AuditLog,
    Booking,
    CommissionLedger,
    LocalProfile,
    Notification,
    PaymentRecord,
    PaymentWebhookEvent,
    Service,
    User,
)
from .schemas import PaymentRefundInput
from .security import admin_user, current_user
from .safepay_provider import (
    checkout_url as safepay_checkout_url,
    create_tracker as safepay_create_tracker,
    safepay_setup_issues,
    verify_webhook as safepay_verify_webhook,
    verify_tracker_payment as safepay_verify_tracker_payment,
)

router = APIRouter()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)



def money_minor(amount: float) -> int:
    # HireALocals V3.1 intentionally supports two-decimal marketplace currencies.
    # USD/GBP/EUR all use 100 minor units. Add explicit handling before enabling
    # a zero-decimal currency such as JPY.
    return int(round(float(amount) * 100))


def payment_record(session: Session, booking_id: int) -> PaymentRecord | None:
    return session.exec(select(PaymentRecord).where(PaymentRecord.booking_id == booking_id)).first()


def payment_is_paid(session: Session, booking_id: int) -> bool:
    row = payment_record(session, booking_id)
    return bool(row and row.status == "paid")


def ensure_booking_paid_for_completion(session: Session, booking: Booking) -> None:
    if settings.payment_required and not payment_is_paid(session, booking.id):
        raise HTTPException(409, "This booking must be paid before it can be marked completed")


def payment_summary(session: Session, booking_id: int) -> dict:
    row = payment_record(session, booking_id)

    return {
        "provider": row.provider if row else settings.payment_provider,
        "mode": settings.payment_mode,
        "required": settings.payment_required,
        "currency": (
            row.currency if row else settings.payment_currency
        ).upper(),
        "status": (
            row.status
            if row
            else ("unpaid" if settings.payment_required else "manual")
        ),
        "amount_total": round((row.amount_total_minor / 100), 2) if row else None,
        "platform_fee": round((row.platform_fee_minor / 100), 2) if row else None,
        "refunded_amount": round((row.refunded_minor / 100), 2) if row else 0.0,
        "checkout_session_id": row.checkout_session_id if row else "",
        "payment_intent_id": row.payment_intent_id if row else "",
        "connected_account_id": row.connected_account_id if row else "",
        "paid_at": row.paid_at if row else None,
        "refunded_at": row.refunded_at if row else None,
    }


def local_profile_for_user(session: Session, user: User) -> LocalProfile:
    if user.role != "local":
        raise HTTPException(403, "Local account required")
    profile = session.exec(select(LocalProfile).where(LocalProfile.user_id == user.id)).first()
    if not profile:
        raise HTTPException(404, "Local profile not found")
    return profile


def user_can_view_booking(session: Session, user: User, booking: Booking) -> bool:
    if user.role == "admin" or booking.tourist_user_id == user.id:
        return True
    if user.role == "local":
        profile = session.exec(select(LocalProfile).where(LocalProfile.user_id == user.id)).first()
        return bool(profile and profile.id == booking.local_profile_id)
    return False


def add_notice(session: Session, user_id: int, kind: str, title: str, body: str, link: str) -> None:
    session.add(Notification(user_id=user_id, kind=kind, title=title[:180], body=body[:2000], link=link[:500]))
    session.commit()


def add_audit(session: Session, actor_user_id: int | None, action: str, entity_type: str, entity_id: str | int, summary: str) -> None:
    session.add(AuditLog(
        actor_user_id=actor_user_id,
        action=action[:100],
        entity_type=entity_type[:80],
        entity_id=str(entity_id)[:120],
        summary=summary[:2000],
    ))
    session.commit()


def get_or_create_ledger(session: Session, booking: Booking) -> CommissionLedger:
    row = session.exec(select(CommissionLedger).where(CommissionLedger.booking_id == booking.id)).first()
    if not row:
        row = CommissionLedger(booking_id=booking.id)
    discount = getattr(booking, "discount_amount", 0.0) or 0.0
    row.gross_amount = round(booking.subtotal + booking.platform_fee - discount, 2)
    row.local_amount = round(booking.subtotal, 2)
    row.platform_fee = round(booking.platform_fee, 2)
    row.updated_at = utcnow()
    session.add(row)
    session.commit()
    session.refresh(row)
    return row



def mark_payment_paid(
    session: Session,
    row: PaymentRecord,
    payment_intent_id: str = "",
    charge_id: str = "",
) -> None:

    already_paid = row.status == "paid"

    row.status = "paid"

    if payment_intent_id:
        row.payment_intent_id = payment_intent_id

    if charge_id:
        row.charge_id = charge_id

    row.paid_at = row.paid_at or utcnow()
    row.updated_at = utcnow()

    session.add(row)

    booking = session.get(
        Booking,
        row.booking_id,
    )

    if booking:

        ledger = get_or_create_ledger(
            session,
            booking,
        )

        ledger.payout_status = "held"

        ledger.notes = (
            "Safepay traveler payment confirmed. "
            "Local payout remains held until the "
            "booking is completed and settlement "
            "is approved."
        )[:2000]

        ledger.updated_at = utcnow()

        session.add(ledger)

    session.commit()

    if booking and not already_paid:

        add_notice(
            session,
            booking.tourist_user_id,
            "payment_paid",
            f"Payment received for booking "
            f"#{booking.id}",
            "Your payment was confirmed securely "
            "by Safepay.",
            f"/dashboard/bookings/{booking.id}",
        )

        local = session.get(
            LocalProfile,
            booking.local_profile_id,
        )

        if local:

            add_notice(
                session,
                local.user_id,
                "payment_paid",
                f"Booking #{booking.id} is paid",
                "The traveler payment has been "
                "confirmed. Your earnings are "
                "recorded by HireALocals and "
                "settlement will follow the "
                "marketplace payout process.",
                "/local-dashboard/earnings",
            )



def mark_payment_refunded(session: Session, row: PaymentRecord, refunded_minor: int | None = None) -> None:
    row.status = "refunded"
    row.refunded_minor = refunded_minor if refunded_minor is not None else row.amount_total_minor
    row.refunded_at = row.refunded_at or utcnow()
    row.updated_at = utcnow()
    session.add(row)
    booking = session.get(Booking, row.booking_id)
    if booking:
        ledger = get_or_create_ledger(session, booking)
        ledger.payout_status = "void"
        ledger.notes = (
            f"{row.provider.title()} payment refunded; "
            "local settlement has been voided."
        )
        ledger.updated_at = utcnow()
        session.add(ledger)
    session.commit()



@router.get("/api/payments/config")
def payment_config():
    return {
        "provider": settings.payment_provider,
        "mode": settings.payment_mode,
        "enabled": settings.payment_required,
        "required": settings.payment_required,
        "currency":
            settings.payment_currency.upper(),
        "checkout":
            "safepay-hosted"
            if settings.safepay_enabled
            else "manual",
        "payout_mode":
            "marketplace_manual"
            if settings.safepay_enabled
            else "manual",
    }


@router.get("/api/payments/bookings/{booking_id}")
def booking_payment_status(
    booking_id: int,
    user: Annotated[
        User,
        Depends(current_user),
    ],
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):
    booking = session.get(
        Booking,
        booking_id,
    )

    if (
        not booking
        or not user_can_view_booking(
            session,
            user,
            booking,
        )
    ):
        raise HTTPException(
            404,
            "Booking not found",
        )

    row = payment_record(
        session,
        booking_id,
    )

    # Webhook is primary. This is a safe
    # server-side reconciliation fallback.
    if (
        row
        and row.provider == "safepay"
        and row.status
        in {"checkout_open", "processing"}
        and row.checkout_session_id
        and row.amount_total_minor > 0
    ):

        try:
            verified, _remote = (
                safepay_verify_tracker_payment(
                    row.checkout_session_id,
                    row.amount_total_minor,
                    row.currency,
                )
            )

            if verified:
                mark_payment_paid(
                    session,
                    row,
                )

        except Exception:
            # Network/provider failure must not
            # break booking-status reads.
            pass

    return payment_summary(
        session,
        booking_id,
    )


@router.post("/api/payments/bookings/{booking_id}/checkout")
def create_checkout(
    booking_id: int,
    user: Annotated[
        User,
        Depends(current_user),
    ],
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):
    if user.role != "tourist":
        raise HTTPException(
            403,
            "Traveler account required",
        )

    booking = session.get(
        Booking,
        booking_id,
    )

    if (
        not booking
        or booking.tourist_user_id != user.id
    ):
        raise HTTPException(
            404,
            "Booking not found",
        )

    if booking.status != "confirmed":
        raise HTTPException(
            409,
            "The local must confirm this booking "
            "before payment",
        )

    existing = payment_record(
        session,
        booking.id,
    )

    if (
        existing
        and existing.status == "paid"
    ):
        return {
            "ok": True,
            "already_paid": True,
            "payment": payment_summary(
                session,
                booking.id,
            ),
        }

    if not settings.safepay_enabled:
        raise HTTPException(
            409,
            "Online payments are not enabled",
        )

    issues = safepay_setup_issues()

    if issues:
        raise HTTPException(
            503,
            "Safepay configuration incomplete: "
            + "; ".join(issues),
        )

    service = (
        session.get(
            Service,
            booking.service_id,
        )
        if booking.service_id
        else None
    )

    discount = getattr(booking, "discount_amount", 0.0) or 0.0
    payable_total = max(0.0, round(booking.subtotal + booking.platform_fee - discount, 2))
    total_minor = money_minor(payable_total)

    fee_minor = money_minor(
        booking.platform_fee
    )

    success_url = (
        settings.safepay_checkout_success_url
        or (
            settings.frontend_url.rstrip("/")
            + f"/dashboard/bookings/"
            f"{booking.id}?payment=success"
        )
    )

    cancel_url = (
        settings.safepay_checkout_cancel_url
        or (
            settings.frontend_url.rstrip("/")
            + f"/dashboard/bookings/"
            f"{booking.id}?payment=cancelled"
        )
    )

    if (
        existing
        and existing.provider == "safepay"
        and existing.checkout_session_id
        and existing.status
        in {"checkout_open", "processing"}
    ):

        url = safepay_checkout_url(
            existing.checkout_session_id,
            f"booking-{booking.id}",
            success_url,
            cancel_url,
        )

        return {
            "ok": True,
            "checkout_url": url,
            "reused": True,
            "payment": payment_summary(
                session,
                booking.id,
            ),
        }

    metadata = {
        "source": "hirealocals",
        "booking_id": str(booking.id),
        "tourist_user_id": str(user.id),
        "local_profile_id":
            str(booking.local_profile_id),
        "service": (
            service.title[:100]
            if service
            else "HireALocals booking"
        ),
    }

    tracker, _remote = (
        safepay_create_tracker(
            total_minor,
            settings.safepay_currency,
            metadata,
        )
    )

    url = safepay_checkout_url(
        tracker,
        f"booking-{booking.id}",
        success_url,
        cancel_url,
    )

    row = (
        existing
        or PaymentRecord(
            booking_id=booking.id
        )
    )

    row.provider = "safepay"
    row.status = "checkout_open"
    row.currency = (
        settings.safepay_currency.lower()
    )
    row.amount_total_minor = total_minor
    row.platform_fee_minor = fee_minor
    row.checkout_session_id = tracker
    row.payment_intent_id = ""
    row.charge_id = ""
    row.connected_account_id = ""
    row.refund_id = ""
    row.updated_at = utcnow()

    session.add(row)
    session.commit()
    session.refresh(row)

    add_audit(
        session,
        user.id,
        "payment.checkout_created",
        "booking",
        booking.id,
        f"Safepay tracker {tracker} created",
    )

    return {
        "ok": True,
        "checkout_url": url,
        "payment": payment_summary(
            session,
            booking.id,
        ),
    }


@router.get("/api/admin/payments")
def admin_payments(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    rows = session.exec(select(PaymentRecord).order_by(PaymentRecord.updated_at.desc())).all()
    result = []
    for row in rows:
        booking = session.get(Booking, row.booking_id)
        tourist = session.get(User, booking.tourist_user_id) if booking else None
        local = session.get(LocalProfile, booking.local_profile_id) if booking else None
        result.append({
            **payment_summary(session, row.booking_id),
            "id": row.id,
            "booking_id": row.booking_id,
            "booking_status": booking.status if booking else "unknown",
            "traveler_name": tourist.full_name if tourist else "Unknown traveler",
            "local_name": local.display_name if local else "Unknown local",
            "updated_at": row.updated_at,
        })
    return result


@router.post("/api/admin/payments/{booking_id}/refund")
def admin_refund_payment(
    booking_id: int,
    payload: PaymentRefundInput,
    admin: Annotated[
        User,
        Depends(admin_user),
    ],
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):
    booking = session.get(
        Booking,
        booking_id,
    )

    row = payment_record(
        session,
        booking_id,
    )

    if not booking or not row:
        raise HTTPException(
            404,
            "Payment not found",
        )

    if row.status != "paid":
        raise HTTPException(
            409,
            "Only a paid booking can be refunded",
        )

    if row.provider != "safepay":
        raise HTTPException(
            409,
            "This record is not an active "
            "Safepay payment.",
        )

    raise HTTPException(
        409,
        "Refund this payment from the Safepay "
        "merchant dashboard. The verified "
        "Safepay refund webhook will "
        "automatically update HireALocals.",
    )


@router.post("/api/payments/safepay/webhook")
async def safepay_webhook(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
):
    if not settings.safepay_webhook_secret:
        raise HTTPException(503, "Safepay webhook is not configured")

    raw = await request.body()

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Invalid Safepay webhook JSON")

    if not isinstance(payload, dict):
        raise HTTPException(400, "Invalid Safepay webhook payload")

    data = payload.get("data")
    if not isinstance(data, dict):
        data = payload

    signature = request.headers.get("X-SFPY-SIGNATURE", "")

    if not safepay_verify_webhook(signature, raw):
        raise HTTPException(400, "Invalid Safepay webhook signature")

    notification = data.get("notification") or {}
    if not isinstance(notification, dict):
        notification = {}

    event_type = str(
        payload.get("type")
        or data.get("type")
        or ""
    ).strip().lower()

    remote_event_id = str(
        payload.get("token")
        or data.get("token")
        or data.get("id")
        or hashlib.sha256(raw).hexdigest()
    )

    event_id = f"safepay:{remote_event_id}"[:220]

    existing_log = session.exec(
        select(PaymentWebhookEvent).where(
            PaymentWebhookEvent.event_id == event_id
        )
    ).first()

    if existing_log and existing_log.status == "processed":
        return {"received": True, "duplicate": True}

    log = existing_log or PaymentWebhookEvent(
        provider="safepay",
        event_id=event_id,
        event_type=event_type[:120],
    )

    try:
        tracker = str(
            notification.get("tracker")
            or data.get("tracker")
            or ""
        )

        row = None

        if tracker:
            row = session.exec(
                select(PaymentRecord).where(
                    PaymentRecord.provider == "safepay",
                    PaymentRecord.checkout_session_id == tracker,
                )
            ).first()

        if not row:
            metadata = (
                data.get("metadata")
                or notification.get("metadata")
                or {}
            )

            if not isinstance(metadata, dict):
                metadata = {}

            booking_value = (
                metadata.get("booking_id")
                or metadata.get("order_id")
                or notification.get("order_id")
                or data.get("order_id")
                or ""
            )

            booking_text = str(booking_value)

            if booking_text.startswith("booking-"):
                booking_text = booking_text.removeprefix("booking-")

            try:
                booking_id = int(booking_text)
            except Exception:
                booking_id = 0

            if booking_id:
                candidate = payment_record(session, booking_id)

                if candidate and candidate.provider == "safepay":
                    row = candidate

        if not row:
            raise RuntimeError(
                f"No HireALocals Safepay payment matched tracker {tracker!r}"
            )

        remote_currency = str(
            notification.get("currency")
            or data.get("currency")
            or ""
        ).upper()

        if (
            remote_currency
            and row.currency
            and remote_currency != row.currency.upper()
        ):
            raise RuntimeError(
                f"Currency mismatch: expected {row.currency.upper()}, "
                f"received {remote_currency}"
            )

        state = str(
            notification.get("state")
            or notification.get("status")
            or data.get("state")
            or data.get("status")
            or ""
        ).upper()

        reference = str(
            notification.get("reference")
            or notification.get("transaction_id")
            or data.get("reference")
            or ""
        )

        is_payment_event = (
            event_type.startswith("payment.")
            or event_type.startswith("payment:")
        )

        is_refund_event = (
            event_type.startswith("refund.")
            or event_type.startswith("refund:")
        )

        amount_value = notification.get("amount")

        if amount_value not in (None, ""):
            try:
                received_minor = int(
                    (Decimal(str(amount_value)) * Decimal("100"))
                    .quantize(Decimal("1"))
                )

                if (
                    is_payment_event
                    and state
                    in {
                        "PAID",
                        "COMPLETE",
                        "COMPLETED",
                        "CAPTURED",
                        "SUCCESS",
                        "SUCCEEDED",
                    }
                    and received_minor != row.amount_total_minor
                ):
                    raise RuntimeError(
                        f"Amount mismatch: expected "
                        f"{row.amount_total_minor}, "
                        f"received {received_minor}"
                    )

            except InvalidOperation:
                pass

        paid_states = {
            "PAID",
            "COMPLETE",
            "COMPLETED",
            "CAPTURED",
            "SUCCESS",
            "SUCCEEDED",
            "TRACKER_ENDED",
        }

        failed_states = {
            "FAILED",
            "DECLINED",
            "REJECTED",
            "CANCELLED",
            "CANCELED",
            "EXPIRED",
        }

        if is_payment_event:

            if (
                event_type == "payment.succeeded"
                or state in paid_states
            ):
                mark_payment_paid(
                    session,
                    row,
                    reference,
                )

            elif (
                event_type == "payment.failed"
                or state in failed_states
            ):

                # A stale failure must never
                # overwrite a successful payment.
                if row.status != "paid":

                    row.status = "failed"
                    row.updated_at = utcnow()

                    session.add(row)
                    session.commit()

            else:

                if row.status != "paid":

                    row.status = "processing"
                    row.updated_at = utcnow()

                    session.add(row)
                    session.commit()

        elif is_refund_event:
            if state in failed_states:
                row.status = "refund_failed"
                row.updated_at = utcnow()
                session.add(row)
                session.commit()

            else:
                refunded_minor = None

                if amount_value not in (None, ""):
                    try:
                        refunded_minor = int(
                            (
                                Decimal(str(amount_value))
                                * Decimal("100")
                            ).quantize(Decimal("1"))
                        )
                    except InvalidOperation:
                        refunded_minor = None

                mark_payment_refunded(
                    session,
                    row,
                    refunded_minor,
                )

        log.status = "processed"
        log.last_error = ""
        log.processed_at = utcnow()
        session.add(log)
        session.commit()

        return {
            "received": True,
            "event_type": event_type,
            "booking_id": row.booking_id,
        }

    except Exception as exc:
        log.status = "failed"
        log.last_error = str(exc)[:1000]
        log.processed_at = utcnow()
        session.add(log)
        session.commit()

        raise HTTPException(
            500,
            f"Safepay webhook processing failed: {str(exc)[:250]}",
        )
