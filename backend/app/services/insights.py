"""Teacher AI Insights: class-level and per-student narratives."""
from sqlalchemy.orm import Session

from app.ai.assessment_service import user_summary
from app.ai.base import get_llm_provider
from app.models.assessment import SkillScore
from app.models.practice import Mistake
from app.models.user import User


def _student_narrative(db: Session, student: User) -> dict:
    summary = user_summary(db, student)
    scores = summary.get("scores", {})
    weak = summary.get("weaknesses", []) or []
    strong = summary.get("strengths", []) or []

    mistakes = (
        db.query(Mistake)
        .filter(Mistake.student_id == student.id)
        .order_by(Mistake.occurrences.desc())
        .limit(3)
        .all()
    )
    mistake_lines = [
        {"category": m.category, "text": m.text[:80], "occurrences": m.occurrences}
        for m in mistakes
    ]

    focus = weak[:3] if weak else ["general fluency"]
    intervention = {
        "grammar": "Assign grammar drills and a 5-sentence daily correction task.",
        "pronunciation": "Assign read-aloud shadowing and minimal-pair practice.",
        "vocabulary": "Use the Vocabulary Builder bank and 5 new words daily.",
        "fluency": "Daily 2-minute speaking prompts; reduce filler words.",
        "confidence": "Low-stakes speaking tasks first, then increase difficulty.",
        "writing": "Weekly writing submissions with structured feedback.",
    }
    interventions = [intervention.get(w.split()[0].lower(), f"Targeted practice on {w}.") for w in focus]

    try:
        provider = get_llm_provider()
        data = provider.chat(
            [
                {"role": "system", "content": "__ROUTE:insights You are an expert language instructor."},
                {"role": "user", "content": (
                    f"level: {summary.get('level')}; scores: {scores}; "
                    f"strengths: {strong}; weaknesses: {weak}; "
                    f"recent mistakes: {mistake_lines}"
                )},
            ],
            temperature=0.5,
        )
        narrative = str(data.get("narrative") or data.get("summary") or _default_narrative(summary, weak, strong))
    except Exception:
        narrative = _default_narrative(summary, weak, strong)

    return {
        "student_id": student.id,
        "username": student.username,
        "full_name": student.full_name,
        "user_id": student.user_id or "",
        "level": summary.get("level", "No data"),
        "overall": summary.get("overall", 0),
        "narrative": narrative,
        "focus_areas": focus,
        "suggested_interventions": interventions,
        "recent_mistakes": mistake_lines,
    }


def _default_narrative(summary: dict, weak: list, strong: list) -> str:
    if not summary.get("scores"):
        return "This student has not completed any scored activity yet."
    parts = [f"{summary.get('level')} student with an overall score of {summary.get('overall')}."]
    if strong:
        parts.append(f"Strengths in {', '.join(strong[:2])}.")
    if weak:
        parts.append(f"Needs the most support in {', '.join(weak[:3])}.")
    else:
        parts.append("Shows balanced development across skills.")
    return " ".join(parts)


def teacher_insights(db: Session, teacher: User) -> dict:
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()  # noqa: E712
    per_student = [_student_narrative(db, s) for s in students]

    levels = {}
    for s in per_student:
        levels[s["level"]] = levels.get(s["level"], 0) + 1

    avg_overall = 0.0
    vals = [s["overall"] for s in per_student if s["overall"]]
    if vals:
        avg_overall = round(sum(vals) / len(vals), 1)

    risk_students = [s for s in per_student if s["overall"] and s["overall"] < 60]

    class_narrative = (
        f"Class of {len(students)} students with an average overall of {avg_overall}. "
        + (f"{len(risk_students)} student(s) are below 60 and need immediate attention: "
           + ", ".join(s["full_name"] for s in risk_students) + "."
           if risk_students else "No students are currently at high risk.")
    )

    return {
        "generated_at": None,
        "class_narrative": class_narrative,
        "class_average": avg_overall,
        "level_distribution": levels,
        "at_risk_count": len(risk_students),
        "students": per_student,
    }