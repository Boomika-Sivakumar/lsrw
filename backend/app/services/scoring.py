"""Score recording: persists SkillScore snapshots + daily progress history."""
import datetime

from sqlalchemy.orm import Session

from app.ai.assessment_service import compute_overall, detect_level, merge_scores
from app.core.config import settings
from app.models.assessment import SkillScore
from app.models.assignment import ProgressHistory


def record_skill_scores(
    db: Session,
    student_id: int,
    source_type: str,
    scores: dict,
    source_id=None,
) -> SkillScore:
    """Insert a SkillScore snapshot, blending with the previous latest scores
    so single weak sessions do not erase prior progress."""
    previous = (
        db.query(SkillScore)
        .filter(SkillScore.student_id == student_id)
        .order_by(SkillScore.created_at.desc())
        .first()
    )
    merged = merge_scores(scores, previous.scores if previous else {})
    overall = compute_overall(merged)
    level = detect_level(merged)
    row = SkillScore(
        student_id=student_id,
        source_type=source_type,
        source_id=source_id,
        scores=merged,
        overall=overall,
        level=level,
    )
    db.add(row)
    db.flush()
    return row


def record_progress_snapshot(db: Session, student_id: int, scores: dict, activities: int = 1):
    """Upsert today's progress snapshot for charting."""
    today = datetime.date.today()
    start = datetime.datetime.combine(today, datetime.time.min)
    end = datetime.datetime.combine(today, datetime.time.max)
    row = (
        db.query(ProgressHistory)
        .filter(ProgressHistory.student_id == student_id, ProgressHistory.history_date.between(start, end))
        .first()
    )
    if not row:
        row = ProgressHistory(student_id=student_id, history_date=datetime.datetime.utcnow())
        db.add(row)
    row.scores = scores
    row.activities = (row.activities or 0) + activities
    row.level = detect_level(scores)
    db.flush()
    return row


def all_skill_names() -> list:
    return settings.SKILLS