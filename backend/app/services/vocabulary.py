"""Vocabulary Builder: word curation and spaced-practice tracking."""
import datetime

from sqlalchemy.orm import Session

from app.ai.assessment_service import user_summary
from app.models.intelligence import VocabularyItem
from app.models.user import User

# Level-appropriate word banks (word, definition, example, category).
WORD_BANK = {
    "Beginner": [
        ("schedule", "a plan of things to be done and when", "I updated my daily schedule.", "general"),
        ("improve", "to make something better", "Practice will improve your English.", "general"),
        ("explain", "to make something clear", "Can you explain that idea again?", "general"),
        ("meeting", "a gathering to discuss something", "We have a meeting at noon.", "business"),
        ("decide", "to choose between options", "I need to decide on a topic.", "general"),
        ("achieve", "to reach a goal", "She achieved her target score.", "general"),
    ],
    "Intermediate": [
        ("efficient", "working well without wasting time", "This process is more efficient.", "academic"),
        ("communicate", "to share information", "We communicate through email.", "business"),
        ("opportunity", "a chance to do something", "This is a great opportunity to practice.", "general"),
        ("emphasize", "to give special importance to", "He emphasized the key points.", "academic"),
        ("collaborate", "to work together", "The team collaborated on the report.", "business"),
        ("relevant", "closely connected to the topic", "Keep your answer relevant.", "academic"),
    ],
    "Upper Intermediate": [
        ("articulate", "to express an idea clearly", "She articulated her view confidently.", "academic"),
        ("concise", "short and clear", "Give a concise summary.", "academic"),
        ("negotiate", "to discuss to reach an agreement", "They negotiated the deadline.", "business"),
        ("coherent", "logical and consistent", "His argument was coherent.", "academic"),
        ("comprehensive", "covering everything needed", "Write a comprehensive report.", "business"),
        ("assertive", "confident and direct", "Be assertive in the interview.", "general"),
    ],
    "Advanced": [
        ("persuade", "to convince someone", "She persuaded the client to agree.", "academic"),
        ("meticulous", "very careful and precise", "He is meticulous about details.", "academic"),
        ("facilitate", "to make a process easier", "Good tools facilitate learning.", "business"),
        ("eloquent", "fluent and persuasive in speech", "He gave an eloquent speech.", "academic"),
        ("articulation", "clear and effective expression", "Her articulation was excellent.", "general"),
        ("synthesize", "to combine ideas into a whole", "Synthesize the key findings.", "academic"),
    ],
}


def _level_for(db: Session, student: User) -> str:
    level = user_summary(db, student).get("level", "Beginner")
    if level not in WORD_BANK:
        level = "Intermediate"
    return level


def seed_words(db: Session, student: User, count: int = 8) -> dict:
    """Suggest a fresh batch of words for the student (no duplicates)."""
    level = _level_for(db, student)
    bank = WORD_BANK.get(level, WORD_BANK["Intermediate"])
    existing = {w.word.lower() for w in db.query(VocabularyItem).filter(VocabularyItem.student_id == student.id).all()}
    added = 0
    for word, definition, example, category in bank:
        if added >= count:
            break
        if word.lower() in existing:
            continue
        db.add(
            VocabularyItem(
                student_id=student.id,
                word=word,
                definition=definition,
                example=example,
                category=category,
                status="new",
                times_seen=1,
            )
        )
        existing.add(word.lower())
        added += 1
    db.commit()
    return {"added": added, "level": level}


def list_words(db: Session, student: User) -> list:
    rows = (
        db.query(VocabularyItem)
        .filter(VocabularyItem.student_id == student.id)
        .order_by(VocabularyItem.status.asc(), VocabularyItem.created_at.desc())
        .all()
    )
    return [
        {
            "id": w.id, "word": w.word, "definition": w.definition, "example": w.example,
            "category": w.category, "status": w.status, "times_practiced": w.times_practiced,
            "times_seen": w.times_seen,
            "last_reviewed": w.last_reviewed.isoformat() if w.last_reviewed else None,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }
        for w in rows
    ]


def set_status(db: Session, student: User, item_id: int, status: str) -> dict:
    item = db.query(VocabularyItem).filter(VocabularyItem.id == item_id, VocabularyItem.student_id == student.id).first()
    if not item:
        raise ValueError("Word not found")
    if status not in ("new", "learning", "known"):
        raise ValueError("Status must be new|learning|known")
    item.status = status
    item.last_reviewed = datetime.datetime.utcnow()
    db.commit()
    return {"id": item.id, "word": item.word, "status": item.status}


def practice_words(db: Session, student: User, word_ids: list) -> dict:
    practiced = 0
    for w in db.query(VocabularyItem).filter(VocabularyItem.id.in_(word_ids), VocabularyItem.student_id == student.id).all():
        w.times_practiced += 1
        w.times_seen += 1
        w.last_reviewed = datetime.datetime.utcnow()
        if w.status == "new":
            w.status = "learning"
        practiced += 1
    db.commit()
    return {"practiced": practiced}