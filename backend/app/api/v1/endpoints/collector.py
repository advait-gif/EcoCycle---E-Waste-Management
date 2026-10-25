"""
Collector endpoints: onboarding, jobs, weighing, batches, earnings.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import (
    User, CollectorProfile, PickupRequest, PickupStatus,
    PickupStatusHistory, PickupOffer, OfferResponse,
    DeliveryBatch, DeliveryBatchPickup, BatchStatus,
    PickupItem, RecyclerInventoryItem, InventoryStatus,
)
from app.schemas.schemas import (
    CollectorOnboardingRequest, CollectorStatusToggle,
    CollectorLocationUpdate, JobStatusUpdate,
    BatchCreateRequest, BatchDeliverRequest, WeighRequest,
)
from app.api.deps import get_current_user, require_roles
from app.services import notification_service, reward_service

router = APIRouter(tags=["Collector"])


@router.post("/collector/onboarding", status_code=201)
def onboarding(
    body: CollectorOnboardingRequest,
    current_user: User = Depends(require_roles("COLLECTOR")),
    db: Session = Depends(get_db),
):
    cp = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == current_user.id)).scalar_one_or_none()
    if not cp:
        raise HTTPException(404, {"code": "NO_PROFILE", "message": "Collector profile not found."})
    for k, v in body.model_dump().items():
        if hasattr(cp, k):
            setattr(cp, k, v)
    db.commit()
    return {"ok": True, "message": "Onboarding submitted. Pending admin review."}


@router.get("/collector/verification-status")
def verification_status(current_user: User = Depends(require_roles("COLLECTOR")), db: Session = Depends(get_db)):
    cp = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == current_user.id)).scalar_one_or_none()
    return {"status": cp.verification_status.value if cp else "UNKNOWN", "reason": cp.rejection_reason if cp else None}


@router.post("/collector/status")
def toggle_online(
    body: CollectorStatusToggle,
    current_user: User = Depends(require_roles("COLLECTOR")),
    db: Session = Depends(get_db),
):
    cp = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == current_user.id)).scalar_one_or_none()
    if not cp or cp.verification_status.value != "VERIFIED":
        raise HTTPException(403, {"code": "NOT_VERIFIED", "message": "Only verified collectors can go online."})
    cp.is_online = body.is_online
    db.commit()
    return {"ok": True, "is_online": body.is_online}


@router.post("/collector/location")
def update_location(
    body: CollectorLocationUpdate,
    current_user: User = Depends(require_roles("COLLECTOR")),
    db: Session = Depends(get_db),
):
    cp = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == current_user.id)).scalar_one_or_none()
    if cp:
        cp.last_lat = body.lat
        cp.last_lng = body.lng
        db.commit()
    return {"ok": True}


@router.get("/collector/offers")
def get_offers(current_user: User = Depends(require_roles("COLLECTOR")), db: Session = Depends(get_db)):
    offers = db.execute(
        select(PickupOffer)
        .where(
            PickupOffer.collector_id == current_user.id,
            PickupOffer.response == OfferResponse.PENDING,
        )
        .options(selectinload(PickupOffer.pickup))
    ).scalars().all()
    return [
        {
            "offer_id": o.id,
            "pickup_id": o.pickup_id,
            "offered_at": o.offered_at,
            "expires_at": o.expires_at,
            "estimated_weight_g": o.pickup.estimated_weight_g if o.pickup else 0,
            "status": o.pickup.status.value if o.pickup else "UNKNOWN",
        }
        for o in offers
    ]


@router.post("/collector/offers/{offer_id}/accept")
def accept_offer(
    offer_id: str,
    current_user: User = Depends(require_roles("COLLECTOR")),
    db: Session = Depends(get_db),
):
    offer = db.get(PickupOffer, offer_id)
    if not offer or offer.collector_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Offer not found."})
    if offer.response != OfferResponse.PENDING:
        raise HTTPException(400, {"code": "ALREADY_RESPONDED", "message": "Offer already responded to."})

    offer.response = OfferResponse.ACCEPTED
    offer.responded_at = datetime.now(timezone.utc)

    pickup = db.get(PickupRequest, offer.pickup_id)
    if pickup:
        pickup.status = PickupStatus.ACCEPTED
        pickup.collector_id = current_user.id
        db.add(PickupStatusHistory(
            pickup_id=pickup.id, from_status=PickupStatus.OFFERED.value,
            to_status=PickupStatus.ACCEPTED.value, actor_id=current_user.id,
        ))
        notification_service.send_notification(
            db, pickup.customer_id,
            "Collector Accepted",
            f"A collector has accepted your pickup request.",
            reference_type="pickup", reference_id=pickup.id,
        )

    db.commit()
    return {"ok": True}


@router.post("/collector/offers/{offer_id}/decline")
def decline_offer(offer_id: str, current_user: User = Depends(require_roles("COLLECTOR")), db: Session = Depends(get_db)):
    offer = db.get(PickupOffer, offer_id)
    if not offer or offer.collector_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Offer not found."})
    offer.response = OfferResponse.DECLINED
    offer.responded_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.post("/collector/jobs/{pickup_id}/status")
def update_job_status(
    pickup_id: str,
    body: JobStatusUpdate,
    current_user: User = Depends(require_roles("COLLECTOR")),
    db: Session = Depends(get_db),
):
    VALID_TRANSITIONS = {
        PickupStatus.ACCEPTED.value: [PickupStatus.EN_ROUTE.value],
        PickupStatus.EN_ROUTE.value: [PickupStatus.ARRIVED.value],
        PickupStatus.ARRIVED.value: [PickupStatus.COLLECTED.value, PickupStatus.FAILED.value],
    }
    pickup = db.get(PickupRequest, pickup_id)
    if not pickup or pickup.collector_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Job not found."})

    allowed = VALID_TRANSITIONS.get(pickup.status.value, [])
    if body.status not in allowed:
        raise HTTPException(400, {"code": "INVALID_TRANSITION", "message": f"Cannot move from {pickup.status.value} to {body.status}."})

    prev = pickup.status.value
    pickup.status = PickupStatus(body.status)

    # Update collector location if provided
    if body.lat and body.lng:
        cp = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == current_user.id)).scalar_one_or_none()
        if cp:
            cp.last_lat = body.lat
            cp.last_lng = body.lng

    db.add(PickupStatusHistory(
        pickup_id=pickup.id, from_status=prev, to_status=body.status,
        actor_id=current_user.id, lat=body.lat, lng=body.lng, note=body.note,
    ))

    msg_map = {
        "EN_ROUTE": "Your collector is on the way!",
        "ARRIVED": "Your collector has arrived.",
        "COLLECTED": "Your e-waste has been collected.",
    }
    if body.status in msg_map:
        notification_service.send_notification(
            db, pickup.customer_id, f"Pickup Update: {body.status}", msg_map[body.status],
            reference_type="pickup", reference_id=pickup.id,
        )

    db.commit()
    return {"ok": True, "status": body.status}


@router.post("/collector/jobs/{pickup_id}/weigh")
def weigh_job(
    pickup_id: str,
    body: WeighRequest,
    current_user: User = Depends(require_roles("COLLECTOR")),
    db: Session = Depends(get_db),
):
    pickup = db.get(PickupRequest, pickup_id)
    if not pickup or pickup.collector_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Job not found."})

    total_actual_g = 0
    for w in body.weights:
        item = db.get(PickupItem, w.get("pickup_item_id"))
        if item and item.pickup_id == pickup_id:
            item.actual_weight_g = w.get("actual_weight_g", 0)
            total_actual_g += item.actual_weight_g

    pickup.actual_weight_g = total_actual_g
    pickup.status = PickupStatus.COLLECTED
    db.add(PickupStatusHistory(
        pickup_id=pickup.id, from_status=PickupStatus.ARRIVED.value,
        to_status=PickupStatus.COLLECTED.value, actor_id=current_user.id, note=body.notes,
    ))
    db.commit()
    return {"ok": True, "actual_weight_g": total_actual_g}


@router.post("/collector/batches", status_code=201)
def create_batch(
    body: BatchCreateRequest,
    current_user: User = Depends(require_roles("COLLECTOR")),
    db: Session = Depends(get_db),
):
    # Validate recycler exists
    recycler = db.get(User, body.recycler_id)
    if not recycler or recycler.role.value != "RECYCLER":
        raise HTTPException(400, {"code": "INVALID_RECYCLER", "message": "Recycler not found."})

    total_g = 0
    batch = DeliveryBatch(collector_id=current_user.id, recycler_id=body.recycler_id)
    db.add(batch)
    db.flush()

    for pid in body.pickup_ids:
        pickup = db.get(PickupRequest, pid)
        if not pickup or pickup.collector_id != current_user.id or pickup.status != PickupStatus.COLLECTED:
            continue
        db.add(DeliveryBatchPickup(batch_id=batch.id, pickup_id=pid))
        pickup.status = PickupStatus.DELIVERED_TO_RECYCLER
        db.add(PickupStatusHistory(
            pickup_id=pid, from_status=PickupStatus.COLLECTED.value,
            to_status=PickupStatus.DELIVERED_TO_RECYCLER.value, actor_id=current_user.id,
        ))
        total_g += pickup.actual_weight_g or 0

    batch.collector_weight_g = total_g
    db.commit()
    db.refresh(batch)
    return {"ok": True, "batch_id": batch.id, "collector_weight_g": total_g}


@router.post("/collector/batches/{batch_id}/deliver")
def mark_delivered(
    batch_id: str,
    body: BatchDeliverRequest,
    current_user: User = Depends(require_roles("COLLECTOR")),
    db: Session = Depends(get_db),
):
    batch = db.get(DeliveryBatch, batch_id)
    if not batch or batch.collector_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Batch not found."})
    batch.collector_weight_g = body.collector_weight_g
    batch.delivered_at = datetime.now(timezone.utc)
    batch.status = BatchStatus.DELIVERED
    db.commit()
    return {"ok": True}


@router.get("/collector/earnings")
def get_earnings(current_user: User = Depends(require_roles("COLLECTOR")), db: Session = Depends(get_db)):
    from app.models.models import EarningsLedger
    rows = db.execute(
        select(EarningsLedger)
        .where(EarningsLedger.collector_id == current_user.id)
        .order_by(EarningsLedger.created_at.desc())
    ).scalars().all()
    return [{"id": r.id, "pickup_id": r.pickup_id, "amount_paise": r.amount_paise, "status": r.status.value} for r in rows]
