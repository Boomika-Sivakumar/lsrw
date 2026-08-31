"""Structured AI output schemas.

All AI responses are validated against these schemas before they are
persisted or returned to the client. Free-form AI output is never trusted.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Correction(BaseModel):
    original: str = ""
    problem: str = ""
    corrected: str = ""
    explanation: str = ""


class MistakeItem(BaseModel):
    category: str = "grammar"  # grammar|pronunciation|vocabulary|fluency|communication|writing
    text: str = ""
    corrected_text: str = ""
    explanation: str = ""


class BaseAnalysis(BaseModel):
    scores: Dict[str, float] = Field(default_factory=dict)
    overall: float = 0
    level: str = "Beginner"
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    mistakes: List[MistakeItem] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    feedback: str = ""


class SpeakingAnalysis(BaseAnalysis):
    transcript: str = ""
    duration_ms: int = 0
    word_count: int = 0
    wpm: float = 0
    fillers: List[str] = Field(default_factory=list)
    corrections: List[Correction] = Field(default_factory=list)


class WritingAnalysis(BaseAnalysis):
    corrections: List[Correction] = Field(default_factory=list)
    corrected_text: str = ""
    clarity: float = 0
    coherence: float = 0
    relevance: float = 0


class ReadingAnalysis(BaseAnalysis):
    transcript: str = ""
    word_count: int = 0
    reading_speed_wpm: float = 0
    skipped_words: int = 0
    repeated_words: int = 0
    pause_count: int = 0
    accuracy: float = 0


class ConversationReply(BaseModel):
    message: str = ""
    next_step: str = "ask_followup"  # ask_followup | end
    evaluation: Optional[Dict[str, Any]] = None


class TopicSet(BaseModel):
    topics: List[str] = Field(default_factory=list)


class QuestionSet(BaseModel):
    skill: str = ""
    questions: List[Dict[str, Any]] = Field(default_factory=list)


class SummaryResult(BaseModel):
    major_ideas: List[str] = Field(default_factory=list)
    agreements: List[str] = Field(default_factory=list)
    disagreements: List[str] = Field(default_factory=list)
    conclusion: str = ""


class RecapResult(BaseModel):
    title: str = ""
    key_points: List[str] = Field(default_factory=list)
    decisions: List[str] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)
    speaker_summary: str = ""


class AssignmentDraft(BaseModel):
    title: str = ""
    skill: str = "writing"
    topic: str = ""
    difficulty: str = "intermediate"
    description: str = ""
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    assessment_criteria: List[str] = Field(default_factory=list)
