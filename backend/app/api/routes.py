"""Aggregate router mounting all API sub-routers."""
from fastapi import APIRouter

from app.api import admin, ai, assessments, auth, discussions, practice, students, teachers

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(students.router)
api_router.include_router(assessments.router)
api_router.include_router(practice.router)
api_router.include_router(ai.router)
api_router.include_router(discussions.router)
api_router.include_router(teachers.router)
api_router.include_router(admin.router)