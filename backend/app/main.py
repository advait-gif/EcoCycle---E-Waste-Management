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
    # Seed default categories if empty
    from app.core.database import SessionLocal
    from app.models.models import EwasteCategory
    from sqlalchemy import select
    db = SessionLocal()
    try:
        count = db.execute(select(EwasteCategory)).first()
        if not count:
            _seed_categories(db)
            db.commit()
    finally:
        db.close()
    yield


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

# CORS — allow frontend dev servers on any localhost port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:4173", "http://localhost:8080"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
