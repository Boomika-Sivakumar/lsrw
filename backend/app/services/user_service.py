"""User registration and profile helpers."""
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_user_id, hash_password
from app.models.user import StudentProfile, TeacherProfile, User


def register_user(db: Session, username: str, email: str, password: str, full_name: str, role: str, goals=None, admin_code: str = "") -> User:
    if db.query(User).filter(User.username == username).first():
        raise ValueError("Username already taken")
    if db.query(User).filter(User.email == email).first():
        raise ValueError("Email already registered")
    if role not in ("student", "teacher", "admin"):
        raise ValueError("Role must be 'student', 'teacher', or 'admin'")
    if role == "admin" and admin_code != settings.ADMIN_REGISTRATION_CODE:
        raise ValueError("Invalid admin registration code")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=role,
        user_id=_unique_user_id(db),
        is_active=True,
    )
    db.add(user)
    db.flush()

    if role == "student":
        db.add(StudentProfile(user_id=user.id, goals=goals or []))
    elif role == "teacher":
        db.add(TeacherProfile(user_id=user.id))
    # admins have no profile; they are managed by the admin console.

    db.commit()
    db.refresh(user)
    return user


def _unique_user_id(db: Session) -> str:
    for _ in range(20):
        uid = generate_user_id()
        if not db.query(User).filter(User.user_id == uid).first():
            return uid
    return generate_user_id() + str(db.query(User).count())[-2:]