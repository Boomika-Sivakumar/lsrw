"""Practice session + conversation / interview / presentation models."""
import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


class PracticeSession(Base):
    """One practice activity for any LSRW skill."""

    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    skill = Column(String(30), nullable=False, index=True)  # listening|speaking|reading|writing
    mode = Column(String(40), default="practice")
    topic = Column(String(200), default="")
    difficulty = Column(String(20), default="intermediate")
    status = Column(String(20), default="completed")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    transcript = Column(Text, default="")
    audio_path = Column(String(300), nullable=True)
    duration_ms = Column(Integer, default=0)
    score = Column(Float, nullable=True)
    result = Column(JSON, default=dict)  # detailed AI analysis

    student = relationship("User", foreign_keys=[student_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    scenario = Column(String(60), default="self-introduction")
    status = Column(String(20), default="in_progress")  # in_progress | completed
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    messages = Column(JSON, default=list)  # [{role, text, ts}]
    report = Column(JSON, default=dict)

    student = relationship("User", foreign_keys=[student_id])


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_role = Column(String(120), default="General")
    status = Column(String(20), default="in_progress")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    questions = Column(JSON, default=list)  # [{question, order}]
    answers = Column(JSON, default=list)  # [{question, transcript, score}]
    report = Column(JSON, default=dict)

    student = relationship("User", foreign_keys=[student_id])


class Presentation(Base):
    __tablename__ = "presentations"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String(200), default="")
    duration_seconds = Column(Integer, default=120)
    difficulty = Column(String(20), default="intermediate")
    status = Column(String(20), default="completed")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    transcript = Column(Text, default="")
    report = Column(JSON, default=dict)

    student = relationship("User", foreign_keys=[student_id])


class Mistake(Base):
    """A repeated mistake, tracked over time and used for personalization."""

    __tablename__ = "mistakes"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(30), nullable=False)  # grammar|pronunciation|vocabulary|fluency|communication|writing
    text = Column(Text, nullable=False)
    corrected_text = Column(Text, default="")
    explanation = Column(Text, default="")
    occurrences = Column(Integer, default=1)
    first_detected = Column(DateTime, default=datetime.datetime.utcnow)
    last_detected = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="Needs Improvement")

    student = relationship("User", foreign_keys=[student_id])


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(40), default="general")
    title = Column(String(200), nullable=False)
    detail = Column(Text, default="")
    activity = Column(Text, default="")
    source = Column(String(40), default="system")
    is_done = Column(String(5), default="false")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    weeks = Column(JSON, default=list)  # [{week, focus, activities}]
    based_on = Column(JSON, default=dict)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])


class DailyChallenge(Base):
    __tablename__ = "daily_challenges"

    id = Column(Integer, primary_key=True)
    challenge_date = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    skill = Column(String(30), nullable=False)
    topic = Column(String(300), nullable=False)
    duration_seconds = Column(Integer, default=120)
    difficulty = Column(String(20), default="intermediate")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ChallengeCompletion(Base):
    __tablename__ = "challenge_completions"

    id = Column(Integer, primary_key=True)
    challenge_id = Column(Integer, ForeignKey("daily_challenges.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Float, nullable=True)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)
