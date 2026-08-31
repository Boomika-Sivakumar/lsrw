"""Application configuration loaded from environment variables.

Secrets (JWT secret, AI API keys) must come from environment variables /
.env file. Never hard-code secrets in source code.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
PROJECT_DIR = BASE_DIR.parent


def _load_dotenv() -> None:
    """Minimal .env loader (no external dependency)."""
    env_path = PROJECT_DIR / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and not os.environ.get(key):
            os.environ[key] = value


_load_dotenv()


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "LSRW Communication AI")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-insecure-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )

    FRONTEND_ORIGINS: list = [
        o.strip()
        for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000").split(",")
        if o.strip()
    ]

    # Required to self-register an admin account from the register page.
    ADMIN_REGISTRATION_CODE: str = os.getenv("ADMIN_REGISTRATION_CODE", "admin-secret")

    DB_HOST: str = os.getenv("DB_HOST", "")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "lsrw_ai")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    @property
    def DATABASE_URL(self) -> str:
        env_url = os.getenv("DATABASE_URL", "")
        if env_url:
            if env_url.startswith("postgres://") or env_url.startswith("postgresql://") or env_url.startswith("postgresql+psycopg2://"):
                env_url = env_url.replace("postgresql+psycopg2://", "mysql+pymysql://").replace("postgresql://", "mysql+pymysql://").replace("postgres://", "mysql+pymysql://")
            return env_url
        if self.DB_HOST:
            auth = f"{self.DB_USER}:{self.DB_PASSWORD}@" if self.DB_PASSWORD else f"{self.DB_USER}@"
            return f"mysql+pymysql://{auth}{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        return "sqlite:///./dev.db"

    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "development")
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "development")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gpt-4o-mini")

    STORAGE_DIR: Path = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "50"))
    MAX_UPLOAD_BYTES: int = MAX_UPLOAD_MB * 1024 * 1024

    # Skill names used consistently across the platform.
    SKILLS: list = [
        "listening",
        "speaking",
        "reading",
        "writing",
        "grammar",
        "vocabulary",
        "pronunciation",
        "fluency",
        "comprehension",
        "confidence",
        "participation",
    ]

    # Communication levels with configurable thresholds (score ranges).
    # Determined from multiple skill scores (not a single score).
    LEVEL_THRESHOLDS: list = [
        ("Beginner", 0, 34),
        ("Elementary", 35, 49),
        ("Intermediate", 50, 69),
        ("Upper Intermediate", 70, 84),
        ("Advanced", 85, 100),
    ]

    def ensure_dirs(self) -> None:
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        (self.STORAGE_DIR / "uploads").mkdir(parents=True, exist_ok=True)
        (self.STORAGE_DIR / "recordings").mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
