"""
Recycler endpoints: onboarding, deliveries, inventory, processing, reports.
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.models import (
    User, RecyclerProfile, DeliveryBatch, DeliveryBatchPickup,
    BatchStatus, RecyclerInventoryItem, InventoryStatus,
    ProcessingRecord, PickupRequest, PickupStatus, PickupStatusHistory,
    EarningsLedger, EarningStatus, EwasteCategory,
)
from app.schemas.schemas import (
    RecyclerOnboardingRequest, ReceiveDeliveryRequest, ProcessingRecordCreate,
)
from app.api.deps import get_current_user, require_roles
from app.services import notification_service, reward_service

router = APIRouter(tags=["Recycler"])


@router.post("/recycler/onboarding", status_code=201)
def onboarding(
    body: RecyclerOnboardingRequest,
    current_user: User = Depends(require_roles("RECYCLER")),
    db: Session = Depends(get_db),
):
    rp = db.execute(select(RecyclerProfile).where(RecyclerProfile.user_id == current_user.id)).scalar_one_or_none()
    if not rp:
        raise HTTPException(404, {"code": "NO_PROFILE", "message": "Recycler profile not found."})
    for k, v in body.model_dump().items():
        if k == "categories_accepted" and isinstance(v, list):
            v = json.dumps(v)
        if hasattr(rp, k):
            setattr(rp, k, v)
    db.commit()
    return {"ok": True, "message": "Onboarding submitted. Awaiting admin review."}


@router.get("/recycler/deliveries")
def list_deliveries(
    status: str | None = Query(None),
    current_user: User = Depends(require_roles("RECYCLER")),
    db: Session = Depends(get_db),
):
    q = select(DeliveryBatch).where(DeliveryBatch.recycler_id == current_user.id)
    if status:
        q = q.where(DeliveryBatch.status == status)
    batches = db.execute(q.order_by(DeliveryBatch.created_at.desc())).scalars().all()
    return [
        {
            "id": b.id, "status": b.status.value,
            "collector_weight_g": b.collector_weight_g,
            "recycler_weight_g": b.recycler_weight_g,
            "delivered_at": b.delivered_at,
        }
        for b in batches
    ]


@router.post("/recycler/deliveries/{batch_id}/receive")
def receive_delivery(
    batch_id: str,
    body: ReceiveDeliveryRequest,
    current_user: User = Depends(require_roles("RECYCLER")),
    db: Session = Depends(get_db),
):
    batch = db.get(DeliveryBatch, batch_id)
    if not batch or batch.recycler_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Delivery not found."})
    if batch.status != BatchStatus.DELIVERED:
        raise HTTPException(400, {"code": "NOT_DELIVERED", "message": "Batch is not in DELIVERED state."})

    total_received_g = sum(w.get("weight_g", 0) for w in body.received_weights)
    batch.recycler_weight_g = total_received_g

    if body.action in ("accept", "partial_accept"):
        batch.status = BatchStatus.RECYCLER_VERIFIED

        # Create inventory items
        for w in body.received_weights:
            db.add(RecyclerInventoryItem(
                recycler_id=current_user.id,
                batch_id=batch_id,
                category_id=w.get("category_id"),
                weight_g=w.get("weight_g", 0),
                status=InventoryStatus.RECEIVED,
            ))

        # Mark pickups RECYCLER_VERIFIED and credit rewards
        batch_pickups = db.execute(
            select(DeliveryBatchPickup).where(DeliveryBatchPickup.batch_id == batch_id)
        ).scalars().all()

        for bp in batch_pickups:
            pickup = db.get(PickupRequest, bp.pickup_id)
            if pickup:
                prev = pickup.status.value
                pickup.status = PickupStatus.RECYCLER_VERIFIED
                db.add(PickupStatusHistory(
                    pickup_id=pickup.id, from_status=prev,
                    to_status=PickupStatus.RECYCLER_VERIFIED.value, actor_id=current_user.id,
                ))

                # Credit reward points (PRD §5.6 — only on RECYCLER_VERIFIED)
                if pickup.actual_weight_g:
                    pts = reward_service.calculate_points_for_pickup(db, pickup.items, pickup.actual_weight_g)
                    if pts > 0:
                        reward_service.credit_points(
                            db, pickup.customer_id, pts,
                            "pickup", pickup.id,
                            f"Reward for verified recycling of pickup {pickup.id}",
                        )
                        notification_service.send_notification(
                            db, pickup.customer_id,
                            "Points Credited",
                            f"{pts} reward points credited for your recycled e-waste!",
                            reference_type="pickup", reference_id=pickup.id,
                        )

                # Mark COMPLETED
                pickup.status = PickupStatus.COMPLETED
                pickup.completed_at = datetime.now(timezone.utc)
                db.add(PickupStatusHistory(
                    pickup_id=pickup.id, from_status=PickupStatus.RECYCLER_VERIFIED.value,
                    to_status=PickupStatus.COMPLETED.value, actor_id=current_user.id,
                ))

                # Record collector earnings (PRD §4.8)
                col_id = pickup.collector_id or batch.collector_id
                if col_id:
                    total_val = 0.0
                    if pickup.items:
                        for it in pickup.items:
                            w = it.actual_weight_g or ((pickup.actual_weight_g or 0) / len(pickup.items))
                            cat = it.category or db.get(EwasteCategory, it.category_id)
                            rate = cat.rate_per_kg if (cat and cat.rate_per_kg) else 50.0
                            total_val += (w / 1000.0) * rate
                    else:
                        rate = 50.0
                        total_val = ((pickup.actual_weight_g or 0) / 1000.0) * rate

                    amount_paise = max(round(total_val * 100), 100)
                    existing_earning = db.execute(
                        select(EarningsLedger).where(
                            EarningsLedger.collector_id == col_id,
                            EarningsLedger.pickup_id == pickup.id,
                        )
                    ).scalar_one_or_none()
                    if not existing_earning:
                        db.add(EarningsLedger(
                            collector_id=col_id,
                            pickup_id=pickup.id,
                            amount_paise=amount_paise,
                            status=EarningStatus.PENDING,
                        ))
                        notification_service.send_notification(
                            db, col_id,
                            "Job Completed & Earnings Credited",
                            f"Pickup {pickup.id[:8]} confirmed by recycler! Rs. {amount_paise / 100:.2f} credited to pending earnings.",
                            reference_type="pickup", reference_id=pickup.id,
                        )

    else:  # reject
        batch.status = BatchStatus.DISPUTED
        for bp in db.execute(select(DeliveryBatchPickup).where(DeliveryBatchPickup.batch_id == batch_id)).scalars().all():
            pickup = db.get(PickupRequest, bp.pickup_id)
            if pickup:
                pickup.status = PickupStatus.DISPUTED

    db.commit()
    return {"ok": True, "action": body.action, "total_received_g": total_received_g}


@router.get("/recycler/inventory")
def get_inventory(
    status: str | None = Query(None),
    current_user: User = Depends(require_roles("RECYCLER")),
    db: Session = Depends(get_db),
):
    q = select(RecyclerInventoryItem).where(RecyclerInventoryItem.recycler_id == current_user.id)
    if status:
        q = q.where(RecyclerInventoryItem.status == status)
    items = db.execute(q).scalars().all()
    return [
        {
            "id": i.id, "batch_id": i.batch_id,
            "category_id": i.category_id,
            "weight_g": i.weight_g,
            "status": i.status.value,
            "intake_date": i.intake_date,
        }
        for i in items
    ]


@router.patch("/recycler/inventory/{item_id}")
def update_inventory(
    item_id: str,
    status: str,
    current_user: User = Depends(require_roles("RECYCLER")),
    db: Session = Depends(get_db),
):
    item = db.get(RecyclerInventoryItem, item_id)
    if not item or item.recycler_id != current_user.id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "Item not found."})
    item.status = InventoryStatus(status)
    db.commit()
    return {"ok": True}


@router.post("/recycler/processing", status_code=201)
def create_processing(
    body: ProcessingRecordCreate,
    current_user: User = Depends(require_roles("RECYCLER")),
    db: Session = Depends(get_db),
):
    record = ProcessingRecord(
        recycler_id=current_user.id,
        batch_id=body.batch_id,
        outputs=json.dumps(body.outputs),
        notes=body.notes,
    )
    db.add(record)
    db.commit()
    return {"ok": True, "record_id": record.id}


@router.get("/recycler/processing")
def list_processing(current_user: User = Depends(require_roles("RECYCLER")), db: Session = Depends(get_db)):
    records = db.execute(
        select(ProcessingRecord).where(ProcessingRecord.recycler_id == current_user.id)
        .order_by(ProcessingRecord.processed_at.desc())
    ).scalars().all()
    return [{"id": r.id, "batch_id": r.batch_id, "outputs": r.outputs, "processed_at": r.processed_at} for r in records]


@router.get("/recycler/reports")
def get_reports(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_roles("RECYCLER")),
    db: Session = Depends(get_db),
):
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    total = db.execute(
        select(func.sum(RecyclerInventoryItem.weight_g))
        .where(RecyclerInventoryItem.recycler_id == current_user.id, RecyclerInventoryItem.intake_date >= since)
    ).scalar() or 0
    return {"period_days": days, "total_weight_g": total}
