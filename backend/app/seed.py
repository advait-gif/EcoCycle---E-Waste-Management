"""
Seed script — creates a default admin user and sample data.
Run: python -m app.seed
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.models import User, UserRole, UserStatus, EwasteCategory


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from sqlalchemy import select

        # Admin user
        admin_email = "admin@ecocycle.demo"
        existing = db.execute(select(User).where(User.email == admin_email)).scalar_one_or_none()
        if not existing:
            admin = User(
                email=admin_email,
                password_hash=hash_password("Admin@1234"),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
            )
            db.add(admin)
            print(f"[seed] Admin created: {admin_email} / Admin@1234")
        else:
            print(f"[seed] Admin already exists: {admin_email}")

        # Default categories (idempotent)
        defaults = [
            {"name": "Laptop",          "slug": "laptop",          "emoji": "💻", "points_per_kg": 15.0, "rate_per_kg": 50.0, "hazardous_flag": False},
            {"name": "Mobile Phone",    "slug": "mobile",          "emoji": "📱", "points_per_kg": 20.0, "rate_per_kg": 80.0, "hazardous_flag": False},
            {"name": "Television",      "slug": "tv",              "emoji": "📺", "points_per_kg":  8.0, "rate_per_kg": 30.0, "hazardous_flag": False},
            {"name": "Battery",         "slug": "battery",         "emoji": "🔋", "points_per_kg": 25.0, "rate_per_kg": 60.0, "hazardous_flag": True },
            {"name": "Charger & Cable", "slug": "charger",         "emoji": "🔌", "points_per_kg": 10.0, "rate_per_kg": 20.0, "hazardous_flag": False},
            {"name": "Printer",         "slug": "printer",         "emoji": "🖨️","points_per_kg":  8.0, "rate_per_kg": 25.0, "hazardous_flag": False},
            {"name": "Refrigerator",    "slug": "refrigerator",    "emoji": "🧊", "points_per_kg":  5.0, "rate_per_kg": 15.0, "hazardous_flag": False},
            {"name": "Washing Machine", "slug": "washing_machine", "emoji": "🫧", "points_per_kg":  5.0, "rate_per_kg": 15.0, "hazardous_flag": False},
            {"name": "Other Appliance", "slug": "other",           "emoji": "🔧", "points_per_kg":  5.0, "rate_per_kg": 10.0, "hazardous_flag": False},
        ]
        for d in defaults:
            ex = db.execute(select(EwasteCategory).where(EwasteCategory.slug == d["slug"])).scalar_one_or_none()
            if not ex:
                db.add(EwasteCategory(**d))
                print(f"[seed] Category: {d['name']}")

        db.commit()
        print("[seed] Done.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
