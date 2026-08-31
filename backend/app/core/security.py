"""Security helpers: password hashing + unique User ID generation."""
import re
import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def generate_user_id() -> str:
    """Generate a unique, human-friendly User ID like `BA1024`."""
    # Format: two uppercase letters + four digits, e.g. BA1024.
    return f"{secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}{secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}{secrets.randbelow(9000) + 1000}"


def generate_discussion_code(year: int = None) -> str:
    """Generate a discussion session code like `GD-2026-AB45`."""
    import datetime

    year = year or datetime.date.today().year
    suffix = f"{secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}{secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}{secrets.randbelow(90) + 10}"
    return f"GD-{year}-{suffix}"


def sanitize_discussion_code(code: str) -> str:
    return re.sub(r"[^A-Za-z0-9\-]", "", code or "").upper()
