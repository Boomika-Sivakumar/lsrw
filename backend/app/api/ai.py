"""AI helper routes (topic/question generation, analysis, feedback)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai import analysis as ai_analysis
from app.ai.assessment_service import default_recommendations, user_summary
from app.ai.base import get_provider_info
from app.ai.content import generate_questions, generate_topics
from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.user import User
from app.schemas.api import AnalysisRequest, ChatRequest, QuestionRequest, TopicRequest

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/provider")
def provider_info(user: User = Depends(get_current_user)):
    return get_provider_info()


@router.post("/generate-topic")
def ai_topics(body: TopicRequest, user: User = Depends(get_current_user)):
    return generate_topics(body.skill, body.context).dict()


@router.post("/generate-questions")
def ai_questions(body: QuestionRequest, user: User = Depends(get_current_user)):
    return {"skill": body.skill, "questions": generate_questions(body.skill, body.topic)}


@router.post("/analyze-speaking")
def ai_analyze_speaking(body: AnalysisRequest, user: User = Depends(get_current_user)):
    return ai_analysis.analyze_speaking(body.text, body.topic, body.duration_ms).dict()


@router.post("/analyze-writing")
def ai_analyze_writing(body: AnalysisRequest, user: User = Depends(get_current_user)):
    return ai_analysis.analyze_writing(body.text, body.prompt).dict()


@router.post("/generate-feedback")
def ai_feedback(body: AnalysisRequest, user: User = Depends(get_current_user)):
    if body.skill == "writing":
        return ai_analysis.analyze_writing(body.text, body.prompt).dict()
    return ai_analysis.analyze_speaking(body.text, body.topic, body.duration_ms).dict()


@router.post("/generate-recommendations")
def ai_recommendations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    summary = user_summary(db, user)
    return {"recommendations": default_recommendations(summary["scores"], [])}


@router.post("/grammar-check")
def grammar_check(body: ChatRequest, user: User = Depends(get_current_user)):
    return ai_analysis.detect_grammar_issue(body.sentence).dict()