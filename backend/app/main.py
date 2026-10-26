"""
EcoCycle FastAPI application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (dev convenience; use Alembic in prod)
    Base.metadata.create_all(bind=engine)
    from app.core.database import SessionLocal
    from app.models.models import EwasteCategory
    from sqlalchemy import select
    db = SessionLocal()
    try:
        count = db.execute(select(EwasteCategory)).first()
        if not count:
            _seed_categories(db)
            db.commit()
        _seed_demo_users(db)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[lifespan] Startup seed notice: {e}")
    finally:
        db.close()
    yield


def _seed_demo_users(db):
    from app.core.security import hash_password
    from app.models.models import User, UserRole, UserStatus, VerificationStatus, CollectorProfile, RecyclerProfile
    from sqlalchemy import select

    # 1. Admin
    admin_email = "admin@ecocycle.demo"
    if not db.execute(select(User).where(User.email == admin_email)).scalar_one_or_none():
        admin = User(
            email=admin_email,
            password_hash=hash_password("Admin@1234"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db.add(admin)

    # 2. Collector
    col_email = "collector@test.demo"
    col_user = db.execute(select(User).where(User.email == col_email)).scalar_one_or_none()
    if not col_user:
        col_user = User(
            email=col_email,
            password_hash=hash_password("Pass@1234"),
            role=UserRole.COLLECTOR,
            status=UserStatus.ACTIVE,
        )
        db.add(col_user)
        db.flush()
        db.add(CollectorProfile(
            user_id=col_user.id,
            name="Verified Collector Fleet",
            verification_status=VerificationStatus.VERIFIED,
            is_online=True,
        ))
    else:
        col_user.password_hash = hash_password("Pass@1234")
        col_user.status = UserStatus.ACTIVE
        col_user.failed_login_attempts = 0
        col_user.locked_until = None
        cp = db.execute(select(CollectorProfile).where(CollectorProfile.user_id == col_user.id)).scalar_one_or_none()
        if not cp:
            db.add(CollectorProfile(
                user_id=col_user.id,
                name="Verified Collector Fleet",
                verification_status=VerificationStatus.VERIFIED,
                is_online=True,
            ))
        elif cp.verification_status != VerificationStatus.VERIFIED:
            cp.verification_status = VerificationStatus.VERIFIED
            cp.is_online = True

    # 3. Recycler
    rec_email = "recycler@test.demo"
    rec_user = db.execute(select(User).where(User.email == rec_email)).scalar_one_or_none()
    if not rec_user:
        rec_user = User(
            email=rec_email,
            password_hash=hash_password("Pass@1234"),
            role=UserRole.RECYCLER,
            status=UserStatus.ACTIVE,
        )
        db.add(rec_user)
        db.flush()
        db.add(RecyclerProfile(
            user_id=rec_user.id,
            facility_name="Authorized CPCB Recycler",
            address="Eco Recycling Park, Sector 4, New Delhi",
            verification_status=VerificationStatus.VERIFIED,
            categories_accepted='["laptop","mobile","tv","battery","charger","printer","refrigerator","washing_machine","other"]',
        ))
    else:
        rec_user.password_hash = hash_password("Pass@1234")
        rec_user.status = UserStatus.ACTIVE
        rec_user.failed_login_attempts = 0
        rec_user.locked_until = None
        rp = db.execute(select(RecyclerProfile).where(RecyclerProfile.user_id == rec_user.id)).scalar_one_or_none()
        if not rp:
            db.add(RecyclerProfile(
                user_id=rec_user.id,
                facility_name="Authorized CPCB Recycler",
                address="Eco Recycling Park, Sector 4, New Delhi",
                verification_status=VerificationStatus.VERIFIED,
                categories_accepted='["laptop","mobile","tv","battery","charger","printer","refrigerator","washing_machine","other"]',
            ))
        elif rp.verification_status != VerificationStatus.VERIFIED:
            rp.verification_status = VerificationStatus.VERIFIED


def _seed_categories(db):
    from app.models.models import EwasteCategory
    defaults = [
        {"name": "Laptop", "slug": "laptop", "emoji": "💻", "points_per_kg": 15.0, "rate_per_kg": 50.0, "hazardous_flag": False},
        {"name": "Mobile Phone", "slug": "mobile", "emoji": "📱", "points_per_kg": 20.0, "rate_per_kg": 80.0, "hazardous_flag": False},
        {"name": "Television", "slug": "tv", "emoji": "📺", "points_per_kg": 8.0, "rate_per_kg": 30.0, "hazardous_flag": False},
        {"name": "Battery", "slug": "battery", "emoji": "🔋", "points_per_kg": 25.0, "rate_per_kg": 60.0, "hazardous_flag": True},
        {"name": "Charger & Cable", "slug": "charger", "emoji": "🔌", "points_per_kg": 10.0, "rate_per_kg": 20.0, "hazardous_flag": False},
        {"name": "Printer", "slug": "printer", "emoji": "🖨️", "points_per_kg": 8.0, "rate_per_kg": 25.0, "hazardous_flag": False},
        {"name": "Refrigerator", "slug": "refrigerator", "emoji": "🧊", "points_per_kg": 5.0, "rate_per_kg": 15.0, "hazardous_flag": False},
        {"name": "Washing Machine", "slug": "washing_machine", "emoji": "🫧", "points_per_kg": 5.0, "rate_per_kg": 15.0, "hazardous_flag": False},
        {"name": "Other Appliance", "slug": "other", "emoji": "🔧", "points_per_kg": 5.0, "rate_per_kg": 10.0, "hazardous_flag": False},
    ]
    for d in defaults:
        db.add(EwasteCategory(**d))


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="EcoCycle — E-Waste Collection & Recycling Marketplace API (v1)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow frontend dev servers on localhost, Vercel deployments, and configured origins
_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:8080",
    "https://ecocycle-seven-tan.vercel.app",
]
if hasattr(settings, "CORS_ORIGINS") and settings.CORS_ORIGINS:
    _allowed_origins.extend([o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        import traceback
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": {"code": "INTERNAL_ERROR", "message": str(exc), "trace": traceback.format_exc()}},
        )
    return JSONResponse(
        status_code=500,
        content={"ok": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."}},
    )


# Mount API
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": "1.0.0"}


@app.get("/", tags=["System"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": "/health",
    }
