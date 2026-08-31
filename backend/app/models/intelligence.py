"""Communication intelligence layer: vocabulary builder + AI coach."""
import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database.db import Base


class VocabularyItem(Base):
    """A word the student is building into their active vocabulary."""

    __tablename__ = "vocabulary_items"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    word = Column(String(80), nullable=False)
    definition = Column(Text, default="")
    example = Column(Text, default="")
    category = Column(String(40), default="general")  # general|academic|business|idiom
    status = Column(String(20), default="new")  # new|learning|known
    times_practiced = Column(Integer, default=0)
    times_seen = Column(Integer, default=0)
    last_reviewed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])


class CoachMessage(Base):
    """A single AI-coach exchange (student -> coach and coach -> student)."""

    __tablename__ = "coach_messages"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(10), nullable=False)  # user | coach
    content = Column(Text, nullable=False)
    context = Column(JSON, default=dict)  # snapshot of scores/recent mistakes at reply time
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])