"""Assessment logic: scoring, level detection, strengths/weaknesses,
learning paths and recommendations. Deterministic so results are stable
and testable."""
import datetime
from typing import Dict, List

from app.core.config import settings
from app.models.user import User


def compute_overall(scores: Dict[str, float]) -> float:
    """Overall communication score = weighted average of all present skills."""
    vals = [v for v in scores.values() if v is not None]
    if not vals:
        return 0.0
    return round(sum(vals) / len(vals), 1)


def detect_level(scores: Dict[str, float]) -> str:
    """Determine communication level from MULTIPLE skill scores.

    Uses a weighted average; thresholds are configurable via
    settings.LEVEL_THRESHOLDS. A student must meet the threshold on the
    overall average of key skills, which prevents a single high score from
    overstating the level.
    """
    core_skills = ["listening", "speaking", "reading", "writing", "grammar", "vocabulary"]
    core = [scores.get(s, 0) for s in core_skills if scores.get(s) is not None]
    avg = (sum(core) / len(core)) if core else compute_overall(scores)
    level = "Beginner"
    for name, low, high in settings.LEVEL_THRESHOLDS:
        if low <= avg <= high:
            level = name
            break
    if avg > settings.LEVEL_THRESHOLDS[-1][2]:
        level = settings.LEVEL_THRESHOLDS[-1][0]
    return level


def strengths_and_weaknesses(scores: Dict[str, float]) -> tuple:
    strengths = [name for name, val in scores.items() if val >= 70]
    weaknesses = [name for name, val in scores.items() if val < 55]
    return strengths, weaknesses


def skill_gaps(scores: Dict[str, float], target_level: str = "Advanced") -> Dict[str, str]:
    """Compare current scores against target level thresholds.

    Returns a map of skill -> gap severity (High/Medium/Low).
    """
    target_high = {"Beginner": 34, "Elementary": 49, "Intermediate": 69, "Upper Intermediate": 84, "Advanced": 100}
    target = target_high.get(target_level, 84)
    gaps = {}
    for skill in ["grammar", "vocabulary", "fluency", "pronunciation", "confidence", "listening", "reading", "writing"]:
        val = scores.get(skill, 0)
        gap = target - val
        if gap >= 30:
            gaps[skill] = "High"
        elif gap >= 15:
            gaps[skill] = "Medium"
        elif gap > 0:
            gaps[skill] = "Low"
        else:
            gaps[skill] = "None"
    return gaps


def build_learning_path(scores: Dict[str, float], weaknesses: List[str], goals: List[str]) -> List[dict]:
    """Generate a personalized weekly learning path."""
    focus_order = ["grammar", "fluency", "pronunciation", "vocabulary", "group discussion", "mock interview"]
    weak_set = set(weaknesses)
    weeks = []
    added = set()
    for i, focus in enumerate(focus_order):
        if focus in weak_set or i < 2:
            weeks.append({"week": i + 1, "focus": focus.title(), "activities": _activities_for(focus)})
            added.add(focus)
    for g in goals:
        mapped = {"interview-communication": "mock interview", "spoken-english": "fluency", "presentation": "structure and delivery"}.get(g, g)
        if mapped and mapped not in added and len(weeks) < 6:
            weeks.append({"week": len(weeks) + 1, "focus": mapped.title(), "activities": _activities_for(mapped)})
            added.add(mapped)
    return weeks


def _activities_for(focus: str) -> List[str]:
    bank = {
        "grammar": ["Complete daily grammar exercises", "Fix flagged mistakes in writing", "Write 5 corrected sentences"],
        "fluency": ["Speak 2 minutes on a familiar topic daily", "Record and review your speech", "Reduce filler words"],
        "pronunciation": ["Shadow a short audio clip daily", "Practice minimal pairs", "Record read-aloud passages"],
        "vocabulary": ["Learn 5 words daily", "Use new words in sentences", "Write short paragraphs"],
        "group discussion": ["Join one group discussion per week", "Practice turn-taking", "Practice active listening"],
        "mock interview": ["Complete one mock interview weekly", "Review interview reports", "Practice STAR answers"],
        "structure and delivery": ["Outline presentations before speaking", "Practice openings and closings"],
        "listening": ["Listen to podcasts and summarize", "Answer comprehension questions"],
        "reading": ["Read articles and summarize", "Read aloud for accuracy"],
        "writing": ["Write one email/essay per week", "Review corrections"],
    }
    return bank.get(focus, ["Practice daily for 15 minutes"])


def default_recommendations(scores: Dict[str, float], mistakes: List[dict]) -> List[dict]:
    recs = []
    if scores.get("grammar", 100) < 65:
        recs.append({"category": "grammar", "title": "Improve grammar", "detail": "Practice the grammar topics you miss most.", "activity": "15 minutes of grammar exercises daily"})
    if scores.get("fluency", 100) < 65:
        recs.append({"category": "fluency", "title": "Build speaking fluency", "detail": "Speak regularly to reduce hesitation.", "activity": "2-minute daily speaking practice"})
    if scores.get("vocabulary", 100) < 65:
        recs.append({"category": "vocabulary", "title": "Expand vocabulary", "detail": "Learn words in context, not in isolation.", "activity": "5 new words with example sentences daily"})
    if scores.get("pronunciation", 100) < 65:
        recs.append({"category": "pronunciation", "title": "Improve pronunciation", "detail": "Focus on problem sounds.", "activity": "Daily read-aloud shadowing"})
    for m in (mistakes or [])[:2]:
        recs.append({"category": m.get("category", "general"), "title": f"Fix: {m.get('text', '')[:60]}", "detail": m.get("explanation", ""), "activity": "Review and rewrite this pattern correctly"})
    if not recs:
        recs.append({"category": "general", "title": "Keep practicing", "detail": "You are doing well. Push to harder topics.", "activity": "Try one advanced scenario this week"})
    return recs


def merge_scores(new_scores: Dict[str, float], old_scores: Dict[str, float]) -> Dict[str, float]:
    """Blend new scores with historical scores (70/30) so one bad session
    does not erase progress."""
    merged = {}
    keys = set(new_scores) | set(old_scores)
    for k in keys:
        n = new_scores.get(k)
        o = old_scores.get(k)
        if n is None:
            merged[k] = o
        elif o is None:
            merged[k] = n
        else:
            merged[k] = round(n * 0.7 + o * 0.3, 1)
    return merged


def upsert_mistake(db, student_id: int, category: str, text: str, corrected_text: str = "", explanation: str = ""):
    """Create or increment a mistake for a student (repeated-mistake tracking)."""
    from app.models.practice import Mistake

    normalized = (text or "").strip().lower()[:200]
    if not normalized:
        return None
    existing = (
        db.query(Mistake)
        .filter(Mistake.student_id == student_id, Mistake.category == category)
        .filter(Mistake.text.ilike(f"%{normalized[:40]}%"))
        .first()
    )
    now = datetime.datetime.utcnow()
    if existing:
        existing.occurrences += 1
        existing.last_detected = now
        if corrected_text:
            existing.corrected_text = corrected_text
        if explanation:
            existing.explanation = explanation
        existing.status = "Needs Improvement"
        db.add(existing)
        db.flush()
        return existing
    m = Mistake(
        student_id=student_id,
        category=category,
        text=(text or "")[:300],
        corrected_text=corrected_text,
        explanation=explanation,
        occurrences=1,
        first_detected=now,
        last_detected=now,
    )
    db.add(m)
    db.flush()
    return m


def user_summary(db, user: User) -> dict:
    """Latest scores / level / strengths for a user."""
    from app.models.assessment import SkillScore

    latest = (
        db.query(SkillScore)
        .filter(SkillScore.student_id == user.id)
        .order_by(SkillScore.created_at.desc())
        .first()
    )
    if not latest:
        return {"scores": {}, "overall": 0, "level": "Beginner", "strengths": [], "weaknesses": []}
    strengths, weaknesses = strengths_and_weaknesses(latest.scores or {})
    return {
        "scores": latest.scores or {},
        "overall": latest.overall,
        "level": latest.level,
        "strengths": strengths,
        "weaknesses": weaknesses,
    }