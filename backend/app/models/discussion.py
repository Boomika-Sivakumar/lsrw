"""Group discussion models (real-time multi-user)."""
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


class GroupDiscussion(Base):
    __tablename__ = "group_discussions"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_code = Column(String(30), unique=True, nullable=False, index=True)
    topic = Column(String(300), nullable=False)
    description = Column(Text, default="")
    difficulty = Column(String(20), default="intermediate")
    duration_seconds = Column(Integer, default=600)
    participant_limit = Column(Integer, default=6)
    status = Column(String(20), default="CREATED", index=True)
    # CREATED -> WAITING -> ACTIVE -> (PAUSED) -> ENDED -> ANALYZING -> COMPLETED
    assessment_criteria = Column(JSON, default=list)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    recording_path = Column(String(300), nullable=True)
    recording_name = Column(String(255), default="")
    recording_size = Column(Integer, default=0)
    recording_uploaded_at = Column(DateTime, nullable=True)
    recap = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    group_score = Column(JSON, default=dict)
    group_report = Column(JSON, default=dict)
    summary = Column(JSON, default=dict)

    teacher = relationship("User", foreign_keys=[teacher_id])
    participants = relationship(
        "DiscussionParticipant",
        back_populates="discussion",
        cascade="all, delete-orphan",
    )

    @property
    def public_dict(self):
        return {
            "id": self.id,
            "session_code": self.session_code,
            "topic": self.topic,
            "description": self.description,
            "difficulty": self.difficulty,
            "duration_seconds": self.duration_seconds,
            "participant_limit": self.participant_limit,
            "status": self.status,
            "assessment_criteria": self.assessment_criteria,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "group_score": self.group_score,
            "group_report": self.group_report,
            "summary": self.summary,
            "recap": self.recap,
            "recording": {
                "path": self.recording_path,
                "name": self.recording_name,
                "size": self.recording_size,
                "uploaded_at": self.recording_uploaded_at.isoformat() if self.recording_uploaded_at else None,
            },
        }


class DiscussionParticipant(Base):
    __tablename__ = "discussion_participants"

    id = Column(Integer, primary_key=True)
    discussion_id = Column(Integer, ForeignKey("group_discussions.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), default="participant")  # participant | moderator
    consent_recording = Column(String(5), default="false")
    connected = Column(String(5), default="false")
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

    discussion = relationship("GroupDiscussion", back_populates="participants")
    student = relationship("User", foreign_keys=[student_id])


class DiscussionTranscript(Base):
    __tablename__ = "discussion_transcripts"

    id = Column(Integer, primary_key=True)
    discussion_id = Column(Integer, ForeignKey("group_discussions.id"), nullable=False, index=True)
    speaker = Column(String(20), default="")  # user_id e.g. BA1024 or 'MODERATOR'
    text = Column(Text, nullable=False)
    start_time = Column(Float, default=0)  # seconds from discussion start
    end_time = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SpeakerSegment(Base):
    __tablename__ = "speaker_segments"

    id = Column(Integer, primary_key=True)
    discussion_id = Column(Integer, ForeignKey("group_discussions.id"), nullable=False, index=True)
    participant_id = Column(Integer, ForeignKey("discussion_participants.id"), nullable=True)
    user_id = Column(String(20), nullable=False)
    text = Column(Text, nullable=False)
    start_time = Column(Float, default=0)
    end_time = Column(Float, default=0)
    is_interruption = Column(String(5), default="false")
    interrupted_user_id = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DiscussionAnalysis(Base):
    __tablename__ = "discussion_analysis"

    id = Column(Integer, primary_key=True)
    discussion_id = Column(Integer, ForeignKey("group_discussions.id"), nullable=False, index=True)
    status = Column(String(20), default="pending")  # pending | done
    group_report = Column(JSON, default=dict)
    individual_reports = Column(JSON, default=dict)  # user_id -> report
    summary = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Recording(Base):
    """Consent-aware audio recording metadata. Files are stored privately."""

    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True)
    discussion_id = Column(Integer, ForeignKey("group_discussions.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    kind = Column(String(20), default="discussion")  # discussion | practice | interview
    path = Column(String(300), nullable=False)
    consent = Column(String(5), default="true")
    deleted = Column(String(5), default="false")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
