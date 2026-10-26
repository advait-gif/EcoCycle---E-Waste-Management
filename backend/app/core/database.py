"""
SQLAlchemy engine and session factory.
Works with SQLite (dev) and PostgreSQL (prod) via DATABASE_URL.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# Render and standard PostgreSQL / Supabase URLs
db_url = settings.effective_db_url

connect_args: dict = {}
pool_kwargs: dict = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Supabase / PostgreSQL SSL and pooling
    if "supabase.co" in db_url or "pooler.supabase.com" in db_url:
        if "sslmode" not in db_url:
            connect_args = {"sslmode": "require"}
    pool_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=settings.DEBUG,
    **pool_kwargs,
)

# Enable WAL mode for SQLite (better concurrency)
if db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
