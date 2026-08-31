"""Assessment + skill score models."""
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
from app.core.config import settings


class SkillScore(Base):
    """A snapshot of a student's skill scores (one row per source event).

    `source_type` indicates where the scores came from, e.g.
    'assessment', 'speaking', 'writing', 'discussion', 'conversation'.
    `scores` is a JSON map of skill -> 0..100.
    """

    __tablename__ = "skill_scores"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    source_type = Column(String(40), nullable=False)
    source_id = Column(Integer, nullable=True)  # id of the originating record
    scores = Column(JSON, default=dict)
    overall = Column(Float, default=0)
    level = Column(String(40), default="Beginner")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    student = relationship("User", foreign_keys=[student_id])

    @property
    def scores_map(self):
        return self.scores or {}


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    kind = Column(String(30), default="initial")  # initial | final | custom
    status = Column(String(30), default="in_progress")  # in_progress | submitted | scored
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    overall_score = Column(Float, nullable=True)
    level = Column(String(40), nullable=True)
    scores = Column(JSON, default=dict)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    mistakes = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    summary = Column(Text, default="")

    student = relationship("User", foreign_keys=[student_id])
    questions = relationship(
        "AssessmentQuestion",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="AssessmentQuestion.order_no",
    )


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    skill = Column(String(30), nullable=False)  # listening|speaking|reading|writing
    type = Column(String(30), default="mcq")  # mcq | short_answer | essay | reading_aloud | speaking
    prompt = Column(Text, nullable=False)
    audio_path = Column(String(300), nullable=True)
    passage = Column(Text, nullable=True)
    options = Column(JSON, default=list)  # for mcq
    correct_answer = Column(Text, nullable=True)
    reference_answer = Column(Text, nullable=True)
    order_no = Column(Integer, default=0)
    difficulty = Column(String(20), default="intermediate")

    assessment = relationship("Assessment", back_populates="questions")
    answers = relationship(
        "AssessmentAnswer", back_populates="question", cascade="all, delete-orphan"
    )


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("assessment_questions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answer_text = Column(Text, default="")
    audio_path = Column(String(300), nullable=True)
    duration_ms = Column(Integer, default=0)
    is_correct = Column(String(10), nullable=True)  # "true" | "false" | "partial" | null
    score = Column(Float, nullable=True)
    feedback = Column(JSON, default=dict)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)

    question = relationship("AssessmentQuestion", back_populates="answers")
    student = relationship("User", foreign_keys=[student_id])
