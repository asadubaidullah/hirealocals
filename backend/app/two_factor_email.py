from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import smtplib

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from email.message import EmailMessage

from typing import (
    Annotated,
    Optional,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import (
    BaseModel,
    Field as PydanticField,
)

from sqlmodel import (
    Field,
    Session,
    SQLModel,
    select,
)

from .config import settings

from .database import (
    get_session,
)

from .models import (
    EmailOutbox,
    User,
    UserEmailState,
)

from .security import (
    create_access_token,
    current_user,
    verify_password,
)

from .two_factor import (
    SecureActionInput,
    UserTwoFactor,
    _check_lock,
    _decode_login_challenge,
    _record_failure,
    _reset_failures,
    _state,
    _verify_code,
)


router = APIRouter()


def utcnow():
    return datetime.now(
        timezone.utc
    )


class UserTwoFactorEmail(
    SQLModel,
    table=True,
):

    id: Optional[int] = Field(
        default=None,
        primary_key=True,
    )

    user_id: int = Field(
        foreign_key="user.id",
        unique=True,
        index=True,
    )

    enabled: bool = Field(
        default=False,
        index=True,
    )

    code_hash: str = Field(
        default="",
        max_length=64,
    )

    code_expires_at: Optional[
        datetime
    ] = None

    last_sent_at: Optional[
        datetime
    ] = None

    window_started_at: Optional[
        datetime
    ] = None

    send_count: int = 0

    failed_attempts: int = 0

    locked_until: Optional[
        datetime
    ] = None

    created_at: datetime = Field(
        default_factory=utcnow,
    )

    updated_at: datetime = Field(
        default_factory=utcnow,
    )


class EmailManageInput(BaseModel):

    password: str = PydanticField(
        min_length=1,
        max_length=128,
    )


class ChallengeInput(BaseModel):

    challenge_token: str = PydanticField(
        min_length=20,
        max_length=4000,
    )


class VerifyEmailOtpInput(
    ChallengeInput
):

    code: str = PydanticField(
        min_length=6,
        max_length=6,
    )


def _aware(value):

    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc
        )

    return value


def _email_row(
    session: Session,
    user_id: int,
    create: bool = False,
):

    row = session.exec(
        select(
            UserTwoFactorEmail
        ).where(
            UserTwoFactorEmail.user_id
            == user_id
        )
    ).first()

    if not row and create:

        row = UserTwoFactorEmail(
            user_id=user_id
        )

        session.add(row)
        session.commit()
        session.refresh(row)

    return row


def _email_verified(
    session: Session,
    user: User,
):

    state = session.exec(
        select(
            UserEmailState
        ).where(
            UserEmailState.user_id
            == user.id
        )
    ).first()

    return bool(
        state
        and state.verified
    )


def _mask_email(
    email: str,
):

    value = str(
        email or ""
    ).strip()

    if "@" not in value:
        return "***"

    local, domain = value.split(
        "@",
        1,
    )

    if len(local) <= 1:
        shown = "*"

    elif len(local) == 2:
        shown = (
            local[0]
            + "*"
        )

    else:
        shown = (
            local[0]
            + "***"
            + local[-1]
        )

    return (
        shown
        + "@"
        + domain
    )


def _code_hash(
    user_id: int,
    nonce: str,
    code: str,
):

    message = (
        f"{user_id}:"
        f"{nonce}:"
        f"{code}"
    ).encode(
        "utf-8"
    )

    return hmac.new(
        settings.jwt_secret.encode(
            "utf-8"
        ),
        message,
        hashlib.sha256,
    ).hexdigest()


def _queue_email(
    session: Session,
    to_email: str,
    subject: str,
    body: str,
):

    row = EmailOutbox(
        to_email=
            to_email.lower().strip(),

        subject=
            subject[:255],

        body_text=
            body,
    )

    session.add(row)
    session.commit()
    session.refresh(row)


    if not settings.smtp_host:

        row.status = "dev_queued"

        row.last_error = (
            "SMTP is not configured. "
            "View the message in "
            "Admin > Email outbox."
        )

        session.add(row)
        session.commit()
        session.refresh(row)

        return row


    try:

        message = EmailMessage()

        message["Subject"] = (
            row.subject
        )

        message["From"] = (
            f"{settings.smtp_from_name} "
            f"<{settings.smtp_from_email}>"
        )

        message["To"] = (
            row.to_email
        )

        message.set_content(
            row.body_text
        )


        with smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=20,
        ) as smtp:

            if settings.smtp_use_tls:
                smtp.starttls()

            if settings.smtp_username:

                smtp.login(
                    settings.smtp_username,
                    settings.smtp_password,
                )

            smtp.send_message(
                message
            )


        row.status = "sent"

        row.sent_at = utcnow()

        row.last_error = ""


    except Exception as exc:

        row.status = "failed"

        row.last_error = str(
            exc
        )[:1000]


    session.add(row)
    session.commit()
    session.refresh(row)

    return row


def _primary_proof(
    session: Session,
    core: UserTwoFactor,
    code: str,
):

    _check_lock(
        core
    )

    (
        valid,
        used_recovery,
        remaining,
    ) = _verify_code(
        core,
        code,
    )

    if not valid:

        _record_failure(
            session,
            core,
        )

        raise HTTPException(
            401,
            "Invalid authenticator or recovery code.",
        )


    if used_recovery:

        core.recovery_hashes = (
            json.dumps(
                remaining
            )
        )


    _reset_failures(
        core
    )

    session.add(core)
    session.commit()


def _login_context(
    session: Session,
    challenge_token: str,
):

    (
        user_id,
        nonce,
    ) = _decode_login_challenge(
        challenge_token
    )

    user = session.get(
        User,
        user_id,
    )

    if (
        not user
        or not user.is_active
    ):

        raise HTTPException(
            401,
            "Account is unavailable.",
        )


    core = _state(
        session,
        user.id,
        False,
    )


    if (
        not core
        or not core.enabled
        or not core.secret_enc
    ):

        raise HTTPException(
            401,
            "Two-factor authentication is unavailable.",
        )


    if (
        not nonce
        or not secrets.compare_digest(
            nonce,
            core.challenge_nonce
            or "",
        )
    ):

        raise HTTPException(
            401,
            "Two-factor login challenge is no longer valid.",
        )


    email = _email_row(
        session,
        user.id,
        False,
    )


    if (
        not email
        or not email.enabled
    ):

        raise HTTPException(
            403,
            "Email OTP backup is not enabled.",
        )


    if not _email_verified(
        session,
        user,
    ):

        raise HTTPException(
            403,
            "Your account email must be verified first.",
        )


    return (
        user,
        core,
        email,
        nonce,
    )


def email_two_factor_enabled(
    session: Session,
    user: User,
) -> bool:

    row = _email_row(
        session,
        user.id,
        False,
    )

    return bool(
        row
        and row.enabled
        and _email_verified(
            session,
            user,
        )
    )


@router.get(
    "/api/auth/2fa/email/status"
)
def email_status(
    user: Annotated[
        User,
        Depends(current_user),
    ],
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):

    core = _state(
        session,
        user.id,
        False,
    )

    row = _email_row(
        session,
        user.id,
        False,
    )

    verified = _email_verified(
        session,
        user,
    )


    return {
        "enabled":
            bool(
                row
                and row.enabled
            ),

        "available":
            bool(
                core
                and core.enabled
                and verified
            ),

        "email_verified":
            verified,

        "masked_email":
            _mask_email(
                user.email
            ),
    }


@router.post(
    "/api/auth/2fa/email/enable"
)
def enable_email(
    payload: EmailManageInput,
    user: Annotated[
        User,
        Depends(current_user),
    ],
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):

    if not verify_password(
        payload.password,
        user.password_hash,
    ):

        raise HTTPException(
            401,
            "Current password is incorrect.",
        )


    core = _state(
        session,
        user.id,
        False,
    )


    if (
        not core
        or not core.enabled
    ):

        raise HTTPException(
            409,
            "Enable Authenticator 2FA first.",
        )


    if not _email_verified(
        session,
        user,
    ):

        raise HTTPException(
            403,
            "Verify your account email first.",
        )


    _primary_proof(
        session,
        core,
        payload.code,
    )


    row = _email_row(
        session,
        user.id,
        True,
    )

    row.enabled = True

    row.code_hash = ""

    row.code_expires_at = None

    row.failed_attempts = 0

    row.locked_until = None

    row.updated_at = utcnow()

    session.add(row)
    session.commit()


    return {
        "ok": True,
        "enabled": True,
        "masked_email":
            _mask_email(
                user.email
            ),
    }


@router.post(
    "/api/auth/2fa/email/disable"
)
def disable_email(
    payload: EmailManageInput,
    user: Annotated[
        User,
        Depends(current_user),
    ],
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):

    if not verify_password(
        payload.password,
        user.password_hash,
    ):

        raise HTTPException(
            401,
            "Current password is incorrect.",
        )


    core = _state(
        session,
        user.id,
        False,
    )


    if (
        not core
        or not core.enabled
    ):

        raise HTTPException(
            409,
            "Two-factor authentication is not enabled.",
        )


    _primary_proof(
        session,
        core,
        payload.code,
    )


    row = _email_row(
        session,
        user.id,
        False,
    )

    if not row:

        raise HTTPException(
            409,
            "Email OTP backup is not enabled.",
        )


    row.enabled = False

    row.code_hash = ""

    row.code_expires_at = None

    row.failed_attempts = 0

    row.locked_until = None

    row.updated_at = utcnow()

    session.add(row)
    session.commit()


    return {
        "ok": True,
        "enabled": False,
    }


@router.post(
    "/api/auth/2fa/email/method"
)
def email_method(
    payload: ChallengeInput,
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):

    (
        user_id,
        nonce,
    ) = _decode_login_challenge(
        payload.challenge_token
    )

    user = session.get(
        User,
        user_id,
    )

    if not user:

        raise HTTPException(
            401,
            "Account is unavailable.",
        )


    core = _state(
        session,
        user.id,
        False,
    )


    valid_challenge = bool(
        core
        and nonce
        and secrets.compare_digest(
            nonce,
            core.challenge_nonce
            or "",
        )
    )


    if not valid_challenge:

        raise HTTPException(
            401,
            "Two-factor login challenge is no longer valid.",
        )


    row = _email_row(
        session,
        user.id,
        False,
    )


    available = bool(
        row
        and row.enabled
        and _email_verified(
            session,
            user,
        )
    )


    return {
        "available":
            available,

        "email_available":
            available,

        "authenticator_available":
            bool(
                core
                and core.enabled
                and core.secret_enc
            ),

        "masked_email":
            _mask_email(
                user.email
            )
            if available
            else "",
    }


@router.post(
    "/api/auth/2fa/email/send-login"
)
def send_login_code(
    payload: ChallengeInput,
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):

    (
        user,
        core,
        row,
        nonce,
    ) = _login_context(
        session,
        payload.challenge_token,
    )


    now = utcnow()


    locked = _aware(
        row.locked_until
    )

    if (
        locked
        and locked > now
    ):

        raise HTTPException(
            429,
            "Email OTP is temporarily locked.",
        )


    last_sent = _aware(
        row.last_sent_at
    )


    if (
        last_sent
        and (
            now - last_sent
        ) < timedelta(
            seconds=60
        )
    ):

        wait = max(
            1,
            60
            - int(
                (
                    now
                    - last_sent
                ).total_seconds()
            ),
        )

        raise HTTPException(
            429,
            f"Please wait {wait} seconds before requesting another code.",
        )


    window = _aware(
        row.window_started_at
    )


    if (
        not window
        or (
            now - window
        ) >= timedelta(
            hours=1
        )
    ):

        row.window_started_at = now

        row.send_count = 0


    if row.send_count >= 5:

        raise HTTPException(
            429,
            "Email OTP hourly limit reached.",
        )


    code = (
        f"{secrets.randbelow(1000000):06d}"
    )


    row.code_hash = _code_hash(
        user.id,
        nonce,
        code,
    )


    row.code_expires_at = (
        now
        + timedelta(
            minutes=10
        )
    )

    row.last_sent_at = now

    row.send_count += 1

    row.failed_attempts = 0

    row.locked_until = None

    row.updated_at = now

    session.add(row)
    session.commit()


    outbox = _queue_email(
        session,
        user.email,
        "Your HireALocals login code",
        (
            f"Hello {user.full_name},\n\n"
            f"Your HireALocals login code is:\n\n"
            f"{code}\n\n"
            f"This code expires in 10 minutes.\n\n"
            f"If you did not try to sign in, "
            f"you can ignore this email."
        ),
    )


    if outbox.status == "failed":

        row.code_hash = ""

        row.code_expires_at = None

        session.add(row)
        session.commit()

        raise HTTPException(
            503,
            "The verification email could not be delivered.",
        )


    return {
        "ok":
            True,

        "masked_email":
            _mask_email(
                user.email
            ),

        "expires_in":
            600,

        "resend_after":
            60,

        "delivery_status":
            outbox.status,
    }


@router.post(
    "/api/auth/2fa/email/verify-login"
)
def verify_login_code(
    payload: VerifyEmailOtpInput,
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):

    (
        user,
        core,
        row,
        nonce,
    ) = _login_context(
        session,
        payload.challenge_token,
    )


    now = utcnow()


    locked = _aware(
        row.locked_until
    )


    if (
        locked
        and locked > now
    ):

        raise HTTPException(
            429,
            "Too many invalid Email OTP attempts. Try again later.",
        )


    expires = _aware(
        row.code_expires_at
    )


    if (
        not row.code_hash
        or not expires
        or expires < now
    ):

        raise HTTPException(
            401,
            "Email code is missing or expired. Request a new code.",
        )


    code = str(
        payload.code
    ).strip()


    if (
        len(code) != 6
        or not code.isdigit()
    ):

        raise HTTPException(
            400,
            "Enter the 6-digit email code.",
        )


    candidate = _code_hash(
        user.id,
        nonce,
        code,
    )


    if not hmac.compare_digest(
        candidate,
        row.code_hash,
    ):

        row.failed_attempts += 1

        row.updated_at = now


        if row.failed_attempts >= 5:

            row.failed_attempts = 0

            row.locked_until = (
                now
                + timedelta(
                    minutes=10
                )
            )


        session.add(row)
        session.commit()


        raise HTTPException(
            401,
            "Invalid email verification code.",
        )


    row.code_hash = ""

    row.code_expires_at = None

    row.failed_attempts = 0

    row.locked_until = None

    row.updated_at = now


    core.challenge_nonce = ""

    _reset_failures(
        core
    )


    session.add(row)
    session.add(core)
    session.commit()


    state = session.exec(
        select(
            UserEmailState
        ).where(
            UserEmailState.user_id
            == user.id
        )
    ).first()


    return {
        "access_token":
            create_access_token(
                user
            ),

        "role":
            user.role,

        "full_name":
            user.full_name,

        "email":
            user.email,

        "email_verified":
            bool(
                state
                and state.verified
            ),
    }
