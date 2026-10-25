"""
Rewards engine — double-entry ledger.
Points are credited only after RECYCLER_VERIFIED weight is confirmed.
"""
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.models import RewardLedger, RewardLedgerType, EwasteCategory


def _get_balance(db: Session, user_id: str) -> int:
    rows = db.execute(
        select(RewardLedger.type, func.sum(RewardLedger.points))
        .where(RewardLedger.user_id == user_id)
        .group_by(RewardLedger.type)
    ).all()
    balance = 0
    for row in rows:
        t, pts = row
        if t in (RewardLedgerType.CREDIT.value, RewardLedgerType.ADJUSTMENT.value):
            balance += pts
        else:  # DEBIT, REVERSAL
            balance -= pts
    return max(balance, 0)


def credit_points(
    db: Session,
    user_id: str,
    points: int,
    reference_type: str,
    reference_id: str,
    reason: str,
) -> RewardLedger:
    # Idempotency: prevent double-credit
    existing = db.execute(
        select(RewardLedger).where(
            RewardLedger.user_id == user_id,
            RewardLedger.type == RewardLedgerType.CREDIT,
            RewardLedger.reference_type == reference_type,
            RewardLedger.reference_id == reference_id,
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    entry = RewardLedger(
        user_id=user_id,
        type=RewardLedgerType.CREDIT,
        points=points,
        reference_type=reference_type,
        reference_id=reference_id,
        reason=reason,
    )
    db.add(entry)
    db.flush()
    return entry


def debit_points(
    db: Session,
    user_id: str,
    points: int,
    reference_type: str,
    reference_id: str,
    reason: str,
) -> RewardLedger:
    balance = _get_balance(db, user_id)
    if balance < points:
        raise ValueError(f"Insufficient points: balance={balance}, requested={points}")
    entry = RewardLedger(
        user_id=user_id,
        type=RewardLedgerType.DEBIT,
        points=points,
        reference_type=reference_type,
        reference_id=reference_id,
        reason=reason,
    )
    db.add(entry)
    db.flush()
    return entry


def reverse_points(
    db: Session,
    user_id: str,
    points: int,
    reference_type: str,
    reference_id: str,
    reason: str,
) -> RewardLedger:
    entry = RewardLedger(
        user_id=user_id,
        type=RewardLedgerType.REVERSAL,
        points=points,
        reference_type=reference_type,
        reference_id=reference_id,
        reason=reason,
    )
    db.add(entry)
    db.flush()
    return entry


def admin_adjust(
    db: Session,
    user_id: str,
    type_: RewardLedgerType,
    points: int,
    reason: str,
    admin_id: str,
) -> RewardLedger:
    entry = RewardLedger(
        user_id=user_id,
        type=type_,
        points=points,
        reference_type="admin_adjustment",
        reference_id=admin_id,
        reason=reason,
    )
    db.add(entry)
    db.flush()
    return entry


def calculate_points_for_pickup(db: Session | None, pickup_items, actual_weight_g: int) -> int:
    """Calculate total reward points using per-category rate (PRD §5.6)."""
    if not pickup_items:
        DEFAULT_POINTS_PER_KG = 10.0
        return round((actual_weight_g / 1000) * DEFAULT_POINTS_PER_KG)

    total_points = 0.0
    has_individual_actual = any(getattr(item, "actual_weight_g", None) for item in pickup_items)

    if has_individual_actual:
        for item in pickup_items:
            w_g = getattr(item, "actual_weight_g", None) or 0
            cat = getattr(item, "category", None)
            if not cat and db and getattr(item, "category_id", None):
                cat = db.get(EwasteCategory, item.category_id)
            rate = cat.points_per_kg if (cat and cat.points_per_kg is not None) else 10.0
            total_points += (w_g / 1000.0) * rate
    else:
        total_est = sum(getattr(item, "estimated_weight_g", 0) for item in pickup_items)
        for item in pickup_items:
            est = getattr(item, "estimated_weight_g", 0)
            proportion = (est / total_est) if total_est > 0 else (1.0 / len(pickup_items))
            w_g = actual_weight_g * proportion
            cat = getattr(item, "category", None)
            if not cat and db and getattr(item, "category_id", None):
                cat = db.get(EwasteCategory, item.category_id)
            rate = cat.points_per_kg if (cat and cat.points_per_kg is not None) else 10.0
            total_points += (w_g / 1000.0) * rate

    return round(total_points)


def get_wallet(db: Session, user_id: str) -> dict:
    balance = _get_balance(db, user_id)
    earned = db.execute(
        select(func.sum(RewardLedger.points)).where(
            RewardLedger.user_id == user_id,
            RewardLedger.type == RewardLedgerType.CREDIT,
        )
    ).scalar() or 0
    return {"user_id": user_id, "balance": balance, "lifetime_earned": int(earned)}
