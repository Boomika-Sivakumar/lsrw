"""Student routes: dashboard, progress, history, profile, goals."""
import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.assessment_service import default_recommendations, user_summary
from app.auth.deps import get_current_user, require_role
from app.database.db import get_db
from app.models.assessment import SkillScore
from app.models.intelligence import CoachMessage
from app.models.practice import Mistake, Recommendation
from app.models.user import StudentProfile, User
from app.schemas.api import (
    AssignmentSubmitRequest,
    CoachRequest,
    GoalUpdateRequest,
    VocabularyPracticeRequest,
    VocabularyStatusRequest,
)
from app.services.dashboard import student_dashboard, student_progress

router = APIRouter(prefix="/api/students", tags=["students"])

student_guard = require_role("student")


@router.get("/me")
def me(user: User = Depends(student_guard)):
    return user.to_public_dict()


@router.get("/me/dashboard")
def dashboard(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    return student_dashboard(db, user)


@router.get("/me/progress")
def progress(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    return student_progress(db, user.id)


@router.get("/me/history")
def history(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.models.assessment import SkillScore
    from app.models.practice import PracticeSession

    practice = (
        db.query(PracticeSession)
        .filter(PracticeSession.student_id == user.id)
        .order_by(PracticeSession.started_at.desc())
        .limit(50)
        .all()
    )
    scores = (
        db.query(SkillScore)
        .filter(SkillScore.student_id == user.id)
        .order_by(SkillScore.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "practice": [
            {"id": p.id, "skill": p.skill, "topic": p.topic, "difficulty": p.difficulty,
             "score": p.score, "started_at": p.started_at.isoformat() if p.started_at else None}
            for p in practice
        ],
        "scores": [
            {"source": s.source_type, "overall": s.overall, "level": s.level,
             "date": s.created_at.isoformat() if s.created_at else None}
            for s in scores
        ],
    }


@router.put("/me/goals")
def update_goals(data: GoalUpdateRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile.goals = data.goals
    if data.target_level:
        profile.target_level = data.target_level
    db.commit()
    return {"goals": profile.goals, "target_level": profile.target_level}


@router.post("/me/recommendations")
def refresh_recommendations(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    """Generate fresh personalized recommendations from current analysis."""
    summary = user_summary(db, user)
    db.query(Recommendation).filter(Recommendation.student_id == user.id, Recommendation.is_done == "false").update({"is_done": "true"})
    recs = default_recommendations(summary["scores"], summary.get("recent_mistakes", []))
    for r in recs:
        db.add(
            Recommendation(
                student_id=user.id,
                category=r["category"],
                title=r["title"],
                detail=r["detail"],
                activity=r["activity"],
                source="ai",
            )
        )
    db.commit()
    return {"recommendations": recs}


# ---- Communication Intelligence Layer ----

@router.get("/me/study-plan")
def study_plan(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.models.practice import LearningPath

    plan = (
        db.query(LearningPath)
        .filter(LearningPath.student_id == user.id)
        .order_by(LearningPath.created_at.desc())
        .first()
    )
    if not plan:
        return {"available": False, "weeks": [], "based_on": {}}
    return {
        "available": True,
        "id": plan.id,
        "weeks": plan.weeks or [],
        "based_on": plan.based_on or {},
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }


@router.post("/me/study-plan/regenerate")
def regenerate_study_plan(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.ai.assessment_service import build_learning_path
    from app.models.practice import LearningPath

    summary = user_summary(db, user)
    profile = user.student_profile
    weeks = build_learning_path(summary["scores"], summary["weaknesses"], profile.goals if profile else [])
    plan = LearningPath(
        student_id=user.id,
        weeks=weeks,
        based_on={
            "level": summary["level"],
            "scores": summary["scores"],
            "weaknesses": summary["weaknesses"],
            "goals": profile.goals if profile else [],
        },
        version=1,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return {"id": plan.id, "weeks": plan.weeks, "based_on": plan.based_on}


@router.get("/me/mistakes/heatmap")
def mistake_heatmap(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    """Mistake density per week per category for the last 12 weeks."""
    weeks = 12
    today = datetime.date.today()
    start = today - datetime.timedelta(days=today.weekday(), weeks=weeks - 1)
    rows = (
        db.query(Mistake)
        .filter(Mistake.student_id == user.id, Mistake.last_detected >= datetime.datetime.combine(start, datetime.time.min))
        .all()
    )
    grid = {}
    order = ["grammar", "pronunciation", "vocabulary", "fluency", "writing", "communication"]
    buckets = []
    for i in range(weeks):
        week_start = start + datetime.timedelta(days=7 * i)
        key = week_start.isoformat()
        buckets.append(key)
        grid[key] = {c: 0 for c in order}
    for m in rows:
        d = m.last_detected.date()
        key = (d - datetime.timedelta(days=d.weekday())).isoformat()
        if key in grid:
            grid[key][m.category] = grid[key].get(m.category, 0) + (m.occurrences or 1)
    return {"weeks": buckets, "categories": order, "grid": grid}


@router.get("/me/coach")
def coach_history(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    rows = (
        db.query(CoachMessage)
        .filter(CoachMessage.student_id == user.id)
        .order_by(CoachMessage.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat() if m.created_at else None}
        for m in reversed(rows)
    ]


@router.post("/me/coach")
def coach_turn(body: CoachRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.services.coach import coach_reply

    return coach_reply(db, user, body.message)


@router.get("/me/vocabulary")
def vocabulary_list(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.services.vocabulary import list_words

    return {"words": list_words(db, user)}


@router.post("/me/vocabulary/seed")
def vocabulary_seed(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.services.vocabulary import seed_words

    return seed_words(db, user)


@router.post("/me/vocabulary/practice")
def vocabulary_practice(body: VocabularyPracticeRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.services.vocabulary import practice_words

    return practice_words(db, user, body.word_ids)


@router.post("/me/vocabulary/{item_id}/status")
def vocabulary_status(item_id: int, body: VocabularyStatusRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.services.vocabulary import set_status

    try:
        return set_status(db, user, item_id, body.status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/assignments")
def student_assignments(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    from app.services.assignment import list_assignments_for_student

    return list_assignments_for_student(db, user)


@router.post("/assignments/{assignment_id}/submit")
def submit_assignment(
    assignment_id: int,
    body: AssignmentSubmitRequest,
    user: User = Depends(student_guard),
    db: Session = Depends(get_db),
):
    from app.models.assignment import Assignment
    from app.services.assignment import submit_assignment

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    sub = submit_assignment(db, user, assignment, body.answer)
    return {"id": sub.id, "score": sub.score, "feedback": sub.feedback}