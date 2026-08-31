"""Assignment + report + progress history models."""
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


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    skill = Column(String(30), nullable=False)  # listening|speaking|reading|writing
    topic = Column(String(300), default="")
    difficulty = Column(String(20), default="intermediate")
    description = Column(Text, default="")
    questions = Column(JSON, default=list)
    assessment_criteria = Column(JSON, default=list)
    deadline = Column(DateTime, nullable=True)
    status = Column(String(20), default="published")  # draft | published | closed
    is_ai_generated = Column(String(5), default="false")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    teacher = relationship("User", foreign_keys=[teacher_id])
    submissions = relationship(
        "AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan"
    )


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(20), default="submitted")  # submitted | scored | reviewed
    answer = Column(JSON, default=dict)
    score = Column(Float, nullable=True)
    feedback = Column(JSON, default=dict)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_by_teacher = Column(String(5), default="false")

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", foreign_keys=[student_id])


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    report_type = Column(String(40), nullable=False)  # student | assessment | discussion | progress | final
    title = Column(String(200), default="")
    report = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])


class ProgressHistory(Base):
    """Daily snapshot of a student's scores / activity for charting."""

    __tablename__ = "progress_history"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    history_date = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    scores = Column(JSON, default=dict)
    activities = Column(Integer, default=0)
    level = Column(String(40), default="Beginner")
