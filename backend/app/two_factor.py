from __future__ import annotations

import base64
import hashlib
import json
import secrets

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from io import BytesIO

from typing import (
    Annotated,
    Optional,
)


import jwt
import pyotp
import qrcode
import qrcode.image.svg


from cryptography.fernet import (
    Fernet,
    InvalidToken,
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
    User,
    UserEmailState,
)

from .security import (
    create_access_token,
    current_user,
    verify_password,
)


router = APIRouter()


def utcnow():
    return datetime.now(
        timezone.utc
    )


# ============================================================
# DATABASE MODEL
# ============================================================

class UserTwoFactor(
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

    secret_enc: str = Field(
        default="",
        max_length=1600,
    )

    recovery_hashes: str = Field(
        default="[]",
        max_length=16000,
    )

    challenge_nonce: str = Field(
        default="",
        max_length=180,
    )

    failed_attempts: int = Field(
        default=0,
    )

    locked_until: Optional[datetime] = None

    enabled_at: Optional[datetime] = None

    created_at: datetime = Field(
        default_factory=utcnow,
    )

    updated_at: datetime = Field(
        default_factory=utcnow,
    )


# ============================================================
# INPUT SCHEMAS
# ============================================================

class PasswordInput(BaseModel):

    password: str = PydanticField(
        min_length=1,
        max_length=128,
    )


class EnableInput(BaseModel):

    password: str = PydanticField(
        min_length=1,
        max_length=128,
    )

    code: str = PydanticField(
        min_length=6,
        max_length=40,
    )


class SecureActionInput(BaseModel):

    password: str = PydanticField(
        min_length=1,
        max_length=128,
    )

    code: str = PydanticField(
        min_length=6,
        max_length=40,
    )


class LoginTwoFactorInput(BaseModel):

    challenge_token: str = PydanticField(
        min_length=20,
        max_length=4000,
    )

    code: str = PydanticField(
        min_length=6,
        max_length=40,
    )


# ============================================================
# SECRET ENCRYPTION
# ============================================================

def _fernet() -> Fernet:

    digest = hashlib.sha256(
        settings.jwt_secret.encode(
            "utf-8"
        )
    ).digest()

    return Fernet(
        base64.urlsafe_b64encode(
            digest
        )
    )


def _encrypt_secret(
    value: str,
) -> str:

    return (
        _fernet()
        .encrypt(
            value.encode(
                "utf-8"
            )
        )
        .decode(
            "utf-8"
        )
    )


def _decrypt_secret(
    value: str,
) -> str:

    if not value:

        raise HTTPException(
            409,
            "Two-factor authentication is not configured.",
        )

    try:

        return (
            _fernet()
            .decrypt(
                value.encode(
                    "utf-8"
                )
            )
            .decode(
                "utf-8"
            )
        )

    except InvalidToken:

        raise HTTPException(
            500,
            "Two-factor security data could not be decrypted.",
        )


# ============================================================
# STATE
# ============================================================

def _state(
    session: Session,
    user_id: int,
    create: bool = False,
) -> Optional[UserTwoFactor]:

    row = session.exec(
        select(UserTwoFactor).where(
            UserTwoFactor.user_id
            == user_id
        )
    ).first()

    if not row and create:

        row = UserTwoFactor(
            user_id=user_id
        )

        session.add(row)
        session.commit()
        session.refresh(row)

    return row


def two_factor_enabled(
    session: Session,
    user: User,
) -> bool:

    row = _state(
        session,
        user.id,
        False,
    )

    return bool(
        row
        and row.enabled
        and row.secret_enc
    )


# ============================================================
# RECOVERY CODES
# ============================================================

def _normalize_recovery(
    value: str,
) -> str:

    return (
        str(value or "")
        .strip()
        .upper()
        .replace("-", "")
        .replace(" ", "")
    )


def _recovery_hash(
    value: str,
) -> str:

    return hashlib.sha256(
        _normalize_recovery(
            value
        ).encode(
            "utf-8"
        )
    ).hexdigest()


def _generate_recovery_codes():

    alphabet = (
        "ABCDEFGHJKLMNPQRSTUVWXYZ"
        "23456789"
    )

    codes = []
    hashes = []

    for _ in range(10):

        raw = "".join(
            secrets.choice(
                alphabet
            )
            for _ in range(12)
        )

        shown = (
            f"{raw[:4]}-"
            f"{raw[4:8]}-"
            f"{raw[8:]}"
        )

        codes.append(
            shown
        )

        hashes.append(
            _recovery_hash(
                raw
            )
        )

    return (
        codes,
        hashes,
    )


def _stored_recovery_hashes(
    row: UserTwoFactor,
):

    try:

        data = json.loads(
            row.recovery_hashes
            or "[]"
        )

    except Exception:

        return []

    return [
        str(item)
        for item in data
        if item
    ]


# ============================================================
# BRUTE-FORCE PROTECTION
# ============================================================

def _aware(
    value,
):

    if value is None:
        return None

    if value.tzinfo is None:

        return value.replace(
            tzinfo=timezone.utc
        )

    return value


def _check_lock(
    row: UserTwoFactor,
):

    locked_until = _aware(
        row.locked_until
    )

    if (
        locked_until
        and locked_until > utcnow()
    ):

        raise HTTPException(
            429,
            "Too many invalid 2FA attempts. Try again later.",
        )


def _record_failure(
    session: Session,
    row: UserTwoFactor,
):

    row.failed_attempts += 1

    if row.failed_attempts >= 5:

        row.failed_attempts = 0

        row.locked_until = (
            utcnow()
            + timedelta(
                minutes=10
            )
        )

    row.updated_at = utcnow()

    session.add(row)
    session.commit()


def _reset_failures(
    row: UserTwoFactor,
):

    row.failed_attempts = 0

    row.locked_until = None

    row.updated_at = utcnow()


# ============================================================
# TOTP / RECOVERY VERIFICATION
# ============================================================

def _verify_code(
    row: UserTwoFactor,
    value: str,
):

    code = str(
        value or ""
    ).strip()

    secret = _decrypt_secret(
        row.secret_enc
    )


    # Authenticator TOTP
    if (
        len(code) == 6
        and code.isdigit()
    ):

        ok = pyotp.TOTP(
            secret
        ).verify(
            code,
            valid_window=1,
        )

        return (
            bool(ok),
            False,
            _stored_recovery_hashes(
                row
            ),
        )


    # Recovery code
    candidate = _recovery_hash(
        code
    )

    hashes = _stored_recovery_hashes(
        row
    )


    if candidate in hashes:

        hashes.remove(
            candidate
        )

        return (
            True,
            True,
            hashes,
        )


    return (
        False,
        False,
        hashes,
    )


# ============================================================
# LOGIN CHALLENGE
# ============================================================

def create_login_challenge(
    session: Session,
    user: User,
) -> str:

    row = _state(
        session,
        user.id,
        True,
    )

    if (
        not row
        or not row.enabled
    ):

        raise HTTPException(
            409,
            "Two-factor authentication is not enabled.",
        )


    nonce = secrets.token_urlsafe(
        24
    )

    row.challenge_nonce = nonce

    row.updated_at = utcnow()

    session.add(row)
    session.commit()


    payload = {
        "sub":
            str(user.id),

        "purpose":
            "2fa_login",

        "nonce":
            nonce,

        "exp":
            utcnow()
            + timedelta(
                minutes=5
            ),
    }


    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm="HS256",
    )


def _decode_login_challenge(
    token: str,
):

    try:

        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[
                "HS256"
            ],
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            401,
            "Two-factor login challenge is invalid or expired.",
        )


    if (
        payload.get("purpose")
        != "2fa_login"
    ):

        raise HTTPException(
            401,
            "Invalid two-factor login challenge.",
        )


    try:

        user_id = int(
            payload.get("sub")
        )

    except Exception:

        raise HTTPException(
            401,
            "Invalid two-factor login challenge.",
        )


    return (
        user_id,
        str(
            payload.get("nonce")
            or ""
        ),
    )


# ============================================================
# QR SVG
# ============================================================

def _qr_svg(
    uri: str,
) -> str:

    image = qrcode.make(
        uri,
        image_factory=
            qrcode.image.svg.SvgPathImage,
    )

    stream = BytesIO()

    image.save(
        stream
    )

    text = stream.getvalue().decode(
        "utf-8"
    )

    svg_start = text.find(
        "<svg"
    )

    if svg_start >= 0:
        text = text[
            svg_start:
        ]

    return text


# ============================================================
# STATUS
# ============================================================

@router.get(
    "/api/auth/2fa/status"
)
def status(
    user: Annotated[
        User,
        Depends(current_user),
    ],
    session: Annotated[
        Session,
        Depends(get_session),
    ],
):

    row = _state(
        session,
        user.id,
        False,
    )

    return {
        "enabled":
            bool(
                row
                and row.enabled
            ),

        "configured":
            bool(
                row
                and row.secret_enc
            ),

        "recovery_codes_remaining":
            len(
                _stored_recovery_hashes(
                    row
                )
            )
            if row
            else 0,
    }


# ============================================================
# START SETUP
# Current password required.
# ============================================================

@router.post(
    "/api/auth/2fa/setup"
)
def setup(
    payload: PasswordInput,
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


    row = _state(
        session,
        user.id,
        True,
    )


    if row.enabled:

        raise HTTPException(
            409,
            "Two-factor authentication is already enabled.",
        )


    secret = pyotp.random_base32()


    row.secret_enc = (
        _encrypt_secret(
            secret
        )
    )

    row.recovery_hashes = "[]"

    row.challenge_nonce = ""

    row.failed_attempts = 0

    row.locked_until = None

    row.updated_at = utcnow()


    session.add(row)
    session.commit()


    uri = pyotp.TOTP(
        secret
    ).provisioning_uri(
        name=user.email,
        issuer_name="HireALocals",
    )


    return {
        "secret":
            secret,

        "otpauth_uri":
            uri,

        "qr_svg":
            _qr_svg(
                uri
            ),
    }


# ============================================================
# ENABLE
# Current password + valid TOTP required.
# ============================================================

@router.post(
    "/api/auth/2fa/enable"
)
def enable(
    payload: EnableInput,
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


    row = _state(
        session,
        user.id,
        False,
    )


    if (
        not row
        or not row.secret_enc
    ):

        raise HTTPException(
            409,
            "Start 2FA setup first.",
        )


    if row.enabled:

        raise HTTPException(
            409,
            "Two-factor authentication is already enabled.",
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
            "Enter the 6-digit authenticator code.",
        )


    secret = _decrypt_secret(
        row.secret_enc
    )


    if not pyotp.TOTP(
        secret
    ).verify(
        code,
        valid_window=1,
    ):

        raise HTTPException(
            400,
            "Invalid authenticator code.",
        )


    recovery_codes, hashes = (
        _generate_recovery_codes()
    )


    row.enabled = True

    row.enabled_at = utcnow()

    row.recovery_hashes = (
        json.dumps(
            hashes
        )
    )

    row.challenge_nonce = ""

    _reset_failures(
        row
    )


    session.add(row)
    session.commit()


    return {
        "ok":
            True,

        "enabled":
            True,

        "recovery_codes":
            recovery_codes,
    }


# ============================================================
# DISABLE
# Password + current 2FA/recovery code required.
# ============================================================

@router.post(
    "/api/auth/2fa/disable"
)
def disable(
    payload: SecureActionInput,
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


    row = _state(
        session,
        user.id,
        False,
    )


    if (
        not row
        or not row.enabled
    ):

        raise HTTPException(
            409,
            "Two-factor authentication is not enabled.",
        )


    _check_lock(
        row
    )


    (
        valid,
        used_recovery,
        remaining,
    ) = _verify_code(
        row,
        payload.code,
    )


    if not valid:

        _record_failure(
            session,
            row,
        )

        raise HTTPException(
            401,
            "Invalid two-factor code.",
        )


    row.enabled = False

    row.secret_enc = ""

    row.recovery_hashes = "[]"

    row.challenge_nonce = ""

    row.enabled_at = None

    _reset_failures(
        row
    )


    session.add(row)
    session.commit()


    return {
        "ok": True,
        "enabled": False,
    }


# ============================================================
# REGENERATE RECOVERY CODES
# ============================================================

@router.post(
    "/api/auth/2fa/recovery-codes"
)
def recovery_codes(
    payload: SecureActionInput,
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


    row = _state(
        session,
        user.id,
        False,
    )


    if (
        not row
        or not row.enabled
    ):

        raise HTTPException(
            409,
            "Two-factor authentication is not enabled.",
        )


    _check_lock(
        row
    )


    (
        valid,
        used_recovery,
        remaining,
    ) = _verify_code(
        row,
        payload.code,
    )


    if not valid:

        _record_failure(
            session,
            row,
        )

        raise HTTPException(
            401,
            "Invalid two-factor code.",
        )


    codes, hashes = (
        _generate_recovery_codes()
    )


    row.recovery_hashes = (
        json.dumps(
            hashes
        )
    )

    _reset_failures(
        row
    )


    session.add(row)
    session.commit()


    return {
        "ok":
            True,

        "recovery_codes":
            codes,
    }


# ============================================================
# LOGIN SECOND STEP
# ============================================================

@router.post(
    "/api/auth/2fa/verify-login"
)
def verify_login(
    payload: LoginTwoFactorInput,
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


    if (
        not user
        or not user.is_active
    ):

        raise HTTPException(
            401,
            "Account is unavailable.",
        )


    row = _state(
        session,
        user.id,
        False,
    )


    if (
        not row
        or not row.enabled
        or not row.secret_enc
    ):

        raise HTTPException(
            401,
            "Two-factor authentication is unavailable.",
        )


    if (
        not nonce
        or not secrets.compare_digest(
            nonce,
            row.challenge_nonce
            or "",
        )
    ):

        raise HTTPException(
            401,
            "Two-factor login challenge is no longer valid.",
        )


    _check_lock(
        row
    )


    (
        valid,
        used_recovery,
        remaining,
    ) = _verify_code(
        row,
        payload.code,
    )


    if not valid:

        _record_failure(
            session,
            row,
        )

        raise HTTPException(
            401,
            "Invalid authenticator or recovery code.",
        )


    if used_recovery:

        row.recovery_hashes = (
            json.dumps(
                remaining
            )
        )


    # Single-use login challenge.
    row.challenge_nonce = ""

    _reset_failures(
        row
    )


    session.add(row)
    session.commit()


    email_state = session.exec(
        select(
            UserEmailState
        ).where(
            UserEmailState.user_id
            == user.id
        )
    ).first()


    email_verified = (
        email_state.verified
        if email_state
        else True
    )


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
            email_verified,
    }
