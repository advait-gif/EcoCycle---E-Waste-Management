"""
End-to-end lifecycle integration test covering PRD section 4:
Customer booking -> Collector acceptance -> Handover & Weighing -> Delivery Batch -> Recycler Verification -> Rewards & Earnings.
"""
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.models import (
    EwasteCategory, User, UserRole, UserStatus, CollectorProfile, RecyclerProfile, VerificationStatus
)
from app.core.security import hash_password

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True, scope="session")
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestSession()

    # 1. Category
    cat = EwasteCategory(
        name="Laptops & Computers",
        slug="laptops",
        emoji="💻",
        points_per_kg=15.0,
        rate_per_kg=60.0,
        hazardous_flag=False,
        active=True
    )
    db.add(cat)

    # 2. Collector
    col_user = User(
        email="collector@test.demo",
        password_hash=hash_password("Pass@1234"),
        role=UserRole.COLLECTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(col_user)
    db.flush()
    col_profile = CollectorProfile(
        user_id=col_user.id,
        name="Raj Collector",
        verification_status=VerificationStatus.VERIFIED,
        is_online=True,
    )
    db.add(col_profile)

    # 3. Recycler
    rec_user = User(
        email="recycler@test.demo",
        password_hash=hash_password("Pass@1234"),
        role=UserRole.RECYCLER,
        status=UserStatus.ACTIVE,
    )
    db.add(rec_user)
    db.flush()
    rec_profile = RecyclerProfile(
        user_id=rec_user.id,
        facility_name="Green Earth Recyclers",
        address="12 Industrial Area, Peenya",
        city="Bengaluru",
        verification_status=VerificationStatus.VERIFIED,
    )
    db.add(rec_profile)

    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_full_marketplace_lifecycle(client):
    # 1. Customer registration & login
    reg = client.post("/api/v1/auth/register", json={
        "name": "Pooja Verma",
        "email": "pooja@test.demo",
        "password": "Customer@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    assert reg.status_code == 201

    cust_login = client.post("/api/v1/auth/login", json={
        "identifier": "pooja@test.demo",
        "password": "Customer@1234",
    })
    assert cust_login.status_code == 200
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 2. Customer creates address
    addr_res = client.post("/api/v1/addresses", json={
        "line1": "Flat 302, Green Heights",
        "line2": "MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "lat": 12.9716,
        "lng": 77.5946,
    }, headers=cust_headers)
    assert addr_res.status_code == 201
    address_id = addr_res.json()["id"]

    # Get category ID
    cats = client.get("/api/v1/categories").json()
    category_id = cats[0]["id"]

    # 3. Customer books pickup
    now = datetime.now(timezone.utc)
    slot_start = (now + timedelta(days=1)).isoformat()
    slot_end = (now + timedelta(days=1, hours=3)).isoformat()

    pickup_res = client.post("/api/v1/pickups", json={
        "address_id": address_id,
        "slot_start": slot_start,
        "slot_end": slot_end,
        "items": [
            {
                "category_id": category_id,
                "quantity": 2,
                "estimated_weight_g": 4500,
            }
        ],
        "notes": "Please ring doorbell",
        "data_wipe_acknowledged": True,
    }, headers=cust_headers)
    assert pickup_res.status_code == 201
    pickup_data = pickup_res.json()
    pickup_id = pickup_data["id"]
    item_id = pickup_data["items"][0]["id"]

    # 4. Collector logs in and checks offers
    col_login = client.post("/api/v1/auth/login", json={
        "identifier": "collector@test.demo",
        "password": "Pass@1234",
    })
    col_token = col_login.json()["access_token"]
    col_headers = {"Authorization": f"Bearer {col_token}"}

    offers_res = client.get("/api/v1/collector/offers", headers=col_headers)
    assert offers_res.status_code == 200
    offers = offers_res.json()
    assert len(offers) >= 1
    offer_id = offers[0]["offer_id"]

    # Accept offer
    accept_res = client.post(f"/api/v1/collector/offers/{offer_id}/accept", headers=col_headers)
    assert accept_res.status_code == 200

    # Start en-route
    start_res = client.post(f"/api/v1/collector/jobs/{pickup_id}/status", json={"status": "EN_ROUTE"}, headers=col_headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "EN_ROUTE"

    # Arrived
    arrive_res = client.post(f"/api/v1/collector/jobs/{pickup_id}/status", json={"status": "ARRIVED"}, headers=col_headers)
    assert arrive_res.status_code == 200
    assert arrive_res.json()["status"] == "ARRIVED"

    # Weigh job & collect (4800g = 4.8kg)
    weigh_res = client.post(f"/api/v1/collector/jobs/{pickup_id}/weigh", json={
        "weights": [
            {
                "pickup_item_id": item_id,
                "actual_weight_g": 4800,
            }
        ],
        "notes": "Collected in safe packaging"
    }, headers=col_headers)
    assert weigh_res.status_code == 200
    assert weigh_res.json()["actual_weight_g"] == 4800

    # 5. Collector creates delivery batch to Recycler
    rec_login = client.post("/api/v1/auth/login", json={
        "identifier": "recycler@test.demo",
        "password": "Pass@1234",
    })
    rec_token = rec_login.json()["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}
    rec_me = client.get("/api/v1/me", headers=rec_headers).json()
    recycler_user_id = rec_me["id"]

    batch_res = client.post("/api/v1/collector/batches", json={
        "recycler_id": recycler_user_id,
        "pickup_ids": [pickup_id],
    }, headers=col_headers)
    assert batch_res.status_code == 201
    batch_id = batch_res.json()["batch_id"]

    # Mark batch delivered
    deliv_res = client.post(f"/api/v1/collector/batches/{batch_id}/deliver", json={
        "collector_weight_g": 4800
    }, headers=col_headers)
    assert deliv_res.status_code == 200

    # 6. Recycler receives and verifies delivery batch
    verify_res = client.post(f"/api/v1/recycler/deliveries/{batch_id}/receive", json={
        "action": "accept",
        "received_weights": [
            {
                "category_id": category_id,
                "weight_g": 4800,
            }
        ],
    }, headers=rec_headers)
    assert verify_res.status_code == 200

    # 7. Check Customer wallet balance is now credited with reward points!
    # 4800g / 1000 * 15 pts/kg = 72 points
    wallet_res = client.get("/api/v1/rewards/wallet", headers=cust_headers)
    assert wallet_res.status_code == 200
    wallet = wallet_res.json()
    assert wallet["balance"] == 72
    assert wallet["lifetime_earned"] == 72

    # 8. Check Collector earnings ledger
    earnings_res = client.get("/api/v1/collector/earnings", headers=col_headers)
    assert earnings_res.status_code == 200
    earnings = earnings_res.json()
    assert len(earnings) >= 1
    assert earnings[0]["amount_paise"] > 0
