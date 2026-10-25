from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path
import secrets

# Absolute path to the backend/ directory (works regardless of CWD)
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
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

    # Database — absolute path so it works from any CWD
    DATABASE_URL: str = f"sqlite:///{_BACKEND_DIR / 'ecocycle.db'}"

    # OTP
    OTP_EXPIRE_MINUTES: int = 10

    # File uploads
    UPLOAD_DIR: str = str(_BACKEND_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

