"""Assignment lifecycle: create, generate with AI, submit, auto-grade."""
import datetime
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.ai.analysis import analyze_writing
from app.ai.content import generate_assignment
from app.models.assignment import Assignment, AssignmentSubmission
from app.models.user import User
from app.services.scoring import record_skill_scores


def create_assignment(db: Session, teacher: User, data: dict) -> Assignment:
    deadline = None
    if data.get("deadline"):
        try:
            deadline = datetime.datetime.fromisoformat(data["deadline"].replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            deadline = None
    a = Assignment(
        teacher_id=teacher.id,
        title=data["title"],
        skill=data.get("skill", "writing"),
        topic=data.get("topic", ""),
        difficulty=data.get("difficulty", "intermediate"),
        description=data.get("description", ""),
        questions=data.get("questions", []),
        assessment_criteria=data.get("assessment_criteria", ["Clarity", "Grammar", "Relevance", "Vocabulary"]),
        deadline=deadline,
        is_ai_generated="false",
        status="published",
    )
    db.add(a)
    db.flush()
    db.commit()
    db.refresh(a)
    return a


def generate_assignment_draft(db: Session, teacher: User, topic: str, objective: str) -> dict:
    draft = generate_assignment(topic, objective)
    return {
        "title": draft.title,
        "skill": draft.skill,
        "topic": draft.topic,
        "difficulty": draft.difficulty,
        "description": draft.description,
        "questions": draft.questions,
        "assessment_criteria": draft.assessment_criteria,
        "is_ai_generated": "true",
        "note": "AI-generated draft. Review and edit before publishing.",
    }


def submit_assignment(db: Session, student: User, assignment: Assignment, answer: dict) -> AssignmentSubmission:
    existing = (
        db.query(AssignmentSubmission)
        .filter(AssignmentSubmission.assignment_id == assignment.id, AssignmentSubmission.student_id == student.id)
        .first()
    )
    text = str(answer.get("text", "") or "")
    analysis = analyze_writing(text, prompt=assignment.title)

    if existing:
        existing.answer = answer
        existing.status = "scored"
        existing.score = analysis.overall
        existing.feedback = {
            "scores": analysis.scores,
            "overall": analysis.overall,
            "corrections": [c.dict() for c in analysis.corrections],
            "strengths": analysis.strengths,
            "weaknesses": analysis.weaknesses,
            "recommendations": analysis.recommendations,
        }
        sub = existing
    else:
        sub = AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=student.id,
            answer=answer,
            status="scored",
            score=analysis.overall,
            feedback={
                "scores": analysis.scores,
                "overall": analysis.overall,
                "corrections": [c.dict() for c in analysis.corrections],
                "strengths": analysis.strengths,
                "weaknesses": analysis.weaknesses,
                "recommendations": analysis.recommendations,
            },
        )
        db.add(sub)
    db.flush()

    record_skill_scores(
        db,
        student.id,
        "assignment",
        {
            "writing": analysis.overall,
            "grammar": analysis.scores.get("grammar", 0),
            "vocabulary": analysis.scores.get("vocabulary", 0),
        },
        source_id=assignment.id,
    )
    db.commit()
    db.refresh(sub)
    return sub


def list_assignments_for_student(db: Session, student: User) -> List[dict]:
    assignments = db.query(Assignment).filter(Assignment.status == "published").order_by(Assignment.created_at.desc()).all()
    out = []
    for a in assignments:
        sub = (
            db.query(AssignmentSubmission)
            .filter(AssignmentSubmission.assignment_id == a.id, AssignmentSubmission.student_id == student.id)
            .first()
        )
        out.append(
            {
                "id": a.id,
                "title": a.title,
                "skill": a.skill,
                "topic": a.topic,
                "difficulty": a.difficulty,
                "description": a.description,
                "questions": a.questions,
                "assessment_criteria": a.assessment_criteria,
                "deadline": a.deadline.isoformat() if a.deadline else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "submitted": sub is not None,
                "score": sub.score if sub else None,
            }
        )
    return out