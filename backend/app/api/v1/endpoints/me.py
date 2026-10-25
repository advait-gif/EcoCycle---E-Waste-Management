"""
/me endpoints — view and update current user profile.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import User, CustomerProfile, CollectorProfile, RecyclerProfile
from app.schemas.schemas import MeOut, MePatch, OkResponse
from app.api.deps import get_current_user

router = APIRouter(tags=["Me"])


def _get_name(user: User, db: Session) -> str | None:
    if user.role.value == "CUSTOMER":
        p = db.execute(select(CustomerProfile).where(CustomerProfile.user_id == user.id)).scalar_one_or_none()
        return p.name if p else None
    elif user.role.value == "COLLECTOR":
        p = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == user.id)).scalar_one_or_none()
        return p.name if p else None
    elif user.role.value == "RECYCLER":
        p = db.execute(select(RecyclerProfile).where(RecyclerProfile.user_id == user.id)).scalar_one_or_none()
        return p.facility_name if p else None
    return None


@router.get("/me", response_model=MeOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return MeOut(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role.value,
        status=current_user.status.value,
        mfa_enabled=current_user.mfa_enabled,
        name=_get_name(current_user, db),
        created_at=current_user.created_at,
    )


@router.patch("/me")
def patch_me(body: MePatch, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.email:
        current_user.email = body.email
        current_user.email_verified_at = None  # re-verify
    if body.phone:
        current_user.phone = body.phone
        current_user.phone_verified_at = None
    if body.name:
        if current_user.role.value == "CUSTOMER":
            p = db.execute(select(CustomerProfile).where(CustomerProfile.user_id == current_user.id)).scalar_one_or_none()
            if p:
                p.name = body.name
        elif current_user.role.value == "COLLECTOR":
            p = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == current_user.id)).scalar_one_or_none()
            if p:
                p.name = body.name
    db.commit()
    return {"ok": True}
