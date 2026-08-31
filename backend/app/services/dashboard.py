"""Dashboard aggregations for students and teachers."""
import datetime
from typing import Dict, List

from sqlalchemy.orm import Session

from app.ai.assessment_service import skill_gaps, user_summary
from app.models.assessment import Assessment, SkillScore
from app.models.assignment import Assignment, AssignmentSubmission, ProgressHistory, Report
from app.models.discussion import DiscussionAnalysis, GroupDiscussion
from app.models.practice import Mistake, Recommendation
from app.models.user import User


def student_dashboard(db: Session, student: User) -> dict:
    summary = user_summary(db, student)

    # Recent mistakes
    recent_mistakes = (
        db.query(Mistake)
        .filter(Mistake.student_id == student.id)
        .order_by(Mistake.last_detected.desc())
        .limit(6)
        .all()
    )
    # Active recommendations
    recommendations = (
        db.query(Recommendation)
        .filter(Recommendation.student_id == student.id, Recommendation.is_done == "false")
        .order_by(Recommendation.created_at.desc())
        .limit(6)
        .all()
    )
    # Assessments
    assessments = (
        db.query(Assessment)
        .filter(Assessment.student_id == student.id)
        .order_by(Assessment.started_at.desc())
        .limit(5)
        .all()
    )
    # Practice sessions (history for charts)
    practice_counts = (
        db.query(SkillScore)
        .filter(SkillScore.student_id == student.id)
        .count()
    )

    profile = student.student_profile
    level = summary["level"]
    gaps = skill_gaps(summary["scores"], profile.target_level if profile else "Advanced")

    daily, weekly, monthly = _period_charts(db, student.id)

    return {
        "user": student.to_public_dict(),
        "summary": summary,
        "scores": summary["scores"],
        "overall": summary["overall"],
        "level": level,
        "target_level": profile.target_level if profile else "Advanced",
        "goals": profile.goals if profile else [],
        "strengths": summary["strengths"],
        "weaknesses": summary["weaknesses"],
        "skill_gaps": gaps,
        "recent_mistakes": [
            {"id": m.id, "category": m.category, "text": m.text, "corrected_text": m.corrected_text,
             "explanation": m.explanation, "occurrences": m.occurrences,
             "last_detected": m.last_detected.isoformat() if m.last_detected else None}
            for m in recent_mistakes
        ],
        "recommendations": [
            {"id": r.id, "category": r.category, "title": r.title, "detail": r.detail,
             "activity": r.activity, "source": r.source}
            for r in recommendations
        ],
        "assessments": [
            {"id": a.id, "title": a.title, "kind": a.kind, "status": a.status,
             "overall_score": a.overall_score, "level": a.level,
             "started_at": a.started_at.isoformat() if a.started_at else None}
            for a in assessments
        ],
        "total_activities": practice_counts,
        "charts": {"daily": daily, "weekly": weekly, "monthly": monthly},
    }


def student_progress(db: Session, student_id: int) -> dict:
    snapshots = (
        db.query(ProgressHistory)
        .filter(ProgressHistory.student_id == student_id)
        .order_by(ProgressHistory.history_date.asc())
        .all()
    )
    scores_history = (
        db.query(SkillScore)
        .filter(SkillScore.student_id == student_id)
        .order_by(SkillScore.created_at.asc())
        .all()
    )
    return {
        "daily": [
            {"date": s.history_date.isoformat() if s.history_date else None, "scores": s.scores, "activities": s.activities}
            for s in snapshots
        ],
        "skill_history": [
            {"date": s.created_at.isoformat() if s.created_at else None, "scores": s.scores, "overall": s.overall, "source": s.source_type}
            for s in scores_history
        ],
        "skill_timeline": _skill_timeline(scores_history),
        "before_after": _before_after(db, student_id),
    }


def _skill_timeline(scores_history: list) -> dict:
    """Per-skill time series built from SkillScore history."""
    skills = ["grammar", "vocabulary", "fluency", "pronunciation", "confidence", "participation",
              "listening", "speaking", "reading", "writing"]
    series = {s: [] for s in skills}
    for row in scores_history:
        date = row.created_at.date().isoformat() if row.created_at else None
        for s in skills:
            val = (row.scores or {}).get(s)
            if val is not None:
                series[s].append({"date": date, "score": val})
    return series


def _before_after(db: Session, student_id: int) -> dict:
    first = (
        db.query(Assessment)
        .filter(Assessment.student_id == student_id, Assessment.status == "scored")
        .order_by(Assessment.started_at.asc())
        .first()
    )
    latest = (
        db.query(Assessment)
        .filter(Assessment.student_id == student_id, Assessment.status == "scored")
        .order_by(Assessment.started_at.desc())
        .first()
    )
    if not first or not latest:
        return {"available": False}
    if first.id == latest.id:
        return {"available": False, "initial": _assessment_scores(first), "current": _assessment_scores(latest)}
    return {
        "available": True,
        "initial": _assessment_scores(first),
        "current": _assessment_scores(latest),
        "initial_date": first.started_at.isoformat() if first.started_at else None,
        "current_date": latest.started_at.isoformat() if latest.started_at else None,
    }


def _assessment_scores(assessment: Assessment) -> dict:
    return {"scores": assessment.scores or {}, "overall": assessment.overall_score, "level": assessment.level}


def _period_charts(db: Session, student_id: int):
    scores = (
        db.query(SkillScore)
        .filter(SkillScore.student_id == student_id)
        .order_by(SkillScore.created_at.asc())
        .all()
    )
    today = datetime.date.today()

    daily, weekly, monthly = [], [], []
    for s in scores:
        d = s.created_at.date() if s.created_at else today
        daily.append({"date": d.isoformat(), "overall": s.overall, "scores": s.scores or {}})
        if d >= today - datetime.timedelta(days=7):
            weekly.append({"date": d.isoformat(), "overall": s.overall})
        if d.month == today.month and d.year == today.year:
            monthly.append({"date": d.isoformat(), "overall": s.overall})

    # Aggregate weekly/monthly by day bucket
    def bucket(items, days):
        buckets = {}
        for it in items:
            dt = datetime.date.fromisoformat(it["date"])
            key = dt - datetime.timedelta(days=dt.weekday())
            if days == 30:
                key = dt.replace(day=1)
            buckets.setdefault(key.isoformat(), []).append(it["overall"])
        return [{"date": k, "overall": round(sum(v) / len(v), 1)} for k, v in sorted(buckets.items())]

    weekly = bucket(weekly, 7)
    monthly = bucket(monthly, 30)
    return daily, weekly, monthly


def teacher_dashboard(db: Session, teacher: User) -> dict:
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()  # noqa: E712
    student_ids = [s.id for s in students]
    if not student_ids:
        return {"total_students": 0, "active_students": 0, "scores": {}, "level_distribution": {}, "recent_activity": []}

    latest_scores = {}
    for sid in student_ids:
        row = (
            db.query(SkillScore)
            .filter(SkillScore.student_id == sid)
            .order_by(SkillScore.created_at.desc())
            .first()
        )
        if row:
            latest_scores[sid] = row

    skills = ["listening", "speaking", "reading", "writing", "grammar", "vocabulary",
              "pronunciation", "fluency", "comprehension", "confidence", "participation"]
    averages = {}
    for skill in skills:
        vals = [r.scores.get(skill) for r in latest_scores.values() if r.scores and r.scores.get(skill) is not None]
        averages[skill] = round(sum(vals) / len(vals), 1) if vals else 0

    level_dist = {}
    for r in latest_scores.values():
        level_dist[r.level] = level_dist.get(r.level, 0) + 1

    # Common mistakes across class
    all_mistakes = {}
    for sid in student_ids:
        rows = db.query(Mistake).filter(Mistake.student_id == sid).all()
        for m in rows:
            key = (m.category, m.text.lower()[:60])
            all_mistakes[key] = all_mistakes.get(key, 0) + m.occurrences
    common_mistakes = sorted(
        [{"category": k[0], "text": k[1], "count": v} for k, v in all_mistakes.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:8]

    # Recent discussions
    discussions = db.query(GroupDiscussion).filter(GroupDiscussion.teacher_id == teacher.id).order_by(GroupDiscussion.created_at.desc()).limit(8).all()

    # Assignments
    assignments = db.query(Assignment).filter(Assignment.teacher_id == teacher.id).order_by(Assignment.created_at.desc()).limit(8).all()

    overall = [r.overall for r in latest_scores.values()]
    class_avg = round(sum(overall) / len(overall), 1) if overall else 0

    ranked = sorted(averages.items(), key=lambda x: x[1])
    strongest = ranked[-1][0] if ranked else ""
    weakest = ranked[0][0] if ranked else ""

    return {
        "total_students": len(students),
        "active_students": len(latest_scores),
        "class_average": class_avg,
        "averages": averages,
        "strongest_skill": strongest,
        "weakest_skill": weakest,
        "common_mistakes": common_mistakes,
        "level_distribution": level_dist,
        "recent_discussions": [
            {"id": d.id, "session_code": d.session_code, "topic": d.topic, "status": d.status,
             "participants": len(d.participants),
             "created_at": d.created_at.isoformat() if d.created_at else None}
            for d in discussions
        ],
        "recent_assignments": [
            {"id": a.id, "title": a.title, "skill": a.skill, "status": a.status,
             "deadline": a.deadline.isoformat() if a.deadline else None,
             "created_at": a.created_at.isoformat() if a.created_at else None}
            for a in assignments
        ],
        "students": [
            {"id": s.id, "username": s.username, "full_name": s.full_name, "user_id": s.user_id,
             "overall": latest_scores[s.id].overall if s.id in latest_scores else None,
             "level": latest_scores[s.id].level if s.id in latest_scores else "No data"}
            for s in students
        ],
    }