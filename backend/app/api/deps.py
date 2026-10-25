"""
FastAPI dependency injection: current user, role guards, rate limit.
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User, UserStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _get_user_from_token(token: str, db: Session) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "INVALID_TOKEN", "message": "Could not validate credentials"},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exc
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = db.get(User, user_id)
    if not user:
        raise credentials_exc
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_SUSPENDED", "message": "Your account has been suspended."},
        )
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    return _get_user_from_token(token, db)


def require_roles(*roles: str):
    """Factory that returns a dependency enforcing role access."""
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": f"Role {current_user.role.value} is not allowed here.",
                },
            )
        return current_user
    return _check


# Convenience guards
require_customer = Depends(require_roles("CUSTOMER"))
require_collector = Depends(require_roles("COLLECTOR"))
require_recycler = Depends(require_roles("RECYCLER"))
require_admin = Depends(require_roles("ADMIN"))
require_admin_or_support = Depends(require_roles("ADMIN", "SUPPORT"))
