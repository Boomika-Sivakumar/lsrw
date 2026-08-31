"""Pydantic request/response schemas for the API."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field

# EmailStr requires email-validator which is not installed; use str + simple check instead.
# Keep it simple: plain str fields.


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    role: str = "student"  # student | teacher | admin
    goals: List[str] = Field(default_factory=list)
    admin_code: str = ""  # required when role == "admin"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class PracticeRequest(BaseModel):
    skill: str
    topic: str = ""
    difficulty: str = "intermediate"
    mode: str = "practice"  # generate | submit | practice
    transcript: str = ""
    text: str = ""
    prompt: str = ""
    audio: Optional[Any] = None
    duration_ms: int = 0
    expected_text: str = ""
    answers: List[Dict[str, Any]] = Field(default_factory=list)


class AnalysisRequest(BaseModel):
    text: str
    prompt: str = ""
    topic: str = ""
    skill: str = "speaking"
    duration_ms: int = 0
    expected_text: str = ""


class AssessmentSubmitRequest(BaseModel):
    answers: List[Dict[str, Any]] = Field(default_factory=list)
    duration_ms: int = 0


class TopicRequest(BaseModel):
    skill: str = "speaking"
    context: str = ""


class QuestionRequest(BaseModel):
    skill: str = "reading"
    topic: str = ""


class ConversationRequest(BaseModel):
    scenario: str = "self-introduction"
    transcript: str = ""
    audio: Optional[Any] = None


class InterviewStartRequest(BaseModel):
    job_role: str = "General"


class InterviewAnswerRequest(BaseModel):
    question: str
    transcript: str = ""
    audio: Optional[Any] = None
    duration_ms: int = 0


class PresentationRequest(BaseModel):
    topic: str
    duration_seconds: int = 120
    difficulty: str = "intermediate"
    transcript: str = ""
    audio: Optional[Any] = None


class DiscussionCreateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=300)
    description: str = ""
    difficulty: str = "intermediate"
    duration_seconds: int = 600
    participant_limit: int = 6
    assessment_criteria: List[str] = Field(default_factory=list)


class DiscussionJoinRequest(BaseModel):
    session_code: str
    consent_recording: str = "true"


class DiscussionSegmentRequest(BaseModel):
    speaker: str
    text: str
    start_time: float = 0
    end_time: float = 0


class AssignmentCreateRequest(BaseModel):
    title: str
    skill: str = "writing"
    topic: str = ""
    difficulty: str = "intermediate"
    description: str = ""
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    assessment_criteria: List[str] = Field(default_factory=list)
    deadline: Optional[str] = None


class AssignmentGenerateRequest(BaseModel):
    topic: str
    objective: str = "Improve communication skills"


class AssignmentSubmitRequest(BaseModel):
    answer: Dict[str, Any] = Field(default_factory=dict)


class GoalUpdateRequest(BaseModel):
    goals: List[str] = Field(default_factory=list)
    target_level: str = ""


class ProgressSnapshotRequest(BaseModel):
    scores: Dict[str, float] = Field(default_factory=dict)
    activities: int = 0


class ChatRequest(BaseModel):
    sentence: str


class CoachRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class VocabularyStatusRequest(BaseModel):
    status: str  # new|learning|known


class VocabularyPracticeRequest(BaseModel):
    word_ids: List[int] = Field(default_factory=list)