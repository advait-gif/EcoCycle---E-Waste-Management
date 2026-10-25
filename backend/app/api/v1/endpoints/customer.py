"""
Customer endpoints: addresses, categories, pickups, tracking, rewards, notifications, complaints.
"""
import secrets
import hashlib
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.models import (
    User, UserRole, Address, EwasteCategory,
    PickupRequest, PickupItem, PickupStatusHistory, PickupStatus,
    PickupOffer, OfferResponse, VerificationStatus,
    RewardLedger, Notification, Complaint, ComplaintStatus, CollectorProfile,
)
from app.schemas.schemas import (
    AddressIn, AddressOut, CategoryOut,
    PickupCreateRequest, PickupOut, PickupCancelRequest,
    HandoverConfirmRequest, RatingCreate, ComplaintCreate, ComplaintOut,
    RecyclingCertificateOut,
    RewardWalletOut, NotificationOut,
)
from app.api.deps import get_current_user, require_roles
from app.services import reward_service, notification_service

router = APIRouter(tags=["Customer"])

require_customer_role = require_roles("CUSTOMER")


# ---------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------

@router.get("/addresses", response_model=list[AddressOut])
def list_addresses(
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(Address).where(Address.user_id == current_user.id)).scalars().all()
    return rows


@router.post("/addresses", response_model=AddressOut, status_code=201)
def create_address(
    body: AddressIn,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    if body.is_default:
        # Clear existing defaults
        db.execute(
            Address.__table__.update()
            .where(Address.user_id == current_user.id)
            .values(is_default=False)
        )
    addr = Address(user_id=current_user.id, **body.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.patch("/addresses/{addr_id}", response_model=AddressOut)
def update_address(
    addr_id: str,
    body: AddressIn,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    addr = db.get(Address, addr_id)
    if not addr or addr.user_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Address not found."})
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(addr, k, v)
    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/addresses/{addr_id}")
def delete_address(
    addr_id: str,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    addr = db.get(Address, addr_id)
    if not addr or addr.user_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Address not found."})
    db.delete(addr)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Categories (public)
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.execute(select(EwasteCategory).where(EwasteCategory.active == True)).scalars().all()


# ---------------------------------------------------------------------------
# Pickups
# ---------------------------------------------------------------------------

@router.post("/pickups", response_model=PickupOut, status_code=201)
def create_pickup(
    body: PickupCreateRequest,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    # Validate address belongs to user
    addr = db.get(Address, body.address_id)
    if not addr or addr.user_id != current_user.id:
        raise HTTPException(400, {"code": "INVALID_ADDRESS", "message": "Address not found."})

    total_g = sum(i.estimated_weight_g for i in body.items)
    # Generate 4-digit handover code
    raw_code = f"{secrets.randbelow(10000):04d}"
    code_hash = hashlib.sha256(raw_code.encode()).hexdigest()

    pickup = PickupRequest(
        customer_id=current_user.id,
        address_id=body.address_id,
        slot_start=body.slot_start,
        slot_end=body.slot_end,
        status=PickupStatus.REQUESTED,
        estimated_weight_g=total_g,
        handover_code_hash=code_hash,
        data_wipe_acknowledged=body.data_wipe_acknowledged,
        notes=body.notes,
    )
    db.add(pickup)
    db.flush()

    for item in body.items:
        db.add(PickupItem(
            pickup_id=pickup.id,
            category_id=item.category_id,
            quantity=item.quantity,
            estimated_weight_g=item.estimated_weight_g,
        ))

    # Status history
    db.add(PickupStatusHistory(
        pickup_id=pickup.id,
        from_status=None,
        to_status=PickupStatus.REQUESTED.value,
        actor_id=current_user.id,
    ))

    # Auto-dispatch (PRD §4.2): offer job to verified, online collectors
    collectors = db.execute(
        select(CollectorProfile)
        .where(
            CollectorProfile.verification_status == VerificationStatus.VERIFIED,
            CollectorProfile.is_online == True,
        )
    ).scalars().all()

    if collectors:
        pickup.status = PickupStatus.OFFERED
        db.add(PickupStatusHistory(
            pickup_id=pickup.id,
            from_status=PickupStatus.REQUESTED.value,
            to_status=PickupStatus.OFFERED.value,
            actor_id=current_user.id,
        ))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        for col in collectors:
            db.add(PickupOffer(
                pickup_id=pickup.id,
                collector_id=col.user_id,
                expires_at=expires_at,
                response=OfferResponse.PENDING,
            ))
            notification_service.send_notification(
                db, col.user_id,
                "New Pickup Offer",
                f"New job available ({total_g/1000:.1f} kg estimated). Tap to accept.",
                reference_type="pickup", reference_id=pickup.id,
            )

    # Customer notification
    notification_service.send_notification(
        db, current_user.id,
        "Pickup Requested",
        f"Your pickup request has been received. Handover code: {raw_code}",
        reference_type="pickup", reference_id=pickup.id,
    )

    db.commit()
    db.refresh(pickup)
    return pickup


@router.get("/pickups", response_model=list[PickupOut])
def list_pickups(
    status: str | None = Query(None),
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    q = select(PickupRequest).where(PickupRequest.customer_id == current_user.id)
    if status:
        q = q.where(PickupRequest.status == status)
    q = q.order_by(PickupRequest.created_at.desc())
    pickups = db.execute(q.options(selectinload(PickupRequest.items))).scalars().all()
    return pickups


@router.get("/pickups/{pickup_id}", response_model=PickupOut)
def get_pickup(
    pickup_id: str,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    pickup = db.execute(
        select(PickupRequest)
        .where(PickupRequest.id == pickup_id, PickupRequest.customer_id == current_user.id)
        .options(selectinload(PickupRequest.items))
    ).scalar_one_or_none()
    if not pickup:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Pickup not found."})
    return pickup


@router.post("/pickups/{pickup_id}/cancel")
def cancel_pickup(
    pickup_id: str,
    body: PickupCancelRequest,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    pickup = db.get(PickupRequest, pickup_id)
    if not pickup or pickup.customer_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Pickup not found."})
    if pickup.status not in (PickupStatus.REQUESTED, PickupStatus.OFFERED, PickupStatus.ACCEPTED, PickupStatus.EN_ROUTE):
        raise HTTPException(400, {"code": "CANNOT_CANCEL", "message": "Pickup cannot be cancelled at this stage."})
    
    prev = pickup.status
    pickup.status = PickupStatus.CANCELLED
    pickup.cancel_reason = body.reason
    db.add(PickupStatusHistory(
        pickup_id=pickup.id, from_status=prev.value,
        to_status=PickupStatus.CANCELLED.value, actor_id=current_user.id, note=body.reason,
    ))
    db.commit()
    return {"ok": True}


@router.post("/pickups/{pickup_id}/confirm-handover")
def confirm_handover(
    pickup_id: str,
    body: HandoverConfirmRequest,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    pickup = db.get(PickupRequest, pickup_id)
    if not pickup or pickup.customer_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Pickup not found."})
    code_hash = hashlib.sha256(body.code.encode()).hexdigest()
    if pickup.handover_code_hash != code_hash:
        raise HTTPException(400, {"code": "INVALID_CODE", "message": "Handover code is incorrect."})
    return {"ok": True, "message": "Code verified."}


@router.post("/pickups/{pickup_id}/rating")
def rate_pickup(
    pickup_id: str,
    body: RatingCreate,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    from app.models.models import Rating
    pickup = db.get(PickupRequest, pickup_id)
    if not pickup or pickup.customer_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Pickup not found."})
    if pickup.status != PickupStatus.COMPLETED:
        raise HTTPException(400, {"code": "NOT_COMPLETED", "message": "Pickup must be completed to rate."})
    if not pickup.collector_id:
        raise HTTPException(400, {"code": "NO_COLLECTOR", "message": "No collector on this pickup."})

    rating = Rating(
        pickup_id=pickup_id,
        from_user_id=current_user.id,
        to_user_id=pickup.collector_id,
        stars=body.stars,
        comment=body.comment,
    )
    db.add(rating)

    # Update collector avg
    cp = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == pickup.collector_id)).scalar_one_or_none()
    if cp:
        new_count = cp.rating_count + 1
        cp.rating_avg = ((cp.rating_avg * cp.rating_count) + body.stars) / new_count
        cp.rating_count = new_count

    db.commit()
    return {"ok": True}


@router.get("/pickups/{pickup_id}/track")
def track_pickup(
    pickup_id: str,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    pickup = db.get(PickupRequest, pickup_id)
    if not pickup or pickup.customer_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Pickup not found."})

    collector_lat, collector_lng, eta = None, None, None
    if pickup.collector_id:
        cp = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == pickup.collector_id)).scalar_one_or_none()
        if cp:
            collector_lat, collector_lng = cp.last_lat, cp.last_lng

    history = db.execute(
        select(PickupStatusHistory)
        .where(PickupStatusHistory.pickup_id == pickup_id)
        .order_by(PickupStatusHistory.created_at)
    ).scalars().all()

    return {
        "pickup_id": pickup_id,
        "status": pickup.status.value,
        "collector_lat": collector_lat,
        "collector_lng": collector_lng,
        "eta_minutes": eta,
        "status_history": [
            {"from": h.from_status, "to": h.to_status, "at": h.created_at.isoformat()}
            for h in history
        ],
    }


# ---------------------------------------------------------------------------
# Rewards
# ---------------------------------------------------------------------------

@router.get("/rewards/wallet", response_model=RewardWalletOut)
def get_wallet(current_user: User = Depends(require_roles("CUSTOMER")), db: Session = Depends(get_db)):
    return reward_service.get_wallet(db, current_user.id)


@router.get("/rewards/ledger")
def get_ledger(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(RewardLedger)
        .where(RewardLedger.user_id == current_user.id)
        .order_by(RewardLedger.created_at.desc())
        .offset(skip).limit(limit)
    ).scalars().all()
    return [{"id": r.id, "type": r.type.value, "points": r.points, "reason": r.reason, "created_at": r.created_at} for r in rows]


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@router.get("/customer/notifications", response_model=list[NotificationOut])
def get_notifications(
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    ).scalars().all()
    return rows


# ---------------------------------------------------------------------------
# Complaints
# ---------------------------------------------------------------------------

@router.post("/complaints", response_model=ComplaintOut, status_code=201)
def raise_complaint(
    body: ComplaintCreate,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    pickup = db.get(PickupRequest, body.pickup_id)
    if not pickup or pickup.customer_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Pickup not found."})
    c = Complaint(
        pickup_id=body.pickup_id,
        raised_by=current_user.id,
        category=body.category,
        description=body.description,
        status=ComplaintStatus.OPEN,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return ComplaintOut(
        id=c.id,
        pickup_id=c.pickup_id,
        category=c.category,
        description=c.description,
        status=c.status.value if hasattr(c.status, "value") else str(c.status),
        created_at=c.created_at,
    )


@router.get("/complaints", response_model=list[ComplaintOut])
def list_complaints(
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Complaint)
        .where(Complaint.raised_by == current_user.id)
        .order_by(Complaint.created_at.desc())
    ).scalars().all()
    return [
        ComplaintOut(
            id=r.id,
            pickup_id=r.pickup_id,
            category=r.category,
            description=r.description,
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/complaints/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: str,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    c = db.get(Complaint, complaint_id)
    if not c or c.raised_by != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Complaint not found."})
    return ComplaintOut(
        id=c.id,
        pickup_id=c.pickup_id,
        category=c.category,
        description=c.description,
        status=c.status.value if hasattr(c.status, "value") else str(c.status),
        created_at=c.created_at,
    )


# ---------------------------------------------------------------------------
# Recycling Certificates (Verified records)
# ---------------------------------------------------------------------------

@router.get("/certificates", response_model=list[RecyclingCertificateOut])
def list_certificates(
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    """
    Returns verified recycling completion records/certificates for customer pickups
    that have completed the recycling chain of custody.
    """
    rows = db.execute(
        select(PickupRequest)
        .options(selectinload(PickupRequest.items))
        .where(
            PickupRequest.customer_id == current_user.id,
            PickupRequest.status.in_([PickupStatus.COMPLETED, PickupStatus.RECYCLER_VERIFIED])
        )
        .order_by(PickupRequest.updated_at.desc())
    ).scalars().all()

    certs = []
    for p in rows:
        weight_kg = (p.actual_weight_g or p.estimated_weight_g or 0) / 1000.0
        cert_hash = hashlib.sha256(f"{p.id}:{current_user.id}:{p.completed_at or p.updated_at}".encode()).hexdigest()[:16]
        certs.append(
            RecyclingCertificateOut(
                certificate_id=f"ECO-CERT-{p.id[:8].upper()}",
                pickup_id=p.id,
                verification_hash=cert_hash,
                status=p.status.value if hasattr(p.status, "value") else str(p.status),
                weight_kg=round(weight_kg, 2),
                item_count=len(p.items),
                issued_at=p.completed_at or p.updated_at,
                co2e_avoided_kg=round(weight_kg * 1.85, 2),
            )
        )
    return certs


@router.get("/certificates/{pickup_id}", response_model=RecyclingCertificateOut)
def get_certificate(
    pickup_id: str,
    current_user: User = Depends(require_roles("CUSTOMER")),
    db: Session = Depends(get_db),
):
    p = db.execute(
        select(PickupRequest)
        .options(selectinload(PickupRequest.items))
        .where(
            PickupRequest.id == pickup_id,
            PickupRequest.customer_id == current_user.id,
            PickupRequest.status.in_([PickupStatus.COMPLETED, PickupStatus.RECYCLER_VERIFIED])
        )
    ).scalar_one_or_none()

    if not p:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Verified recycling record not found."})

    weight_kg = (p.actual_weight_g or p.estimated_weight_g or 0) / 1000.0
    cert_hash = hashlib.sha256(f"{p.id}:{current_user.id}:{p.completed_at or p.updated_at}".encode()).hexdigest()[:16]
    return RecyclingCertificateOut(
        certificate_id=f"ECO-CERT-{p.id[:8].upper()}",
        pickup_id=p.id,
        verification_hash=cert_hash,
        status=p.status.value if hasattr(p.status, "value") else str(p.status),
        weight_kg=round(weight_kg, 2),
        item_count=len(p.items),
        issued_at=p.completed_at or p.updated_at,
        co2e_avoided_kg=round(weight_kg * 1.85, 2),
    )

