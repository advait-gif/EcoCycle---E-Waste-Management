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

        # Collector demo user
        from app.models.models import VerificationStatus, CollectorProfile, RecyclerProfile
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
            print(f"[seed] Collector created: {col_email} / Pass@1234")
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
            print(f"[seed] Collector updated: {col_email}")

        # Recycler demo user
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
            print(f"[seed] Recycler created: {rec_email} / Pass@1234")
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
            print(f"[seed] Recycler updated: {rec_email}")

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
