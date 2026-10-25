"""
Auth endpoints: register, login, OTP, MFA, password reset, refresh, logout.
"""
import hashlib, secrets, random, string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, select

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, generate_totp_secret, get_totp_uri, verify_totp,
)
from app.core.config import settings
from app.models.models import (
    User, UserRole, UserStatus, RefreshToken, OtpCode,
    CustomerProfile, CollectorProfile, RecyclerProfile,
)
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, TokenResponse,
    OtpSendRequest, OtpVerifyRequest, RefreshRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    MfaSetupResponse, MfaVerifyRequest, MeOut, MePatch, OkResponse,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


def _otp_code(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _find_user(db: Session, identifier: str) -> User | None:
    return db.execute(
        select(User).where(
            or_(User.email == identifier, User.phone == identifier)
        )
    ).scalar_one_or_none()


# ---------------------------------------------------------------------------

@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    # Check duplicates
    if body.email:
        if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
            raise HTTPException(400, {"code": "EMAIL_TAKEN", "message": "Email already registered."})
    if body.phone:
        if db.execute(select(User).where(User.phone == body.phone)).scalar_one_or_none():
            raise HTTPException(400, {"code": "PHONE_TAKEN", "message": "Phone already registered."})

    user = User(
        email=body.email,
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=UserRole(body.role),
    )
    db.add(user)
    db.flush()

    # Create role profile
    if body.role == "CUSTOMER":
        db.add(CustomerProfile(user_id=user.id, name=body.name))
    elif body.role == "COLLECTOR":
        db.add(CollectorProfile(user_id=user.id, name=body.name))
    elif body.role == "RECYCLER":
        db.add(RecyclerProfile(user_id=user.id, facility_name=body.name))

    # Create OTP for verification
    if body.email:
        code = _otp_code()
        db.add(OtpCode(
            user_id=user.id, code=code, purpose="email_verify",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        ))
        # TODO: send email

    db.commit()
    return {"ok": True, "user_id": user.id, "message": "Registration successful. Please verify your contact."}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = _find_user(db, body.identifier)
    if not user or not user.password_hash:
        raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "Invalid credentials."})

    # Lockout check
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(403, {"code": "ACCOUNT_LOCKED", "message": "Account is temporarily locked."})

    if not verify_password(body.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        db.commit()
        raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "Invalid credentials."})

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    if user.mfa_enabled:
        # Return partial token; frontend must complete MFA
        partial = create_access_token(user.id, extra={"mfa_pending": True})
        return TokenResponse(
            access_token=partial,
            role=user.role.value,
            user_id=user.id,
            mfa_required=True,
        )

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    db.commit()
    return TokenResponse(access_token=access, role=user.role.value, user_id=user.id)


@router.post("/otp/send")
def otp_send(body: OtpSendRequest, db: Session = Depends(get_db)):
    user = _find_user(db, body.identifier)
    if not user:
        return {"ok": True, "message": "If an account exists, an OTP has been sent."}
    code = _otp_code()
    db.add(OtpCode(
        user_id=user.id, code=code, purpose=body.purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    ))
    db.commit()
    # TODO: send via email/SMS provider
    return {"ok": True, "message": "OTP sent.", "_dev_code": code}  # remove _dev_code in prod


@router.post("/otp/verify")
def otp_verify(body: OtpVerifyRequest, db: Session = Depends(get_db)):
    user = _find_user(db, body.identifier)
    if not user:
        raise HTTPException(400, {"code": "USER_NOT_FOUND", "message": "User not found."})

    otp = db.execute(
        select(OtpCode).where(
            OtpCode.user_id == user.id,
            OtpCode.purpose == body.purpose,
            OtpCode.used_at.is_(None),
            OtpCode.expires_at > datetime.now(timezone.utc),
        ).order_by(OtpCode.created_at.desc())
    ).scalar_one_or_none()

    if not otp:
        raise HTTPException(400, {"code": "INVALID_OTP", "message": "OTP is invalid or expired."})

    otp.attempts += 1
    if otp.attempts > 5:
        raise HTTPException(400, {"code": "TOO_MANY_ATTEMPTS", "message": "Too many attempts."})

    if otp.code != body.code:
        db.commit()
        raise HTTPException(400, {"code": "INVALID_OTP", "message": "OTP is incorrect."})

    otp.used_at = datetime.now(timezone.utc)
    if body.purpose == "email_verify":
        user.email_verified_at = datetime.now(timezone.utc)
    elif body.purpose == "phone_verify":
        user.phone_verified_at = datetime.now(timezone.utc)

    db.commit()
    return {"ok": True, "message": "Verified successfully."}


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(401, {"code": "INVALID_TOKEN", "message": "Invalid refresh token."})

    token_hash = _hash_token(body.refresh_token)
    stored = db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    ).scalar_one_or_none()

    if not stored:
        raise HTTPException(401, {"code": "TOKEN_REVOKED", "message": "Refresh token invalid or revoked."})

    user = db.get(User, user_id)
    stored.revoked_at = datetime.now(timezone.utc)

    access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(new_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    db.commit()
    return TokenResponse(access_token=access, role=user.role.value, user_id=user.id)


@router.post("/logout")
def logout(body: RefreshRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token_hash = _hash_token(body.refresh_token)
    stored = db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    ).scalar_one_or_none()
    if stored:
        stored.revoked_at = datetime.now(timezone.utc)
        db.commit()
    return {"ok": True}


@router.post("/logout-all")
def logout_all(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tokens = db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
        )
    ).scalars().all()
    for t in tokens:
        t.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "revoked": len(tokens)}


@router.post("/password/forgot")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = _find_user(db, body.identifier)
    if user:
        code = _otp_code()
        db.add(OtpCode(
            user_id=user.id, code=code, purpose="password_reset",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        ))
        db.commit()
        # TODO: send reset email/SMS
    return {"ok": True, "message": "If an account exists, a reset code has been sent."}


@router.post("/password/reset")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = _find_user(db, body.identifier)
    if not user:
        raise HTTPException(400, {"code": "INVALID_CODE", "message": "Invalid reset code."})

    otp = db.execute(
        select(OtpCode).where(
            OtpCode.user_id == user.id,
            OtpCode.purpose == "password_reset",
            OtpCode.code == body.code,
            OtpCode.used_at.is_(None),
            OtpCode.expires_at > datetime.now(timezone.utc),
        )
    ).scalar_one_or_none()

    if not otp:
        raise HTTPException(400, {"code": "INVALID_CODE", "message": "Invalid or expired reset code."})

    otp.used_at = datetime.now(timezone.utc)
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True, "message": "Password reset successfully."}


@router.post("/mfa/setup", response_model=MfaSetupResponse)
def mfa_setup(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = generate_totp_secret()
    current_user.mfa_secret = secret
    db.commit()
    return MfaSetupResponse(
        totp_uri=get_totp_uri(secret, current_user.email or str(current_user.id)),
        secret=secret,
    )


@router.post("/mfa/verify")
def mfa_verify(body: MfaVerifyRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.mfa_secret:
        raise HTTPException(400, {"code": "MFA_NOT_SETUP", "message": "MFA is not configured."})
    if not verify_totp(current_user.mfa_secret, body.code):
        raise HTTPException(400, {"code": "INVALID_TOTP", "message": "Invalid or expired TOTP code."})
    current_user.mfa_enabled = True
    db.commit()

    access = create_access_token(current_user.id)
    refresh = create_refresh_token(current_user.id)
    import hashlib
    db.add(RefreshToken(
        user_id=current_user.id,
        token_hash=hashlib.sha256(refresh.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    db.commit()
    return TokenResponse(access_token=access, role=current_user.role.value, user_id=current_user.id)

