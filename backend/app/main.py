from contextlib import asynccontextmanager
from datetime import date, datetime, time, timezone, timedelta
from pathlib import Path
from typing import Annotated, Optional
import re
import secrets
import uuid
import hashlib
import smtplib
from email.message import EmailMessage
import io
import csv

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select, SQLModel
from sqlalchemy import or_, func, delete

from .config import settings
from .database import create_db_and_tables, get_session
from .models import (
    User,
    LocalProfile,
    Service,
    Booking,
    Review,
    ProviderApplication,
    ContactMessage,
    WeeklyAvailability,
    Message,
    ConversationPreference,
    TravelerProfile,
    Favorite,
    CommissionLedger,
    ReviewModeration,
    SiteSetting,
    UploadRecord,
    AvailabilityOverride,
    BookingDetail,
    BookingEvent,
    UserEmailState,
    AuthToken,
    Notification,
    EmailOutbox,
    SupportState,
    SupportReply,
    SeoCity,
    BlogPost,
    ServiceCategory,
    AuditLog,
    RateLimitEvent,
    PaymentRecord,
    UserConsent,
    LaunchTask,
    TripRequest,
    RequestOffer,
    ReviewReport,
    PromoCode,
    PromoRedemption,
    ReferralCode,
    ReferralAttribution,
    SearchEvent,
)
from .schemas import (
    RegisterInput,
    LoginInput,
    TokenOut,
    UserOut,
    BookingInput,
    ProviderApplicationInput,
    ContactInput,
    StatusUpdate,
    LocalProfileUpdate,
    ServiceInput,
    ServiceUpdate,
    AvailabilityUpdate,
    MessageInput,
    TravelerProfileUpdate,
    ReviewInput,
    AdminSettingsUpdate,
    CommissionUpdate,
    AvailabilityOverrideInput,
    MeetingPointInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    VerifyEmailInput,
    SupportUpdateInput,
    SupportReplyInput,
    SeoCityInput,
    SeoCityUpdate,
    BlogPostInput,
    BlogPostUpdate,
    ServiceCategoryInput,
    ServiceCategoryUpdate,
    LaunchTaskUpdate,
    TripRequestInput,
    RequestOfferInput,
    ReviewReportInput,
    PromoValidateInput,
    PromoCreateInput,
    PromoUpdateInput,
    ReferralClaimInput,
    DemandSummaryResponse,
    RevenueKPIOverview,
    RevenueTrendPoint,
    CityRevenueItem,
    CategoryRevenueItem,
    LocalRevenueItem,
    PromoRevenueItem,
    ReferralRevenueItem,
    PaymentLifecycleStats,
    ReconciliationRow,
    PayoutAgingBucket,
    PayoutAgingBreakdown,
    BatchPayoutInput,
    BatchPayoutResult,
    RevenueAnalyticsResponse,
)
from .security import hash_password, verify_password, create_access_token, current_user, admin_user
from .didit_kyc import router as didit_kyc_router
from .payments import router as payments_router, payment_summary, payment_is_paid, ensure_booking_paid_for_completion
from .two_factor import router as two_factor_router, two_factor_enabled, create_login_challenge
from .two_factor_email import router as two_factor_email_router, email_two_factor_enabled
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.is_production and settings.strict_production_checks:
        issues = settings.production_issues()
        if issues:
            raise RuntimeError("Production preflight failed: " + "; ".join(issues))
    create_db_and_tables()
    seed_if_empty(seed_demo_data=settings.seed_demo_data)
    yield


app = FastAPI(
    title="HireALocals API",
    version="0.3.3",
    description="Marketplace API for HireALocals.com â€” launch controls, consent records, Safepay payments and production hardening",
    lifespan=lifespan,
    docs_url="/docs" if settings.api_docs_enabled else None,
    redoc_url="/redoc" if settings.api_docs_enabled else None,
    openapi_url="/openapi.json" if settings.api_docs_enabled else None,
)

# Reject unexpected Host headers in production while keeping LAN development convenient.
if settings.is_production and settings.trusted_hosts_list:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts_list)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_origin_regex=(
        r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$"
        if not settings.is_production else None
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def request_security_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

BACKEND_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_UPLOAD_ROOT = BACKEND_ROOT / "uploads"
PRIVATE_UPLOAD_ROOT = BACKEND_ROOT / "private_uploads"
PUBLIC_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
PRIVATE_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(PUBLIC_UPLOAD_ROOT)), name="uploads")
app.include_router(payments_router)
app.include_router(two_factor_router)
app.include_router(two_factor_email_router)

DEFAULT_SITE_SETTINGS = {
    "platform_fee_percent": "12",
    "support_email": "support@hirealocals.com",
    "marketplace_mode": "open",
    "require_local_verification": "true",
    "require_email_verification": "false",
}


def get_setting(session: Session, key: str) -> str:
    row = session.exec(select(SiteSetting).where(SiteSetting.key == key)).first()
    return row.value if row else DEFAULT_SITE_SETTINGS.get(key, "")


def get_bool_setting(session: Session, key: str) -> bool:
    return get_setting(session, key).strip().lower() in {"1", "true", "yes", "on"}


def _client_ip(request: Request) -> str:
    # Do not trust arbitrary X-Forwarded-For values here. Configure the reverse proxy
    # to pass the real client address to Uvicorn/ASGI in production.
    return request.client.host if request.client else "unknown"


def _privacy_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def audit_event(
    session: Session,
    actor_user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: str | int = "",
    summary: str = "",
    request: Request | None = None,
) -> AuditLog:
    row = AuditLog(
        actor_user_id=actor_user_id,
        action=action[:100],
        entity_type=entity_type[:80],
        entity_id=str(entity_id)[:120],
        summary=summary[:2000],
        request_id=(getattr(request.state, "request_id", "") if request else "")[:80],
        ip_hash=_privacy_hash(_client_ip(request)) if request else "",
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def record_consent(
    session: Session,
    user_id: int,
    kind: str,
    version: str,
    request: Request,
    booking_id: int | None = None,
) -> UserConsent:
    """Write an append-only policy acceptance record without storing a raw IP address."""
    row = UserConsent(
        user_id=user_id,
        booking_id=booking_id,
        kind=kind[:60],
        version=version[:80],
        request_id=(getattr(request.state, "request_id", "") or "")[:80],
        ip_hash=_privacy_hash(_client_ip(request)),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def enforce_rate_limit(
    session: Session,
    request: Request,
    route_key: str,
    limit: int,
    window_seconds: int,
    identity: str = "",
) -> None:
    if not settings.rate_limit_enabled:
        return
    raw_identity = f"{_client_ip(request)}|{identity.lower().strip()}"
    identity_hash = _privacy_hash(raw_identity)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=window_seconds)
    recent = session.exec(
        select(RateLimitEvent).where(
            RateLimitEvent.route_key == route_key,
            RateLimitEvent.identity_hash == identity_hash,
            RateLimitEvent.created_at >= cutoff,
        )
    ).all()
    if len(recent) >= limit:
        oldest = min((r.created_at for r in recent), default=now)
        if oldest.tzinfo is None:
            oldest = oldest.replace(tzinfo=timezone.utc)
        retry_after = max(1, int(window_seconds - (now - oldest).total_seconds()))
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
    session.add(RateLimitEvent(route_key=route_key, identity_hash=identity_hash, created_at=now))
    # Opportunistic cleanup keeps the table bounded without a scheduler.
    session.exec(
        delete(RateLimitEvent)
        .where(RateLimitEvent.created_at < now - timedelta(days=1))
        .execution_options(synchronize_session=False)
    )
    session.commit()


def email_state(session: Session, user: User, legacy_verified: bool = True) -> UserEmailState:
    row = session.exec(select(UserEmailState).where(UserEmailState.user_id == user.id)).first()
    if not row:
        row = UserEmailState(
            user_id=user.id,
            verified=legacy_verified,
            verified_at=datetime.now(timezone.utc) if legacy_verified else None,
        )
        session.add(row); session.commit(); session.refresh(row)
    return row


def _token_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def issue_auth_token(session: Session, user: User, kind: str, minutes: int) -> str:
    # Invalidate older unused tokens of the same kind without storing raw secrets.
    old = session.exec(select(AuthToken).where(AuthToken.user_id == user.id, AuthToken.kind == kind, AuthToken.used_at == None)).all()
    now = datetime.now(timezone.utc)
    for row in old:
        row.used_at = now
        session.add(row)
    raw = secrets.token_urlsafe(40)
    session.add(AuthToken(user_id=user.id, kind=kind, token_hash=_token_hash(raw), expires_at=now + timedelta(minutes=minutes)))
    session.commit()
    return raw


def auth_token_row(session: Session, raw: str, kind: str) -> AuthToken:
    row = session.exec(select(AuthToken).where(AuthToken.token_hash == _token_hash(raw), AuthToken.kind == kind)).first()
    if not row or row.used_at is not None:
        raise HTTPException(400, "This link is invalid or has already been used")
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(400, "This link has expired. Request a new one")
    return row


def _deliver_outbox_row(session: Session, row: EmailOutbox) -> None:
    if not settings.smtp_host or settings.app_env != "production":
        row.status = "dev_queued"
        row.last_error = "Development mode: outbox recorded. View this message in Admin > Email outbox."
        session.add(row); session.commit()
        return
    try:
        msg = EmailMessage()
        msg["Subject"] = row.subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg["To"] = row.to_email
        msg.set_content(row.body_text)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=2) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(msg)
        row.status = "sent"
        row.sent_at = datetime.now(timezone.utc)
        row.last_error = ""
    except Exception as exc:
        row.status = "failed"
        row.last_error = str(exc)[:1000]
    session.add(row); session.commit()


def queue_email(session: Session, to_email: str, subject: str, body_text: str) -> EmailOutbox:
    row = EmailOutbox(to_email=to_email.lower().strip(), subject=subject[:255], body_text=body_text)
    session.add(row); session.commit(); session.refresh(row)
    _deliver_outbox_row(session, row)
    session.refresh(row)
    return row


def add_notification(session: Session, user_id: int, kind: str, title: str, body: str = "", link: str = "", email: bool = False) -> Notification | None:
    user = session.get(User, user_id)
    if not user:
        return None
    item = Notification(user_id=user_id, kind=kind, title=title[:180], body=body[:2000], link=link[:500])
    session.add(item); session.commit(); session.refresh(item)
    if email:
        target = (settings.frontend_url.rstrip("/") + link) if link.startswith("/") else link
        queue_email(session, user.email, title, f"{body}\n\nOpen HireALocals: {target}" if target else body)
    return item


def booking_party_ids(session: Session, booking: Booking) -> tuple[int, int | None]:
    local = session.get(LocalProfile, booking.local_profile_id)
    return booking.tourist_user_id, (local.user_id if local else None)


def notify_other_booking_party(session: Session, booking: Booking, actor_user_id: int, kind: str, title: str, body: str, email: bool = True) -> None:
    tourist_id, local_user_id = booking_party_ids(session, booking)
    target_id = local_user_id if actor_user_id == tourist_id else tourist_id
    if target_id:
        role_link = f"/dashboard/bookings/{booking.id}" if target_id == tourist_id else "/local-dashboard/bookings"
        add_notification(session, target_id, kind, title, body, role_link, email=email)


def notify_admins(session: Session, kind: str, title: str, body: str, link: str) -> None:
    admins = session.exec(select(User).where(User.role == "admin", User.is_active == True)).all()
    for admin in admins:
        add_notification(session, admin.id, kind, title, body, link, email=False)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "local"


def unique_local_slug(session: Session, name: str, city: str) -> str:
    base = slugify(f"{name}-{city}")
    candidate = base
    n = 2
    while session.exec(select(LocalProfile).where(LocalProfile.slug == candidate)).first():
        candidate = f"{base}-{n}"
        n += 1
    return candidate


def _ensure_utc_datetime(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def calculate_booking_financials(
    session: Session,
    subtotal: float,
    promo_code_str: str | None = None,
    user_id: int | None = None,
) -> dict:
    """Authoritative server-side calculation for booking financial values."""
    subtotal = round(float(subtotal), 2)
    fee_setting = get_setting(session, "platform_fee_percent") or "12"
    try:
        fee_percent = float(fee_setting)
    except Exception:
        fee_percent = 12.0

    platform_fee = round(subtotal * (fee_percent / 100.0), 2)
    discount_amount = 0.0
    applied_promo: PromoCode | None = None

    if promo_code_str and promo_code_str.strip():
        norm_code = promo_code_str.strip().upper()
        promo = session.exec(select(PromoCode).where(PromoCode.code == norm_code)).first()
        if promo and promo.is_active:
            now = datetime.now(timezone.utc)
            p_starts = _ensure_utc_datetime(promo.starts_at)
            p_expires = _ensure_utc_datetime(promo.expires_at)
            valid_time = (not p_starts or now >= p_starts) and (not p_expires or now <= p_expires)
            valid_uses = not promo.max_uses_total or promo.current_uses < promo.max_uses_total
            valid_min = subtotal >= promo.min_subtotal

            user_ok = True
            if user_id:
                user_redemptions = session.exec(
                    select(PromoRedemption).where(
                        PromoRedemption.promo_code_id == promo.id,
                        PromoRedemption.user_id == user_id,
                    )
                ).all()
                if len(user_redemptions) >= promo.max_uses_per_user:
                    user_ok = False

            if valid_time and valid_uses and valid_min and user_ok:
                if promo.discount_type == "percent":
                    calc_disc = round(subtotal * (promo.discount_value / 100.0), 2)
                    if promo.max_discount is not None:
                        calc_disc = min(calc_disc, round(float(promo.max_discount), 2))
                    discount_amount = calc_disc
                else:
                    discount_amount = min(round(float(promo.discount_value), 2), round(subtotal + platform_fee, 2))
                applied_promo = promo

    discount_amount = min(discount_amount, round(subtotal + platform_fee, 2))
    traveler_total = max(0.0, round(subtotal + platform_fee - discount_amount, 2))
    local_payable = round(subtotal, 2)
    net_platform_revenue = round(platform_fee - discount_amount, 2)

    return {
        "subtotal": subtotal,
        "platform_fee": platform_fee,
        "discount_amount": discount_amount,
        "total": traveler_total,
        "local_payable": local_payable,
        "net_platform_revenue": net_platform_revenue,
        "promo_code_id": applied_promo.id if applied_promo else None,
        "promo_code": applied_promo.code if applied_promo else "",
        "applied_promo": applied_promo,
    }


def sync_commission_ledger(session: Session) -> list[CommissionLedger]:
    bookings = session.exec(select(Booking).order_by(Booking.created_at.desc())).all()
    rows = []
    for booking in bookings:
        row = session.exec(select(CommissionLedger).where(CommissionLedger.booking_id == booking.id)).first()
        if not row:
            row = CommissionLedger(booking_id=booking.id)
        disc = getattr(booking, "discount_amount", 0.0) or 0.0
        row.gross_amount = round(booking.subtotal + booking.platform_fee - disc, 2)
        row.local_amount = round(booking.subtotal, 2)
        row.platform_fee = round(booking.platform_fee, 2)
        if booking.status in {"cancelled", "rejected"} and row.payout_status != "paid":
            row.payout_status = "void"
        elif booking.status == "completed" and row.payout_status in {"pending", "held"}:
            row.payout_status = "unpaid"
        elif booking.status == "confirmed" and row.payout_status == "pending":
            row.payout_status = "held"
        row.updated_at = datetime.now(timezone.utc)
        session.add(row)
        rows.append(row)
    session.commit()
    return rows


def upload_public_dict(row: UploadRecord, owner: User | None = None) -> dict:
    return {
        "id": row.id,
        "owner_user_id": row.owner_user_id,
        "owner_name": owner.full_name if owner else "",
        "owner_email": owner.email if owner else "",
        "kind": row.kind,
        "original_name": row.original_name,
        "mime_type": row.mime_type,
        "size_bytes": row.size_bytes,
        "status": row.status,
        "public_url": row.public_url,
        "created_at": row.created_at,
    }


def require_local_profile(user: User, session: Session) -> LocalProfile:
    if user.role != "local":
        raise HTTPException(403, "Local account required")
    profile = session.exec(select(LocalProfile).where(LocalProfile.user_id == user.id)).first()
    if not profile:
        raise HTTPException(404, "Local profile not found")
    return profile


def booking_for_user(booking_id: int, user: User, session: Session) -> Booking:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if user.role == "admin":
        return booking
    if user.role == "tourist" and booking.tourist_user_id == user.id:
        return booking
    if user.role == "local":
        profile = require_local_profile(user, session)
        if booking.local_profile_id == profile.id:
            return booking
    raise HTTPException(403, "You do not have access to this booking")


RESERVED_BOOKING_STATUSES = {"pending", "confirmed"}


def parse_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(400, "Booking date must use YYYY-MM-DD")


def parse_hhmm(value: str) -> time:
    try:
        return datetime.strptime(value, "%H:%M").time()
    except ValueError:
        raise HTTPException(400, "Time must use HH:MM in 24-hour format")


def as_minutes(value: str) -> int:
    t = parse_hhmm(value)
    return t.hour * 60 + t.minute


def hhmm_from_minutes(total: int) -> str:
    total = max(0, min(total, 24 * 60))
    return f"{total // 60:02d}:{total % 60:02d}"


def duration_minutes(hours: float) -> int:
    minutes = int(round(float(hours) * 60))
    if minutes < 30 or minutes > 24 * 60:
        raise HTTPException(400, "Booking duration must be between 30 minutes and 24 hours")
    return minutes


def booking_detail_row(session: Session, booking_id: int) -> BookingDetail | None:
    return session.exec(select(BookingDetail).where(BookingDetail.booking_id == booking_id)).first()


def booking_end_time(booking: Booking) -> str:
    return hhmm_from_minutes(as_minutes(booking.start_time) + duration_minutes(booking.hours))


def effective_schedule(session: Session, local_profile_id: int, booking_day: date) -> dict:
    date_key = booking_day.isoformat()
    override = session.exec(
        select(AvailabilityOverride).where(
            AvailabilityOverride.local_profile_id == local_profile_id,
            AvailabilityOverride.booking_date == date_key,
        )
    ).first()
    if override:
        if not override.enabled:
            return {"enabled": False, "source": "date_override", "start_time": None, "end_time": None, "note": override.note}
        start_m, end_m = as_minutes(override.start_time), as_minutes(override.end_time)
        if end_m <= start_m:
            raise HTTPException(400, "The local has an invalid date-specific availability window")
        return {"enabled": True, "source": "date_override", "start_time": override.start_time, "end_time": override.end_time, "note": override.note}

    weekday = booking_day.weekday()
    row = session.exec(
        select(WeeklyAvailability).where(
            WeeklyAvailability.local_profile_id == local_profile_id,
            WeeklyAvailability.weekday == weekday,
        )
    ).first()
    if row:
        if not row.enabled:
            return {"enabled": False, "source": "weekly", "start_time": None, "end_time": None, "note": ""}
        start_m, end_m = as_minutes(row.start_time), as_minutes(row.end_time)
        if end_m <= start_m:
            raise HTTPException(400, "The local has an invalid weekly availability window")
        return {"enabled": True, "source": "weekly", "start_time": row.start_time, "end_time": row.end_time, "note": ""}

    # Match the Local dashboard defaults for profiles that have never saved a schedule.
    if weekday < 5:
        return {"enabled": True, "source": "default", "start_time": "09:00", "end_time": "17:00", "note": ""}
    return {"enabled": False, "source": "default", "start_time": None, "end_time": None, "note": ""}


def booking_overlaps(session: Session, local_profile_id: int, booking_date: str, start_minute: int, end_minute: int, exclude_booking_id: int | None = None) -> Booking | None:
    rows = session.exec(
        select(Booking).where(
            Booking.local_profile_id == local_profile_id,
            Booking.booking_date == booking_date,
        )
    ).all()
    for existing in rows:
        if exclude_booking_id and existing.id == exclude_booking_id:
            continue
        if existing.status not in RESERVED_BOOKING_STATUSES:
            continue
        existing_start = as_minutes(existing.start_time)
        existing_end = existing_start + duration_minutes(existing.hours)
        if start_minute < existing_end and end_minute > existing_start:
            return existing
    return None


def validate_booking_slot(session: Session, local_profile_id: int, booking_date: str, start_time: str, hours: float, exclude_booking_id: int | None = None) -> dict:
    booking_day = parse_iso_date(booking_date)
    if booking_day < date.today():
        raise HTTPException(400, "Booking date cannot be in the past")
    schedule = effective_schedule(session, local_profile_id, booking_day)
    if not schedule["enabled"]:
        note = f" ({schedule['note']})" if schedule.get("note") else ""
        raise HTTPException(409, f"This local is unavailable on that date{note}")
    start_minute = as_minutes(start_time)
    end_minute = start_minute + duration_minutes(hours)
    window_start = as_minutes(schedule["start_time"])
    window_end = as_minutes(schedule["end_time"])
    if start_minute < window_start or end_minute > window_end:
        raise HTTPException(409, f"Choose a time between {schedule['start_time']} and {schedule['end_time']} for this duration")
    conflict = booking_overlaps(session, local_profile_id, booking_date, start_minute, end_minute, exclude_booking_id)
    if conflict:
        raise HTTPException(409, f"That time overlaps booking #{conflict.id}. Please choose another available slot")
    return {**schedule, "start_time": start_time, "end_time": hhmm_from_minutes(end_minute)}


def available_slots_for_date(session: Session, local_profile_id: int, booking_date: str, hours: float) -> dict:
    booking_day = parse_iso_date(booking_date)
    if booking_day < date.today():
        raise HTTPException(400, "Booking date cannot be in the past")
    schedule = effective_schedule(session, local_profile_id, booking_day)
    required = duration_minutes(hours)
    if not schedule["enabled"]:
        return {"booking_date": booking_date, "duration_hours": hours, "schedule": schedule, "slots": []}
    window_start = as_minutes(schedule["start_time"])
    window_end = as_minutes(schedule["end_time"])
    slots = []
    cursor = window_start
    while cursor + required <= window_end:
        if not booking_overlaps(session, local_profile_id, booking_date, cursor, cursor + required):
            slots.append(hhmm_from_minutes(cursor))
        cursor += 30
    return {"booking_date": booking_date, "duration_hours": hours, "schedule": schedule, "slots": slots}


def log_booking_event(session: Session, booking: Booking, actor_user_id: int | None, event_type: str, from_status: str = "", to_status: str = "", note: str = "") -> None:
    session.add(BookingEvent(
        booking_id=booking.id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        note=note[:1000],
    ))


def booking_timeline(session: Session, booking_id: int) -> list[dict]:
    events = session.exec(select(BookingEvent).where(BookingEvent.booking_id == booking_id).order_by(BookingEvent.created_at.asc())).all()
    rows = []
    for event in events:
        actor = session.get(User, event.actor_user_id) if event.actor_user_id else None
        rows.append({
            "id": event.id, "event_type": event.event_type, "from_status": event.from_status, "to_status": event.to_status,
            "note": event.note, "created_at": event.created_at,
            "actor_name": actor.full_name if actor else "System", "actor_role": actor.role if actor else "system",
        })
    return rows


def meeting_point_dict(session: Session, booking_id: int) -> dict:
    detail = booking_detail_row(session, booking_id)
    if not detail:
        return {"meeting_point_name": "", "meeting_address": "", "meeting_instructions": "", "latitude": None, "longitude": None}
    return {
        "meeting_point_name": detail.meeting_point_name, "meeting_address": detail.meeting_address,
        "meeting_instructions": detail.meeting_instructions, "latitude": detail.latitude, "longitude": detail.longitude,
        "updated_at": detail.updated_at,
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "hirealocals-api", "version": "0.3.3", "release": settings.release_version, "environment": settings.app_env}


@app.get("/api/health/ready")
def health_ready(session: Annotated[Session, Depends(get_session)]):
    try:
        session.exec(select(User).limit(1)).first()
        return {"status": "ready", "database": "ok", "version": "0.3.3", "release": settings.release_version}
    except Exception:
        raise HTTPException(503, "Database is not ready")


@app.get("/api/marketplace/config")
def marketplace_config(session: Annotated[Session, Depends(get_session)]):
    return {
        "platform_fee_percent": float(get_setting(session, "platform_fee_percent") or "12"),
        "marketplace_mode": get_setting(session, "marketplace_mode"),
        "require_local_verification": get_bool_setting(session, "require_local_verification"),
        "require_email_verification": get_bool_setting(session, "require_email_verification"),
        "payment_mode": settings.payment_mode,
        "payment_required": settings.payment_required,
        "payment_currency": settings.payment_currency.upper(),
        "terms_version": settings.terms_version,
        "privacy_version": settings.privacy_version,
        "booking_policy_version": settings.booking_policy_version,
    }


@app.post("/api/auth/register", response_model=TokenOut)
def register(payload: RegisterInput, request: Request, session: Annotated[Session, Depends(get_session)]):
    enforce_rate_limit(session, request, "auth_register", 5, 3600, payload.email)
    if not payload.confirm_age:
        raise HTTPException(400, "You must confirm that you are at least 18 years old to create an account")
    if not payload.accept_terms:
        raise HTTPException(400, "You must accept the Terms of Use and Privacy Policy to create an account")
    if session.exec(select(User).where(User.email == payload.email.lower())).first():
        raise HTTPException(409, "Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        role="tourist",
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    profile = TravelerProfile(
        user_id=user.id,
        phone=payload.phone.strip(),
        country=payload.country.strip(),
    )
    state = UserEmailState(user_id=user.id, verified=False)
    session.add(profile)
    session.add(state)
    session.commit()

    record_consent(session, user.id, "age_18", "18+", request)
    record_consent(session, user.id, "terms", settings.terms_version, request)
    record_consent(session, user.id, "privacy", settings.privacy_version, request)

    raw = issue_auth_token(session, user, "verify_email", 24 * 60)
    verify_link = f"{settings.frontend_url.rstrip('/')}/verify-email?token={raw}"
    queue_email(
        session,
        user.email,
        "Verify your HireALocals email",
        f"Hello {user.full_name},\n\nVerify your email address using this link:\n{verify_link}\n\nThis link expires in 24 hours.",
    )
    audit_event(session, user.id, "auth.register", "user", user.id, "Traveler account created", request)
    return TokenOut(
        access_token=create_access_token(user),
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        email_verified=False,
    )


@app.post("/api/auth/login")
def login(
    payload: LoginInput,
    request: Request,
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):
    enforce_rate_limit(
        session,
        request,
        "auth_login",
        10,
        600,
        payload.email,
    )

    user = session.exec(
        select(User).where(
            User.email
            == payload.email.lower()
        )
    ).first()

    if (
        not user
        or not verify_password(
            payload.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            401,
            "Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            403,
            "This account is inactive",
        )

    state = email_state(
        session,
        user,
        legacy_verified=True,
    )

    if (
        two_factor_enabled(
            session,
            user,
        )
        or email_two_factor_enabled(
            session,
            user,
        )
    ):

        challenge = (
            create_login_challenge(
                session,
                user,
            )
        )

        audit_event(
            session,
            user.id,
            "auth.login_2fa_challenge",
            "user",
            user.id,
            "Password verified; 2FA challenge issued",
            request,
        )

        return {
            "two_factor_required":
                True,

            "challenge_token":
                challenge,

            "role":
                user.role,

            "full_name":
                user.full_name,

            "email":
                user.email,

            "email_verified":
                state.verified,
        }

    audit_event(
        session,
        user.id,
        "auth.login",
        "user",
        user.id,
        f"Successful {user.role} login",
        request,
    )

    return TokenOut(
        access_token=
            create_access_token(
                user
            ),

        role=
            user.role,

        full_name=
            user.full_name,

        email=
            user.email,

        email_verified=
            state.verified,
    )


@app.get("/api/auth/me", response_model=UserOut)
def me(
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    state = email_state(session, user, legacy_verified=True)
    image_url = ""

    if user.role == "local":
        profile = session.exec(
            select(LocalProfile).where(LocalProfile.user_id == user.id)
        ).first()
        if profile:
            image_url = profile.image_url or ""

    elif user.role == "tourist":
        profile = session.exec(
            select(TravelerProfile).where(TravelerProfile.user_id == user.id)
        ).first()
        if profile:
            image_url = profile.image_url or ""

    elif user.role == "admin":
        avatar = session.exec(
            select(UploadRecord)
            .where(
                UploadRecord.owner_user_id == user.id,
                UploadRecord.kind == "profile_image",
                UploadRecord.status == "approved",
            )
            .order_by(UploadRecord.created_at.desc())
        ).first()

        if avatar and avatar.public_url:
            if avatar.public_url.startswith(("http://", "https://")):
                image_url = avatar.public_url
            else:
                image_url = (
                    str(request.base_url).rstrip("/")
                    + "/"
                    + avatar.public_url.lstrip("/")
                )

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        email_verified=state.verified,
        image_url=image_url,
    )


@app.get("/api/auth/email-status")
def auth_email_status(user: Annotated[User, Depends(current_user)], session: Annotated[Session, Depends(get_session)]):
    state = email_state(session, user, legacy_verified=True)
    return {"email": user.email, "verified": state.verified, "require_email_verification": get_bool_setting(session, "require_email_verification")}


@app.post("/api/auth/resend-verification")
def resend_verification(request: Request, user: Annotated[User, Depends(current_user)], session: Annotated[Session, Depends(get_session)]):
    enforce_rate_limit(session, request, "auth_resend_verification", 4, 3600, user.email)
    state = email_state(session, user, legacy_verified=True)
    if state.verified:
        return {"ok": True, "message": "Email is already verified"}
    raw = issue_auth_token(session, user, "verify_email", 24 * 60)
    link = f"{settings.frontend_url.rstrip('/')}/verify-email?token={raw}"
    queue_email(session, user.email, "Verify your HireALocals email", f"Hello {user.full_name},\n\nVerify your email address using this link:\n{link}\n\nThis link expires in 24 hours.")
    return {"ok": True, "message": "Verification email queued"}


@app.post("/api/auth/verify-email")
def verify_email(payload: VerifyEmailInput, session: Annotated[Session, Depends(get_session)]):
    token = auth_token_row(session, payload.token, "verify_email")
    user = session.get(User, token.user_id)
    if not user:
        raise HTTPException(404, "Account not found")
    state = email_state(session, user, legacy_verified=False)
    now = datetime.now(timezone.utc)
    state.verified = True; state.verified_at = now; state.updated_at = now
    token.used_at = now
    session.add(state); session.add(token); session.commit()
    add_notification(session, user.id, "email_verified", "Email verified", "Your email address has been verified successfully.", "/dashboard" if user.role == "tourist" else "/local-dashboard")
    audit_event(session, user.id, "auth.email_verified", "user", user.id, "Email address verified")
    return {"ok": True, "message": "Email verified"}


@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordInput, request: Request, session: Annotated[Session, Depends(get_session)]):
    enforce_rate_limit(session, request, "auth_forgot_password", 5, 1800, payload.email)
    user = session.exec(select(User).where(User.email == payload.email.lower())).first()
    # Always return the same response to avoid revealing registered addresses.
    if user and user.is_active:
        raw = issue_auth_token(session, user, "password_reset", 30)
        link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={raw}"
        queue_email(session, user.email, "Reset your HireALocals password", f"Hello {user.full_name},\n\nUse this link to reset your password:\n{link}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.")
    return {"ok": True, "message": "If that email is registered, password reset instructions have been sent."}


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordInput, session: Annotated[Session, Depends(get_session)]):
    token = auth_token_row(session, payload.token, "password_reset")
    user = session.get(User, token.user_id)
    if not user:
        raise HTTPException(404, "Account not found")
    user.password_hash = hash_password(payload.new_password)
    token.used_at = datetime.now(timezone.utc)
    session.add(user); session.add(token); session.commit()
    add_notification(session, user.id, "password_changed", "Password changed", "Your HireALocals password was reset successfully.", "/login", email=True)
    audit_event(session, user.id, "auth.password_reset", "user", user.id, "Password reset completed")
    return {"ok": True, "message": "Password reset. You can now log in with your new password."}


# HIREALOCALS LOCAL KYC REQUIRED R1

def local_kyc_approved(
    session: Session,
    profile: LocalProfile,
) -> bool:

    approved = session.exec(
        select(UploadRecord).where(
            UploadRecord.owner_user_id
                == profile.user_id,

            UploadRecord.kind
                == "verification_document",

            UploadRecord.status
                == "approved",
        )
    ).first()

    return approved is not None


@app.get("/api/search/locals")
def search_locals(
    session: Annotated[Session, Depends(get_session)],
    request: Request,
    q: str = "",
    country: str = "",
    city: str = "",
    category: str = "",
    max_rate: float | None = None,
    min_rating: float | None = None,
    verified: bool | None = None,
    sort: str = "recommended",
    page: int = 1,
    page_size: int = 9,
):
    page = max(1, page)
    page_size = max(1, min(page_size, 24))
    # KYC is mandatory for every public Local.
    statement = select(LocalProfile).where(
        LocalProfile.verified == True
    )
    if country:
        statement = statement.where(LocalProfile.country_code == country.upper())
    if city:
        city_clean = city.strip()
        statement = statement.where(or_(LocalProfile.city_slug == slugify(city_clean), LocalProfile.city_name.ilike(city_clean)))
    if q.strip():
        term = f"%{q.strip()}%"
        statement = statement.where(or_(
            LocalProfile.display_name.ilike(term),
            LocalProfile.headline.ilike(term),
            LocalProfile.bio.ilike(term),
            LocalProfile.city_name.ilike(term),
            LocalProfile.languages.ilike(term),
        ))
    if max_rate is not None:
        statement = statement.where(LocalProfile.hourly_rate <= max_rate)
    if min_rating is not None:
        statement = statement.where(LocalProfile.rating >= min_rating)
    if sort == "price_low":
        statement = statement.order_by(LocalProfile.hourly_rate.asc(), LocalProfile.rating.desc())
    elif sort == "price_high":
        statement = statement.order_by(LocalProfile.hourly_rate.desc(), LocalProfile.rating.desc())
    elif sort == "rating":
        statement = statement.order_by(LocalProfile.rating.desc(), LocalProfile.review_count.desc())
    elif sort == "newest":
        statement = statement.order_by(LocalProfile.created_at.desc())
    else:
        statement = statement.order_by(LocalProfile.verified.desc(), LocalProfile.rating.desc(), LocalProfile.review_count.desc())

    profiles = session.exec(statement).all()
    rows: list[dict] = []
    for profile in profiles:

        if not local_kyc_approved(
            session,
            profile,
        ):
            continue

        services = session.exec(select(Service).where(Service.local_profile_id == profile.id, Service.active == True)).all()
        if category and not any(service.category.lower() == category.lower() for service in services):
            continue
        rows.append({"profile": profile, "services": services})

    total = len(rows)

    # Record search telemetry if any search terms or filters are active
    if q.strip() or country or city or category:
        try:
            client_ip = request.client.host if request.client else ""
            ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()[:16] if client_ip else ""
            event = SearchEvent(
                query=q.strip()[:200],
                country_code=country.upper()[:2],
                city_name=city.strip()[:120],
                category=category.strip()[:80],
                results_count=total,
                is_zero_result=(total == 0),
                ip_hash=ip_hash,
            )
            session.add(event)
            session.commit()
        except Exception:
            session.rollback()

    pages = max(1, (total + page_size - 1) // page_size)
    if page > pages:
        page = pages
    start = (page - 1) * page_size
    items = rows[start:start + page_size]
    cities = session.exec(select(SeoCity).where(SeoCity.published == True).order_by(SeoCity.name)).all()
    categories = session.exec(select(ServiceCategory).where(ServiceCategory.active == True).order_by(ServiceCategory.sort_order, ServiceCategory.name)).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
        "facets": {
            "cities": [{"name": row.name, "slug": row.slug, "country_code": row.country_code} for row in cities],
            "categories": [row.name for row in categories],
        },
    }


@app.get("/api/locals")
def locals_list(
    session: Annotated[Session, Depends(get_session)],
    country: str | None = None,
    city: str | None = None,
    category: str | None = None,
):
    # KYC is mandatory for marketplace visibility.
    statement = select(LocalProfile).where(
        LocalProfile.verified == True
    )
    if country:
        statement = statement.where(LocalProfile.country_code == country.upper())
    if city:
        statement = statement.where(LocalProfile.city_slug == city)
    profiles = session.exec(statement).all()
    result = []
    for p in profiles:

        if not local_kyc_approved(
            session,
            p,
        ):
            continue

        services = session.exec(
            select(Service).where(Service.local_profile_id == p.id, Service.active == True)
        ).all()
        if category and not any(s.category.lower() == category.lower() for s in services):
            continue
        result.append({"profile": p, "services": services})
    return result


@app.get("/api/locals/{slug}")
def local_detail(slug: str, session: Annotated[Session, Depends(get_session)]):
    p = session.exec(select(LocalProfile).where(LocalProfile.slug == slug)).first()
    if (
        not p
        or not p.verified
        or not local_kyc_approved(
            session,
            p,
        )
    ):
        raise HTTPException(
            404,
            "Local not found",
        )
    services = session.exec(
        select(Service).where(Service.local_profile_id == p.id, Service.active == True)
    ).all()
    availability = session.exec(
        select(WeeklyAvailability).where(
            WeeklyAvailability.local_profile_id == p.id,
            WeeklyAvailability.enabled == True,
        )
    ).all()
    reviews = session.exec(
        select(Review).where(Review.local_profile_id == p.id).order_by(Review.created_at.desc()).limit(20)
    ).all()
    public_reviews = []
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for review in reviews:
        moderation = session.exec(select(ReviewModeration).where(ReviewModeration.review_id == review.id)).first()
        if moderation and moderation.status == "hidden":
            continue
        clamped = min(max(int(review.rating), 1), 5)
        distribution[clamped] += 1
        traveler = session.get(User, review.tourist_user_id)
        public_name = "Traveler"
        if traveler and traveler.full_name.strip():
            parts = traveler.full_name.strip().split()
            public_name = parts[0] + ((" " + parts[-1][0] + ".") if len(parts) > 1 else "")
        public_reviews.append({
            "id": review.id,
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "created_at": review.created_at,
            "traveler_name": public_name,
            "verified_booking": True,
        })
    completed_trips_count = len(
        session.exec(
            select(Booking).where(
                Booking.local_profile_id == p.id,
                Booking.status == "completed"
            )
        ).all()
    )
    return {
        "profile": p,
        "services": services,
        "availability": availability,
        "reviews": public_reviews,
        "rating_breakdown": distribution,
        "completed_trips_count": completed_trips_count,
    }


@app.get("/api/locals/{profile_id}/available-slots")
def public_available_slots(
    profile_id: int,
    booking_date: str,
    session: Annotated[Session, Depends(get_session)],
    service_id: int | None = None,
    hours: float = 2.0,
):
    local = session.get(LocalProfile, profile_id)
    if not local:
        raise HTTPException(404, "Local not found")
    service = session.get(Service, service_id) if service_id else None
    if service:
        if service.local_profile_id != local.id or not service.active:
            raise HTTPException(400, "Selected service is unavailable for this local")
        hours = service.duration_hours
    return available_slots_for_date(session, local.id, booking_date, hours)


@app.post("/api/bookings")
def create_booking(
    payload: BookingInput,
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    enforce_rate_limit(session, request, "booking_create", 20, 3600, str(user.id))
    if user.role not in ("tourist", "admin"):
        raise HTTPException(403, "Tourist account required")
    if not payload.accept_booking_terms:
        raise HTTPException(400, "Accept the booking, cancellation and refund policy before requesting a booking")
    if user.role == "tourist" and get_bool_setting(session, "require_email_verification") and not email_state(session, user, legacy_verified=True).verified:
        raise HTTPException(403, "Verify your email before creating a booking")
    if get_setting(session, "marketplace_mode") == "paused":
        raise HTTPException(503, "Bookings are temporarily paused by the marketplace administrator")
    local = session.get(LocalProfile, payload.local_profile_id)
    if not local:
        raise HTTPException(404, "Local not found")
    if (
        not local.verified
        or not local_kyc_approved(
            session,
            local,
        )
    ):
        raise HTTPException(
            403,
            "This Local must complete approved KYC before receiving bookings.",
        )
    service = session.get(Service, payload.service_id) if payload.service_id else None
    if service and (service.local_profile_id != local.id or not service.active):
        raise HTTPException(400, "Selected service is unavailable for this local")

    booking_hours = float(service.duration_hours if service else payload.hours)
    validate_booking_slot(session, local.id, payload.booking_date, payload.start_time, booking_hours)

    raw_subtotal = round((service.price if service else local.hourly_rate * booking_hours), 2)
    fin = calculate_booking_financials(session, raw_subtotal, getattr(payload, "promo_code", None), user.id)
    booking = Booking(
        tourist_user_id=user.id,
        local_profile_id=local.id,
        service_id=payload.service_id,
        booking_date=payload.booking_date,
        start_time=payload.start_time,
        guests=payload.guests,
        hours=booking_hours,
        message=payload.message.strip(),
        subtotal=fin["subtotal"],
        platform_fee=fin["platform_fee"],
        discount_amount=fin["discount_amount"],
        promo_code=fin["promo_code"],
    )
    session.add(booking)
    session.flush()

    if fin["promo_code_id"] and fin["discount_amount"] > 0:
        redemption = PromoRedemption(
            promo_code_id=fin["promo_code_id"],
            user_id=user.id,
            booking_id=booking.id,
            discount_amount=fin["discount_amount"],
        )
        session.add(redemption)
        promo_row = session.get(PromoCode, fin["promo_code_id"])
        if promo_row:
            promo_row.current_uses += 1
            session.add(promo_row)
        audit_event(session, user.id, "promo.redeemed", "booking", booking.id, f"Promo code {fin['promo_code']} applied for ${fin['discount_amount']:.2f} discount", request)

    session.commit()
    session.refresh(booking)

    detail = BookingDetail(
        booking_id=booking.id,
        meeting_point_name=payload.meeting_point_name.strip(),
        meeting_address=payload.meeting_address.strip(),
        meeting_instructions=payload.meeting_instructions.strip(),
        updated_by_user_id=user.id,
    )
    session.add(detail)
    log_booking_event(session, booking, user.id, "requested", "", "pending", "Traveler created the booking request")
    session.commit()
    record_consent(session, user.id, "booking_policy", settings.booking_policy_version, request, booking.id)
    if local.user_id:
        add_notification(session, local.user_id, "booking_request", f"New booking request #{booking.id}", f"{user.full_name} requested {booking.booking_date} at {booking.start_time}.", "/local-dashboard/bookings", email=True)
    audit_event(session, user.id, "booking.created", "booking", booking.id, f"Booking requested for local #{local.id}", request)
    session.refresh(booking)
    return booking


@app.get("/api/bookings/mine")
def my_bookings(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    if user.role == "local":
        p = session.exec(select(LocalProfile).where(LocalProfile.user_id == user.id)).first()
        return [] if not p else session.exec(
            select(Booking).where(Booking.local_profile_id == p.id).order_by(Booking.created_at.desc())
        ).all()
    return session.exec(
        select(Booking).where(Booking.tourist_user_id == user.id).order_by(Booking.created_at.desc())
    ).all()


# HIREALOCALS CONVERSATION ACTIONS V71

def conversation_preference(
    session: Session,
    booking_id: int,
    user_id: int,
    create: bool = False,
) -> ConversationPreference | None:

    rows = session.exec(
        select(ConversationPreference).where(
            ConversationPreference.booking_id == booking_id,
            ConversationPreference.user_id == user_id,
        )
    ).all()

    row = rows[0] if rows else None

    if not row and create:

        row = ConversationPreference(
            booking_id=booking_id,
            user_id=user_id,
        )

        session.add(row)
        session.commit()
        session.refresh(row)

    return row


def conversation_state_dict(
    row: ConversationPreference | None,
    booking_id: int,
) -> dict:

    return {
        "booking_id": booking_id,
        "archived": bool(row.archived) if row else False,
        "cleared_at": row.cleared_at if row else None,
        "deleted_at": row.deleted_at if row else None,
    }


@app.get("/api/messages/conversation-states")
def conversation_states(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):

    rows = session.exec(
        select(ConversationPreference).where(
            ConversationPreference.user_id == user.id
        )
    ).all()

    return [
        conversation_state_dict(
            row,
            row.booking_id,
        )
        for row in rows
    ]


@app.patch("/api/bookings/{booking_id}/conversation-state")
def update_conversation_state(
    booking_id: int,
    payload: dict,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):

    booking_for_user(
        booking_id,
        user,
        session,
    )

    action = str(
        payload.get("action") or ""
    ).strip().lower()

    allowed = {
        "archive",
        "unarchive",
        "clear",
        "delete",
        "restore",
    }

    if action not in allowed:
        raise HTTPException(
            400,
            "Invalid conversation action",
        )

    row = conversation_preference(
        session,
        booking_id,
        user.id,
        create=True,
    )

    now = datetime.now(timezone.utc)

    if action == "archive":

        row.archived = True

    elif action == "unarchive":

        row.archived = False

    elif action == "clear":

        row.cleared_at = now

    elif action == "delete":

        # Move to Trash FOR THIS USER ONLY.
        # Original shared messages remain intact.
        row.deleted_at = now
        row.archived = False

    elif action == "restore":

        # Old delete-for-me also set cleared_at.
        if (
            row.deleted_at is not None
            and row.cleared_at == row.deleted_at
        ):
            row.cleared_at = None

        row.deleted_at = None
        row.archived = False

    row.updated_at = now

    session.add(row)
    session.commit()
    session.refresh(row)

    return conversation_state_dict(
        row,
        booking_id,
    )


@app.get("/api/bookings/{booking_id}/messages")
def booking_messages(
    booking_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):

    booking_for_user(
        booking_id,
        user,
        session,
    )

    preference = conversation_preference(
        session,
        booking_id,
        user.id,
        create=False,
    )

    query = select(Message).where(
        Message.booking_id == booking_id
    )

    # Clear/Delete only hides historical messages
    # from THIS user's view.
    if (
        preference
        and preference.cleared_at
    ):

        query = query.where(
            Message.created_at >
            preference.cleared_at
        )

    rows = session.exec(
        query.order_by(
            Message.created_at.asc()
        )
    ).all()

    result = []

    for row in rows:

        sender = session.get(
            User,
            row.sender_user_id,
        )

        result.append(
            {
                "id": row.id,
                "booking_id": row.booking_id,
                "sender_user_id": row.sender_user_id,
                "sender_name": (
                    sender.full_name
                    if sender
                    else "User"
                ),
                "sender_role": (
                    sender.role
                    if sender
                    else "user"
                ),
                "body": row.body,
                "created_at": row.created_at,
                "mine": (
                    row.sender_user_id ==
                    user.id
                ),
            }
        )

    return result


@app.post("/api/bookings/{booking_id}/messages")
def send_booking_message(
    booking_id: int,
    payload: MessageInput,
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):

    enforce_rate_limit(
        session,
        request,
        "booking_message",
        60,
        300,
        str(user.id),
    )

    booking = booking_for_user(
        booking_id,
        user,
        session,
    )

    body = payload.body.strip()

    if not body:
        raise HTTPException(
            400,
            "Message cannot be empty",
        )

    item = Message(
        booking_id=booking_id,
        sender_user_id=user.id,
        body=body,
    )

    session.add(item)

    log_booking_event(
        session,
        booking,
        user.id,
        "message",
        booking.status,
        booking.status,
        "New booking message",
    )

    session.commit()
    session.refresh(item)

    # A fresh message brings archived/deleted copies
    # back to Inbox for both participants.
    #
    # cleared_at is intentionally preserved:
    # messages hidden by "Clear/Delete for me"
    # do NOT reappear.
    preferences = session.exec(
        select(ConversationPreference).where(
            ConversationPreference.booking_id ==
            booking_id
        )
    ).all()

    changed = False
    now = datetime.now(timezone.utc)

    for preference in preferences:

        if (
            preference.archived
            or preference.deleted_at
        ):

            preference.archived = False
            preference.deleted_at = None
            preference.updated_at = now

            session.add(preference)
            changed = True

    if changed:
        session.commit()

    notify_other_booking_party(
        session,
        booking,
        user.id,
        "booking_message",
        f"New message on booking #{booking.id}",
        f"{user.full_name}: {item.body[:180]}",
        email=True,
    )

    return {
        "ok": True,
        "id": item.id,
    }


@app.patch("/api/bookings/{booking_id}/messages/read")
def mark_booking_messages_read(
    booking_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    booking_for_user(booking_id, user, session)

    rows = session.exec(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.kind == "booking_message",
            Notification.title == f"New message on booking #{booking_id}",
            Notification.read_at == None,
        )
    ).all()

    if rows:
        now = datetime.now(timezone.utc)

        for row in rows:
            row.read_at = now
            session.add(row)

        session.commit()

    return {
        "ok": True,
        "booking_id": booking_id,
        "unread_count": 0,
    }

@app.post("/api/bookings/{booking_id}/report")
async def report_booking_conversation(
    booking_id: int,
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
    reason: str = Form(...),
    details: str = Form(...),
    screenshot: UploadFile | None = File(None),
):

    booking_for_user(
        booking_id,
        user,
        session,
    )

    enforce_rate_limit(
        session,
        request,
        "message_report",
        5,
        600,
        str(user.id),
    )

    reasons = {
        "safety_concern":
            "Safety concern",

        "harassment":
            "Harassment or threatening behavior",

        "spam":
            "Spam or scam",

        "inappropriate_content":
            "Inappropriate content",

        "payment_request":
            "Suspicious payment request",

        "other":
            "Other",
    }

    reason_key = (
        reason
        .strip()
        .lower()
    )

    if reason_key not in reasons:

        raise HTTPException(
            400,
            "Invalid report reason",
        )

    details_clean = details.strip()

    if len(details_clean) < 3:

        raise HTTPException(
            400,
            "Please describe the issue",
        )

    if len(details_clean) > 4000:

        raise HTTPException(
            400,
            "Report details are too long",
        )

    upload_id = None

    if (
        screenshot
        and screenshot.filename
    ):

        allowed_screenshots = {
            "image/jpeg",
            "image/png",
            "image/webp",
        }

        if screenshot.content_type not in allowed_screenshots:

            raise HTTPException(
                400,
                "Screenshot must be JPG, PNG or WebP",
            )

        upload = await _save_upload(
            screenshot,
            user,
            "message_report",
            session,
            False,
        )

        upload_id = upload.id

    recent = session.exec(
        select(Message)
        .where(
            Message.booking_id ==
            booking_id
        )
        .order_by(
            Message.created_at.desc()
        )
        .limit(12)
    ).all()

    recent = list(
        reversed(recent)
    )

    context_lines = []

    for row in recent:

        sender = session.get(
            User,
            row.sender_user_id,
        )

        sender_name = (
            sender.full_name
            if sender
            else f"User #{row.sender_user_id}"
        )

        body_preview = (
            row.body[:500]
            .replace("\r", " ")
            .replace("\n", " ")
        )

        context_lines.append(
            (
                f"{row.created_at.isoformat()} | "
                f"{sender_name}: "
                f"{body_preview}"
            )
        )

    context_text = (
        "\n".join(context_lines)
        if context_lines
        else "No messages captured."
    )

    screenshot_line = (
        f"Screenshot upload ID: {upload_id}"
        if upload_id
        else "Screenshot upload ID: none"
    )

    message_text = (
        "BOT TRIAGE STATUS: PENDING\n"
        f"Booking: #{booking_id}\n"
        f"Reporter user ID: {user.id}\n"
        f"Reporter role: {user.role}\n"
        f"Reason: {reasons[reason_key]}\n"
        f"{screenshot_line}\n\n"
        "Reporter details:\n"
        f"{details_clean}\n\n"
        "Recent conversation context:\n"
        f"{context_text}"
    )

    item = ContactMessage(
        name=user.full_name,
        email=user.email,
        subject=(
            f"[MESSAGE REPORT] Booking "
            f"#{booking_id} ? "
            f"{reasons[reason_key]}"
        ),
        message=message_text,
    )

    session.add(item)
    session.commit()
    session.refresh(item)

    support_state = SupportState(
        contact_message_id=item.id,
        status="open",
        admin_note=(
            "[BOT TRIAGE PENDING] "
            f"Conversation report "
            f"for booking #{booking_id}"
        ),
    )

    session.add(support_state)
    session.commit()

    notify_admins(
        session,
        "message_report",
        "New conversation report",
        (
            f"{user.full_name} reported "
            f"booking #{booking_id}: "
            f"{reasons[reason_key]}"
        ),
        f"/admin/support?id={item.id}",
    )

    queue_email(
        session,
        user.email,
        "We received your HireALocals report",
        (
            f"Hello {user.full_name},\n\n"
            "Your conversation report has been received.\n"
            f"Reference: HAL-SUPPORT-{item.id}\n\n"
            "Our Trust & Safety workflow will review "
            "the report and escalate it to human "
            "support when needed."
        ),
    )

    return {
        "ok": True,
        "reference":
            f"HAL-SUPPORT-{item.id}",
        "support_id": item.id,
        "screenshot_upload_id":
            upload_id,
        "triage_status": "pending",
    }


@app.get("/api/bookings/{booking_id}/timeline")
def get_booking_timeline(
    booking_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    booking_for_user(booking_id, user, session)
    return booking_timeline(session, booking_id)


@app.patch("/api/bookings/{booking_id}/meeting-point")
def update_booking_meeting_point(
    booking_id: int,
    payload: MeetingPointInput,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    booking = booking_for_user(booking_id, user, session)
    if booking.status in {"completed", "cancelled", "rejected"}:
        raise HTTPException(409, "Meeting point cannot be changed for a closed booking")
    if user.role == "tourist" and booking.status != "pending":
        raise HTTPException(409, "Traveler can edit the meeting point only while the request is pending")
    detail = booking_detail_row(session, booking.id)
    if not detail:
        detail = BookingDetail(booking_id=booking.id)
    detail.meeting_point_name = payload.meeting_point_name.strip()
    detail.meeting_address = payload.meeting_address.strip()
    detail.meeting_instructions = payload.meeting_instructions.strip()
    detail.latitude = payload.latitude
    detail.longitude = payload.longitude
    detail.updated_by_user_id = user.id
    detail.updated_at = datetime.now(timezone.utc)
    session.add(detail)
    log_booking_event(session, booking, user.id, "meeting_point_updated", booking.status, booking.status, detail.meeting_point_name or "Meeting point updated")
    session.commit(); session.refresh(detail)
    notify_other_booking_party(session, booking, user.id, "meeting_point", f"Meeting point updated for booking #{booking.id}", detail.meeting_point_name or detail.meeting_address or "Meeting details were updated.", email=True)
    return meeting_point_dict(session, booking.id)


@app.get("/api/account/consents")
def account_consents(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    rows = session.exec(
        select(UserConsent).where(UserConsent.user_id == user.id).order_by(UserConsent.accepted_at.desc())
    ).all()
    return [
        {
            "id": row.id,
            "kind": row.kind,
            "version": row.version,
            "booking_id": row.booking_id,
            "accepted_at": row.accepted_at,
        }
        for row in rows
    ]


# ------------------------- Local workspace -------------------------


@app.get("/api/local/profile")
def local_profile(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    services = session.exec(
        select(Service).where(Service.local_profile_id == profile.id).order_by(Service.id.desc())
    ).all()
    return {"profile": profile, "services": services, "email": user.email}


@app.patch("/api/local/profile")
def update_local_profile(
    payload: LocalProfileUpdate,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
    request: Request,
):
    profile = require_local_profile(user, session)
    data = payload.model_dump(exclude_unset=True)

    if "image_url" in data:
        raise HTTPException(
            400,
            "Profile photo URL cannot be set manually. Upload a profile photo instead.",
        )

    old_country = (profile.country_code or "").upper()
    country_changed = False

    if "country_code" in data:
        new_country = (data["country_code"] or "").strip().upper()
        data["country_code"] = new_country
        if profile.verified and new_country and new_country != old_country:
            country_changed = True

    for key, value in data.items():
        setattr(profile, key, value)
    session.add(profile)

    if country_changed:
        audit_event(
            session=session,
            actor_user_id=user.id,
            action="local.profile_country_changed",
            entity_type="local_profile",
            entity_id=profile.id,
            summary=f"Verified Local changed country from {old_country} to {profile.country_code}",
            request=request,
        )

    session.commit()
    session.refresh(profile)
    return profile


def active_service_category(session: Session, name: str) -> str:
    row = session.exec(select(ServiceCategory).where(ServiceCategory.name == name.strip(), ServiceCategory.active == True)).first()
    if not row:
        raise HTTPException(400, "Choose an active service category")
    return row.name


@app.get("/api/local/services")
def local_services(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    return session.exec(
        select(Service).where(Service.local_profile_id == profile.id).order_by(Service.id.desc())
    ).all()


@app.post("/api/local/services")
def add_local_service(
    payload: ServiceInput,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    data = payload.model_dump()
    data["category"] = active_service_category(session, payload.category)
    item = Service(local_profile_id=profile.id, **data)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@app.patch("/api/local/services/{service_id}")
def update_local_service(
    service_id: int,
    payload: ServiceUpdate,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    item = session.get(Service, service_id)
    if not item or item.local_profile_id != profile.id:
        raise HTTPException(404, "Service not found")
    updates = payload.model_dump(exclude_unset=True)
    if "category" in updates:
        updates["category"] = active_service_category(session, str(updates["category"]))
    for key, value in updates.items():
        setattr(item, key, value)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@app.delete("/api/local/services/{service_id}")
def archive_local_service(
    service_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    item = session.get(Service, service_id)
    if not item or item.local_profile_id != profile.id:
        raise HTTPException(404, "Service not found")
    item.active = False
    session.add(item)
    session.commit()
    return {"ok": True, "id": item.id, "active": False}


@app.get("/api/local/bookings")
def local_bookings(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    bookings = session.exec(
        select(Booking).where(Booking.local_profile_id == profile.id).order_by(Booking.created_at.desc())
    ).all()
    result = []
    for b in bookings:
        tourist = session.get(User, b.tourist_user_id)
        service = session.get(Service, b.service_id) if b.service_id else None
        message_count = len(session.exec(select(Message).where(Message.booking_id == b.id)).all())

        # HIREALOCALS TRUE MESSAGE UNREAD V2
        unread_count = len(
            session.exec(
                select(Notification).where(
                    Notification.user_id == user.id,
                    Notification.kind == "booking_message",
                    Notification.title == f"New message on booking #{b.id}",
                    Notification.read_at == None,
                )
            ).all()
        )
        result.append(
            {
                "id": b.id, "booking_date": b.booking_date, "start_time": b.start_time,
                "end_time": booking_end_time(b), "guests": b.guests, "hours": b.hours,
                "message": b.message, "subtotal": b.subtotal, "platform_fee": b.platform_fee,
                "status": b.status, "created_at": b.created_at,
                "tourist_name": tourist.full_name if tourist else "Traveler",
                "tourist_email": tourist.email if tourist else "",
                "service_title": service.title if service else "General local booking",
                "message_count": message_count, "unread_count": unread_count, "meeting_point": meeting_point_dict(session, b.id),
                "timeline": booking_timeline(session, b.id), "payment": payment_summary(session, b.id),
            }
        )
    return result


@app.get("/api/local/reviews")
def get_local_reviews(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    reviews = session.exec(
        select(Review).where(Review.local_profile_id == profile.id).order_by(Review.created_at.desc())
    ).all()

    items = []
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in reviews:
        moderation = session.exec(select(ReviewModeration).where(ReviewModeration.review_id == r.id)).first()
        mod_status = moderation.status if moderation else "visible"
        if mod_status != "hidden":
            clamped = min(max(int(r.rating), 1), 5)
            distribution[clamped] += 1
        tourist = session.get(User, r.tourist_user_id)
        booking = session.get(Booking, r.booking_id)
        service = session.get(Service, booking.service_id) if booking and booking.service_id else None
        reports_count = len(session.exec(select(ReviewReport).where(ReviewReport.review_id == r.id)).all())
        items.append({
            "id": r.id,
            "booking_id": r.booking_id,
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "created_at": r.created_at,
            "tourist_name": tourist.full_name if tourist else "Traveler",
            "service_title": service.title if service else "General local experience",
            "booking_date": booking.booking_date if booking else "",
            "moderation_status": mod_status,
            "reports_count": reports_count,
            "verified_booking": True,
        })

    completed_count = len(session.exec(select(Booking).where(Booking.local_profile_id == profile.id, Booking.status == "completed")).all())
    visible_count = sum(distribution.values())
    five_star_pct = round((distribution[5] / visible_count * 100)) if visible_count > 0 else 0

    return {
        "rating": profile.rating,
        "review_count": profile.review_count,
        "distribution": distribution,
        "completed_count": completed_count,
        "five_star_percentage": five_star_pct,
        "reviews": items,
    }


def process_qualifying_referral_reward(session: Session, booking: Booking) -> None:
    """Awards referral credit strictly when referee's first booking is completed and paid."""
    if settings.payment_required and not payment_is_paid(session, booking.id):
        return

    attribution = session.exec(
        select(ReferralAttribution).where(
            ReferralAttribution.referee_user_id == booking.tourist_user_id,
            ReferralAttribution.status == "pending",
        )
    ).first()

    if not attribution:
        return

    # Check if referee already had a previous completed booking
    prev_completed = session.exec(
        select(Booking).where(
            Booking.tourist_user_id == booking.tourist_user_id,
            Booking.id != booking.id,
            Booking.status == "completed",
        )
    ).all()
    if prev_completed:
        return

    attribution.status = "qualified"
    attribution.qualifying_booking_id = booking.id
    attribution.qualified_at = datetime.now(timezone.utc)
    session.add(attribution)

    ref_code = session.get(ReferralCode, attribution.referral_code_id)
    if ref_code:
        ref_code.total_referred_count += 1
        ref_code.total_credits_earned = round(ref_code.total_credits_earned + attribution.reward_amount, 2)
        session.add(ref_code)

    session.commit()

    audit_event(
        session,
        attribution.referrer_user_id,
        "referral.reward_unlocked",
        "referral_attribution",
        attribution.id,
        f"Referral reward of ${attribution.reward_amount:.2f} unlocked via referee booking #{booking.id}",
    )
    add_notification(
        session,
        attribution.referrer_user_id,
        "referral_reward",
        "Referral Reward Unlocked! 🎉",
        f"Your friend completed their first experience! You've earned ${attribution.reward_amount:.2f} in travel credits.",
        "/dashboard/referrals",
        email=True,
    )


@app.patch("/api/local/bookings/{booking_id}")
def local_booking_status(
    booking_id: int,
    payload: StatusUpdate,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    booking = session.get(Booking, booking_id)
    if not booking or booking.local_profile_id != profile.id:
        raise HTTPException(404, "Booking not found")
    transitions = {
        "pending": {"confirmed", "rejected"},
        "confirmed": {"completed", "cancelled"},
    }
    allowed = transitions.get(booking.status, set())
    if payload.status not in allowed:
        raise HTTPException(409, f"Cannot change booking from {booking.status} to {payload.status}")
    if payload.status == "confirmed":
        validate_booking_slot(session, booking.local_profile_id, booking.booking_date, booking.start_time, booking.hours, exclude_booking_id=booking.id)
    if payload.status == "completed":
        ensure_booking_paid_for_completion(session, booking)
    if payload.status == "cancelled" and settings.payment_required and payment_is_paid(session, booking.id):
        raise HTTPException(409, "This booking is paid. Ask support/admin to refund it so payment and cancellation stay synchronized.")
    old_status = booking.status
    booking.status = payload.status
    session.add(booking)
    log_booking_event(session, booking, user.id, "status_changed", old_status, payload.status, f"Local changed booking to {payload.status}")
    session.commit()
    session.refresh(booking)
    if payload.status == "completed":
        process_qualifying_referral_reward(session, booking)
    add_notification(session, booking.tourist_user_id, "booking_status", f"Booking #{booking.id} is {booking.status}", f"Your booking for {booking.booking_date} at {booking.start_time} was marked {booking.status}.", f"/dashboard/bookings/{booking.id}", email=True)
    session.refresh(booking)
    return booking


@app.get("/api/local/availability")
def get_local_availability(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    rows = session.exec(
        select(WeeklyAvailability)
        .where(WeeklyAvailability.local_profile_id == profile.id)
        .order_by(WeeklyAvailability.weekday.asc())
    ).all()
    by_day = {r.weekday: r for r in rows}
    return [
        {
            "weekday": day,
            "enabled": by_day[day].enabled if day in by_day else day < 5,
            "start_time": by_day[day].start_time if day in by_day else "09:00",
            "end_time": by_day[day].end_time if day in by_day else "17:00",
        }
        for day in range(7)
    ]


@app.put("/api/local/availability")
def save_local_availability(
    payload: AvailabilityUpdate,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    future_reserved = session.exec(select(Booking).where(
        Booking.local_profile_id == profile.id,
        Booking.status.in_(list(RESERVED_BOOKING_STATUSES)),
    )).all()
    for day in payload.days:
        if day.enabled and as_minutes(day.end_time) <= as_minutes(day.start_time):
            raise HTTPException(400, f"Start time must be before end time for weekday {day.weekday}")
        affected = []
        for existing in future_reserved:
            try:
                d = date.fromisoformat(existing.booking_date)
            except ValueError:
                continue
            if d >= date.today() and d.weekday() == day.weekday:
                affected.append(existing)
        if affected and not day.enabled:
            raise HTTPException(409, f"Cannot mark this weekday unavailable while booking #{affected[0].id} is reserved")
        if affected and day.enabled:
            win_start, win_end = as_minutes(day.start_time), as_minutes(day.end_time)
            for existing in affected:
                start = as_minutes(existing.start_time); end = start + duration_minutes(existing.hours)
                if start < win_start or end > win_end:
                    raise HTTPException(409, f"New hours would exclude reserved booking #{existing.id} on {existing.booking_date}")
        row = session.exec(
            select(WeeklyAvailability).where(
                WeeklyAvailability.local_profile_id == profile.id,
                WeeklyAvailability.weekday == day.weekday,
            )
        ).first()
        if not row:
            row = WeeklyAvailability(local_profile_id=profile.id, weekday=day.weekday)
        row.enabled = day.enabled
        row.start_time = day.start_time
        row.end_time = day.end_time
        row.updated_at = datetime.now(timezone.utc)
        session.add(row)
    session.commit()
    return {"ok": True}


@app.get("/api/local/availability-overrides")
def local_availability_overrides(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    return session.exec(
        select(AvailabilityOverride).where(AvailabilityOverride.local_profile_id == profile.id).order_by(AvailabilityOverride.booking_date.asc())
    ).all()


@app.put("/api/local/availability-overrides")
def save_local_availability_override(
    payload: AvailabilityOverrideInput,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    booking_day = parse_iso_date(payload.booking_date)
    if booking_day < date.today():
        raise HTTPException(400, "Availability override cannot be set in the past")
    if payload.enabled and as_minutes(payload.end_time) <= as_minutes(payload.start_time):
        raise HTTPException(400, "Start time must be before end time")
    reserved = session.exec(select(Booking).where(
        Booking.local_profile_id == profile.id,
        Booking.booking_date == payload.booking_date,
        Booking.status.in_(list(RESERVED_BOOKING_STATUSES)),
    )).all()
    if reserved and not payload.enabled:
        raise HTTPException(409, f"Cannot block this date while booking #{reserved[0].id} is reserved")
    if reserved and payload.enabled:
        win_start, win_end = as_minutes(payload.start_time), as_minutes(payload.end_time)
        for existing in reserved:
            start = as_minutes(existing.start_time); end = start + duration_minutes(existing.hours)
            if start < win_start or end > win_end:
                raise HTTPException(409, f"Custom hours would exclude reserved booking #{existing.id}")
    row = session.exec(select(AvailabilityOverride).where(
        AvailabilityOverride.local_profile_id == profile.id,
        AvailabilityOverride.booking_date == payload.booking_date,
    )).first()
    if not row:
        row = AvailabilityOverride(local_profile_id=profile.id, booking_date=payload.booking_date)
    row.enabled = payload.enabled
    row.start_time = payload.start_time
    row.end_time = payload.end_time
    row.note = payload.note.strip()
    row.updated_at = datetime.now(timezone.utc)
    session.add(row); session.commit(); session.refresh(row)
    return row


@app.delete("/api/local/availability-overrides/{override_id}")
def delete_local_availability_override(
    override_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    row = session.get(AvailabilityOverride, override_id)
    if not row or row.local_profile_id != profile.id:
        raise HTTPException(404, "Availability override not found")
    session.delete(row); session.commit()
    return {"ok": True}


@app.get("/api/local/earnings")
def local_earnings(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    bookings = session.exec(select(Booking).where(Booking.local_profile_id == profile.id)).all()
    completed = [b for b in bookings if b.status == "completed"]
    confirmed = [b for b in bookings if b.status == "confirmed"]
    pending = [b for b in bookings if b.status == "pending"]
    paid_bookings = [b for b in bookings if payment_is_paid(session, b.id)]
    return {
        "completed_earnings": round(sum(b.subtotal for b in completed), 2),
        "confirmed_value": round(sum(b.subtotal for b in confirmed), 2),
        "pending_value": round(sum(b.subtotal for b in pending), 2),
        "completed_count": len(completed),
        "confirmed_count": len(confirmed),
        "pending_count": len(pending),
        "platform_fees_paid_by_travelers": round(sum(b.platform_fee for b in completed + confirmed), 2),
        "paid_value": round(sum(b.subtotal for b in paid_bookings), 2),
        # Kept temporarily for frontend backward compatibility.
        "paid_booking_value": round(sum(b.subtotal for b in paid_bookings), 2),
        "payment_mode": settings.payment_mode,
        "payment_currency": settings.payment_currency.upper(),
    }



# ------------------------- Traveler workspace -------------------------


def require_traveler(user: User) -> None:
    if user.role != "tourist":
        raise HTTPException(403, "Traveler account required")


def get_or_create_traveler_profile(user: User, session: Session) -> TravelerProfile:
    profile = session.exec(select(TravelerProfile).where(TravelerProfile.user_id == user.id)).first()
    if not profile:
        profile = TravelerProfile(user_id=user.id)
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return profile


def get_or_create_referral_code(session: Session, user: User) -> ReferralCode:
    ref = session.exec(select(ReferralCode).where(ReferralCode.user_id == user.id)).first()
    if not ref:
        base_name = re.sub(r"[^A-Z0-9]+", "", (user.full_name or "TRAVEL").upper())[:6] or "TRAVEL"
        suffix = secrets.token_hex(2).upper()
        code = f"REF-{base_name}-{suffix}"
        while session.exec(select(ReferralCode).where(ReferralCode.code == code)).first():
            suffix = secrets.token_hex(2).upper()
            code = f"REF-{base_name}-{suffix}"
        ref = ReferralCode(
            user_id=user.id,
            code=code,
            reward_credit=15.0,
            referee_discount=10.0,
        )
        session.add(ref)
        session.commit()
        session.refresh(ref)
    return ref


def traveler_booking_row(booking: Booking, session: Session) -> dict:
    local = session.get(LocalProfile, booking.local_profile_id)
    service = session.get(Service, booking.service_id) if booking.service_id else None
    messages = session.exec(select(Message).where(Message.booking_id == booking.id)).all()

    unread_count = len(
        session.exec(
            select(Notification).where(
                Notification.user_id == booking.tourist_user_id,
                Notification.kind == "booking_message",
                Notification.title == f"New message on booking #{booking.id}",
                Notification.read_at == None,
            )
        ).all()
    )
    review = session.exec(select(Review).where(Review.booking_id == booking.id)).first()
    disc = getattr(booking, "discount_amount", 0.0) or 0.0
    promo = getattr(booking, "promo_code", "") or ""
    return {
        "id": booking.id, "booking_date": booking.booking_date, "start_time": booking.start_time,
        "end_time": booking_end_time(booking), "guests": booking.guests, "hours": booking.hours,
        "message": booking.message, "subtotal": booking.subtotal, "platform_fee": booking.platform_fee,
        "discount_amount": disc, "promo_code": promo,
        "total": round(booking.subtotal + booking.platform_fee - disc, 2), "status": booking.status,
        "created_at": booking.created_at, "local_profile_id": booking.local_profile_id,
        "local_name": local.display_name if local else "Unknown local", "local_slug": local.slug if local else "",
        "local_headline": local.headline if local else "", "local_city": local.city_name if local else "",
        "local_image": local.image_url if local else "", "local_rating": local.rating if local else 0,
        "service_id": booking.service_id, "service_title": service.title if service else "Flexible local time",
        "service_category": service.category if service else "Local help", "message_count": len(messages), "unread_count": unread_count,
        "meeting_point": meeting_point_dict(session, booking.id), "timeline": booking_timeline(session, booking.id),
        "payment": payment_summary(session, booking.id),
        "review": None if not review else {
            "id": review.id, "rating": review.rating, "title": review.title,
            "comment": review.comment, "created_at": review.created_at,
        },
    }


@app.get("/api/traveler/referrals")
def traveler_referrals(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    ref_code = get_or_create_referral_code(session, user)
    attributions = session.exec(
        select(ReferralAttribution)
        .where(ReferralAttribution.referrer_user_id == user.id)
        .order_by(ReferralAttribution.created_at.desc())
    ).all()

    att_list = []
    for att in attributions:
        referee = session.get(User, att.referee_user_id)
        att_list.append({
            "id": att.id,
            "referee_name": referee.full_name if referee else "Invited Traveler",
            "status": att.status,
            "reward_amount": att.reward_amount,
            "created_at": att.created_at,
            "qualified_at": att.qualified_at,
        })

    return {
        "code": ref_code.code,
        "reward_credit": ref_code.reward_credit,
        "referee_discount": ref_code.referee_discount,
        "total_referred_count": ref_code.total_referred_count,
        "total_credits_earned": ref_code.total_credits_earned,
        "invite_url": f"{settings.frontend_url.rstrip('/')}/register?ref={ref_code.code}",
        "attributions": att_list,
    }


@app.post("/api/referrals/claim")
def claim_referral_code(
    payload: ReferralClaimInput,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
    request: Request,
):
    norm_code = payload.code.strip().upper()
    ref_code = session.exec(select(ReferralCode).where(ReferralCode.code == norm_code)).first()
    if not ref_code:
        raise HTTPException(404, "Invalid referral code")

    if ref_code.user_id == user.id:
        raise HTTPException(400, "Self-referrals are not permitted")

    existing_att = session.exec(
        select(ReferralAttribution).where(ReferralAttribution.referee_user_id == user.id)
    ).first()
    if existing_att:
        raise HTTPException(409, "You have already claimed a referral code")

    attribution = ReferralAttribution(
        referrer_user_id=ref_code.user_id,
        referee_user_id=user.id,
        referral_code_id=ref_code.id,
        status="pending",
        reward_amount=ref_code.reward_credit,
    )
    session.add(attribution)
    session.commit()
    session.refresh(attribution)
    audit_event(session, user.id, "referral.claimed", "referral_attribution", attribution.id, f"Claimed referral code {ref_code.code} from user #{ref_code.user_id}", request)
    return {
        "ok": True,
        "code": ref_code.code,
        "referee_discount": ref_code.referee_discount,
        "message": f"Referral code {ref_code.code} applied! Enjoy ${ref_code.referee_discount:.2f} off your first booking.",
    }


@app.get("/api/traveler/overview")
def traveler_overview(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    profile = get_or_create_traveler_profile(user, session)
    bookings = session.exec(
        select(Booking).where(Booking.tourist_user_id == user.id).order_by(Booking.created_at.desc())
    ).all()
    favorites = session.exec(select(Favorite).where(Favorite.tourist_user_id == user.id)).all()
    reviews = session.exec(select(Review).where(Review.tourist_user_id == user.id)).all()
    enriched = [traveler_booking_row(b, session) for b in bookings[:4]]
    return {
        "user": {"id": user.id, "full_name": user.full_name, "email": user.email},
        "profile": profile,
        "counts": {
            "open": len([b for b in bookings if b.status in {"pending", "confirmed"}]),
            "completed": len([b for b in bookings if b.status == "completed"]),
            "saved": len(favorites),
            "reviews": len(reviews),
        },
        "recent_bookings": enriched,
    }


@app.get("/api/traveler/bookings")
def traveler_bookings(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    bookings = session.exec(
        select(Booking).where(Booking.tourist_user_id == user.id).order_by(Booking.created_at.desc())
    ).all()
    return [traveler_booking_row(b, session) for b in bookings]


@app.get("/api/traveler/bookings/{booking_id}")
def traveler_booking_detail(
    booking_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    booking = session.get(Booking, booking_id)
    if not booking or booking.tourist_user_id != user.id:
        raise HTTPException(404, "Booking not found")
    return traveler_booking_row(booking, session)


@app.patch("/api/traveler/bookings/{booking_id}/cancel")
def traveler_cancel_booking(
    booking_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    booking = session.get(Booking, booking_id)
    if not booking or booking.tourist_user_id != user.id:
        raise HTTPException(404, "Booking not found")
    if booking.status not in {"pending", "confirmed"}:
        raise HTTPException(409, "Only pending or confirmed bookings can be cancelled")
    if settings.payment_required and payment_is_paid(session, booking.id):
        raise HTTPException(409, "This booking is already paid. Contact support so the cancellation and Safepay refund can be handled together.")
    old_status = booking.status
    booking.status = "cancelled"
    session.add(booking)
    log_booking_event(session, booking, user.id, "status_changed", old_status, "cancelled", "Traveler cancelled the booking")
    session.commit()
    session.refresh(booking)
    local = session.get(LocalProfile, booking.local_profile_id)
    if local:
        add_notification(session, local.user_id, "booking_cancelled", f"Booking #{booking.id} cancelled", f"{user.full_name} cancelled the booking for {booking.booking_date} at {booking.start_time}.", "/local-dashboard/bookings", email=True)
    return {"ok": True, "status": booking.status}


@app.get("/api/traveler/conversations")
def traveler_conversations(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    bookings = session.exec(
        select(Booking).where(Booking.tourist_user_id == user.id).order_by(Booking.created_at.desc())
    ).all()
    result = []
    for booking in bookings:
        row = traveler_booking_row(booking, session)
        result.append({
            "id": row["id"],
            "booking_date": row["booking_date"],
            "status": row["status"],
            "local_name": row["local_name"],
            "local_slug": row["local_slug"],
            "local_image": row["local_image"],
            "service_title": row["service_title"],
            "message_count": row["message_count"],
        })
    return result


@app.get("/api/traveler/saved-ids")
def traveler_saved_ids(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    rows = session.exec(select(Favorite).where(Favorite.tourist_user_id == user.id)).all()
    return [row.local_profile_id for row in rows]


@app.get("/api/traveler/saved")
def traveler_saved_locals(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    rows = session.exec(
        select(Favorite).where(Favorite.tourist_user_id == user.id).order_by(Favorite.created_at.desc())
    ).all()
    result = []
    for favorite in rows:
        local = session.get(LocalProfile, favorite.local_profile_id)
        if not local:
            continue
        services = session.exec(
            select(Service).where(Service.local_profile_id == local.id, Service.active == True)
        ).all()
        result.append({"favorite_id": favorite.id, "saved_at": favorite.created_at, "profile": local, "services": services})
    return result


@app.post("/api/traveler/saved/{local_profile_id}")
def traveler_save_local(
    local_profile_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    if not session.get(LocalProfile, local_profile_id):
        raise HTTPException(404, "Local not found")
    existing = session.exec(
        select(Favorite).where(
            Favorite.tourist_user_id == user.id,
            Favorite.local_profile_id == local_profile_id,
        )
    ).first()
    if existing:
        return {"ok": True, "saved": True, "id": existing.id}
    item = Favorite(tourist_user_id=user.id, local_profile_id=local_profile_id)
    session.add(item)
    session.commit()
    session.refresh(item)
    return {"ok": True, "saved": True, "id": item.id}


@app.delete("/api/traveler/saved/{local_profile_id}")
def traveler_unsave_local(
    local_profile_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    row = session.exec(
        select(Favorite).where(
            Favorite.tourist_user_id == user.id,
            Favorite.local_profile_id == local_profile_id,
        )
    ).first()
    if row:
        session.delete(row)
        session.commit()
    return {"ok": True, "saved": False}


@app.get("/api/traveler/reviews")
def traveler_reviews(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    reviews = session.exec(
        select(Review).where(Review.tourist_user_id == user.id).order_by(Review.created_at.desc())
    ).all()
    result = []
    for review in reviews:
        local = session.get(LocalProfile, review.local_profile_id)
        result.append({
            "id": review.id,
            "booking_id": review.booking_id,
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "created_at": review.created_at,
            "local_name": local.display_name if local else "Unknown local",
            "local_slug": local.slug if local else "",
            "local_image": local.image_url if local else "",
        })
    return result


def recalculate_local_rating(session: Session, local_profile_id: int) -> dict:
    """
    Centralized single source of truth for local ratings, review counts,
    and 1-5 star distribution histograms.
    Excludes any review where ReviewModeration.status == 'hidden'.
    Updates and commits LocalProfile.rating and LocalProfile.review_count.
    """
    reviews = session.exec(
        select(Review).where(Review.local_profile_id == local_profile_id)
    ).all()

    visible_reviews = []
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    for r in reviews:
        mod = session.exec(
            select(ReviewModeration).where(ReviewModeration.review_id == r.id)
        ).first()
        if mod and mod.status == "hidden":
            continue
        visible_reviews.append(r)
        clamped = min(max(int(r.rating), 1), 5)
        distribution[clamped] += 1

    total_count = len(visible_reviews)
    avg_rating = round(sum(r.rating for r in visible_reviews) / total_count, 2) if total_count > 0 else 0.0

    local = session.get(LocalProfile, local_profile_id)
    if local:
        local.rating = avg_rating
        local.review_count = total_count
        session.add(local)
        session.commit()
        session.refresh(local)

    return {
        "rating": avg_rating,
        "review_count": total_count,
        "distribution": distribution,
    }


@app.post("/api/traveler/reviews")
def traveler_create_review(
    payload: ReviewInput,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    booking = session.get(Booking, payload.booking_id)
    if not booking or booking.tourist_user_id != user.id:
        raise HTTPException(404, "Booking not found")
    if booking.status != "completed":
        raise HTTPException(400, "A review can be submitted after the booking is completed")
    existing = session.exec(select(Review).where(Review.booking_id == booking.id)).first()
    if existing:
        raise HTTPException(409, "You already reviewed this booking")
    local = session.get(LocalProfile, booking.local_profile_id)
    if not local:
        raise HTTPException(404, "Local profile not found")
    review = Review(
        booking_id=booking.id,
        tourist_user_id=user.id,
        local_profile_id=local.id,
        rating=payload.rating,
        title=payload.title.strip(),
        comment=payload.comment.strip(),
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    stats = recalculate_local_rating(session, local.id)
    add_notification(session, local.user_id, "new_review", f"New {review.rating}-star review", f"{user.full_name} reviewed booking #{booking.id}.", f"/locals/{local.slug}", email=True)
    return {
        "ok": True,
        "id": review.id,
        "local_rating": stats["rating"],
        "local_review_count": stats["review_count"],
        "distribution": stats["distribution"],
    }


@app.post("/api/reviews/{review_id}/report")
def report_review(
    review_id: int,
    payload: ReviewReportInput,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    allowed_reasons = {"spam", "harassment", "fraud", "privacy", "other"}
    if payload.reason.lower() not in allowed_reasons:
        raise HTTPException(400, "Invalid report reason")
    existing = session.exec(
        select(ReviewReport).where(
            ReviewReport.review_id == review_id,
            ReviewReport.reporter_user_id == user.id,
        )
    ).first()
    if existing:
        raise HTTPException(409, "You have already reported this review")
    report = ReviewReport(
        review_id=review_id,
        reporter_user_id=user.id,
        reason=payload.reason.lower().strip(),
        details=payload.details.strip() if payload.details else "",
        status="pending",
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    notify_admins(session, "review_reported", f"Review #{review_id} reported", f"Report reason: {report.reason}. Details: {report.details}", "/admin/reviews")
    audit_event(session, user.id, "review.reported", "review", review_id, f"Reported by user #{user.id} for {report.reason}")
    return {"ok": True, "report_id": report.id, "status": "pending"}


@app.get("/api/traveler/profile")
def traveler_profile(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    profile = get_or_create_traveler_profile(user, session)
    return {
        "full_name": user.full_name,
        "email": user.email,
        "phone": profile.phone,
        "country": profile.country,
        "home_city": profile.home_city,
        "bio": profile.bio,
        "image_url": profile.image_url,
        "updated_at": profile.updated_at,
    }


@app.patch("/api/traveler/profile")
def traveler_update_profile(
    payload: TravelerProfileUpdate,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_traveler(user)
    profile = get_or_create_traveler_profile(user, session)
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"] is not None:
        user.full_name = data.pop("full_name").strip()
        session.add(user)
    else:
        data.pop("full_name", None)
    for key, value in data.items():
        if value is not None:
            setattr(profile, key, value.strip() if isinstance(value, str) else value)
    profile.updated_at = datetime.now(timezone.utc)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return {"ok": True, "full_name": user.full_name, "profile": profile}


# ------------------------- Provider applications -------------------------


@app.post("/api/provider-applications")
def provider_application(
    payload: ProviderApplicationInput,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
):
    enforce_rate_limit(session, request, "provider_application", 5, 3600, payload.email)
    application = ProviderApplication(**payload.model_dump())
    session.add(application)
    session.commit()
    session.refresh(application)
    notify_admins(session, "provider_application", "New provider application", f"{application.name} applied from {application.city}.", "/admin/locals")
    return {"ok": True, "id": application.id, "status": application.status}


class AdminBadgeClearRequest(SQLModel):
    category: str = "all"


@app.get("/api/admin/activity-badges")
def admin_activity_badges(
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    unread_notes = session.exec(
        select(Notification).where(
            Notification.user_id == admin.id,
            Notification.read_at == None,
        )
    ).all()

    locals_count = sum(
        1 for n in unread_notes
        if n.kind in {"provider_application", "kyc_submitted", "verification_document"}
        or "/admin/locals" in (n.link or "")
    )
    requests_count = sum(
        1 for n in unread_notes
        if n.kind in {"custom_request", "request_submitted", "trip_request"}
        or "/admin/requests" in (n.link or "")
    )
    reviews_count = sum(
        1 for n in unread_notes
        if n.kind in {"review_reported", "review_flagged", "new_review"}
        or "/admin/reviews" in (n.link or "")
    )
    support_count = sum(
        1 for n in unread_notes
        if n.kind in {"support_message"}
        or "/admin/support" in (n.link or "")
    )
    total_unread = len(unread_notes)

    return {
        "total": total_unread,
        "locals": locals_count,
        "requests": requests_count,
        "reviews": reviews_count,
        "support": support_count,
        "notifications": total_unread,
    }


@app.post("/api/admin/activity-badges/clear")
def admin_activity_badges_clear(
    payload: AdminBadgeClearRequest,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    unread_notes = session.exec(
        select(Notification).where(
            Notification.user_id == admin.id,
            Notification.read_at == None,
        )
    ).all()

    now = datetime.now(timezone.utc)
    cat = payload.category.lower().strip()

    updated = 0
    for n in unread_notes:
        match = False
        if cat in {"all", "notifications"}:
            match = True
        elif cat in {"locals", "provider-applications", "kyc"} and (
            n.kind in {"provider_application", "kyc_submitted", "verification_document"}
            or "/admin/locals" in (n.link or "")
            or "/admin" == (n.link or "").strip()
        ):
            match = True
        elif cat in {"requests", "custom-requests"} and (
            n.kind in {"custom_request", "request_submitted", "trip_request"}
            or "/admin/requests" in (n.link or "")
        ):
            match = True
        elif cat in {"reviews"} and (
            n.kind in {"review_reported", "review_flagged", "new_review"}
            or "/admin/reviews" in (n.link or "")
        ):
            match = True
        elif cat in {"support"} and (
            n.kind in {"support_message"}
            or "/admin/support" in (n.link or "")
        ):
            match = True

        if match:
            n.read_at = now
            session.add(n)
            updated += 1

    if updated > 0:
        session.commit()

    remaining = session.exec(
        select(Notification).where(
            Notification.user_id == admin.id,
            Notification.read_at == None,
        )
    ).all()

    return {
        "ok": True,
        "cleared": updated,
        "total": len(remaining),
        "locals": sum(
            1 for n in remaining
            if n.kind in {"provider_application", "kyc_submitted", "verification_document"}
            or "/admin/locals" in (n.link or "")
        ),
        "requests": sum(
            1 for n in remaining
            if n.kind in {"custom_request", "request_submitted", "trip_request"}
            or "/admin/requests" in (n.link or "")
        ),
        "reviews": sum(
            1 for n in remaining
            if n.kind in {"review_reported", "review_flagged", "new_review"}
            or "/admin/reviews" in (n.link or "")
        ),
        "support": sum(
            1 for n in remaining
            if n.kind in {"support_message"}
            or "/admin/support" in (n.link or "")
        ),
        "notifications": len(remaining),
    }


@app.get("/api/admin/provider-applications")
def admin_applications(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    return session.exec(
        select(ProviderApplication).order_by(ProviderApplication.created_at.desc())
    ).all()


@app.patch("/api/admin/provider-applications/{application_id}")
def update_application(
    application_id: int,
    payload: StatusUpdate,
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    app_item = session.get(ProviderApplication, application_id)
    if not app_item:
        raise HTTPException(404, "Application not found")
    if payload.status not in {"pending", "approved", "rejected", "needs_info"}:
        raise HTTPException(400, "Invalid status")

    created_account = False
    temp_password = None
    local_profile_id = None
    if payload.status == "approved":
        email = app_item.email.lower().strip()
        user = session.exec(select(User).where(User.email == email)).first()
        if user and user.role != "local":
            raise HTTPException(409, "This email already belongs to a non-local account. Use a separate local email until multi-role accounts are introduced.")
        if not user:
            temp_password = "HAL-" + secrets.token_urlsafe(9)
            user = User(email=email, full_name=app_item.name.strip(), role="local", password_hash=hash_password(temp_password))
            session.add(user); session.commit(); session.refresh(user)
            created_account = True

        profile = session.exec(select(LocalProfile).where(LocalProfile.user_id == user.id)).first()
        if not profile:
            profile = LocalProfile(
                user_id=user.id,
                slug=unique_local_slug(session, app_item.name, app_item.city),
                display_name=app_item.name.strip(),
                headline=f"Local in {app_item.city.strip()}",
                bio=app_item.experience.strip() or f"Local experience in {app_item.city.strip()}.",
                country_code=app_item.country_code.upper(),
                city_slug=slugify(app_item.city),
                city_name=app_item.city.strip(),
                languages=app_item.languages.strip() or "English",
                hourly_rate=30.0,
                verified=False,
            )
            session.add(profile); session.commit(); session.refresh(profile)
        local_profile_id = profile.id

    app_item.status = payload.status
    session.add(app_item); session.commit(); session.refresh(app_item)
    subject = f"Your HireALocals application is {payload.status.replace('_', ' ')}"
    if payload.status == "approved" and user:
        body = f"Hello {app_item.name},\n\nYour Local application has been approved."
        if temp_password:
            body += f"\n\nTemporary login email: {user.email}\nTemporary password: {temp_password}\nPlease log in and change your password using Forgot password if needed."
        body += f"\n\nLogin: {settings.frontend_url.rstrip('/')}/login"
        queue_email(session, app_item.email, subject, body)
        add_notification(session, user.id, "application_approved", "Local application approved", "Complete your profile, services, availability and verification documents.", "/local-dashboard/profile")
    elif payload.status in {"rejected", "needs_info"}:
        queue_email(session, app_item.email, subject, f"Hello {app_item.name},\n\nYour HireALocals application status is now: {payload.status.replace('_', ' ')}.\n\nIf you need help, contact {get_setting(session, 'support_email')}.")
    audit_event(session, _.id, "admin.provider_application_status", "provider_application", app_item.id, f"Status changed to {payload.status}")
    return {
        "application": app_item,
        "created_account": created_account,
        "temp_password": temp_password,
        "local_profile_id": local_profile_id,
    }


# ------------------------- Admin workspace -------------------------


@app.get("/api/admin/locals")
def admin_locals(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profiles = session.exec(select(LocalProfile).order_by(LocalProfile.created_at.desc())).all()
    result = []
    for p in profiles:
        user = session.get(User, p.user_id)
        services = session.exec(select(Service).where(Service.local_profile_id == p.id)).all()
        result.append(
            {
                "id": p.id,
                "slug": p.slug,
                "display_name": p.display_name,
                "headline": p.headline,
                "city_name": p.city_name,
                "country_code": p.country_code,
                "languages": p.languages,
                "hourly_rate": p.hourly_rate,
                "rating": p.rating,
                "review_count": p.review_count,
                "verified": p.verified,
                "image_url": p.image_url,
                "email": user.email if user else "",
                "services_count": len(services),
                "created_at": p.created_at,
            }
        )
    return result


@app.patch("/api/admin/locals/{profile_id}/verification")
def admin_local_verification(
    profile_id: int,
    payload: StatusUpdate,
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = session.get(LocalProfile, profile_id)
    if not profile:
        raise HTTPException(404, "Local profile not found")
    if payload.status not in {
        "verified",
        "unverified",
    }:
        raise HTTPException(
            400,
            "Status must be verified or unverified",
        )

    if (
        payload.status == "verified"
        and not local_kyc_approved(
            session,
            profile,
        )
    ):
        raise HTTPException(
            409,
            "Approved KYC document is required before this Local can be verified.",
        )

    profile.verified = (
        payload.status == "verified"
    )
    session.add(profile)
    session.commit()
    session.refresh(profile)
    audit_event(session, _.id, "admin.local_verification", "local_profile", profile.id, f"Verification set to {profile.verified}")
    return {"ok": True, "id": profile.id, "verified": profile.verified}


@app.get("/api/admin/bookings")
def admin_bookings(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    bookings = session.exec(select(Booking).order_by(Booking.created_at.desc())).all()
    result = []
    for b in bookings:
        tourist = session.get(User, b.tourist_user_id)
        local = session.get(LocalProfile, b.local_profile_id)
        service = session.get(Service, b.service_id) if b.service_id else None
        result.append(
            {
                "id": b.id,
                "booking_date": b.booking_date,
                "start_time": b.start_time,
                "guests": b.guests,
                "hours": b.hours,
                "subtotal": b.subtotal,
                "platform_fee": b.platform_fee,
                "status": b.status,
                "created_at": b.created_at,
                "local_name": local.display_name if local else "Unknown local",
                "tourist_name": tourist.full_name if tourist else "Unknown traveler",
                "tourist_email": tourist.email if tourist else "",
                "service_title": service.title if service else None,
                "payment": payment_summary(session, b.id),
            }
        )
    return result


@app.patch("/api/admin/bookings/{booking_id}")
def admin_booking_status(
    booking_id: int,
    payload: StatusUpdate,
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    allowed = {"pending", "confirmed", "completed", "cancelled", "rejected"}
    if payload.status not in allowed:
        raise HTTPException(400, "Invalid booking status")
    if payload.status == "confirmed":
        validate_booking_slot(session, booking.local_profile_id, booking.booking_date, booking.start_time, booking.hours, exclude_booking_id=booking.id)
    if payload.status == "completed":
        ensure_booking_paid_for_completion(session, booking)
    if payload.status in {"cancelled", "rejected"} and settings.payment_required and payment_is_paid(session, booking.id):
        raise HTTPException(409, "This booking is already paid. Refund the payment from Admin > Payments before cancelling it.")
    old_status = booking.status
    booking.status = payload.status
    session.add(booking)
    log_booking_event(session, booking, _.id, "admin_status_changed", old_status, payload.status, f"Admin changed booking to {payload.status}")
    session.commit()
    session.refresh(booking)
    tourist_id, local_user_id = booking_party_ids(session, booking)
    for target_id, link in ((tourist_id, f"/dashboard/bookings/{booking.id}"), (local_user_id, "/local-dashboard/bookings")):
        if target_id:
            add_notification(session, target_id, "booking_admin_update", f"Booking #{booking.id} updated", f"Marketplace support changed the booking status to {booking.status}.", link, email=True)
    audit_event(session, _.id, "admin.booking_status", "booking", booking.id, f"{old_status} -> {booking.status}")
    return booking


@app.get("/api/admin/reviews")
def admin_reviews(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    reviews = session.exec(select(Review).order_by(Review.created_at.desc())).all()
    result = []
    for r in reviews:
        tourist = session.get(User, r.tourist_user_id)
        local = session.get(LocalProfile, r.local_profile_id)
        moderation = session.exec(select(ReviewModeration).where(ReviewModeration.review_id == r.id)).first()
        reports = session.exec(select(ReviewReport).where(ReviewReport.review_id == r.id).order_by(ReviewReport.created_at.desc())).all()
        report_details = []
        for rep in reports:
            reporter = session.get(User, rep.reporter_user_id)
            report_details.append({
                "id": rep.id,
                "reason": rep.reason,
                "details": rep.details,
                "status": rep.status,
                "reporter_name": reporter.full_name if reporter else "User",
                "created_at": rep.created_at,
            })
        result.append(
            {
                "id": r.id,
                "rating": r.rating,
                "title": r.title,
                "comment": r.comment,
                "created_at": r.created_at,
                "local_name": local.display_name if local else "Unknown local",
                "tourist_name": tourist.full_name if tourist else "Unknown traveler",
                "booking_id": r.booking_id,
                "moderation_status": moderation.status if moderation else "visible",
                "report_count": len(reports),
                "reports": report_details,
            }
        )
    return result


@app.get("/api/admin/travelers")
def admin_travelers(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    users = session.exec(select(User).where(User.role == "tourist").order_by(User.created_at.desc())).all()
    result = []
    for user in users:
        profile = session.exec(select(TravelerProfile).where(TravelerProfile.user_id == user.id)).first()
        bookings = session.exec(select(Booking).where(Booking.tourist_user_id == user.id)).all()
        reviews = session.exec(select(Review).where(Review.tourist_user_id == user.id)).all()
        gross = sum(b.subtotal + b.platform_fee for b in bookings if b.status not in {"cancelled", "rejected"})
        result.append({
            "id": user.id, "full_name": user.full_name, "email": user.email, "is_active": user.is_active,
            "created_at": user.created_at, "phone": profile.phone if profile else "",
            "country": profile.country if profile else "", "home_city": profile.home_city if profile else "",
            "image_url": profile.image_url if profile else "", "bookings_count": len(bookings),
            "reviews_count": len(reviews), "gross_booked": round(gross, 2),
        })
    return result


@app.patch("/api/admin/users/{user_id}/status")
def admin_user_status(
    user_id: int,
    payload: StatusUpdate,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id and payload.status == "inactive":
        raise HTTPException(400, "You cannot deactivate your own admin account")
    if payload.status not in {"active", "inactive"}:
        raise HTTPException(400, "Status must be active or inactive")
    user.is_active = payload.status == "active"
    session.add(user); session.commit(); session.refresh(user)
    audit_event(session, admin.id, "admin.user_status", "user", user.id, f"Account set to {payload.status}")
    return {"ok": True, "id": user.id, "is_active": user.is_active}


@app.get("/api/admin/bookings/{booking_id}")
def admin_booking_detail(
    booking_id: int,
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    tourist = session.get(User, booking.tourist_user_id)
    traveler_profile = session.exec(select(TravelerProfile).where(TravelerProfile.user_id == booking.tourist_user_id)).first()
    local = session.get(LocalProfile, booking.local_profile_id)
    local_user = session.get(User, local.user_id) if local else None
    service = session.get(Service, booking.service_id) if booking.service_id else None
    review = session.exec(select(Review).where(Review.booking_id == booking.id)).first()
    messages = session.exec(select(Message).where(Message.booking_id == booking.id).order_by(Message.created_at.asc())).all()
    msg_rows = []
    for msg in messages:
        sender = session.get(User, msg.sender_user_id)
        msg_rows.append({
            "id": msg.id, "sender_name": sender.full_name if sender else "User",
            "sender_role": sender.role if sender else "user", "body": msg.body, "created_at": msg.created_at,
        })
    return {
        "booking": booking,
        "tourist": {
            "id": tourist.id if tourist else None, "name": tourist.full_name if tourist else "Unknown traveler",
            "email": tourist.email if tourist else "", "phone": traveler_profile.phone if traveler_profile else "",
            "country": traveler_profile.country if traveler_profile else "", "home_city": traveler_profile.home_city if traveler_profile else "",
        },
        "local": {
            "id": local.id if local else None, "name": local.display_name if local else "Unknown local",
            "email": local_user.email if local_user else "", "city": local.city_name if local else "",
            "verified": local.verified if local else False, "slug": local.slug if local else "",
        },
        "service": None if not service else {"id": service.id, "title": service.title, "category": service.category, "price": service.price},
        "economics": {
            "local_amount": round(booking.subtotal, 2),
            "platform_fee": round(booking.platform_fee, 2),
            "discount_amount": round(getattr(booking, "discount_amount", 0.0) or 0.0, 2),
            "customer_total": round(booking.subtotal + booking.platform_fee - (getattr(booking, "discount_amount", 0.0) or 0.0), 2),
        },
        "messages": msg_rows,
        "meeting_point": meeting_point_dict(session, booking.id),
        "timeline": booking_timeline(session, booking.id),
        "end_time": booking_end_time(booking),
        "payment": payment_summary(session, booking.id),
        "review": None if not review else {"id": review.id, "rating": review.rating, "title": review.title, "comment": review.comment},
    }


@app.get("/api/admin/commission")
def admin_commission(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    sync_commission_ledger(session)
    rows = session.exec(select(CommissionLedger).order_by(CommissionLedger.updated_at.desc())).all()
    result = []
    for row in rows:
        booking = session.get(Booking, row.booking_id)
        local = session.get(LocalProfile, booking.local_profile_id) if booking else None
        tourist = session.get(User, booking.tourist_user_id) if booking else None
        result.append({
            "id": row.id, "booking_id": row.booking_id, "gross_amount": row.gross_amount,
            "local_amount": row.local_amount, "platform_fee": row.platform_fee,
            "payout_status": row.payout_status, "notes": row.notes, "updated_at": row.updated_at,
            "booking_status": booking.status if booking else "unknown",
            "local_name": local.display_name if local else "Unknown local",
            "tourist_name": tourist.full_name if tourist else "Unknown traveler",
            "payment": payment_summary(session, row.booking_id),
        })
    return result


@app.patch("/api/admin/commission/{ledger_id}")
def admin_commission_update(
    ledger_id: int,
    payload: CommissionUpdate,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    row = session.get(CommissionLedger, ledger_id)
    if not row:
        raise HTTPException(404, "Ledger entry not found")
    if payload.payout_status not in {"pending", "held", "unpaid", "scheduled", "paid", "void"}:
        raise HTTPException(400, "Invalid payout status")
    row.payout_status = payload.payout_status
    row.notes = payload.notes.strip()
    row.updated_at = datetime.now(timezone.utc)
    session.add(row); session.commit(); session.refresh(row)
    audit_event(session, admin.id, "admin.commission_status", "commission_ledger", row.id, f"Payout status set to {row.payout_status}")
    return row


@app.patch("/api/admin/reviews/{review_id}/moderation")
def admin_review_moderation(
    review_id: int,
    payload: StatusUpdate,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    if payload.status not in {"visible", "hidden", "flagged"}:
        raise HTTPException(400, "Invalid moderation status")
    row = session.exec(select(ReviewModeration).where(ReviewModeration.review_id == review_id)).first()
    if not row:
        row = ReviewModeration(review_id=review_id)
    row.status = payload.status
    row.updated_at = datetime.now(timezone.utc)
    session.add(row); session.commit(); session.refresh(row)
    stats = recalculate_local_rating(session, review.local_profile_id)
    audit_event(session, admin.id, "admin.review_moderation", "review", review_id, f"Moderation set to {row.status}; rating recalculated to {stats['rating']} ({stats['review_count']} reviews)")
    return {
        "ok": True,
        "review_id": review_id,
        "status": row.status,
        "local_rating": stats["rating"],
        "local_review_count": stats["review_count"],
        "distribution": stats["distribution"],
    }


@app.get("/api/admin/settings")
def admin_settings(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    return {
        "platform_fee_percent": float(get_setting(session, "platform_fee_percent") or "12"),
        "support_email": get_setting(session, "support_email"),
        "marketplace_mode": get_setting(session, "marketplace_mode"),
        "require_local_verification": get_bool_setting(session, "require_local_verification"),
        "require_email_verification": get_bool_setting(session, "require_email_verification"),
    }


@app.patch("/api/admin/settings")
def admin_settings_update(
    payload: AdminSettingsUpdate,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    if payload.marketplace_mode not in {"open", "paused"}:
        raise HTTPException(400, "Marketplace mode must be open or paused")
    data = {
        "platform_fee_percent": str(payload.platform_fee_percent),
        "support_email": str(payload.support_email),
        "marketplace_mode": payload.marketplace_mode,
        "require_local_verification": "true" if payload.require_local_verification else "false",
        "require_email_verification": "true" if payload.require_email_verification else "false",
    }
    for key, value in data.items():
        row = session.exec(select(SiteSetting).where(SiteSetting.key == key)).first()
        if not row:
            row = SiteSetting(key=key, value=value)
        else:
            row.value = value
            row.updated_at = datetime.now(timezone.utc)
        session.add(row)
    session.commit()
    audit_event(session, admin.id, "admin.settings_update", "site_settings", "global", f"Marketplace mode={payload.marketplace_mode}; fee={payload.platform_fee_percent}%")
    return {"ok": True, **data}


# ------------------------- Promotions & Coupons -------------------------


@app.post("/api/promotions/validate")
def validate_promo_code(
    payload: PromoValidateInput,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User | None, Depends(current_user)] = None,
):
    norm_code = payload.code.strip().upper()
    promo = session.exec(select(PromoCode).where(PromoCode.code == norm_code)).first()
    if not promo:
        raise HTTPException(404, "Promo code not found")
    if not promo.is_active:
        raise HTTPException(400, "This promo code is no longer active")
    now = datetime.now(timezone.utc)
    p_starts = _ensure_utc_datetime(promo.starts_at)
    p_expires = _ensure_utc_datetime(promo.expires_at)
    if p_starts and now < p_starts:
        raise HTTPException(400, "This promo code has not started yet")
    if p_expires and now > p_expires:
        raise HTTPException(400, "This promo code has expired")
    if promo.max_uses_total and promo.current_uses >= promo.max_uses_total:
        raise HTTPException(400, "Promo code usage limit has been reached")
    if payload.subtotal < promo.min_subtotal:
        raise HTTPException(400, f"Minimum booking subtotal of ${promo.min_subtotal:.2f} is required for this code")
    if user:
        user_uses = session.exec(
            select(PromoRedemption).where(
                PromoRedemption.promo_code_id == promo.id,
                PromoRedemption.user_id == user.id,
            )
        ).all()
        if len(user_uses) >= promo.max_uses_per_user:
            raise HTTPException(400, "You have already reached the maximum usage limit for this promo code")

    subtotal = round(payload.subtotal, 2)
    fee_setting = get_setting(session, "platform_fee_percent") or "12"
    try:
        fee_percent = float(fee_setting)
    except Exception:
        fee_percent = 12.0
    platform_fee = round(subtotal * (fee_percent / 100.0), 2)

    if promo.discount_type == "percent":
        discount = round(subtotal * (promo.discount_value / 100.0), 2)
        if promo.max_discount is not None:
            discount = min(discount, round(float(promo.max_discount), 2))
    else:
        discount = min(round(float(promo.discount_value), 2), round(subtotal + platform_fee, 2))

    discount = min(discount, round(subtotal + platform_fee, 2))
    estimated_total = max(0.0, round(subtotal + platform_fee - discount, 2))

    return {
        "valid": True,
        "code": promo.code,
        "description": promo.description,
        "discount_type": promo.discount_type,
        "discount_value": promo.discount_value,
        "discount_amount": discount,
        "subtotal": subtotal,
        "platform_fee": platform_fee,
        "estimated_total": estimated_total,
    }


@app.get("/api/admin/promotions")
def admin_promotions(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    promos = session.exec(select(PromoCode).order_by(PromoCode.created_at.desc())).all()
    result = []
    for promo in promos:
        redemptions = session.exec(select(PromoRedemption).where(PromoRedemption.promo_code_id == promo.id)).all()
        total_discount_spent = sum(r.discount_amount for r in redemptions)
        result.append({
            "id": promo.id,
            "code": promo.code,
            "description": promo.description,
            "discount_type": promo.discount_type,
            "discount_value": promo.discount_value,
            "max_discount": promo.max_discount,
            "min_subtotal": promo.min_subtotal,
            "max_uses_total": promo.max_uses_total,
            "max_uses_per_user": promo.max_uses_per_user,
            "current_uses": promo.current_uses,
            "is_active": promo.is_active,
            "starts_at": promo.starts_at,
            "expires_at": promo.expires_at,
            "created_at": promo.created_at,
            "total_redemptions_count": len(redemptions),
            "total_discount_spent": round(total_discount_spent, 2),
        })
    return result


@app.post("/api/admin/promotions")
def admin_create_promotion(
    payload: PromoCreateInput,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    request: Request,
):
    code_upper = payload.code.strip().upper()
    existing = session.exec(select(PromoCode).where(PromoCode.code == code_upper)).first()
    if existing:
        raise HTTPException(409, "A promo code with this code already exists")

    starts_at = None
    if payload.starts_at:
        try:
            starts_at = datetime.fromisoformat(payload.starts_at.replace("Z", "+00:00"))
        except Exception:
            pass

    expires_at = None
    if payload.expires_at:
        try:
            expires_at = datetime.fromisoformat(payload.expires_at.replace("Z", "+00:00"))
        except Exception:
            pass

    promo = PromoCode(
        code=code_upper,
        description=payload.description.strip(),
        discount_type=payload.discount_type,
        discount_value=round(payload.discount_value, 2),
        max_discount=round(payload.max_discount, 2) if payload.max_discount is not None else None,
        min_subtotal=round(payload.min_subtotal, 2),
        max_uses_total=payload.max_uses_total,
        max_uses_per_user=payload.max_uses_per_user,
        starts_at=starts_at,
        expires_at=expires_at,
        is_active=payload.is_active,
    )
    session.add(promo)
    session.commit()
    session.refresh(promo)
    audit_event(session, admin.id, "admin.promo_created", "promocode", promo.id, f"Created promo {promo.code} ({promo.discount_type} {promo.discount_value})", request)
    return promo


@app.patch("/api/admin/promotions/{promo_id}")
def admin_update_promotion(
    promo_id: int,
    payload: PromoUpdateInput,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    request: Request,
):
    promo = session.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(404, "Promo code not found")

    if payload.description is not None:
        promo.description = payload.description.strip()
    if payload.is_active is not None:
        promo.is_active = payload.is_active
    if payload.max_uses_total is not None:
        promo.max_uses_total = payload.max_uses_total
    if payload.max_uses_per_user is not None:
        promo.max_uses_per_user = payload.max_uses_per_user
    if payload.min_subtotal is not None:
        promo.min_subtotal = round(payload.min_subtotal, 2)
    if payload.expires_at is not None:
        if payload.expires_at == "":
            promo.expires_at = None
        else:
            try:
                promo.expires_at = datetime.fromisoformat(payload.expires_at.replace("Z", "+00:00"))
            except Exception:
                pass

    promo.updated_at = datetime.now(timezone.utc)
    session.add(promo)
    session.commit()
    session.refresh(promo)
    audit_event(session, admin.id, "admin.promo_updated", "promocode", promo.id, f"Updated promo {promo.code}; active={promo.is_active}", request)
    return promo


@app.get("/api/admin/revenue/summary")
def admin_revenue_summary(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    period: str = "all_time",
):
    now = datetime.now(timezone.utc)
    cutoff = None
    if period == "today":
        cutoff = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    elif period == "7d":
        cutoff = now - timedelta(days=7)
    elif period == "30d":
        cutoff = now - timedelta(days=30)

    bookings = session.exec(select(Booking).order_by(Booking.created_at.desc())).all()
    payments = session.exec(select(PaymentRecord)).all()
    paid_booking_ids = {p.booking_id for p in payments if p.status == "paid"}

    filtered_bookings = []
    for b in bookings:
        if b.id not in paid_booking_ids or b.status == "cancelled":
            continue
        if cutoff:
            b_time = b.created_at
            if b_time.tzinfo is None:
                b_time = b_time.replace(tzinfo=timezone.utc)
            if b_time < cutoff:
                continue
        filtered_bookings.append(b)

    total_subtotal = sum(b.subtotal for b in filtered_bookings)
    total_platform_fee = sum(b.platform_fee for b in filtered_bookings)
    total_discount_spent = sum(getattr(b, "discount_amount", 0.0) or 0.0 for b in filtered_bookings)
    gbv = sum(b.subtotal + b.platform_fee - (getattr(b, "discount_amount", 0.0) or 0.0) for b in filtered_bookings)
    net_platform_revenue = total_platform_fee - total_discount_spent
    take_rate_pct = round((net_platform_revenue / total_subtotal * 100), 2) if total_subtotal > 0 else 12.0

    refunded_records = [p for p in payments if p.status == "refunded"]
    if cutoff:
        filtered_refunds = []
        for p in refunded_records:
            p_time = p.refunded_at or p.updated_at
            if p_time.tzinfo is None:
                p_time = p_time.replace(tzinfo=timezone.utc)
            if p_time >= cutoff:
                filtered_refunds.append(p)
        refunded_records = filtered_refunds
    total_refund_volume = sum((p.refunded_minor / 100.0) for p in refunded_records)

    sync_commission_ledger(session)
    ledger_entries = session.exec(select(CommissionLedger)).all()
    payout_held = sum(l.local_amount for l in ledger_entries if l.payout_status == "held")
    payout_unpaid = sum(l.local_amount for l in ledger_entries if l.payout_status == "unpaid")
    payout_paid = sum(l.local_amount for l in ledger_entries if l.payout_status == "paid")

    return {
        "period": period,
        "gbv": round(gbv, 2),
        "total_local_payable": round(total_subtotal, 2),
        "total_platform_fee": round(total_platform_fee, 2),
        "total_discount_spent": round(total_discount_spent, 2),
        "net_platform_revenue": round(net_platform_revenue, 2),
        "effective_take_rate": round(take_rate_pct, 2),
        "paid_bookings_count": len(filtered_bookings),
        "total_refund_volume": round(total_refund_volume, 2),
        "refund_count": len(refunded_records),
        "payouts": {
            "held": round(payout_held, 2),
            "unpaid": round(payout_unpaid, 2),
            "paid": round(payout_paid, 2),
        },
        "currency": settings.payment_currency.upper(),
    }


def parse_date_window(
    period: str = "all_time",
    from_date: str | None = None,
    to_date: str | None = None,
) -> tuple[datetime | None, datetime | None, datetime | None, datetime | None, str]:
    now = datetime.now(timezone.utc)
    if from_date and to_date:
        try:
            start = datetime.fromisoformat(from_date.replace("Z", "+00:00")).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
            end = datetime.fromisoformat(to_date.replace("Z", "+00:00")).replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
            duration = end - start
            prev_end = start - timedelta(microseconds=1)
            prev_start = prev_end - duration
            return start, end, prev_start, prev_end, f"custom_{from_date}_{to_date}"
        except Exception:
            pass

    if period == "today":
        start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        end = now
        prev_start = start - timedelta(days=1)
        prev_end = start - timedelta(microseconds=1)
        return start, end, prev_start, prev_end, "today"
    elif period == "7d":
        start = now - timedelta(days=7)
        end = now
        prev_start = now - timedelta(days=14)
        prev_end = start
        return start, end, prev_start, prev_end, "7d"
    elif period == "30d":
        start = now - timedelta(days=30)
        end = now
        prev_start = now - timedelta(days=60)
        prev_end = start
        return start, end, prev_start, prev_end, "30d"
    elif period == "90d":
        start = now - timedelta(days=90)
        end = now
        prev_start = now - timedelta(days=180)
        prev_end = start
        return start, end, prev_start, prev_end, "90d"
    elif period == "mtd":
        start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        end = now
        days_into = (now - start).total_seconds()
        if now.month == 1:
            prev_month_start = datetime(now.year - 1, 12, 1, tzinfo=timezone.utc)
        else:
            prev_month_start = datetime(now.year, now.month - 1, 1, tzinfo=timezone.utc)
        prev_end = prev_month_start + timedelta(seconds=days_into)
        prev_start = prev_month_start
        return start, end, prev_start, prev_end, "mtd"
    elif period == "qtd":
        q = (now.month - 1) // 3 + 1
        q_start_month = (q - 1) * 3 + 1
        start = datetime(now.year, q_start_month, 1, tzinfo=timezone.utc)
        end = now
        days_into = (now - start).total_seconds()
        if q == 1:
            prev_q_start = datetime(now.year - 1, 10, 1, tzinfo=timezone.utc)
        else:
            prev_q_start = datetime(now.year, (q - 2) * 3 + 1, 1, tzinfo=timezone.utc)
        prev_end = prev_q_start + timedelta(seconds=days_into)
        prev_start = prev_q_start
        return start, end, prev_start, prev_end, "qtd"

    return None, None, None, None, "all_time"


def safe_growth_delta(current_val: float, prev_val: float) -> float:
    if prev_val > 0:
        return round(((current_val - prev_val) / prev_val) * 100.0, 2)
    return 0.0


def filter_bookings_by_range(
    bookings: list[Booking],
    paid_booking_ids: set[int],
    start_time: datetime | None,
    end_time: datetime | None,
) -> list[Booking]:
    filtered = []
    for b in bookings:
        if b.id not in paid_booking_ids or b.status == "cancelled":
            continue
        b_time = b.created_at
        if b_time.tzinfo is None:
            b_time = b_time.replace(tzinfo=timezone.utc)
        if start_time and b_time < start_time:
            continue
        if end_time and b_time > end_time:
            continue
        filtered.append(b)
    return filtered


def get_payout_aging_breakdown(session: Session) -> PayoutAgingBreakdown:
    sync_commission_ledger(session)
    now = datetime.now(timezone.utc)
    ledgers = session.exec(select(CommissionLedger)).all()

    held_total = sum(l.local_amount for l in ledgers if l.payout_status == "held")
    held_count = len([l for l in ledgers if l.payout_status == "held"])
    unpaid_total = sum(l.local_amount for l in ledgers if l.payout_status == "unpaid")
    unpaid_count = len([l for l in ledgers if l.payout_status == "unpaid"])
    scheduled_total = sum(l.local_amount for l in ledgers if l.payout_status == "scheduled")
    scheduled_count = len([l for l in ledgers if l.payout_status == "scheduled"])

    # Aging for outstanding liabilities (unpaid & scheduled)
    b0_7_amount, b0_7_items, b0_7_locals = 0.0, 0, set()
    b8_14_amount, b8_14_items, b8_14_locals = 0.0, 0, set()
    b15_30_amount, b15_30_items, b15_30_locals = 0.0, 0, set()
    b30plus_amount, b30plus_items, b30plus_locals = 0.0, 0, set()

    for l in ledgers:
        if l.payout_status in {"unpaid", "scheduled"}:
            booking = session.get(Booking, l.booking_id)
            ref_time = l.updated_at
            if ref_time.tzinfo is None:
                ref_time = ref_time.replace(tzinfo=timezone.utc)
            days = (now - ref_time).days
            local_id = booking.local_profile_id if booking else 0

            if days <= 7:
                b0_7_amount += l.local_amount
                b0_7_items += 1
                b0_7_locals.add(local_id)
            elif days <= 14:
                b8_14_amount += l.local_amount
                b8_14_items += 1
                b8_14_locals.add(local_id)
            elif days <= 30:
                b15_30_amount += l.local_amount
                b15_30_items += 1
                b15_30_locals.add(local_id)
            else:
                b30plus_amount += l.local_amount
                b30plus_items += 1
                b30plus_locals.add(local_id)

    buckets = [
        PayoutAgingBucket(bucket_label="0-7d", amount=round(b0_7_amount, 2), count=b0_7_items, local_count=len(b0_7_locals)),
        PayoutAgingBucket(bucket_label="8-14d", amount=round(b8_14_amount, 2), count=b8_14_items, local_count=len(b8_14_locals)),
        PayoutAgingBucket(bucket_label="15-30d", amount=round(b15_30_amount, 2), count=b15_30_items, local_count=len(b15_30_locals)),
        PayoutAgingBucket(bucket_label="30d+", amount=round(b30plus_amount, 2), count=b30plus_items, local_count=len(b30plus_locals)),
    ]

    return PayoutAgingBreakdown(
        total_unpaid_liability=round(unpaid_total, 2),
        unpaid_count=unpaid_count,
        total_scheduled_liability=round(scheduled_total, 2),
        scheduled_count=scheduled_count,
        total_held_liability=round(held_total, 2),
        held_count=held_count,
        buckets=buckets,
    )


@app.get("/api/admin/revenue/analytics", response_model=RevenueAnalyticsResponse)
def admin_revenue_analytics(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    period: str = "all_time",
    from_date: str | None = None,
    to_date: str | None = None,
):
    start_time, end_time, prev_start, prev_end, period_label = parse_date_window(period, from_date, to_date)
    now = datetime.now(timezone.utc)

    bookings = session.exec(select(Booking).order_by(Booking.created_at.desc())).all()
    payments = session.exec(select(PaymentRecord)).all()
    paid_booking_ids = {p.booking_id for p in payments if p.status == "paid"}

    # Current window bookings
    current_bookings = filter_bookings_by_range(bookings, paid_booking_ids, start_time, end_time)
    # Previous window bookings for comparison
    prev_bookings = filter_bookings_by_range(bookings, paid_booking_ids, prev_start, prev_end) if prev_start and prev_end else []

    # Current KPIs
    total_subtotal = sum(b.subtotal for b in current_bookings)
    total_platform_fee = sum(b.platform_fee for b in current_bookings)
    total_discount_spent = sum(getattr(b, "discount_amount", 0.0) or 0.0 for b in current_bookings)
    gbv = sum(b.subtotal + b.platform_fee - (getattr(b, "discount_amount", 0.0) or 0.0) for b in current_bookings)
    net_platform_revenue = total_platform_fee - total_discount_spent
    take_rate_pct = round((net_platform_revenue / total_subtotal * 100), 2) if total_subtotal > 0 else 12.0

    # Referral liabilities
    referral_attributions = session.exec(select(ReferralAttribution)).all()
    filtered_referrals = []
    for r in referral_attributions:
        if r.status not in {"credited", "qualified", "rewarded"}:
            continue
        r_time = r.created_at
        if r_time.tzinfo is None:
            r_time = r_time.replace(tzinfo=timezone.utc)
        if start_time and r_time < start_time:
            continue
        if end_time and r_time > end_time:
            continue
        filtered_referrals.append(r)
    total_referral_cost = sum(r.reward_amount for r in filtered_referrals)

    # Refunds
    refunded_records = [p for p in payments if p.status == "refunded"]
    if start_time or end_time:
        filtered_refunds = []
        for p in refunded_records:
            p_time = p.refunded_at or p.updated_at
            if p_time.tzinfo is None:
                p_time = p_time.replace(tzinfo=timezone.utc)
            if start_time and p_time < start_time:
                continue
            if end_time and p_time > end_time:
                continue
            filtered_refunds.append(p)
        refunded_records = filtered_refunds
    total_refund_volume = sum((p.refunded_minor / 100.0) for p in refunded_records)

    # Previous comparison metrics
    prev_subtotal = sum(b.subtotal for b in prev_bookings)
    prev_platform_fee = sum(b.platform_fee for b in prev_bookings)
    prev_discount = sum(getattr(b, "discount_amount", 0.0) or 0.0 for b in prev_bookings)
    prev_gbv = sum(b.subtotal + b.platform_fee - (getattr(b, "discount_amount", 0.0) or 0.0) for b in prev_bookings)
    prev_net_rev = prev_platform_fee - prev_discount

    gbv_delta_pct = safe_growth_delta(gbv, prev_gbv)
    net_rev_delta_pct = safe_growth_delta(net_platform_revenue, prev_net_rev)
    paid_count_delta_pct = safe_growth_delta(len(current_bookings), len(prev_bookings))

    # Payout totals
    sync_commission_ledger(session)
    ledger_entries = session.exec(select(CommissionLedger)).all()
    payout_held = sum(l.local_amount for l in ledger_entries if l.payout_status == "held")
    payout_unpaid = sum(l.local_amount for l in ledger_entries if l.payout_status == "unpaid")
    payout_paid = sum(l.local_amount for l in ledger_entries if l.payout_status == "paid")

    kpis = RevenueKPIOverview(
        period=period_label,
        start_date=start_time.isoformat() if start_time else None,
        end_date=end_time.isoformat() if end_time else None,
        gbv=round(gbv, 2),
        total_local_payable=round(total_subtotal, 2),
        total_platform_fee=round(total_platform_fee, 2),
        total_discount_spent=round(total_discount_spent, 2),
        total_referral_cost=round(total_referral_cost, 2),
        net_platform_revenue=round(net_platform_revenue, 2),
        effective_take_rate=round(take_rate_pct, 2),
        paid_bookings_count=len(current_bookings),
        total_refund_volume=round(total_refund_volume, 2),
        refund_count=len(refunded_records),
        payout_held=round(payout_held, 2),
        payout_unpaid=round(payout_unpaid, 2),
        payout_paid=round(payout_paid, 2),
        gbv_delta_pct=gbv_delta_pct,
        net_revenue_delta_pct=net_rev_delta_pct,
        paid_bookings_delta_pct=paid_count_delta_pct,
        currency=settings.payment_currency.upper(),
    )

    # Time-series trend bucketing
    trends_map: dict[str, dict] = {}
    trend_start = start_time or (now - timedelta(days=30))
    trend_end = end_time or now
    days_span = max((trend_end - trend_start).days, 1)

    # Generate ordered empty buckets
    if days_span <= 31:
        cur = trend_start
        while cur <= trend_end:
            key = cur.strftime("%Y-%m-%d")
            trends_map[key] = {"date": key, "label": cur.strftime("%b %d"), "gbv": 0.0, "net_revenue": 0.0, "platform_fee": 0.0, "discounts": 0.0, "refunds": 0.0, "local_payable": 0.0, "bookings_count": 0}
            cur += timedelta(days=1)
    elif days_span <= 95:
        cur = trend_start
        while cur <= trend_end:
            key = cur.strftime("%Y-W%W")
            trends_map[key] = {"date": key, "label": f"Wk {cur.strftime('%W')}", "gbv": 0.0, "net_revenue": 0.0, "platform_fee": 0.0, "discounts": 0.0, "refunds": 0.0, "local_payable": 0.0, "bookings_count": 0}
            cur += timedelta(days=7)
    else:
        cur = datetime(trend_start.year, trend_start.month, 1, tzinfo=timezone.utc)
        while cur <= trend_end:
            key = cur.strftime("%Y-%m")
            trends_map[key] = {"date": key, "label": cur.strftime("%b %Y"), "gbv": 0.0, "net_revenue": 0.0, "platform_fee": 0.0, "discounts": 0.0, "refunds": 0.0, "local_payable": 0.0, "bookings_count": 0}
            if cur.month == 12:
                cur = datetime(cur.year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                cur = datetime(cur.year, cur.month + 1, 1, tzinfo=timezone.utc)

    for b in current_bookings:
        b_time = b.created_at
        if b_time.tzinfo is None:
            b_time = b_time.replace(tzinfo=timezone.utc)
        if days_span <= 31:
            key = b_time.strftime("%Y-%m-%d")
        elif days_span <= 95:
            key = b_time.strftime("%Y-W%W")
        else:
            key = b_time.strftime("%Y-%m")

        if key in trends_map:
            disc = getattr(b, "discount_amount", 0.0) or 0.0
            row_gbv = b.subtotal + b.platform_fee - disc
            trends_map[key]["gbv"] += row_gbv
            trends_map[key]["platform_fee"] += b.platform_fee
            trends_map[key]["discounts"] += disc
            trends_map[key]["net_revenue"] += (b.platform_fee - disc)
            trends_map[key]["local_payable"] += b.subtotal
            trends_map[key]["bookings_count"] += 1

    trend_series = [
        RevenueTrendPoint(
            date=v["date"],
            label=v["label"],
            gbv=round(v["gbv"], 2),
            net_revenue=round(v["net_revenue"], 2),
            platform_fee=round(v["platform_fee"], 2),
            discounts=round(v["discounts"], 2),
            refunds=round(v["refunds"], 2),
            local_payable=round(v["local_payable"], 2),
            bookings_count=v["bookings_count"],
        )
        for v in trends_map.values()
    ]

    # Dimensional Analytics
    # 1. By City
    cities_map: dict[str, dict] = {}
    for b in current_bookings:
        local = session.get(LocalProfile, b.local_profile_id)
        city_name = (local.city_name if local else "") or getattr(b, "city_name", "") or "Global / Custom"
        country_code = (local.country_code if local else "") or "GB"
        c_key = f"{city_name}:{country_code}".lower()
        if c_key not in cities_map:
            cities_map[c_key] = {"city_name": city_name, "country_code": country_code, "count": 0, "gbv": 0.0, "local_payable": 0.0, "platform_revenue": 0.0}
        disc = getattr(b, "discount_amount", 0.0) or 0.0
        cities_map[c_key]["count"] += 1
        cities_map[c_key]["gbv"] += (b.subtotal + b.platform_fee - disc)
        cities_map[c_key]["local_payable"] += b.subtotal
        cities_map[c_key]["platform_revenue"] += (b.platform_fee - disc)

    by_city = [
        CityRevenueItem(
            city_name=v["city_name"],
            country_code=v["country_code"],
            paid_bookings_count=v["count"],
            gbv=round(v["gbv"], 2),
            local_payable=round(v["local_payable"], 2),
            platform_revenue=round(v["platform_revenue"], 2),
            effective_take_rate=round((v["platform_revenue"] / v["local_payable"] * 100), 2) if v["local_payable"] > 0 else 12.0,
        )
        for v in sorted(cities_map.values(), key=lambda x: x["gbv"], reverse=True)
    ]

    # 2. By Category
    categories_map: dict[str, dict] = {}
    for b in current_bookings:
        service = session.get(Service, b.service_id) if b.service_id else None
        cat_name = service.category if service else "Custom Itinerary"
        if cat_name not in categories_map:
            categories_map[cat_name] = {"category_name": cat_name, "count": 0, "gbv": 0.0, "local_payable": 0.0, "platform_revenue": 0.0}
        disc = getattr(b, "discount_amount", 0.0) or 0.0
        categories_map[cat_name]["count"] += 1
        categories_map[cat_name]["gbv"] += (b.subtotal + b.platform_fee - disc)
        categories_map[cat_name]["local_payable"] += b.subtotal
        categories_map[cat_name]["platform_revenue"] += (b.platform_fee - disc)

    by_category = [
        CategoryRevenueItem(
            category_name=v["category_name"],
            paid_bookings_count=v["count"],
            gbv=round(v["gbv"], 2),
            local_payable=round(v["local_payable"], 2),
            platform_revenue=round(v["platform_revenue"], 2),
        )
        for v in sorted(categories_map.values(), key=lambda x: x["gbv"], reverse=True)
    ]

    # 3. By Local Partner
    locals_map: dict[int, dict] = {}
    for b in current_bookings:
        lid = b.local_profile_id
        if lid not in locals_map:
            local = session.get(LocalProfile, lid)
            locals_map[lid] = {"local_id": lid, "local_name": local.display_name if local else f"Local #{lid}", "city_name": local.city_name if local else "", "count": 0, "gross_earnings": 0.0, "platform_rev": 0.0}
        disc = getattr(b, "discount_amount", 0.0) or 0.0
        locals_map[lid]["count"] += 1
        locals_map[lid]["gross_earnings"] += b.subtotal
        locals_map[lid]["platform_rev"] += (b.platform_fee - disc)

    by_local = [
        LocalRevenueItem(
            local_id=v["local_id"],
            local_name=v["local_name"],
            city_name=v["city_name"],
            paid_bookings_count=v["count"],
            gross_earnings=round(v["gross_earnings"], 2),
            platform_revenue_generated=round(v["platform_rev"], 2),
        )
        for v in sorted(locals_map.values(), key=lambda x: x["gross_earnings"], reverse=True)
    ]

    # 4. By Promo Campaign
    promos = session.exec(select(PromoCode)).all()
    redemptions = session.exec(select(PromoRedemption)).all()
    by_promo = []
    for promo in promos:
        p_reds = [r for r in redemptions if r.promo_code_id == promo.id]
        if start_time or end_time:
            filtered_p_reds = []
            for r in p_reds:
                r_time = r.created_at
                if r_time.tzinfo is None:
                    r_time = r_time.replace(tzinfo=timezone.utc)
                if start_time and r_time < start_time:
                    continue
                if end_time and r_time > end_time:
                    continue
                filtered_p_reds.append(r)
            p_reds = filtered_p_reds
        burn = sum(r.discount_amount for r in p_reds)
        p_booking_ids = {r.booking_id for r in p_reds}
        p_bookings = [b for b in current_bookings if b.id in p_booking_ids]
        p_gbv = sum(b.subtotal + b.platform_fee - (getattr(b, "discount_amount", 0.0) or 0.0) for b in p_bookings)
        p_net = sum(b.platform_fee - (getattr(b, "discount_amount", 0.0) or 0.0) for b in p_bookings)
        if p_reds or promo.is_active:
            by_promo.append(PromoRevenueItem(
                code=promo.code,
                discount_type=f"{promo.discount_value}%" if promo.discount_type == "percentage" else f"${promo.discount_value}",
                redemptions_count=len(p_reds),
                total_discount_burn=round(burn, 2),
                associated_gbv=round(p_gbv, 2),
                net_platform_revenue=round(p_net, 2),
            ))

    # 5. By Referral Channel
    ref_codes = session.exec(select(ReferralCode)).all()
    by_referral = []
    for rc in ref_codes:
        r_attrs = [a for a in referral_attributions if a.referral_code_id == rc.id]
        if start_time or end_time:
            filtered_r_attrs = []
            for a in r_attrs:
                a_time = a.created_at
                if a_time.tzinfo is None:
                    a_time = a_time.replace(tzinfo=timezone.utc)
                if start_time and a_time < start_time:
                    continue
                if end_time and a_time > end_time:
                    continue
                filtered_r_attrs.append(a)
            r_attrs = filtered_r_attrs
        q_count = len([a for a in r_attrs if a.status in {"credited", "qualified", "rewarded"}])
        credits_earned = sum(a.reward_amount for a in r_attrs if a.status in {"credited", "qualified", "rewarded"})
        r_booking_ids = {a.qualifying_booking_id for a in r_attrs if getattr(a, "qualifying_booking_id", None)}
        r_bookings = [b for b in current_bookings if b.id in r_booking_ids]
        r_gbv = sum(b.subtotal + b.platform_fee - (getattr(b, "discount_amount", 0.0) or 0.0) for b in r_bookings)
        referrer = session.get(User, rc.user_id)
        if r_attrs or getattr(rc, "is_active", True):
            by_referral.append(ReferralRevenueItem(
                code=rc.code,
                referrer_name=referrer.full_name if referrer else f"User #{rc.user_id}",
                total_referred_users=getattr(rc, "total_referred_count", 0),
                qualified_bookings_count=q_count,
                total_credits_earned=round(credits_earned, 2),
                generated_booking_value=round(r_gbv, 2),
            ))

    # Payment Lifecycle Stats
    all_payments = session.exec(select(PaymentRecord)).all()
    if start_time or end_time:
        filtered_payments = []
        for p in all_payments:
            p_time = p.created_at
            if p_time.tzinfo is None:
                p_time = p_time.replace(tzinfo=timezone.utc)
            if start_time and p_time < start_time:
                continue
            if end_time and p_time > end_time:
                continue
            filtered_payments.append(p)
        all_payments = filtered_payments

    p_total = len(all_payments)
    p_paid = len([p for p in all_payments if p.status == "paid"])
    p_proc = len([p for p in all_payments if p.status == "processing"])
    p_fail = len([p for p in all_payments if p.status == "failed"])
    p_ref = len([p for p in all_payments if p.status == "refunded"])

    payment_stats = PaymentLifecycleStats(
        total_payment_attempts=p_total,
        paid_count=p_paid,
        processing_count=p_proc,
        failed_count=p_fail,
        refunded_count=p_ref,
        success_rate_pct=round((p_paid / p_total * 100), 2) if p_total > 0 else 100.0,
        failure_rate_pct=round((p_fail / p_total * 100), 2) if p_total > 0 else 0.0,
        refund_rate_pct=round((p_ref / p_paid * 100), 2) if p_paid > 0 else 0.0,
    )

    # Payout Aging
    payout_aging = get_payout_aging_breakdown(session)

    return RevenueAnalyticsResponse(
        kpis=kpis,
        trends=trend_series,
        by_city=by_city,
        by_category=by_category,
        by_local=by_local,
        by_promo=by_promo,
        by_referral=by_referral,
        payment_stats=payment_stats,
        payout_aging=payout_aging,
    )


@app.get("/api/admin/revenue/reconciliation", response_model=list[ReconciliationRow])
def admin_revenue_reconciliation(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    period: str = "all_time",
    from_date: str | None = None,
    to_date: str | None = None,
):
    start_time, end_time, _, _, _ = parse_date_window(period, from_date, to_date)
    sync_commission_ledger(session)

    bookings = session.exec(select(Booking).order_by(Booking.created_at.desc())).all()
    payments = session.exec(select(PaymentRecord)).all()
    ledgers = session.exec(select(CommissionLedger)).all()

    payment_by_booking = {p.booking_id: p for p in payments}
    ledger_by_booking = {l.booking_id: l for l in ledgers}

    rows = []
    for b in bookings:
        b_time = b.created_at
        if b_time.tzinfo is None:
            b_time = b_time.replace(tzinfo=timezone.utc)
        if start_time and b_time < start_time:
            continue
        if end_time and b_time > end_time:
            continue

        tourist = session.get(User, b.tourist_user_id)
        local = session.get(LocalProfile, b.local_profile_id)
        pay = payment_by_booking.get(b.id)
        led = ledger_by_booking.get(b.id)

        disc = getattr(b, "discount_amount", 0.0) or 0.0
        expected_total = round(b.subtotal + b.platform_fee - disc, 2)
        charged_amt = round(pay.amount_total_minor / 100.0, 2) if pay else 0.0

        # Discrepancy Classification
        reconciliation_status = "matched"
        discrepancy_note = "All records synchronized"

        if not pay:
            if settings.payment_required and b.status not in {"cancelled", "rejected"}:
                reconciliation_status = "mismatch"
                discrepancy_note = "Missing payment record for active booking"
            else:
                reconciliation_status = "matched"
                discrepancy_note = "Manual or free booking"
        elif not led:
            reconciliation_status = "mismatch"
            discrepancy_note = "Missing commission ledger entry"
        elif abs(charged_amt - expected_total) > 0.02 and pay.status == "paid":
            reconciliation_status = "mismatch"
            discrepancy_note = f"Charged amount (${charged_amt}) differs from booking total (${expected_total})"
        elif b.status == "completed" and led and led.payout_status == "held":
            reconciliation_status = "warning"
            discrepancy_note = "Booking completed but local payout remains held"
        elif b.status == "cancelled" and pay.status == "paid":
            reconciliation_status = "warning"
            discrepancy_note = "Booking cancelled while payment is captured (refund pending)"
        elif pay.status == "failed":
            reconciliation_status = "warning"
            discrepancy_note = "Payment failed at gateway"

        rows.append(ReconciliationRow(
            booking_id=b.id,
            booking_status=b.status,
            traveler_name=tourist.full_name if tourist else f"Tourist #{b.tourist_user_id}",
            local_name=local.display_name if local else f"Local #{b.local_profile_id}",
            booking_total=expected_total,
            payment_status=pay.status if pay else "unpaid",
            safepay_tracker=pay.payment_intent_id if pay else "",
            charged_amount=charged_amt,
            commission_gross=led.gross_amount if led else 0.0,
            local_payable=led.local_amount if led else round(b.subtotal, 2),
            platform_fee=led.platform_fee if led else round(b.platform_fee, 2),
            payout_status=led.payout_status if led else "unpaid",
            reconciliation_status=reconciliation_status,
            discrepancy_note=discrepancy_note,
        ))

    return rows


@app.get("/api/admin/revenue/payout-aging", response_model=PayoutAgingBreakdown)
def admin_revenue_payout_aging(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    return get_payout_aging_breakdown(session)


@app.post("/api/admin/commission/batch-update", response_model=BatchPayoutResult)
def admin_commission_batch_update(
    payload: BatchPayoutInput,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    if not payload.ledger_ids:
        raise HTTPException(400, "No settlement records specified for batch update")

    updated_ids = []
    total_amount = 0.0

    for lid in payload.ledger_ids:
        row = session.get(CommissionLedger, lid)
        if not row:
            continue
        if row.payout_status == "void":
            raise HTTPException(400, f"Cannot transition void ledger entry #{lid}")
        if row.payout_status == "paid" and payload.target_status == "paid":
            # Already paid - skip to maintain idempotency
            continue

        row.payout_status = payload.target_status
        if payload.reference_note:
            existing_note = row.notes or ""
            row.notes = f"{existing_note} [Batch: {payload.reference_note}]".strip()[:2000]
        row.updated_at = datetime.now(timezone.utc)
        session.add(row)
        updated_ids.append(row.id)
        total_amount += row.local_amount
        audit_event(session, admin.id, "admin.commission_batch_update", "commission_ledger", row.id, f"Batch update status to {payload.target_status}; ref: {payload.reference_note}")

    session.commit()
    return BatchPayoutResult(
        updated_count=len(updated_ids),
        target_status=payload.target_status,
        total_amount=round(total_amount, 2),
        updated_ids=updated_ids,
    )


@app.get("/api/admin/revenue/export/summary")
def admin_export_revenue_summary(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    period: str = "all_time",
    from_date: str | None = None,
    to_date: str | None = None,
):
    analytics = admin_revenue_analytics(_, session, period, from_date, to_date)
    k = analytics.kpis

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Period", "Start Date", "End Date", "Gross Booking Value",
        "Local Payables", "Platform Fees", "Promo Subsidies",
        "Referral Costs", "Net Platform Revenue", "Effective Take Rate (%)",
        "Paid Bookings Count", "Refund Volume", "Refund Count", "Currency",
    ])
    writer.writerow([
        k.period, k.start_date or "N/A", k.end_date or "N/A", k.gbv,
        k.total_local_payable, k.total_platform_fee, k.total_discount_spent,
        k.total_referral_cost, k.net_platform_revenue, k.effective_take_rate,
        k.paid_bookings_count, k.total_refund_volume, k.refund_count, k.currency,
    ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hirealocals_revenue_summary_{period}.csv"},
    )


@app.get("/api/admin/revenue/export/settlements")
def admin_export_settlements(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    sync_commission_ledger(session)
    ledgers = session.exec(select(CommissionLedger).order_by(CommissionLedger.updated_at.desc())).all()
    now = datetime.now(timezone.utc)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ledger ID", "Booking ID", "Local Partner Name", "Local Email",
        "Local Payable Amount", "Currency", "Payout Status",
        "Aging (Days)", "Last Updated (UTC)", "Settlement Notes",
    ])

    for l in ledgers:
        b = session.get(Booking, l.booking_id)
        local = session.get(LocalProfile, b.local_profile_id) if b else None
        local_user = session.get(User, local.user_id) if local else None
        ref_time = l.updated_at
        if ref_time.tzinfo is None:
            ref_time = ref_time.replace(tzinfo=timezone.utc)
        aging_days = (now - ref_time).days

        writer.writerow([
            l.id, l.booking_id, local.display_name if local else "N/A",
            local_user.email if local_user else "N/A", l.local_amount,
            settings.payment_currency.upper(), l.payout_status,
            aging_days, l.updated_at.isoformat(), l.notes or "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=hirealocals_payout_manifest.csv"},
    )


@app.get("/api/admin/revenue/export/reconciliation")
def admin_export_reconciliation(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    period: str = "all_time",
    from_date: str | None = None,
    to_date: str | None = None,
):
    rows = admin_revenue_reconciliation(_, session, period, from_date, to_date)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Booking ID", "Booking Status", "Traveler Name", "Local Partner Name",
        "Booking Total", "Payment Status", "Safepay Tracker", "Charged Total",
        "Local Payable", "Platform Fee", "Payout Status",
        "Reconciliation Status", "Discrepancy Notes",
    ])

    for r in rows:
        writer.writerow([
            r.booking_id, r.booking_status, r.traveler_name, r.local_name,
            r.booking_total, r.payment_status, r.safepay_tracker, r.charged_amount,
            r.local_payable, r.platform_fee, r.payout_status,
            r.reconciliation_status, r.discrepancy_note,
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hirealocals_reconciliation_ledger_{period}.csv"},
    )


@app.get("/api/admin/revenue/export/marketing")
def admin_export_marketing(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    period: str = "all_time",
    from_date: str | None = None,
    to_date: str | None = None,
):
    analytics = admin_revenue_analytics(_, session, period, from_date, to_date)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["=== PROMOTIONAL CAMPAIGNS ==="])
    writer.writerow(["Promo Code", "Discount Type", "Redemptions Count", "Total Discount Burn", "Associated GBV", "Net Platform Revenue Yield"])
    for p in analytics.by_promo:
        writer.writerow([p.code, p.discount_type, p.redemptions_count, p.total_discount_burn, p.associated_gbv, p.net_platform_revenue])

    writer.writerow([])
    writer.writerow(["=== REFERRAL CHANNELS ==="])
    writer.writerow(["Referral Code", "Referrer Name", "Referred Users Count", "Qualified Bookings Count", "Total Credits Earned", "Generated Booking Value"])
    for r in analytics.by_referral:
        writer.writerow([r.code, r.referrer_name, r.total_referred_users, r.qualified_bookings_count, r.total_credits_earned, r.generated_booking_value])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hirealocals_marketing_audit_{period}.csv"},
    )


@app.get("/api/admin/demand/summary", response_model=DemandSummaryResponse)
def admin_demand_summary(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    period: str = "all_time",
):
    now = datetime.now(timezone.utc)
    cutoff = None
    if period == "today":
        cutoff = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    elif period == "7d":
        cutoff = now - timedelta(days=7)
    elif period == "30d":
        cutoff = now - timedelta(days=30)

    events = session.exec(select(SearchEvent).order_by(SearchEvent.created_at.desc())).all()
    if cutoff:
        filtered = []
        for ev in events:
            ev_time = ev.created_at
            if ev_time.tzinfo is None:
                ev_time = ev_time.replace(tzinfo=timezone.utc)
            if ev_time >= cutoff:
                filtered.append(ev)
        events = filtered

    total_searches = len(events)
    zero_result_searches = sum(1 for e in events if e.is_zero_result)
    zero_result_rate = round((zero_result_searches / total_searches * 100), 2) if total_searches > 0 else 0.0

    city_counts: dict[str, dict] = {}
    for e in events:
        c_name = e.city_name.strip() or e.query.strip()
        if c_name:
            c_key = c_name.title()
            if c_key not in city_counts:
                city_counts[c_key] = {"city": c_key, "count": 0, "zero_results": 0}
            city_counts[c_key]["count"] += 1
            if e.is_zero_result:
                city_counts[c_key]["zero_results"] += 1

    top_cities = sorted(city_counts.values(), key=lambda x: x["count"], reverse=True)[:10]

    cat_counts: dict[str, dict] = {}
    for e in events:
        cat = e.category.strip()
        if cat:
            cat_key = cat.title()
            if cat_key not in cat_counts:
                cat_counts[cat_key] = {"category": cat_key, "count": 0, "zero_results": 0}
            cat_counts[cat_key]["count"] += 1
            if e.is_zero_result:
                cat_counts[cat_key]["zero_results"] += 1

    top_categories = sorted(cat_counts.values(), key=lambda x: x["count"], reverse=True)[:10]

    return {
        "period": period,
        "total_searches": total_searches,
        "zero_result_searches": zero_result_searches,
        "zero_result_rate": zero_result_rate,
        "top_searched_cities": top_cities,
        "top_searched_categories": top_categories,
    }


@app.get("/api/admin/audit")
def admin_audit_log(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    q: str = "",
    action: str = "",
    entity_type: str = "",
    page: int = 1,
    page_size: int = 50,
):
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    statement = select(AuditLog)
    if action.strip():
        statement = statement.where(AuditLog.action == action.strip())
    if entity_type.strip():
        statement = statement.where(AuditLog.entity_type == entity_type.strip())
    if q.strip():
        term = f"%{q.strip()}%"
        statement = statement.where(or_(
            AuditLog.action.ilike(term),
            AuditLog.entity_type.ilike(term),
            AuditLog.entity_id.ilike(term),
            AuditLog.summary.ilike(term),
        ))
    rows = session.exec(statement.order_by(AuditLog.created_at.desc())).all()
    total = len(rows)
    pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, pages)
    rows = rows[(page - 1) * page_size: page * page_size]
    items = []
    for row in rows:
        actor = session.get(User, row.actor_user_id) if row.actor_user_id else None
        items.append({
            "id": row.id,
            "actor_user_id": row.actor_user_id,
            "actor_name": actor.full_name if actor else "System",
            "actor_email": actor.email if actor else "",
            "action": row.action,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "summary": row.summary,
            "request_id": row.request_id,
            "created_at": row.created_at,
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


@app.get("/api/admin/system-status")
def admin_system_status(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    demo_emails = {
        "admin@hirealocals.com", "traveler@example.com", "james@example.com",
        "maya@example.com", "olivia@example.com", "daniel@example.com",
    }
    users = session.exec(select(User)).all()
    demo_present = [u.email for u in users if u.email.lower() in demo_emails]
    demo_active = [u.email for u in users if u.email.lower() in demo_emails and u.is_active]
    issues = settings.production_issues() if settings.is_production else []
    if settings.is_production and demo_active:
        issues = [*issues, "Known demo accounts are still active"]
    return {
        "version": "0.3.3",
        "environment": settings.app_env,
        "database": "postgresql" if settings.database_url.startswith(("postgresql", "postgres")) else "sqlite",
        "strict_production_checks": settings.strict_production_checks,
        "rate_limit_enabled": settings.rate_limit_enabled,
        "api_docs_enabled": settings.api_docs_enabled,
        "seed_demo_data": settings.seed_demo_data,
        "smtp_configured": bool(settings.smtp_host),
        "payment_mode": settings.payment_mode,
        "payment_provider": settings.payment_provider,
        "payment_currency": settings.payment_currency.upper(),
        "safepay_configured": (
            settings.safepay_enabled
            and bool(settings.safepay_public_key)
            and bool(settings.safepay_secret_key)
        ),
        "safepay_webhook_configured": (
            settings.safepay_enabled
            and bool(settings.safepay_webhook_secret)
        ),
        "production_issues": issues,
        "demo_accounts_present": demo_present,
        "demo_accounts_active": demo_active,
        "counts": {
            "users": len(users),
            "locals": len(session.exec(select(LocalProfile)).all()),
            "bookings": len(session.exec(select(Booking)).all()),
            "reviews": len(session.exec(select(Review)).all()),
            "audit_events": len(session.exec(select(AuditLog)).all()),
            "consent_records": len(session.exec(select(UserConsent)).all()),
            "launch_tasks": len(session.exec(select(LaunchTask)).all()),
        },
    }


LAUNCH_TASK_DEFAULTS = [
    ("legal_review", "Marketplace Terms and Privacy Policy reviewed for launch jurisdictions", "Legal", True),
    ("refund_policy", "Cancellation/refund policy finalized and published", "Legal", True),
    ("safepay_sandbox_e2e", "Payment sandbox booking â†’ checkout â†’ verified webhook â†’ refund workflow tested end-to-end", "Payments", True),
    ("backup_restore_test", "Production backup and restore procedure tested", "Operations", True),
    ("mobile_browser_qa", "Mobile + desktop QA completed on major browsers", "QA", True),
    ("provider_pilot", "At least one real verified Local completed the full onboarding flow", "Marketplace", True),
    ("domain_ssl", "Production domain, HTTPS, DNS and API routing verified", "Infrastructure", True),
    ("support_workflow", "Support inbox, notification and escalation workflow tested", "Operations", True),
]


def ensure_launch_tasks(session: Session) -> list[LaunchTask]:
    rows = session.exec(select(LaunchTask)).all()
    existing = {row.key for row in rows}
    changed = False
    for key, label, category, required in LAUNCH_TASK_DEFAULTS:
        if key not in existing:
            session.add(LaunchTask(key=key, label=label, category=category, required=required))
            changed = True
    if changed:
        session.commit()
    return session.exec(select(LaunchTask).order_by(LaunchTask.category, LaunchTask.id)).all()


def launch_check(code: str, label: str, ok: bool, detail: str, level: str = "required") -> dict:
    return {"code": code, "label": label, "ok": bool(ok), "detail": detail, "level": level}


@app.get("/api/admin/launch-control")
def admin_launch_control(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    tasks = ensure_launch_tasks(session)
    users = session.exec(select(User)).all()
    demo_emails = {"admin@hirealocals.com", "traveler@example.com", "james@example.com", "maya@example.com", "olivia@example.com", "daniel@example.com"}
    demo_active = [u.email for u in users if u.is_active and u.email.lower() in demo_emails]
    verified_locals = session.exec(select(LocalProfile).where(LocalProfile.verified == True)).all()  # noqa: E712
    active_services = session.exec(select(Service).where(Service.active == True)).all()  # noqa: E712
    published_cities = session.exec(select(SeoCity).where(SeoCity.published == True)).all()  # noqa: E712
    published_posts = session.exec(select(BlogPost).where(BlogPost.published == True)).all()  # noqa: E712
    support_email = get_setting(session, "support_email")
    checks = [
        launch_check("environment", "Production environment selected", settings.is_production, f"APP_ENV={settings.app_env}"),
        launch_check("database", "PostgreSQL configured", settings.database_url.startswith(("postgresql", "postgres")), "PostgreSQL" if settings.database_url.startswith(("postgresql", "postgres")) else "SQLite fallback is still active"),
        launch_check("https", "Frontend HTTPS configured", settings.frontend_url.lower().startswith("https://"), settings.frontend_url),
        launch_check("jwt", "Strong JWT secret configured", settings.jwt_secret != "change-me-in-production" and len(settings.jwt_secret) >= 32, "Secret value is never displayed"),
        launch_check("rate_limit", "Rate limiting enabled", settings.rate_limit_enabled, "Enabled" if settings.rate_limit_enabled else "Disabled"),
        launch_check("api_docs", "API docs disabled for production", not settings.api_docs_enabled, "Disabled" if not settings.api_docs_enabled else "Still enabled", "recommended"),
        launch_check("demo_seed", "Demo seeding disabled", not settings.seed_demo_data, f"SEED_DEMO_DATA={settings.seed_demo_data}"),
        launch_check("demo_accounts", "Demo accounts disabled", not demo_active, "No active known demo accounts" if not demo_active else ", ".join(demo_active)),
        launch_check("smtp", "SMTP configured", bool(settings.smtp_host), settings.smtp_host or "Not configured"),
        launch_check("support", "Support email configured", bool(support_email and "@" in support_email), support_email or "Missing"),
        launch_check("verified_locals", "At least one verified Local is live", len(verified_locals) > 0, f"{len(verified_locals)} verified Local(s)"),
        launch_check("services", "At least one active service exists", len(active_services) > 0, f"{len(active_services)} active service(s)"),
        launch_check("cities", "Published destination content exists", len(published_cities) > 0, f"{len(published_cities)} published city page(s)"),
        launch_check("blog", "Published travel content exists", len(published_posts) > 0, f"{len(published_posts)} published article(s)", "recommended"),
        launch_check("terms", "Terms version is finalized", bool(settings.terms_version and not settings.terms_version.lower().startswith("draft")), settings.terms_version),
        launch_check("privacy", "Privacy version is finalized", bool(settings.privacy_version and not settings.privacy_version.lower().startswith("draft")), settings.privacy_version),
        launch_check("booking_policy", "Booking/refund policy version is finalized", bool(settings.booking_policy_version and not settings.booking_policy_version.lower().startswith("draft")), settings.booking_policy_version),
        launch_check(
            "payments",
            "Live payment provider configured",
            (
                (
                    settings.payment_mode == "safepay_live"
                    and bool(settings.safepay_public_key)
                    and bool(settings.safepay_secret_key)
                    and bool(settings.safepay_webhook_secret)
                )
            ),
            settings.payment_mode,
            "recommended",
        ),
    ]
    required_checks = [x for x in checks if x["level"] == "required"]
    automatic_passed = sum(1 for x in required_checks if x["ok"])
    manual_required = [x for x in tasks if x.required]
    manual_passed = sum(1 for x in manual_required if x.done)
    total = len(required_checks) + len(manual_required)
    passed = automatic_passed + manual_passed
    score = round((passed / total) * 100) if total else 100
    blockers = [x["label"] for x in required_checks if not x["ok"]] + [x.label for x in manual_required if not x.done]
    return {
        "release": settings.release_version,
        "score": score,
        "ready": not blockers,
        "blockers": blockers,
        "automatic_checks": checks,
        "manual_tasks": [
            {"id": x.id, "key": x.key, "label": x.label, "category": x.category, "required": x.required, "done": x.done, "note": x.note, "updated_at": x.updated_at}
            for x in tasks
        ],
    }


@app.patch("/api/admin/launch-control/tasks/{task_key}")
def admin_launch_task_update(
    task_key: str,
    payload: LaunchTaskUpdate,
    request: Request,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    ensure_launch_tasks(session)
    row = session.exec(select(LaunchTask).where(LaunchTask.key == task_key)).first()
    if not row:
        raise HTTPException(404, "Launch task not found")
    row.done = payload.done
    row.note = payload.note.strip()
    row.updated_by_user_id = admin.id
    row.updated_at = datetime.now(timezone.utc)
    session.add(row); session.commit(); session.refresh(row)
    audit_event(session, admin.id, "admin.launch_task", "launch_task", row.id, f"{row.key}={'done' if row.done else 'open'}", request)
    return {"ok": True, "key": row.key, "done": row.done, "note": row.note}


def _valid_file_signature(data: bytes, mime_type: str) -> bool:
    if mime_type == "image/jpeg":
        return data.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/webp":
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    if mime_type == "application/pdf":
        return data.startswith(b"%PDF-")
    return False


async def _save_upload(file: UploadFile, user: User, kind: str, session: Session, public: bool) -> UploadRecord:
    allowed_images = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    allowed_docs = {**allowed_images, "application/pdf": ".pdf"}
    allowed = allowed_images if kind == "profile_image" else allowed_docs
    if file.content_type not in allowed:
        raise HTTPException(400, "Unsupported file type")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(413, "File is too large")
    if not _valid_file_signature(data, file.content_type or ""):
        raise HTTPException(400, "File content does not match the declared file type")
    folder = PUBLIC_UPLOAD_ROOT / "profiles" if public else PRIVATE_UPLOAD_ROOT / "verification"
    folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{allowed[file.content_type]}"
    target = folder / stored_name
    target.write_bytes(data)
    public_url = f"/uploads/profiles/{stored_name}" if public else ""
    row = UploadRecord(
        owner_user_id=user.id, kind=kind, original_name=(file.filename or "upload")[:255],
        stored_path=str(target), mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(data), status="approved" if public else "pending", public_url=public_url,
    )
    session.add(row); session.commit(); session.refresh(row)
    return row


@app.post("/api/uploads/profile-image")
async def upload_profile_image(
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
    file: UploadFile = File(...),
):
    if user.role not in {"tourist", "local", "admin"}:
        raise HTTPException(403, "Profile image upload is not available for this account")
    row = await _save_upload(file, user, "profile_image", session, True)
    absolute_url = str(request.base_url).rstrip("/") + row.public_url
    if user.role == "local":
        profile = require_local_profile(user, session)
        profile.image_url = absolute_url
        session.add(profile); session.commit()
    elif user.role == "tourist":
        profile = get_or_create_traveler_profile(user, session)
        profile.image_url = absolute_url
        profile.updated_at = datetime.now(timezone.utc)
        session.add(profile); session.commit()
    return {"ok": True, "url": absolute_url, "upload": upload_public_dict(row, user)}


@app.post("/api/local/verification-document")
async def local_verification_document(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
    file: UploadFile = File(...),
):
    require_local_profile(user, session)
    row = await _save_upload(file, user, "verification_document", session, False)
    return {"ok": True, "upload": upload_public_dict(row, user)}


@app.get("/api/local/uploads")
def local_uploads(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    require_local_profile(user, session)
    rows = session.exec(select(UploadRecord).where(UploadRecord.owner_user_id == user.id).order_by(UploadRecord.created_at.desc())).all()
    return [upload_public_dict(row, user) for row in rows]


@app.get("/api/admin/uploads")
def admin_uploads(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    rows = session.exec(select(UploadRecord).order_by(UploadRecord.created_at.desc())).all()
    return [upload_public_dict(row, session.get(User, row.owner_user_id)) for row in rows]


@app.patch("/api/admin/uploads/{upload_id}/status")
def admin_upload_status(
    upload_id: int,
    payload: StatusUpdate,
    admin: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    row = session.get(UploadRecord, upload_id)
    if not row:
        raise HTTPException(404, "Upload not found")
    if payload.status not in {"pending", "approved", "rejected"}:
        raise HTTPException(400, "Invalid upload status")
    row.status = payload.status
    session.add(row)
    if row.kind == "verification_document":
        owner = session.get(User, row.owner_user_id)
        if owner and owner.role == "local":
            profile = session.exec(select(LocalProfile).where(LocalProfile.user_id == owner.id)).first()
            if profile:
                if payload.status == "approved":
                    profile.verified = True
                elif payload.status == "rejected":
                    other_approved = session.exec(
                        select(UploadRecord).where(
                            UploadRecord.owner_user_id == owner.id,
                            UploadRecord.kind == "verification_document",
                            UploadRecord.status == "approved",
                            UploadRecord.id != row.id,
                        )
                    ).first()
                    if not other_approved:
                        profile.verified = False
                session.add(profile)
    session.commit(); session.refresh(row)
    if row.kind == "verification_document":
        add_notification(session, row.owner_user_id, "verification_document", f"Verification document {row.status}", f"Your verification document {row.original_name} was marked {row.status}.", "/local-dashboard/profile", email=True)
    audit_event(session, admin.id, "admin.upload_status", "upload", row.id, f"{row.kind} marked {row.status}")
    return {"ok": True, "id": row.id, "status": row.status}


@app.get("/api/admin/uploads/{upload_id}/file")
def admin_upload_file(
    upload_id: int,
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    row = session.get(UploadRecord, upload_id)
    if not row:
        raise HTTPException(404, "Upload not found")
    path = Path(row.stored_path).resolve()
    allowed_roots = [PUBLIC_UPLOAD_ROOT.resolve(), PRIVATE_UPLOAD_ROOT.resolve()]
    if not any(root == path or root in path.parents for root in allowed_roots) or not path.exists():
        raise HTTPException(404, "Stored file not found")
    return FileResponse(path=str(path), media_type=row.mime_type, filename=row.original_name)


@app.post("/api/contact")
def contact(payload: ContactInput, request: Request, session: Annotated[Session, Depends(get_session)]):
    enforce_rate_limit(session, request, "contact", 5, 600, payload.email)
    item = ContactMessage(**payload.model_dump())
    session.add(item); session.commit(); session.refresh(item)
    state = SupportState(contact_message_id=item.id, status="open")
    session.add(state); session.commit()
    notify_admins(session, "support_message", "New support message", f"{item.name}: {item.subject}", f"/admin/support?id={item.id}")
    queue_email(session, item.email, "We received your HireALocals message", f"Hello {item.name},\n\nWe received your message: {item.subject}.\n\nOur support team will reply as soon as possible.\nReference: HAL-SUPPORT-{item.id}")
    return {"ok": True, "id": item.id, "reference": f"HAL-SUPPORT-{item.id}"}


# ------------------------- Notifications -------------------------

@app.get("/api/notifications")
def notifications(user: Annotated[User, Depends(current_user)], session: Annotated[Session, Depends(get_session)], limit: int = 50):
    rows = session.exec(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(min(max(limit, 1), 100))).all()
    return rows


@app.get("/api/notifications/unread-count")
def notification_unread_count(user: Annotated[User, Depends(current_user)], session: Annotated[Session, Depends(get_session)]):
    rows = session.exec(select(Notification).where(Notification.user_id == user.id, Notification.read_at == None)).all()
    return {"count": len(rows)}


@app.patch("/api/notifications/{notification_id}/read")
def notification_read(notification_id: int, user: Annotated[User, Depends(current_user)], session: Annotated[Session, Depends(get_session)]):
    row = session.get(Notification, notification_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, "Notification not found")
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc); session.add(row); session.commit()
    return {"ok": True}


@app.post("/api/notifications/read-all")
def notification_read_all(user: Annotated[User, Depends(current_user)], session: Annotated[Session, Depends(get_session)]):
    rows = session.exec(select(Notification).where(Notification.user_id == user.id, Notification.read_at == None)).all()
    now = datetime.now(timezone.utc)
    for row in rows:
        row.read_at = now; session.add(row)
    session.commit()
    return {"ok": True, "updated": len(rows)}


# ------------------------- Support inbox / email operations -------------------------

def support_row(session: Session, item: ContactMessage) -> dict:

    state = session.exec(
        select(SupportState).where(
            SupportState.contact_message_id ==
            item.id
        )
    ).first()

    if not state:

        state = SupportState(
            contact_message_id=item.id
        )

        session.add(state)
        session.commit()
        session.refresh(state)

    replies = session.exec(
        select(SupportReply)
        .where(
            SupportReply.contact_message_id ==
            item.id
        )
        .order_by(
            SupportReply.created_at.asc()
        )
    ).all()

    reply_rows = []

    for reply in replies:

        admin = session.get(
            User,
            reply.admin_user_id,
        )

        reply_rows.append(
            {
                "id": reply.id,
                "message": reply.message,
                "created_at":
                    reply.created_at,
                "admin_name": (
                    admin.full_name
                    if admin
                    else "Admin"
                ),
            }
        )

    report_upload_id = None

    for line in item.message.splitlines():

        prefix = "Screenshot upload ID:"

        if line.startswith(prefix):

            value = (
                line
                .split(":", 1)[1]
                .strip()
            )

            if value.isdigit():

                report_upload_id = int(
                    value
                )

            break

    return {
        "id": item.id,
        "reference":
            f"HAL-SUPPORT-{item.id}",
        "name": item.name,
        "email": item.email,
        "subject": item.subject,
        "message": item.message,
        "created_at": item.created_at,
        "status": state.status,
        "admin_note":
            state.admin_note,
        "assigned_user_id":
            state.assigned_user_id,
        "report_upload_id":
            report_upload_id,
        "replies": reply_rows,
    }


@app.get("/api/admin/support")
def admin_support(_: Annotated[User, Depends(admin_user)], session: Annotated[Session, Depends(get_session)]):
    rows=session.exec(select(ContactMessage).order_by(ContactMessage.created_at.desc())).all()
    return [support_row(session,row) for row in rows]


@app.patch("/api/admin/support/{message_id}")
def admin_support_update(message_id:int,payload:SupportUpdateInput,admin:Annotated[User,Depends(admin_user)],session:Annotated[Session,Depends(get_session)]):
    item=session.get(ContactMessage,message_id)
    if not item: raise HTTPException(404,"Support message not found")
    if payload.status not in {"open","pending","closed"}: raise HTTPException(400,"Invalid support status")
    state=session.exec(select(SupportState).where(SupportState.contact_message_id==message_id)).first() or SupportState(contact_message_id=message_id)
    state.status=payload.status; state.admin_note=payload.admin_note.strip(); state.assigned_user_id=admin.id; state.updated_at=datetime.now(timezone.utc)
    session.add(state); session.commit()
    audit_event(session, admin.id, "admin.support_status", "support", item.id, f"Status set to {state.status}")
    return support_row(session,item)


@app.post("/api/admin/support/{message_id}/reply")
def admin_support_reply(message_id:int,payload:SupportReplyInput,admin:Annotated[User,Depends(admin_user)],session:Annotated[Session,Depends(get_session)]):
    item=session.get(ContactMessage,message_id)
    if not item: raise HTTPException(404,"Support message not found")
    reply=SupportReply(contact_message_id=message_id,admin_user_id=admin.id,message=payload.message.strip())
    session.add(reply)
    state=session.exec(select(SupportState).where(SupportState.contact_message_id==message_id)).first() or SupportState(contact_message_id=message_id)
    state.status="pending"; state.assigned_user_id=admin.id; state.updated_at=datetime.now(timezone.utc); session.add(state); session.commit(); session.refresh(reply)
    queue_email(session,item.email,f"Re: {item.subject} [{f'HAL-SUPPORT-{item.id}'}]",f"Hello {item.name},\n\n{reply.message}\n\nHireALocals Support")
    audit_event(session, admin.id, "admin.support_reply", "support", item.id, "Support reply sent")
    return {"ok":True,"reply_id":reply.id}


@app.get("/api/admin/email-outbox")
def admin_email_outbox(_:Annotated[User,Depends(admin_user)],session:Annotated[Session,Depends(get_session)],limit:int=100):
    return session.exec(select(EmailOutbox).order_by(EmailOutbox.created_at.desc()).limit(min(max(limit,1),200))).all()


@app.post("/api/admin/email-outbox/{email_id}/retry")
def admin_email_retry(email_id:int,admin:Annotated[User,Depends(admin_user)],session:Annotated[Session,Depends(get_session)]):
    row=session.get(EmailOutbox,email_id)
    if not row: raise HTTPException(404,"Email not found")
    row.status="queued"; row.last_error=""; session.add(row); session.commit(); _deliver_outbox_row(session,row); session.refresh(row)
    audit_event(session, admin.id, "admin.email_retry", "email_outbox", row.id, f"Retry result: {row.status}")
    return {"ok":True,"status":row.status,"last_error":row.last_error}


# ---------------------------------------------------------------------------
# V2.9 â€” DB-driven SEO cities, travel guide CMS and service taxonomy
# ---------------------------------------------------------------------------

def seo_city_dict(session: Session, row: SeoCity) -> dict:
    local_count = len(session.exec(select(LocalProfile).where(
        LocalProfile.country_code == row.country_code,
        LocalProfile.city_slug == row.slug,
    )).all())
    return {**row.model_dump(), "local_count": local_count, "url": f"/{row.country_slug}/{row.slug}"}


def blog_post_dict(row: BlogPost, include_content: bool = True) -> dict:
    data = row.model_dump()
    if not include_content:
        data.pop("content", None)
    return data


@app.get("/api/content/cities")
def public_cities(country: str = "", featured: bool = False, session: Session = Depends(get_session)):
    rows = session.exec(select(SeoCity).where(SeoCity.published == True).order_by(SeoCity.sort_order, SeoCity.name)).all()
    if country:
        needle = country.lower().strip()
        rows = [r for r in rows if r.country_code.lower() == needle or r.country_slug.lower() == needle]
    if featured:
        rows = [r for r in rows if r.featured]
    return [seo_city_dict(session, r) for r in rows]


@app.get("/api/content/cities/{country_slug}/{city_slug}")
def public_city(country_slug: str, city_slug: str, session: Session = Depends(get_session)):
    row = session.exec(select(SeoCity).where(
        SeoCity.country_slug == country_slug.lower().strip(),
        SeoCity.slug == city_slug.lower().strip(),
        SeoCity.published == True,
    )).first()
    if not row:
        raise HTTPException(404, "City page not found")
    return seo_city_dict(session, row)


@app.get("/api/content/blog")
def public_blog(category: str = "", featured: bool = False, session: Session = Depends(get_session)):
    rows = session.exec(select(BlogPost).where(BlogPost.published == True).order_by(BlogPost.published_at.desc(), BlogPost.created_at.desc())).all()
    if category:
        rows = [r for r in rows if r.category.lower() == category.lower().strip()]
    if featured:
        rows = [r for r in rows if r.featured]
    return [blog_post_dict(r, include_content=False) for r in rows]


@app.get("/api/content/blog/{slug}")
def public_blog_post(slug: str, session: Session = Depends(get_session)):
    row = session.exec(select(BlogPost).where(BlogPost.slug == slug.lower().strip(), BlogPost.published == True)).first()
    if not row:
        raise HTTPException(404, "Travel guide not found")
    return blog_post_dict(row, include_content=True)


@app.get("/api/content/service-categories")
def public_service_categories(session: Session = Depends(get_session)):
    rows = session.exec(select(ServiceCategory).where(ServiceCategory.active == True).order_by(ServiceCategory.sort_order, ServiceCategory.name)).all()
    return [r.model_dump() for r in rows]


@app.get("/api/admin/seo-cities")
def admin_seo_cities(_: User = Depends(admin_user), session: Session = Depends(get_session)):
    rows = session.exec(select(SeoCity).order_by(SeoCity.sort_order, SeoCity.name)).all()
    return [seo_city_dict(session, r) for r in rows]


@app.post("/api/admin/seo-cities")
def admin_create_seo_city(payload: SeoCityInput, admin: User = Depends(admin_user), session: Session = Depends(get_session)):
    country_slug = slugify(payload.country_slug)
    city_slug = slugify(payload.slug)
    key = f"{country_slug}/{city_slug}"
    if session.exec(select(SeoCity).where(SeoCity.path_key == key)).first():
        raise HTTPException(409, "A city page already uses this URL")
    data = payload.model_dump()
    data.update({"country_code": payload.country_code.upper(), "country_slug": country_slug, "slug": city_slug})
    row = SeoCity(path_key=key, **data)
    if not row.meta_title:
        row.meta_title = f"Hire a Local in {row.name}"
    if not row.meta_description:
        row.meta_description = row.description[:320]
    session.add(row); session.commit(); session.refresh(row)
    audit_event(session, admin.id, "admin.seo_city_create", "seo_city", row.id, row.path_key)
    return seo_city_dict(session, row)


@app.patch("/api/admin/seo-cities/{city_id}")
def admin_update_seo_city(city_id: int, payload: SeoCityUpdate, admin: User = Depends(admin_user), session: Session = Depends(get_session)):
    row = session.get(SeoCity, city_id)
    if not row:
        raise HTTPException(404, "City page not found")
    updates = payload.model_dump(exclude_unset=True)
    country_slug = slugify(str(updates.get("country_slug", row.country_slug)))
    city_slug = slugify(str(updates.get("slug", row.slug)))
    key = f"{country_slug}/{city_slug}"
    if key != row.path_key:
        raise HTTPException(400, "City URL slugs are locked after creation to protect SEO. Create a new city page if the URL must change.")
    updates["country_slug"] = row.country_slug
    updates["slug"] = row.slug
    updates["path_key"] = row.path_key
    if "country_code" in updates:
        updates["country_code"] = str(updates["country_code"]).upper()
    for key_name, value in updates.items():
        setattr(row, key_name, value)
    row.updated_at = datetime.now(timezone.utc)
    session.add(row); session.commit(); session.refresh(row)
    audit_event(session, admin.id, "admin.seo_city_update", "seo_city", row.id, row.path_key)
    return seo_city_dict(session, row)


@app.get("/api/admin/blog")
def admin_blog(_: User = Depends(admin_user), session: Session = Depends(get_session)):
    rows = session.exec(select(BlogPost).order_by(BlogPost.updated_at.desc())).all()
    return [blog_post_dict(r, include_content=True) for r in rows]


@app.post("/api/admin/blog")
def admin_create_blog(payload: BlogPostInput, admin: User = Depends(admin_user), session: Session = Depends(get_session)):
    slug = slugify(payload.slug)
    if session.exec(select(BlogPost).where(BlogPost.slug == slug)).first():
        raise HTTPException(409, "A travel guide already uses this slug")
    data = payload.model_dump()
    data["slug"] = slug
    row = BlogPost(**data)
    if not row.meta_title:
        row.meta_title = row.title[:180]
    if not row.meta_description:
        row.meta_description = row.excerpt[:320]
    if row.published:
        row.published_at = datetime.now(timezone.utc)
    session.add(row); session.commit(); session.refresh(row)
    audit_event(session, admin.id, "admin.blog_create", "blog_post", row.id, row.slug)
    return blog_post_dict(row, True)


@app.patch("/api/admin/blog/{post_id}")
def admin_update_blog(post_id: int, payload: BlogPostUpdate, admin: User = Depends(admin_user), session: Session = Depends(get_session)):
    row = session.get(BlogPost, post_id)
    if not row:
        raise HTTPException(404, "Travel guide not found")
    updates = payload.model_dump(exclude_unset=True)
    if "slug" in updates:
        new_slug = slugify(str(updates["slug"]))
        if row.published and new_slug != row.slug:
            raise HTTPException(400, "Published article slugs are locked to protect existing SEO URLs.")
        conflict = session.exec(select(BlogPost).where(BlogPost.slug == new_slug, BlogPost.id != row.id)).first()
        if conflict:
            raise HTTPException(409, "Another travel guide already uses this slug")
        updates["slug"] = new_slug
    was_published = row.published
    for key_name, value in updates.items():
        setattr(row, key_name, value)
    if row.published and not was_published:
        row.published_at = datetime.now(timezone.utc)
    row.updated_at = datetime.now(timezone.utc)
    session.add(row); session.commit(); session.refresh(row)
    audit_event(session, admin.id, "admin.blog_update", "blog_post", row.id, row.slug)
    return blog_post_dict(row, True)


@app.get("/api/admin/service-categories")
def admin_service_categories(_: User = Depends(admin_user), session: Session = Depends(get_session)):
    rows = session.exec(select(ServiceCategory).order_by(ServiceCategory.sort_order, ServiceCategory.name)).all()
    out = []
    for row in rows:
        service_count = len(session.exec(select(Service).where(Service.category == row.name)).all())
        out.append({**row.model_dump(), "service_count": service_count})
    return out


@app.post("/api/admin/service-categories")
def admin_create_service_category(payload: ServiceCategoryInput, admin: User = Depends(admin_user), session: Session = Depends(get_session)):
    slug = slugify(payload.slug or payload.name)
    if session.exec(select(ServiceCategory).where((ServiceCategory.slug == slug) | (ServiceCategory.name == payload.name.strip()))).first():
        raise HTTPException(409, "This service category already exists")
    data = payload.model_dump()
    data.update({"name": payload.name.strip(), "slug": slug})
    row = ServiceCategory(**data)
    session.add(row); session.commit(); session.refresh(row)
    audit_event(session, admin.id, "admin.service_category_create", "service_category", row.id, row.name)
    return row.model_dump()


@app.patch("/api/admin/service-categories/{category_id}")
def admin_update_service_category(category_id: int, payload: ServiceCategoryUpdate, admin: User = Depends(admin_user), session: Session = Depends(get_session)):
    row = session.get(ServiceCategory, category_id)
    if not row:
        raise HTTPException(404, "Service category not found")
    updates = payload.model_dump(exclude_unset=True)
    old_name = row.name
    new_name = str(updates.get("name", row.name)).strip()
    new_slug = slugify(str(updates.get("slug") or new_name))
    conflict = session.exec(select(ServiceCategory).where(ServiceCategory.id != row.id, (ServiceCategory.slug == new_slug) | (ServiceCategory.name == new_name))).first()
    if conflict:
        raise HTTPException(409, "Another service category already uses this name or slug")
    updates["name"] = new_name
    updates["slug"] = new_slug
    for key_name, value in updates.items():
        setattr(row, key_name, value)
    row.updated_at = datetime.now(timezone.utc)
    # Keep existing provider services aligned if an admin renames a taxonomy item.
    if old_name != new_name:
        services = session.exec(select(Service).where(Service.category == old_name)).all()
        for service in services:
            service.category = new_name
            session.add(service)
    session.add(row); session.commit(); session.refresh(row)
    audit_event(session, admin.id, "admin.service_category_update", "service_category", row.id, row.name)
    return row.model_dump()


# ============================================================================
# PUBLIC SITE CONTENT
# Restored support/contact/social content contract.
# ============================================================================

_HAL_SITE_CONTENT_DEFAULTS: dict[str, str] = {
    "support_email": "support@hirealocals.com",
    "support_phone": "",
    "whatsapp_number": "",
    "facebook_url": "",
    "youtube_url": "",
    "linkedin_url": "",
    "instagram_url": "",
    "footer_help_title": "Need help?",
    "footer_social_title": "Follow HireALocals",
}


def _hal_site_content_values(
    session: Session,
) -> dict[str, str]:
    result: dict[str, str] = {}

    for key, default in _HAL_SITE_CONTENT_DEFAULTS.items():
        value = get_setting(session, key)

        if value is None:
            value = default

        value = str(value)

        if not value and default:
            value = default

        result[key] = value

    return result


@app.get("/api/content/site")
def public_site_content(
    session: Annotated[Session, Depends(get_session)],
):
    return _hal_site_content_values(session)


@app.get("/api/admin/site-content")
def admin_site_content(
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    return _hal_site_content_values(session)


@app.patch("/api/admin/site-content")
def admin_site_content_update(
    payload: dict[str, str],
    _: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    allowed = set(_HAL_SITE_CONTENT_DEFAULTS)

    unknown = set(payload) - allowed

    if unknown:
        raise HTTPException(
            400,
            "Unsupported site-content field.",
        )

    data: dict[str, str] = {}

    for key in _HAL_SITE_CONTENT_DEFAULTS:
        value = str(payload.get(key, "") or "").strip()
        data[key] = value

    email = data["support_email"]

    if (
        not email
        or "@" not in email
        or email.startswith("@")
        or email.endswith("@")
    ):
        raise HTTPException(
            400,
            "Enter a valid support email address.",
        )

    for key in (
        "facebook_url",
        "youtube_url",
        "linkedin_url",
        "instagram_url",
    ):
        value = data[key]

        if value and not value.startswith(
            ("https://", "http://")
        ):
            raise HTTPException(
                400,
                f"{key} must be a full http/https URL.",
            )

    for key, value in data.items():
        row = session.exec(
            select(SiteSetting).where(
                SiteSetting.key == key
            )
        ).first()

        if row is None:
            row = SiteSetting(
                key=key,
                value=value,
            )
        else:
            row.value = value

        session.add(row)

    session.commit()

    return _hal_site_content_values(session)

# Didit hosted Local identity verification
app.include_router(didit_kyc_router)


# ============================================================================
# POINT 4: REQUEST-A-LOCAL (DEMAND CAPTURE, MATCHING & CONVERSION)
# ============================================================================

def _hal_is_local_eligible(session: Session, profile: LocalProfile) -> bool:
    return bool(profile.verified or local_kyc_approved(session, profile))


def _hal_offer_dict(session: Session, offer: RequestOffer) -> dict:
    local = session.get(LocalProfile, offer.local_profile_id)
    return {
        "id": offer.id,
        "trip_request_id": offer.trip_request_id,
        "local_profile_id": offer.local_profile_id,
        "local_name": local.display_name if local else "Local Partner",
        "local_slug": local.slug if local else "",
        "local_image": local.image_url if local else "",
        "local_city": local.city_name if local else "",
        "local_rating": local.rating if local else 0.0,
        "local_review_count": local.review_count if local else 0,
        "local_hourly_rate": local.hourly_rate if local else 30.0,
        "local_verified": _hal_is_local_eligible(session, local) if local else False,
        "offered_price": offer.offered_price,
        "currency": offer.currency,
        "duration_hours": offer.duration_hours,
        "proposed_start_time": offer.proposed_start_time,
        "proposal_message": offer.proposal_message,
        "inclusions": offer.inclusions,
        "status": offer.status,
        "created_at": offer.created_at.isoformat() if offer.created_at else "",
        "updated_at": offer.updated_at.isoformat() if offer.updated_at else "",
    }


def _hal_request_dict(session: Session, req: TripRequest, include_offers: bool = True) -> dict:
    offers_data = []
    if include_offers:
        offers = session.exec(
            select(RequestOffer)
            .where(RequestOffer.trip_request_id == req.id)
            .order_by(RequestOffer.created_at.asc())
        ).all()
        offers_data = [_hal_offer_dict(session, o) for o in offers]

    traveler = session.get(User, req.tourist_user_id)

    return {
        "id": req.id,
        "tourist_user_id": req.tourist_user_id,
        "traveler_name": traveler.full_name if traveler else "Traveler",
        "traveler_email": traveler.email if traveler else "",
        "country_code": req.country_code,
        "city_name": req.city_name,
        "city_slug": req.city_slug,
        "booking_date": req.booking_date,
        "flexible_dates": req.flexible_dates,
        "date_end": req.date_end,
        "preferred_time": req.preferred_time,
        "duration_hours": req.duration_hours,
        "guests": req.guests,
        "category": req.category,
        "title": req.title,
        "description": req.description,
        "interests": req.interests,
        "language_preference": req.language_preference,
        "budget_amount": req.budget_amount,
        "budget_currency": req.budget_currency,
        "special_requirements": req.special_requirements,
        "meeting_preference": req.meeting_preference,
        "status": req.status,
        "selected_offer_id": req.selected_offer_id,
        "converted_booking_id": req.converted_booking_id,
        "offer_count": len(offers_data) if include_offers else len(session.exec(select(RequestOffer.id).where(RequestOffer.trip_request_id == req.id)).all()),
        "offers": offers_data,
        "expires_at": req.expires_at.isoformat() if req.expires_at else None,
        "created_at": req.created_at.isoformat() if req.created_at else "",
        "updated_at": req.updated_at.isoformat() if req.updated_at else "",
    }


@app.post("/api/requests")
def create_custom_request(
    payload: TripRequestInput,
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    enforce_rate_limit(session, request, "request_create", 20, 3600, str(user.id))

    clean_city = payload.city_name.strip()
    c_slug = slugify(clean_city)

    trip_req = TripRequest(
        tourist_user_id=user.id,
        country_code=(payload.country_code or "GB").strip().upper(),
        city_name=clean_city,
        city_slug=c_slug,
        booking_date=payload.booking_date.strip(),
        flexible_dates=payload.flexible_dates,
        date_end=payload.date_end.strip() if payload.date_end else None,
        preferred_time=payload.preferred_time.strip() or "morning",
        duration_hours=payload.duration_hours,
        guests=payload.guests,
        category=payload.category.strip() or "Custom Experience",
        title=payload.title.strip() or f"{payload.category} in {clean_city}",
        description=payload.description.strip(),
        interests=payload.interests.strip(),
        language_preference=payload.language_preference.strip() or "English",
        budget_amount=payload.budget_amount,
        budget_currency=payload.budget_currency.strip() or "USD",
        special_requirements=payload.special_requirements.strip(),
        meeting_preference=payload.meeting_preference.strip(),
        status="submitted",
    )

    session.add(trip_req)
    session.commit()
    session.refresh(trip_req)

    # Find matching verified locals and queue notifications
    candidate_locals = session.exec(
        select(LocalProfile).where(
            or_(
                LocalProfile.city_slug == c_slug,
                LocalProfile.country_code == trip_req.country_code,
            )
        )
    ).all()

    for cand in candidate_locals:
        if _hal_is_local_eligible(session, cand) and cand.user_id and cand.user_id != user.id:
            add_notification(
                session,
                cand.user_id,
                "opportunity_new",
                f"New opportunity in {trip_req.city_name}",
                f"{user.full_name} is looking for a local on {trip_req.booking_date} ({trip_req.category}). Submit a quote to win this trip!",
                "/local-dashboard/opportunities",
                email=False,
            )

    notify_admins(
        session,
        "custom_request",
        f"New custom request #{trip_req.id}",
        f"{user.full_name} submitted a custom request in {trip_req.city_name}.",
        "/admin/requests",
    )

    audit_event(
        session,
        user.id,
        "request.created",
        "trip_request",
        trip_req.id,
        f"Created custom request for {trip_req.city_name} on {trip_req.booking_date}",
        request,
    )

    return _hal_request_dict(session, trip_req, include_offers=True)


@app.get("/api/traveler/requests")
def list_traveler_requests(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    reqs = session.exec(
        select(TripRequest)
        .where(TripRequest.tourist_user_id == user.id)
        .order_by(TripRequest.created_at.desc())
    ).all()
    return [_hal_request_dict(session, r, include_offers=True) for r in reqs]


@app.get("/api/traveler/requests/{request_id}")
def get_traveler_request_detail(
    request_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    req = session.get(TripRequest, request_id)
    if not req:
        raise HTTPException(404, "Trip request not found")
    if req.tourist_user_id != user.id and user.role != "admin":
        raise HTTPException(403, "You do not own this request")
    return _hal_request_dict(session, req, include_offers=True)


@app.patch("/api/traveler/requests/{request_id}/cancel")
def cancel_traveler_request(
    request_id: int,
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    req = session.get(TripRequest, request_id)
    if not req:
        raise HTTPException(404, "Trip request not found")
    if req.tourist_user_id != user.id and user.role != "admin":
        raise HTTPException(403, "You do not own this request")
    if req.status == "converted_to_booking":
        raise HTTPException(409, "Cannot cancel a request that has already been converted to a booking")

    req.status = "cancelled"
    req.updated_at = datetime.now(timezone.utc)
    session.add(req)

    # Transition open offers to declined
    offers = session.exec(
        select(RequestOffer).where(
            RequestOffer.trip_request_id == req.id,
            RequestOffer.status == "submitted",
        )
    ).all()
    for o in offers:
        o.status = "declined"
        o.updated_at = datetime.now(timezone.utc)
        session.add(o)

    session.commit()
    audit_event(session, user.id, "request.cancelled", "trip_request", req.id, f"Cancelled custom request #{req.id}", request)
    return {"ok": True, "status": "cancelled"}


@app.get("/api/local/requests")
def list_local_opportunities(
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    if not _hal_is_local_eligible(session, profile):
        raise HTTPException(403, "KYC verified approval required to access marketplace opportunities")

    open_reqs = session.exec(
        select(TripRequest).where(
            or_(
                TripRequest.city_slug == profile.city_slug,
                TripRequest.country_code == profile.country_code,
            ),
            TripRequest.status.in_(["submitted", "matching", "offers_received"]),
        ).order_by(TripRequest.created_at.desc())
    ).all()

    results = []
    for r in open_reqs:
        # Check if local submitted an offer for this request
        my_offer = session.exec(
            select(RequestOffer).where(
                RequestOffer.trip_request_id == r.id,
                RequestOffer.local_profile_id == profile.id,
            )
        ).first()

        item = _hal_request_dict(session, r, include_offers=False)
        item["my_offer"] = _hal_offer_dict(session, my_offer) if my_offer else None
        results.append(item)

    return results


@app.get("/api/local/requests/{request_id}")
def get_local_opportunity_detail(
    request_id: int,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    if not _hal_is_local_eligible(session, profile):
        raise HTTPException(403, "KYC verified approval required to access marketplace opportunities")

    r = session.get(TripRequest, request_id)
    if not r:
        raise HTTPException(404, "Trip request not found")

    my_offer = session.exec(
        select(RequestOffer).where(
            RequestOffer.trip_request_id == r.id,
            RequestOffer.local_profile_id == profile.id,
        )
    ).first()

    item = _hal_request_dict(session, r, include_offers=False)
    item["my_offer"] = _hal_offer_dict(session, my_offer) if my_offer else None
    return item


@app.post("/api/local/requests/{request_id}/offers")
def submit_local_quote(
    request_id: int,
    payload: RequestOfferInput,
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    if not _hal_is_local_eligible(session, profile):
        raise HTTPException(403, "KYC verified approval required to submit quotes")

    trip_req = session.get(TripRequest, request_id)
    if not trip_req:
        raise HTTPException(404, "Trip request not found")
    if trip_req.status not in ["submitted", "matching", "offers_received"]:
        raise HTTPException(400, f"Request is not open for offers (status: {trip_req.status})")

    # Check for existing quote
    existing = session.exec(
        select(RequestOffer).where(
            RequestOffer.trip_request_id == trip_req.id,
            RequestOffer.local_profile_id == profile.id,
            RequestOffer.status.in_(["submitted", "accepted"]),
        )
    ).first()
    if existing:
        raise HTTPException(409, "You already have an active quote submitted for this request")

    offer = RequestOffer(
        trip_request_id=trip_req.id,
        local_profile_id=profile.id,
        offered_price=round(payload.offered_price, 2),
        currency=payload.currency.strip() or "USD",
        duration_hours=payload.duration_hours,
        proposed_start_time=payload.proposed_start_time.strip() or "10:00",
        proposal_message=payload.proposal_message.strip(),
        inclusions=payload.inclusions.strip(),
        status="submitted",
    )
    session.add(offer)

    if trip_req.status in ["submitted", "matching"]:
        trip_req.status = "offers_received"
        trip_req.updated_at = datetime.now(timezone.utc)
        session.add(trip_req)

    session.commit()
    session.refresh(offer)

    # Notify traveler
    add_notification(
        session,
        trip_req.tourist_user_id,
        "offer_received",
        f"New quote from {profile.display_name} for your {trip_req.city_name} trip!",
        f"{profile.display_name} submitted a custom quote of ${offer.offered_price:.2f} for your trip on {trip_req.booking_date}.",
        "/dashboard/requests",
        email=True,
    )

    audit_event(
        session,
        user.id,
        "request.offer_submitted",
        "request_offer",
        offer.id,
        f"Local {profile.display_name} quoted ${offer.offered_price:.2f} on request #{trip_req.id}",
        request,
    )

    return _hal_offer_dict(session, offer)


@app.patch("/api/local/offers/{offer_id}/withdraw")
def withdraw_local_quote(
    offer_id: int,
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    profile = require_local_profile(user, session)
    offer = session.get(RequestOffer, offer_id)
    if not offer:
        raise HTTPException(404, "Quote not found")
    if offer.local_profile_id != profile.id and user.role != "admin":
        raise HTTPException(403, "You do not own this quote")
    if offer.status == "accepted":
        raise HTTPException(409, "Cannot withdraw an accepted quote")

    offer.status = "withdrawn"
    offer.updated_at = datetime.now(timezone.utc)
    session.add(offer)
    session.commit()

    audit_event(session, user.id, "request.offer_withdrawn", "request_offer", offer.id, f"Withdrew quote #{offer.id}", request)
    return {"ok": True, "status": "withdrawn"}


@app.post("/api/traveler/requests/{request_id}/accept/{offer_id}")
def accept_request_offer(
    request_id: int,
    offer_id: int,
    request: Request,
    user: Annotated[User, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    trip_req = session.get(TripRequest, request_id)
    if not trip_req:
        raise HTTPException(404, "Trip request not found")
    if trip_req.tourist_user_id != user.id and user.role != "admin":
        raise HTTPException(403, "You do not own this trip request")
    if trip_req.status == "converted_to_booking" or trip_req.converted_booking_id:
        raise HTTPException(409, "This request has already been converted to a booking")
    if trip_req.status == "cancelled":
        raise HTTPException(400, "Cannot accept an offer on a cancelled request")

    offer = session.get(RequestOffer, offer_id)
    if not offer or offer.trip_request_id != trip_req.id:
        raise HTTPException(404, "Offer not found for this request")
    if offer.status != "submitted":
        raise HTTPException(409, f"Offer cannot be accepted in status '{offer.status}'")

    local = session.get(LocalProfile, offer.local_profile_id)
    if not local:
        raise HTTPException(404, "Local profile not found for this offer")

    # 1. Update accepted offer status
    offer.status = "accepted"
    offer.updated_at = datetime.now(timezone.utc)
    session.add(offer)

    # 2. Decline competing offers
    competing = session.exec(
        select(RequestOffer).where(
            RequestOffer.trip_request_id == trip_req.id,
            RequestOffer.id != offer.id,
            RequestOffer.status == "submitted",
        )
    ).all()
    for comp in competing:
        comp.status = "declined"
        comp.updated_at = datetime.now(timezone.utc)
        session.add(comp)
        comp_local = session.get(LocalProfile, comp.local_profile_id)
        if comp_local and comp_local.user_id:
            add_notification(
                session,
                comp_local.user_id,
                "offer_declined",
                f"Opportunity update: {trip_req.city_name}",
                f"The traveler selected another quote for the trip on {trip_req.booking_date}.",
                "/local-dashboard/opportunities",
                email=False,
            )

    # 3. Create standard Booking
    fin = calculate_booking_financials(session, offer.offered_price, None, user.id)

    booking = Booking(
        tourist_user_id=trip_req.tourist_user_id,
        local_profile_id=offer.local_profile_id,
        service_id=None,
        booking_date=trip_req.booking_date,
        start_time=offer.proposed_start_time,
        guests=trip_req.guests,
        hours=offer.duration_hours,
        message=f"Custom Request: {trip_req.title or trip_req.category}\n\nTraveler Requirements:\n{trip_req.description}\n\nAccepted Local Proposal:\n{offer.proposal_message}",
        subtotal=fin["subtotal"],
        platform_fee=fin["platform_fee"],
        discount_amount=fin["discount_amount"],
        promo_code=fin["promo_code"],
        status="confirmed",
    )
    session.add(booking)
    session.flush()

    # 4. Create BookingDetail and event log
    detail = BookingDetail(
        booking_id=booking.id,
        meeting_point_name=trip_req.meeting_preference or f"Agreed with {local.display_name}",
        meeting_address=trip_req.city_name,
        meeting_instructions=trip_req.special_requirements or "",
        updated_by_user_id=user.id,
    )
    session.add(detail)
    log_booking_event(
        session,
        booking,
        user.id,
        "requested",
        "",
        "confirmed",
        f"Converted from Custom Request #{trip_req.id} (Accepted Offer #{offer.id})",
    )

    # 5. Link TripRequest
    trip_req.status = "converted_to_booking"
    trip_req.selected_offer_id = offer.id
    trip_req.converted_booking_id = booking.id
    trip_req.updated_at = datetime.now(timezone.utc)
    session.add(trip_req)

    # 6. Commit & notify
    session.commit()
    session.refresh(booking)

    if local.user_id:
        add_notification(
            session,
            local.user_id,
            "offer_accepted",
            f"Quote accepted! New Booking #{booking.id}",
            f"{user.full_name} accepted your quote for {booking.booking_date} (${booking.subtotal:.2f}).",
            "/local-dashboard/bookings",
            email=True,
        )

    audit_event(
        session,
        user.id,
        "request.converted",
        "trip_request",
        trip_req.id,
        f"Accepted offer #{offer.id} -> created Booking #{booking.id}",
        request,
    )

    return {
        "ok": True,
        "booking_id": booking.id,
        "request_id": trip_req.id,
        "redirect_url": f"/dashboard/bookings/{booking.id}",
    }


@app.get("/api/admin/requests")
def admin_list_requests(
    user: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
    status: Optional[str] = None,
    city: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    query = select(TripRequest)
    if status and status != "all":
        query = query.where(TripRequest.status == status)
    if city and city != "all":
        query = query.where(TripRequest.city_slug == slugify(city))

    total = len(session.exec(query).all())
    reqs = session.exec(
        query.order_by(TripRequest.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [_hal_request_dict(session, r, include_offers=True) for r in reqs],
    }


@app.post("/api/admin/requests/{request_id}/notify-locals")
def admin_notify_candidate_locals(
    request_id: int,
    request: Request,
    user: Annotated[User, Depends(admin_user)],
    session: Annotated[Session, Depends(get_session)],
):
    trip_req = session.get(TripRequest, request_id)
    if not trip_req:
        raise HTTPException(404, "Trip request not found")

    candidate_locals = session.exec(
        select(LocalProfile).where(
            or_(
                LocalProfile.city_slug == trip_req.city_slug,
                LocalProfile.country_code == trip_req.country_code,
            )
        )
    ).all()

    dispatched = 0
    for cand in candidate_locals:
        if _hal_is_local_eligible(session, cand) and cand.user_id and cand.user_id != trip_req.tourist_user_id:
            add_notification(
                session,
                cand.user_id,
                "opportunity_new",
                f"[Priority] New opportunity in {trip_req.city_name}",
                f"A traveler is requesting a local in {trip_req.city_name} for {trip_req.booking_date} ({trip_req.category}). Submit your proposal now.",
                "/local-dashboard/opportunities",
                email=True,
            )
            dispatched += 1

    if trip_req.status == "submitted":
        trip_req.status = "matching"
        trip_req.updated_at = datetime.now(timezone.utc)
        session.add(trip_req)
        session.commit()

    audit_event(session, user.id, "admin.request_dispatched", "trip_request", trip_req.id, f"Dispatched alerts to {dispatched} locals for request #{trip_req.id}", request)
    return {"ok": True, "dispatched_count": dispatched, "status": trip_req.status}

