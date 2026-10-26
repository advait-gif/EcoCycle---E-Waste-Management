from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path
import secrets

# Absolute path to backend and root directories
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_ROOT_DIR / ".env"), str(_BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "EcoCycle"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: str = ""

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(64)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database — supports Supabase PostgreSQL or local SQLite fallback
    DATABASE_URL: str = ""
    SUPABASE_DB_URL: str = ""
    VITE_SUPABASE_URL: str = ""
    VITE_SUPABASE_ANON_KEY: str = ""

    @property
    def effective_db_url(self) -> str:
        url = (self.SUPABASE_DB_URL or self.DATABASE_URL or "").strip()
        if not url:
            return f"sqlite:///{_BACKEND_DIR / 'ecocycle.db'}"
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    # OTP
    OTP_EXPIRE_MINUTES: int = 10

    # File uploads
    UPLOAD_DIR: str = str(_BACKEND_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

