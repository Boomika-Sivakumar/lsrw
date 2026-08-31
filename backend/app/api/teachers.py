"""Teacher routes: dashboard, students, assignments, class analytics, exports."""
import json

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.auth.deps import require_role
from app.database.db import get_db
from app.models.assessment import Assessment, SkillScore
from app.models.assignment import Assignment
from app.models.user import User
from app.schemas.api import AssignmentCreateRequest, AssignmentGenerateRequest
from app.services.assignment import (
    create_assignment,
    generate_assignment_draft,
    list_assignments_for_student,
    submit_assignment,
)
from app.services.dashboard import student_dashboard, teacher_dashboard
from app.services.report import build_student_report, export_csv, report_to_html

router = APIRouter(prefix="/api/teachers", tags=["teachers"])

teacher_guard = require_role("teacher")


@router.get("/dashboard")
def dashboard(teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    return teacher_dashboard(db, teacher)


@router.get("/insights")
def ai_insights(teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    import datetime

    from app.services.insights import teacher_insights

    data = teacher_insights(db, teacher)
    data["generated_at"] = datetime.datetime.utcnow().isoformat()
    return data


@router.get("/students")
def students(teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    rows = db.query(User).filter(User.role == "student", User.is_active == True).all()  # noqa: E712
    out = []
    for s in rows:
        latest = (
            db.query(SkillScore)
            .filter(SkillScore.student_id == s.id)
            .order_by(SkillScore.created_at.desc())
            .first()
        )
        out.append(
            {
                "id": s.id, "username": s.username, "full_name": s.full_name,
                "user_id": s.user_id, "email": s.email,
                "overall": latest.overall if latest else None,
                "level": latest.level if latest else "No data",
            }
        )
    return out


@router.get("/students/{student_id}")
def student_detail(student_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    s = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    return student_dashboard(db, s)


@router.get("/students/{student_id}/report")
def student_report(student_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    s = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    return build_student_report(db, s)


# ---- Assignments ----

@router.get("/assignments")
def list_assignments(teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    rows = db.query(Assignment).filter(Assignment.teacher_id == teacher.id).order_by(Assignment.created_at.desc()).all()
    return [
        {
            "id": a.id, "title": a.title, "skill": a.skill, "topic": a.topic,
            "difficulty": a.difficulty, "description": a.description,
            "status": a.status, "is_ai_generated": a.is_ai_generated,
            "deadline": a.deadline.isoformat() if a.deadline else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "submission_count": len(a.submissions),
        }
        for a in rows
    ]


@router.post("/assignments")
def create_assignment_route(body: AssignmentCreateRequest, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    a = create_assignment(db, teacher, body.dict())
    return {"id": a.id, "title": a.title, "status": a.status}


@router.get("/assignments/{assignment_id}")
def assignment_detail(assignment_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.teacher_id == teacher.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {
        "id": a.id, "title": a.title, "skill": a.skill, "topic": a.topic,
        "difficulty": a.difficulty, "description": a.description,
        "questions": a.questions, "assessment_criteria": a.assessment_criteria,
        "deadline": a.deadline.isoformat() if a.deadline else None,
        "submissions": [
            {
                "id": s.id, "student_id": s.student_id, "user_id": s.student.user_id or "",
                "full_name": s.student.full_name, "status": s.status, "score": s.score,
                "feedback": s.feedback,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            }
            for s in a.submissions
        ],
    }


@router.post("/assignments/generate")
def generate_assignment(body: AssignmentGenerateRequest, teacher: User = Depends(teacher_guard)):
    draft = generate_assignment_draft(None, teacher, body.topic, body.objective)
    return draft


@router.post("/assignments/{assignment_id}/publish")
def publish_assignment(assignment_id: int, body: AssignmentCreateRequest, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.teacher_id == teacher.id).first()
    if a:
        a.status = "published"
        db.commit()
        return {"id": a.id, "status": "published"}
    # Create new from provided body
    a = create_assignment(db, teacher, {**body.dict(), "is_ai_generated": "true"})
    return {"id": a.id, "status": a.status}


# ---- Class analytics ----

@router.get("/analytics")
def class_analytics(teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    dash = teacher_dashboard(db, teacher)
    return {
        "class_average": dash["class_average"],
        "averages": dash["averages"],
        "strongest_skill": dash["strongest_skill"],
        "weakest_skill": dash["weakest_skill"],
        "common_mistakes": dash["common_mistakes"],
        "level_distribution": dash["level_distribution"],
        "student_count": dash["total_students"],
    }


@router.get("/analytics/export")
def class_export_csv(teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    rows = []
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()  # noqa: E712
    for s in students:
        latest = (
            db.query(SkillScore)
            .filter(SkillScore.student_id == s.id)
            .order_by(SkillScore.created_at.desc())
            .first()
        )
        rows.append(
            {
                "user_id": s.user_id or "", "name": s.full_name,
                "overall": latest.overall if latest else "",
                "level": latest.level if latest else "",
            }
        )
    data = export_csv(rows, ["user_id", "name", "overall", "level"])
    return Response(content=data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=class_report.csv"})


@router.get("/students/{student_id}/report/export")
def student_report_html(student_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    s = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    report = build_student_report(db, s)
    html = report_to_html(report, f"Student Report - {s.full_name} ({s.user_id})")
    return Response(content=html, media_type="text/html", headers={"Content-Disposition": "attachment; filename=student_report.html"})


@router.get("/students/{student_id}/assessment/export/{assessment_id}")
def assessment_export(student_id: int, assessment_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    a = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.student_id == student_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    s = db.query(User).filter(User.id == student_id).first()
    report = {
        "user": {"full_name": s.full_name, "user_id": s.user_id or ""},
        "overall": a.overall_score,
        "level": a.level,
        "scores": a.scores or {},
        "strengths": a.strengths or [],
        "weaknesses": a.weaknesses or [],
        "recommendations": [{"title": r} for r in (a.recommendations or [])],
    }
    html = report_to_html(report, f"Assessment Report - {a.title}")
    return Response(content=html, media_type="text/html", headers={"Content-Disposition": "attachment; filename=assessment_report.html"})