"""
Pydantic v2 schemas — request/response DTOs for EcoCycle API.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------

class OkResponse(BaseModel):
    ok: bool = True
    message: str = "Success"


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    ok: bool = False
    error: ErrorDetail


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., pattern="^(CUSTOMER|COLLECTOR|RECYCLER)$")
    consent: bool = Field(..., description="Must accept terms and privacy policy")

    @model_validator(mode="after")
    def email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError("Either email or phone is required")
        if not self.consent:
            raise ValueError("You must accept the terms and privacy policy")
        return self


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or phone number")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    user: Optional[dict] = None
    mfa_required: bool = False


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class OtpSendRequest(BaseModel):
    identifier: str
    purpose: str  # "email_verify" | "phone_verify" | "login" | "password_reset"


class OtpVerifyRequest(BaseModel):
    identifier: str
    code: str
    purpose: str


class ForgotPasswordRequest(BaseModel):
    identifier: str  # email or phone – return neutral response either way


class ResetPasswordRequest(BaseModel):
    identifier: str
    code: str
    new_password: str = Field(..., min_length=8)


class MfaSetupResponse(BaseModel):
    totp_uri: str
    secret: str


class MfaVerifyRequest(BaseModel):
    code: str


class UserOut(BaseModel):
    id: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    status: str
    email_verified_at: Optional[datetime]
    phone_verified_at: Optional[datetime]
    mfa_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MeOut(BaseModel):
    id: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    status: str
    mfa_enabled: bool
    name: Optional[str] = None   # from profile
    created_at: datetime

    model_config = {"from_attributes": True}


class MePatch(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")


# ---------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------

class AddressIn(BaseModel):
    line1: str = Field(..., min_length=3, max_length=512)
    line2: Optional[str] = None
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    landmark: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_default: bool = False


class AddressOut(AddressIn):
    id: str
    user_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    emoji: Optional[str]
    points_per_kg: float
    hazardous_flag: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Pickups
# ---------------------------------------------------------------------------

class PickupItemIn(BaseModel):
    category_id: str
    quantity: int = Field(..., ge=1)
    estimated_weight_g: int = Field(..., ge=0, description="Estimated weight in grams")


class PickupCreateRequest(BaseModel):
    address_id: str
    slot_start: datetime
    slot_end: datetime
    items: list[PickupItemIn] = Field(..., min_length=1)
    notes: Optional[str] = None
    data_wipe_acknowledged: bool = False


class PickupItemOut(BaseModel):
    id: str
    category_id: str
    quantity: int
    estimated_weight_g: int
    actual_weight_g: Optional[int]

    model_config = {"from_attributes": True}


class PickupOut(BaseModel):
    id: str
    customer_id: str
    address_id: str
    slot_start: datetime
    slot_end: datetime
    status: str
    estimated_weight_g: int
    actual_weight_g: Optional[int]
    collector_id: Optional[str]
    data_wipe_acknowledged: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    items: list[PickupItemOut] = []

    model_config = {"from_attributes": True}


class PickupCancelRequest(BaseModel):
    reason: str = Field(..., min_length=5)


class HandoverConfirmRequest(BaseModel):
    code: str = Field(..., min_length=4, max_length=4)


class WeighRequest(BaseModel):
    """Collector submits actual weights per item."""
    weights: list[dict]  # [{pickup_item_id, actual_weight_g, photo_key?}]
    notes: Optional[str] = None


class TrackResponse(BaseModel):
    pickup_id: str
    status: str
    collector_lat: Optional[float]
    collector_lng: Optional[float]
    eta_minutes: Optional[int]
    status_history: list[dict]


# ---------------------------------------------------------------------------
# Collector
# ---------------------------------------------------------------------------

class CollectorOnboardingRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    service_radius_km: float = Field(10.0, ge=1, le=100)
    address: str = Field(..., min_length=5)
    city: str
    state: str
    pincode: str = Field(..., pattern=r"^\d{6}$")


class CollectorStatusToggle(BaseModel):
    is_online: bool


class CollectorLocationUpdate(BaseModel):
    lat: float
    lng: float


class JobStatusUpdate(BaseModel):
    status: str  # EN_ROUTE | ARRIVED | COLLECTED | FAILED
    lat: Optional[float] = None
    lng: Optional[float] = None
    note: Optional[str] = None


class BatchCreateRequest(BaseModel):
    recycler_id: str
    pickup_ids: list[str] = Field(..., min_length=1)


class BatchDeliverRequest(BaseModel):
    collector_weight_g: int = Field(..., ge=0)


class CollectorProfileOut(BaseModel):
    id: str
    name: str
    verification_status: str
    vehicle_type: Optional[str]
    service_radius_km: float
    is_online: bool
    rating_avg: float
    acceptance_rate: float
    completion_rate: float

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Recycler
# ---------------------------------------------------------------------------

class RecyclerOnboardingRequest(BaseModel):
    facility_name: str = Field(..., min_length=2)
    address: str = Field(..., min_length=5)
    city: str
    gst: Optional[str] = None
    pan: Optional[str] = None
    capacity_kg: Optional[float] = None
    categories_accepted: Optional[list[str]] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None


class ReceiveDeliveryRequest(BaseModel):
    action: str  # "accept" | "partial_accept" | "reject"
    received_weights: list[dict]  # [{category_id, weight_g}]
    reason: Optional[str] = None


class ProcessingRecordCreate(BaseModel):
    batch_id: str
    outputs: dict[str, int]  # {material_name: weight_g}
    notes: Optional[str] = None


class RecyclerProfileOut(BaseModel):
    id: str
    facility_name: str
    verification_status: str
    city: Optional[str]
    capacity_kg: Optional[float]
    categories_accepted: Optional[str]

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Ratings & Complaints
# ---------------------------------------------------------------------------

class RatingCreate(BaseModel):
    stars: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ComplaintCreate(BaseModel):
    pickup_id: str
    category: str  # "no_show" | "behaviour" | "weight_mismatch" | "wrong_items" | "points_not_credited"
    description: Optional[str] = None


class ComplaintOut(BaseModel):
    id: str
    pickup_id: str
    category: str
    status: str
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RecyclingCertificateOut(BaseModel):
    certificate_id: str
    pickup_id: str
    verification_hash: str
    status: str
    weight_kg: float
    item_count: int
    issued_at: datetime
    co2e_avoided_kg: float

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Rewards
# ---------------------------------------------------------------------------

class RewardWalletOut(BaseModel):
    user_id: str
    balance: int
    lifetime_earned: int


class RewardLedgerEntryOut(BaseModel):
    id: str
    type: str
    points: int
    reference_type: Optional[str]
    reference_id: Optional[str]
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationOut(BaseModel):
    id: str
    channel: str
    title: str
    body: str
    is_read: bool
    created_at: datetime
    reference_type: Optional[str]
    reference_id: Optional[str]

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

class VerificationDecisionRequest(BaseModel):
    action: str  # "approve" | "reject" | "more_info" | "suspend"
    note: Optional[str] = None


class ReassignPickupRequest(BaseModel):
    collector_id: str
    reason: str


class OverridePickupRequest(BaseModel):
    status: str
    reason: str


class DisputeResolveRequest(BaseModel):
    resolution: str  # "points_reversed" | "collector_penalty" | "recycler_flag" | "no_action"
    note: Optional[str] = None


class RewardAdjustRequest(BaseModel):
    user_id: str
    type: str  # "CREDIT" | "DEBIT" | "REVERSAL" | "ADJUSTMENT"
    points: int = Field(..., ge=1)
    reason: str = Field(..., min_length=5)


class AdminUserStatusRequest(BaseModel):
    status: str  # "ACTIVE" | "SUSPENDED"
    note: Optional[str] = None


class PaginatedResponse(BaseModel):
    total: int
    page: int
    per_page: int
    data: list[Any]

