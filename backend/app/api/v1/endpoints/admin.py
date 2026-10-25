"""
Admin endpoints: verifications, pickups, disputes, settings, analytics, audit.
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.models.models import (
    User, UserRole, UserStatus, CollectorProfile, RecyclerProfile,
    VerificationStatus, PickupRequest, PickupStatus, PickupStatusHistory,
    PickupOffer, OfferResponse, Complaint, ComplaintStatus, DisputeResolution,
    RewardLedger, RewardLedgerType, EwasteCategory, AuditLog, SystemSetting,
    RecyclerInventoryItem,
)
from app.schemas.schemas import (
    VerificationDecisionRequest, ReassignPickupRequest, OverridePickupRequest,
    DisputeResolveRequest, RewardAdjustRequest, AdminUserStatusRequest,
)
from app.api.deps import get_current_user, require_roles
from app.services import reward_service, notification_service

router = APIRouter(prefix="/admin", tags=["Admin"])
require_admin = require_roles("ADMIN")


def _audit(db, actor_id, action, entity=None, entity_id=None, note=None):
    db.add(AuditLog(actor_id=actor_id, action=action, entity=entity, entity_id=entity_id, after=note))


# ---------------------------------------------------------------------------
# Verifications
# ---------------------------------------------------------------------------

@router.get("/verifications")
def list_verifications(
    role: str = Query("COLLECTOR"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if role == "COLLECTOR":
        rows = db.execute(
            select(CollectorProfile)
            .where(CollectorProfile.verification_status == VerificationStatus.PENDING)
            .order_by(CollectorProfile.created_at)
        ).scalars().all()
    else:
        rows = db.execute(
            select(RecyclerProfile)
            .where(RecyclerProfile.verification_status == VerificationStatus.PENDING)
            .order_by(RecyclerProfile.created_at)
        ).scalars().all()
    return [{"id": r.id, "user_id": r.user_id, "status": r.verification_status.value} for r in rows]


@router.post("/verifications/{profile_id}/decision")
def decide_verification(
    profile_id: str,
    body: VerificationDecisionRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Try collector first, then recycler
    cp = db.get(CollectorProfile, profile_id)
    rp = db.get(RecyclerProfile, profile_id)
    target = cp or rp
    if not target:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Profile not found."})

    action_map = {
        "approve": VerificationStatus.VERIFIED,
        "reject": VerificationStatus.REJECTED,
        "more_info": VerificationStatus.MORE_INFO_NEEDED,
        "suspend": VerificationStatus.REJECTED,
    }
    if body.action not in action_map:
        raise HTTPException(400, {"code": "INVALID_ACTION", "message": "Invalid action."})

    target.verification_status = action_map[body.action]
    if body.action in ("reject", "more_info"):
        target.rejection_reason = body.note

    _audit(db, current_user.id, f"VERIFICATION_{body.action.upper()}", entity="profile", entity_id=profile_id, note=body.note)
    notification_service.send_notification(
        db, target.user_id,
        f"Verification: {body.action}",
        body.note or f"Your verification status has been updated to {action_map[body.action].value}.",
        reference_type="verification", reference_id=profile_id,
    )
    db.commit()
    return {"ok": True, "new_status": action_map[body.action].value}


# ---------------------------------------------------------------------------
# Pickups
# ---------------------------------------------------------------------------

@router.get("/pickups")
def list_all_pickups(
    status: str | None = Query(None),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = select(PickupRequest)
    if status:
        q = q.where(PickupRequest.status == status)
    q = q.order_by(desc(PickupRequest.created_at)).offset(skip).limit(limit)
    total = db.execute(select(func.count(PickupRequest.id))).scalar() or 0
    pickups = db.execute(q).scalars().all()
    return {
        "total": total,
        "data": [{"id": p.id, "status": p.status.value, "customer_id": p.customer_id, "collector_id": p.collector_id, "created_at": p.created_at} for p in pickups]
    }


@router.post("/pickups/{pickup_id}/reassign")
def reassign_pickup(
    pickup_id: str,
    body: ReassignPickupRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pickup = db.get(PickupRequest, pickup_id)
    if not pickup:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Pickup not found."})
    old_collector = pickup.collector_id
    pickup.collector_id = body.collector_id
    _audit(db, current_user.id, "PICKUP_REASSIGN", entity="pickup", entity_id=pickup_id, note=json.dumps({"from": old_collector, "to": body.collector_id, "reason": body.reason}))
    db.commit()
    return {"ok": True}


@router.post("/pickups/{pickup_id}/override")
def override_pickup(
    pickup_id: str,
    body: OverridePickupRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pickup = db.get(PickupRequest, pickup_id)
    if not pickup:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Pickup not found."})
    prev = pickup.status.value
    pickup.status = PickupStatus(body.status)
    db.add(PickupStatusHistory(pickup_id=pickup_id, from_status=prev, to_status=body.status, actor_id=current_user.id, note=f"Admin override: {body.reason}"))
    _audit(db, current_user.id, "PICKUP_OVERRIDE", entity="pickup", entity_id=pickup_id, note=body.reason)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Disputes
# ---------------------------------------------------------------------------

@router.get("/disputes")
def list_disputes(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    complaints = db.execute(
        select(Complaint).where(Complaint.status == ComplaintStatus.OPEN)
        .order_by(Complaint.created_at)
    ).scalars().all()
    return [{"id": c.id, "pickup_id": c.pickup_id, "category": c.category, "status": c.status.value} for c in complaints]


@router.post("/disputes/{complaint_id}/resolve")
def resolve_dispute(
    complaint_id: str,
    body: DisputeResolveRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Complaint not found."})

    complaint.status = ComplaintStatus.RESOLVED
    complaint.resolution = DisputeResolution(body.resolution.upper())
    complaint.resolution_note = body.note
    complaint.resolved_by = current_user.id

    # If points reversal, find and reverse
    if body.resolution == "points_reversed":
        pickup = db.get(PickupRequest, complaint.pickup_id)
        if pickup and pickup.customer_id:
            reward_service.reverse_points(
                db, pickup.customer_id, 0,  # amount to be calculated from ledger
                "complaint", complaint_id, f"Admin reversal for dispute {complaint_id}",
            )

    _audit(db, current_user.id, "DISPUTE_RESOLVED", entity="complaint", entity_id=complaint_id, note=body.resolution)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Settings & Categories
# ---------------------------------------------------------------------------

@router.get("/settings")
def get_settings(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(select(SystemSetting)).scalars().all()
    return {r.key: json.loads(r.value) for r in rows}


@router.put("/settings")
def update_settings(
    data: dict,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    for key, value in data.items():
        existing = db.get(SystemSetting, key)
        if existing:
            existing.value = json.dumps(value)
            existing.updated_by = current_user.id
        else:
            db.add(SystemSetting(key=key, value=json.dumps(value), updated_by=current_user.id))
    _audit(db, current_user.id, "SETTINGS_UPDATE", note=json.dumps(list(data.keys())))
    db.commit()
    return {"ok": True}


@router.get("/categories")
def get_categories(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.execute(select(EwasteCategory)).scalars().all()


@router.put("/categories")
def update_categories(data: list[dict], current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    for item in data:
        cat = db.get(EwasteCategory, item.get("id"))
        if cat:
            for k, v in item.items():
                if hasattr(cat, k) and k != "id":
                    setattr(cat, k, v)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Reward Administration
# ---------------------------------------------------------------------------

@router.post("/rewards/adjust")
def admin_adjust_rewards(
    body: RewardAdjustRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    reward_service.admin_adjust(
        db, body.user_id, RewardLedgerType(body.type),
        body.points, body.reason, current_user.id,
    )
    _audit(db, current_user.id, f"REWARD_{body.type}", entity="user", entity_id=body.user_id, note=body.reason)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@router.get("/analytics/overview")
def analytics_overview(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_customers = db.execute(select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)).scalar() or 0
    total_collectors = db.execute(select(func.count(User.id)).where(User.role == UserRole.COLLECTOR)).scalar() or 0
    total_recyclers = db.execute(select(func.count(User.id)).where(User.role == UserRole.RECYCLER)).scalar() or 0
    total_pickups = db.execute(select(func.count(PickupRequest.id))).scalar() or 0
    completed_pickups = db.execute(select(func.count(PickupRequest.id)).where(PickupRequest.status == PickupStatus.COMPLETED)).scalar() or 0
    total_weight_g = db.execute(select(func.sum(PickupRequest.actual_weight_g)).where(PickupRequest.status == PickupStatus.COMPLETED)).scalar() or 0
    points_issued = db.execute(select(func.sum(RewardLedger.points)).where(RewardLedger.type == RewardLedgerType.CREDIT)).scalar() or 0

    return {
        "total_customers": total_customers,
        "total_collectors": total_collectors,
        "total_recyclers": total_recyclers,
        "total_pickups": total_pickups,
        "completed_pickups": completed_pickups,
        "total_weight_kg": round(total_weight_g / 1000, 2),
        "points_issued": points_issued,
        "completion_rate": round(completed_pickups / total_pickups * 100, 1) if total_pickups else 0,
    }


@router.get("/analytics/pickups")
def analytics_pickups(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    by_status = db.execute(
        select(PickupRequest.status, func.count(PickupRequest.id))
        .where(PickupRequest.created_at >= since)
        .group_by(PickupRequest.status)
    ).all()
    return {"period_days": days, "by_status": {row[0].value: row[1] for row in by_status}}


@router.get("/analytics/recyclers")
def analytics_recyclers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    by_recycler = db.execute(
        select(RecyclerInventoryItem.recycler_id, func.sum(RecyclerInventoryItem.weight_g))
        .group_by(RecyclerInventoryItem.recycler_id)
    ).all()
    return [{"recycler_id": r[0], "total_weight_g": r[1]} for r in by_recycler]


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@router.get("/users")
def list_users(
    role: str | None = Query(None),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = select(User)
    if role:
        q = q.where(User.role == UserRole(role))
    users = db.execute(q.offset(skip).limit(limit)).scalars().all()
    return [{"id": u.id, "email": u.email, "phone": u.phone, "role": u.role.value, "status": u.status.value} for u in users]


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    body: AdminUserStatusRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "User not found."})
    user.status = UserStatus(body.status)
    _audit(db, current_user.id, f"USER_STATUS_{body.status}", entity="user", entity_id=user_id, note=body.note)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

@router.get("/audit-log")
def get_audit_log(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    logs = db.execute(
        select(AuditLog).order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    ).scalars().all()
    return [{"id": l.id, "action": l.action, "entity": l.entity, "entity_id": l.entity_id, "actor_id": l.actor_id, "created_at": l.created_at} for l in logs]
