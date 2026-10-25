"""
EcoCycle backend — core unit tests.
Run: pytest backend/tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.models import EwasteCategory

from sqlalchemy.pool import StaticPool

# In-memory SQLite for tests with StaticPool so all connections share the DB
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
    # Seed a category
    db.add(EwasteCategory(name="Laptop", slug="laptop", emoji="💻", points_per_kg=15.0, rate_per_kg=50.0, hazardous_flag=False))
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


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Public: categories
# ---------------------------------------------------------------------------

def test_get_categories_public(client):
    r = client.get("/api/v1/categories")
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) >= 1
    assert cats[0]["slug"] == "laptop"


# ---------------------------------------------------------------------------
# Auth: register & login
# ---------------------------------------------------------------------------

def test_register_customer(client):
    r = client.post("/api/v1/auth/register", json={
        "name": "Aarav Sharma",
        "email": "aarav@example.demo",
        "password": "Test@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    assert r.status_code == 201
    assert r.json()["ok"] is True


def test_register_duplicate_email(client):
    client.post("/api/v1/auth/register", json={
        "name": "Dup User",
        "email": "dup@example.demo",
        "password": "Test@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    r = client.post("/api/v1/auth/register", json={
        "name": "Dup User 2",
        "email": "dup@example.demo",
        "password": "Test@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "EMAIL_TAKEN"


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={
        "name": "Login Test",
        "email": "logintest@example.demo",
        "password": "Correct@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    r = client.post("/api/v1/auth/login", json={
        "identifier": "logintest@example.demo",
        "password": "wrongpassword",
    })
    assert r.status_code == 401


def test_login_success(client):
    client.post("/api/v1/auth/register", json={
        "name": "Login OK",
        "email": "loginok@example.demo",
        "password": "Test@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    r = client.post("/api/v1/auth/login", json={
        "identifier": "loginok@example.demo",
        "password": "Test@1234",
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["role"] == "CUSTOMER"


# ---------------------------------------------------------------------------
# Auth: /me requires auth
# ---------------------------------------------------------------------------

def test_me_unauthenticated(client):
    r = client.get("/api/v1/me")
    assert r.status_code == 401


def test_me_authenticated(client):
    client.post("/api/v1/auth/register", json={
        "name": "Me Test",
        "email": "metest@example.demo",
        "password": "Test@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    login = client.post("/api/v1/auth/login", json={
        "identifier": "metest@example.demo",
        "password": "Test@1234",
    })
    token = login.json()["access_token"]
    r = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "metest@example.demo"
    assert r.json()["role"] == "CUSTOMER"


# ---------------------------------------------------------------------------
# Rewards: wallet returns 0 for new user
# ---------------------------------------------------------------------------

def test_rewards_wallet_empty(client):
    client.post("/api/v1/auth/register", json={
        "name": "Reward Test",
        "email": "rewardtest@example.demo",
        "password": "Test@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    login = client.post("/api/v1/auth/login", json={
        "identifier": "rewardtest@example.demo",
        "password": "Test@1234",
    })
    token = login.json()["access_token"]
    r = client.get("/api/v1/rewards/wallet", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["balance"] == 0
    assert r.json()["lifetime_earned"] == 0


# ---------------------------------------------------------------------------
# Role guards
# ---------------------------------------------------------------------------

def test_admin_endpoint_requires_admin(client):
    client.post("/api/v1/auth/register", json={
        "name": "Not Admin",
        "email": "notadmin@example.demo",
        "password": "Test@1234",
        "role": "CUSTOMER",
        "consent": True,
    })
    login = client.post("/api/v1/auth/login", json={
        "identifier": "notadmin@example.demo",
        "password": "Test@1234",
    })
    token = login.json()["access_token"]
    r = client.get("/api/v1/admin/analytics/overview", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_otp_send_unknown_user_neutral(client):
    """OTP send must not reveal whether an account exists."""
    r = client.post("/api/v1/auth/otp/send", json={
        "identifier": "nobody@nowhere.demo",
        "purpose": "email_verify",
    })
    assert r.status_code == 200
    assert r.json()["ok"] is True


# ---------------------------------------------------------------------------
# Reward service unit tests (direct)
# ---------------------------------------------------------------------------

def test_reward_service_calculate_points():
    from app.services.reward_service import calculate_points_for_pickup
    # 1000g = 1 kg = 10 pts default
    pts = calculate_points_for_pickup(None, None, 1000)
    assert pts == 10

def test_reward_service_calculate_points_zero():
    from app.services.reward_service import calculate_points_for_pickup
    assert calculate_points_for_pickup(None, None, 0) == 0
