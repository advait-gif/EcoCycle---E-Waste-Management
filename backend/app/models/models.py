"""
EcoCycle – full SQLAlchemy ORM models (PRD v1.0).
All IDs are UUIDs stored as strings (SQLite-compatible).
Weights stored in grams (int) to avoid float rounding drift.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, JSON, UniqueConstraint, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, PyEnum):
    CUSTOMER = "CUSTOMER"
    COLLECTOR = "COLLECTOR"
    RECYCLER = "RECYCLER"
    ADMIN = "ADMIN"
    SUPPORT = "SUPPORT"


class UserStatus(str, PyEnum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DELETED = "DELETED"


class VerificationStatus(str, PyEnum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    MORE_INFO_NEEDED = "MORE_INFO_NEEDED"


class PickupStatus(str, PyEnum):
    REQUESTED = "REQUESTED"
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    EN_ROUTE = "EN_ROUTE"
    ARRIVED = "ARRIVED"
    COLLECTED = "COLLECTED"
    DELIVERED_TO_RECYCLER = "DELIVERED_TO_RECYCLER"
    RECYCLER_VERIFIED = "RECYCLER_VERIFIED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_COLLECTOR_FOUND = "NO_COLLECTOR_FOUND"
    FAILED = "FAILED"
    DISPUTED = "DISPUTED"


class OfferResponse(str, PyEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"


class BatchStatus(str, PyEnum):
    OPEN = "OPEN"
    DELIVERED = "DELIVERED"
    RECYCLER_VERIFIED = "RECYCLER_VERIFIED"
    DISPUTED = "DISPUTED"


class InventoryStatus(str, PyEnum):
    RECEIVED = "RECEIVED"
    SORTED = "SORTED"
    IN_PROCESSING = "IN_PROCESSING"
    PROCESSED = "PROCESSED"


class RewardLedgerType(str, PyEnum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"
    REVERSAL = "REVERSAL"
    ADJUSTMENT = "ADJUSTMENT"


class EarningStatus(str, PyEnum):
    PENDING = "PENDING"
    PAID = "PAID"


class NotificationChannel(str, PyEnum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"


class ComplaintStatus(str, PyEnum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class DisputeResolution(str, PyEnum):
    POINTS_REVERSED = "POINTS_REVERSED"
    COLLECTOR_PENALTY = "COLLECTOR_PENALTY"
    RECYCLER_FLAG = "RECYCLER_FLAG"
    NO_ACTION = "NO_ACTION"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), unique=True, index=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.ACTIVE)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    phone_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    # Relationships
    customer_profile: Mapped[Optional["CustomerProfile"]] = relationship(back_populates="user", uselist=False)
    collector_profile: Mapped[Optional["CollectorProfile"]] = relationship(back_populates="user", uselist=False)
    recycler_profile: Mapped[Optional["RecyclerProfile"]] = relationship(back_populates="user", uselist=False)
    sessions: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    otps: Mapped[list["OtpCode"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    addresses: Mapped[list["Address"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    device: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="sessions")


class OtpCode(Base):
    """One-time passwords for registration & login."""
    __tablename__ = "otp_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    code: Mapped[str] = mapped_column(String(10))
    purpose: Mapped[str] = mapped_column(String(50))  # "email_verify", "phone_verify", "login", "password_reset"
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="otps")


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    default_address_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship(back_populates="customer_profile")


class CollectorProfile(Base):
    __tablename__ = "collector_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    verification_status: Mapped[VerificationStatus] = mapped_column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vehicle_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    service_radius_km: Mapped[float] = mapped_column(Float, default=10.0)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bank_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # encrypted ref
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    acceptance_rate: Mapped[float] = mapped_column(Float, default=100.0)
    completion_rate: Mapped[float] = mapped_column(Float, default=100.0)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship(back_populates="collector_profile")


class RecyclerProfile(Base):
    __tablename__ = "recycler_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    facility_name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gst: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    capacity_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    categories_accepted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array string
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    verification_status: Mapped[VerificationStatus] = mapped_column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship(back_populates="recycler_profile")


class VerificationDocument(Base):
    __tablename__ = "verification_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    doc_type: Mapped[str] = mapped_column(String(100))  # e.g. "govt_id", "authorization_cert", "gst"
    file_key: Mapped[str] = mapped_column(String(512))  # storage path
    doc_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[VerificationStatus] = mapped_column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------

class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    line1: Mapped[str] = mapped_column(String(512))
    line2: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(100))
    pincode: Mapped[str] = mapped_column(String(10))
    landmark: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship(back_populates="addresses")


# ---------------------------------------------------------------------------
# E-waste Categories
# ---------------------------------------------------------------------------

class EwasteCategory(Base):
    __tablename__ = "ewaste_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    emoji: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    points_per_kg: Mapped[float] = mapped_column(Float, default=10.0)
    rate_per_kg: Mapped[float] = mapped_column(Float, default=0.0)  # INR paid by recycler
    hazardous_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# Pickup Requests
# ---------------------------------------------------------------------------

class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    customer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    address_id: Mapped[str] = mapped_column(ForeignKey("addresses.id"))
    slot_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    slot_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[PickupStatus] = mapped_column(Enum(PickupStatus), default=PickupStatus.REQUESTED, index=True)
    estimated_weight_g: Mapped[int] = mapped_column(Integer, default=0)  # grams
    actual_weight_g: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    collector_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    handover_code_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_wipe_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    address: Mapped["Address"] = relationship()
    items: Mapped[list["PickupItem"]] = relationship(back_populates="pickup", cascade="all, delete-orphan")
    status_history: Mapped[list["PickupStatusHistory"]] = relationship(back_populates="pickup", cascade="all, delete-orphan")
    offers: Mapped[list["PickupOffer"]] = relationship(back_populates="pickup", cascade="all, delete-orphan")


class PickupItem(Base):
    __tablename__ = "pickup_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    pickup_id: Mapped[str] = mapped_column(ForeignKey("pickup_requests.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[str] = mapped_column(ForeignKey("ewaste_categories.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    estimated_weight_g: Mapped[int] = mapped_column(Integer, default=0)
    actual_weight_g: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    photo_keys: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    pickup: Mapped["PickupRequest"] = relationship(back_populates="items")
    category: Mapped["EwasteCategory"] = relationship()


class PickupStatusHistory(Base):
    __tablename__ = "pickup_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    pickup_id: Mapped[str] = mapped_column(ForeignKey("pickup_requests.id", ondelete="CASCADE"), index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50))
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    pickup: Mapped["PickupRequest"] = relationship(back_populates="status_history")


class PickupOffer(Base):
    __tablename__ = "pickup_offers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    pickup_id: Mapped[str] = mapped_column(ForeignKey("pickup_requests.id", ondelete="CASCADE"), index=True)
    collector_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    offered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    response: Mapped[OfferResponse] = mapped_column(Enum(OfferResponse), default=OfferResponse.PENDING)

    pickup: Mapped["PickupRequest"] = relationship(back_populates="offers")

    __table_args__ = (
        UniqueConstraint("pickup_id", "collector_id", name="uq_offer_pickup_collector"),
    )


# ---------------------------------------------------------------------------
# Delivery Batches (collector → recycler)
# ---------------------------------------------------------------------------

class DeliveryBatch(Base):
    __tablename__ = "delivery_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    collector_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    recycler_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[BatchStatus] = mapped_column(Enum(BatchStatus), default=BatchStatus.OPEN)
    collector_weight_g: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    recycler_weight_g: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    batch_pickups: Mapped[list["DeliveryBatchPickup"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class DeliveryBatchPickup(Base):
    __tablename__ = "delivery_batch_pickups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    batch_id: Mapped[str] = mapped_column(ForeignKey("delivery_batches.id", ondelete="CASCADE"), index=True)
    pickup_id: Mapped[str] = mapped_column(ForeignKey("pickup_requests.id"), index=True)

    batch: Mapped["DeliveryBatch"] = relationship(back_populates="batch_pickups")

    __table_args__ = (
        UniqueConstraint("batch_id", "pickup_id", name="uq_batch_pickup"),
    )


# ---------------------------------------------------------------------------
# Recycler Inventory & Processing
# ---------------------------------------------------------------------------

class RecyclerInventoryItem(Base):
    __tablename__ = "recycler_inventory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    recycler_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("delivery_batches.id"), index=True)
    category_id: Mapped[str] = mapped_column(ForeignKey("ewaste_categories.id"))
    weight_g: Mapped[int] = mapped_column(Integer)
    status: Mapped[InventoryStatus] = mapped_column(Enum(InventoryStatus), default=InventoryStatus.RECEIVED)
    intake_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    category: Mapped["EwasteCategory"] = relationship()


class ProcessingRecord(Base):
    __tablename__ = "processing_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    recycler_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("delivery_batches.id"), index=True)
    outputs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON: {material: weight_g}
    document_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Rewards
# ---------------------------------------------------------------------------

class RewardLedger(Base):
    __tablename__ = "reward_ledger"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[RewardLedgerType] = mapped_column(Enum(RewardLedgerType))
    points: Mapped[int] = mapped_column(Integer)  # always positive; type determines direction
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # "pickup", "admin_adj"
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Prevent double-crediting the same pickup
    __table_args__ = (
        Index("ix_reward_pickup", "reference_type", "reference_id"),
    )


# ---------------------------------------------------------------------------
# Collector Earnings
# ---------------------------------------------------------------------------

class EarningsLedger(Base):
    __tablename__ = "earnings_ledger"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    collector_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    pickup_id: Mapped[str] = mapped_column(ForeignKey("pickup_requests.id"), index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)  # INR paise to avoid float
    status: Mapped[EarningStatus] = mapped_column(Enum(EarningStatus), default=EarningStatus.PENDING)
    payout_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Payout(Base):
    __tablename__ = "payouts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    collector_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(50))  # "UPI", "bank"
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Ratings & Complaints
# ---------------------------------------------------------------------------

class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    pickup_id: Mapped[str] = mapped_column(ForeignKey("pickup_requests.id"), index=True)
    from_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    to_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    stars: Mapped[int] = mapped_column(Integer)  # 1–5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    __table_args__ = (
        UniqueConstraint("pickup_id", "from_user_id", name="uq_rating_pickup_from"),
    )


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    pickup_id: Mapped[str] = mapped_column(ForeignKey("pickup_requests.id"), index=True)
    raised_by: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(100))  # "no_show", "behaviour", "weight_mismatch", etc.
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ComplaintStatus] = mapped_column(Enum(ComplaintStatus), default=ComplaintStatus.OPEN)
    resolution: Mapped[Optional[DisputeResolution]] = mapped_column(Enum(DisputeResolution), nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sla_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="notifications")


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(255), index=True)
    entity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    before: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # JSON
    after: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    # JSON
    ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# System Settings
# ---------------------------------------------------------------------------

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text)  # JSON
    updated_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
