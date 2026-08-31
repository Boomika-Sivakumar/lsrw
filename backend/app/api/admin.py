"""Admin routes: user management (delete records, manage teacher role)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import require_role
from app.database.db import get_db
from app.models.user import User
from app.services import admin as admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])

admin_guard = require_role("admin")


class RoleRequest(BaseModel):
    role: str = Field(min_length=1, max_length=20)


@router.get("/stats")
def stats(admin: User = Depends(admin_guard), db: Session = Depends(get_db)):
    return admin_service.admin_stats(db)


@router.get("/users")
def list_all_users(admin: User = Depends(admin_guard), db: Session = Depends(get_db)):
    return admin_service.list_users(db)


@router.get("/students")
def list_students(admin: User = Depends(admin_guard), db: Session = Depends(get_db)):
    return admin_service.list_users(db, role="student")


@router.get("/teachers")
def list_teachers(admin: User = Depends(admin_guard), db: Session = Depends(get_db)):
    return admin_service.list_users(db, role="teacher")


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(admin_guard), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Admins cannot delete themselves")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Admins cannot delete other admins")
    name = f"{user.username} ({user.role})"
    admin_service.delete_account(db, user)
    return {"deleted": name}


@router.put("/users/{user_id}/role")
def change_role(user_id: int, body: RoleRequest, admin: User = Depends(admin_guard), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Admins cannot change their own role")
    try:
        updated = admin_service.set_role(db, user, body.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": updated.id, "username": updated.username, "role": updated.role}