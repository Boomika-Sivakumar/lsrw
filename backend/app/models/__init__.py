"""Import all models so they register on Base.metadata."""
from app.models.user import User, StudentProfile, TeacherProfile
from app.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAnswer,
    SkillScore,
)
from app.models.practice import (
    PracticeSession,
    Conversation,
    Interview,
    Presentation,
    Mistake,
    Recommendation,
    LearningPath,
    DailyChallenge,
    ChallengeCompletion,
)
from app.models.discussion import (
    GroupDiscussion,
    DiscussionParticipant,
    DiscussionTranscript,
    SpeakerSegment,
    DiscussionAnalysis,
    Recording,
)
from app.models.assignment import (
    Assignment,
    AssignmentSubmission,
    Report,
    ProgressHistory,
)
from app.models.intelligence import VocabularyItem, CoachMessage

__all__ = [
    "User",
    "StudentProfile",
    "TeacherProfile",
    "Assessment",
    "AssessmentQuestion",
    "AssessmentAnswer",
    "SkillScore",
    "PracticeSession",
    "Conversation",
    "Interview",
    "Presentation",
    "Mistake",
    "Recommendation",
    "LearningPath",
    "DailyChallenge",
    "ChallengeCompletion",
    "GroupDiscussion",
    "DiscussionParticipant",
    "DiscussionTranscript",
    "SpeakerSegment",
    "DiscussionAnalysis",
    "Recording",
    "Assignment",
    "AssignmentSubmission",
    "Report",
    "ProgressHistory",
    "VocabularyItem",
    "CoachMessage",
]
