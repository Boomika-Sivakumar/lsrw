"""Practice routes for Listening / Speaking / Reading / Writing plus
AI conversation, mock interview and presentation practice."""
import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai import analysis as ai_analysis
from app.ai.assessment_service import default_recommendations, upsert_mistake
from app.ai.content import conversation_turn, generate_topics
from app.ai.speech_service import transcribe_audio
from app.auth.deps import require_role
from app.data.banks import LISTENING_SCRIPTS, MOCK_INTERVIEW_QUESTIONS, PRESENTATION_TOPICS, READING_PASSAGES
from app.database.db import get_db
from app.models.assessment import SkillScore
from app.models.practice import Conversation, Interview, Mistake, PracticeSession, Presentation, Recommendation
from app.models.user import User
from app.schemas.api import ConversationRequest, InterviewAnswerRequest, InterviewStartRequest, PracticeRequest, PresentationRequest
from app.services.scoring import record_progress_snapshot, record_skill_scores

router = APIRouter(prefix="/api/practice", tags=["practice"])

student_guard = require_role("student")


def _store_session(db, student_id, skill, result, topic="", difficulty="", mode="practice", duration_ms=0):
    ps = PracticeSession(
        student_id=student_id,
        skill=skill,
        topic=topic,
        difficulty=difficulty,
        mode=mode,
        status="completed",
        duration_ms=duration_ms,
        score=result.get("overall"),
        result=result,
    )
    db.add(ps)
    db.flush()
    return ps


def _record_result(db, student_id, skill, result, source="practice", source_id=None):
    scores = {k: v for k, v in (result.get("scores") or {}).items()}
    # Map common analysis keys into platform skills.
    mapping = {
        "grammar": "grammar", "vocabulary": "vocabulary", "pronunciation": "pronunciation",
        "fluency": "fluency", "confidence": "confidence", "comprehension": "comprehension",
        "clarity": "comprehension", "accuracy": "comprehension",
    }
    platform = {}
    if skill == "listening":
        platform["listening"] = result.get("overall", 0)
    elif skill == "speaking":
        platform["speaking"] = result.get("overall", 0)
    elif skill == "reading":
        platform["reading"] = result.get("overall", 0)
    elif skill == "writing":
        platform["writing"] = result.get("overall", 0)
    for k, v in scores.items():
        target = mapping.get(k)
        if target:
            platform[target] = v
    record_skill_scores(db, student_id, source, platform, source_id=source_id)
    record_progress_snapshot(db, student_id, platform, activities=1)
    return platform


def _persist_feedback(db, student_id, result):
    for m in (result.get("mistakes") or []):
        upsert_mistake(db, student_id, m.get("category", "grammar"), m.get("text", ""), m.get("corrected_text", ""), m.get("explanation", ""))
    for r in (result.get("recommendations") or []):
        db.add(Recommendation(student_id=student_id, category="practice", title=r[:120], detail=r, source="ai"))


@router.post("/listening")
def practice_listening(body: PracticeRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    if body.mode == "generate":
        scripts = [
            {"title": s["title"], "script": s["script"], "questions": s["questions"]}
            for s in LISTENING_SCRIPTS
        ]
        return {"content": scripts}

    # Submit answers -> evaluate
    correct = total = 0
    details = []
    script = body.topic or ""
    refs = [s for s in LISTENING_SCRIPTS if s["title"].lower() == script.lower()]
    if refs:
        qs = refs[0]["questions"]
        for item in body.answers:
            expected = item.get("expected", "")
            actual = (item.get("answer") or "").strip().lower()
            ok = bool(expected) and any(p.strip().lower() in actual for p in expected.split(" or ") if p.strip())
            correct += 1 if ok else 0
            total += 1
            details.append({"ok": ok, "question": item.get("question", ""), "answer": item.get("answer", "")})
    comprehension = round(100 * correct / max(total, 1), 1)
    scores = {"comprehension": comprehension, "listening": comprehension}
    overall = comprehension
    result = {
        "overall": overall,
        "scores": scores,
        "correct": correct,
        "total": total,
        "details": details,
        "strengths": ["Good listening comprehension"] if comprehension >= 70 else [],
        "weaknesses": ["Needs listening practice"] if comprehension < 60 else [],
        "recommendations": ["Listen to English podcasts daily."] if comprehension < 75 else ["Try harder audio material."],
        "feedback": f"You answered {correct}/{total} correctly ({comprehension}%).",
        "mistakes": [],
        "level": "Intermediate",
    }
    _store_session(db, user.id, "listening", result, topic=script, difficulty=body.difficulty, mode="practice")
    _record_result(db, user.id, "listening", result, source="listening")
    db.commit()
    return result


@router.post("/speaking")
def practice_speaking(body: PracticeRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    transcript = body.transcript or body.text
    result = ai_analysis.analyze_speaking(transcript, topic=body.topic, duration_ms=body.duration_ms)
    data = result.dict()
    ps = _store_session(db, user.id, "speaking", data, topic=body.topic, difficulty=body.difficulty, mode=body.mode, duration_ms=body.duration_ms)
    _record_result(db, user.id, "speaking", data, source="speaking", source_id=ps.id)
    _persist_feedback(db, user.id, data)
    db.commit()
    return data


@router.post("/reading")
def practice_reading(body: PracticeRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    if body.mode == "generate":
        return {
            "content": [
                {"title": p["title"], "text": p["text"], "questions": p["questions"]}
                for p in READING_PASSAGES
            ]
        }
    if body.mode == "readaloud":
        result = ai_analysis.analyze_reading(body.transcript or body.text, body.expected_text, body.duration_ms)
        data = result.dict()
        ps = _store_session(db, user.id, "reading", data, topic=body.topic, difficulty=body.difficulty, mode="readaloud")
        _record_result(db, user.id, "reading", data, source="reading", source_id=ps.id)
        db.commit()
        return data

    # Comprehension submit
    correct = total = 0
    details = []
    for item in body.answers:
        expected = (item.get("expected") or "").strip().lower()
        actual = (item.get("answer") or "").strip().lower()
        ok = False
        if expected.startswith("option"):
            pass
        if item.get("type") == "mcq":
            sel = item.get("answer")
            try:
                ok = int(sel) == int(item.get("correct", -1))
            except Exception:
                ok = False
        elif item.get("type") == "truefalse":
            ok = actual == item.get("correct", "").lower()
        else:
            ok = bool(expected) and expected in actual
        correct += 1 if ok else 0
        total += 1
        details.append({"ok": ok, "question": item.get("question", "")})
    comprehension = round(100 * correct / max(total, 1), 1)
    result = {
        "overall": comprehension,
        "scores": {"comprehension": comprehension, "reading": comprehension},
        "correct": correct,
        "total": total,
        "details": details,
        "strengths": ["Good reading comprehension"] if comprehension >= 70 else [],
        "weaknesses": ["Needs reading practice"] if comprehension < 60 else [],
        "recommendations": ["Read articles and summarize them daily."] if comprehension < 75 else ["Try harder passages."],
        "feedback": f"You answered {correct}/{total} correctly ({comprehension}%).",
        "mistakes": [],
        "level": "Intermediate",
    }
    _store_session(db, user.id, "reading", result, topic=body.topic, difficulty=body.difficulty)
    _record_result(db, user.id, "reading", result, source="reading")
    db.commit()
    return result


@router.post("/writing")
def practice_writing(body: PracticeRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    if body.mode == "generate":
        from app.data.banks import WRITING_PROMPTS

        return {"content": WRITING_PROMPTS}
    result = ai_analysis.analyze_writing(body.text or body.transcript, prompt=body.prompt or body.topic)
    data = result.dict()
    ps = _store_session(db, user.id, "writing", data, topic=body.topic, difficulty=body.difficulty)
    _record_result(db, user.id, "writing", data, source="writing", source_id=ps.id)
    _persist_feedback(db, user.id, data)
    db.commit()
    return data


# ---- AI conversation ----

@router.get("/topics")
def topics(skill: str = "speaking", user: User = Depends(student_guard)):
    return generate_topics(skill).dict()


@router.post("/conversation/start")
def start_conversation(body: ConversationRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    conv = Conversation(student_id=user.id, scenario=body.scenario)
    db.add(conv)
    db.flush()
    reply = conversation_turn(body.scenario, [], 0)
    conv.messages = [{"role": "ai", "text": reply.message, "ts": datetime.datetime.utcnow().isoformat()}]
    db.commit()
    db.refresh(conv)
    return {"conversation_id": conv.id, "message": reply.message, "next_step": reply.next_step}


@router.post("/conversation/{conversation_id}/turn")
def conversation_turn_route(
    conversation_id: int,
    body: ConversationRequest,
    user: User = Depends(student_guard),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.student_id == user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    turn_index = len(conv.messages or []) // 2
    conv.messages = (conv.messages or []) + [
        {"role": "user", "text": body.transcript or "", "ts": datetime.datetime.utcnow().isoformat()}
    ]
    reply = conversation_turn(conv.scenario, conv.messages, turn_index)
    conv.messages = conv.messages + [
        {"role": "ai", "text": reply.message, "ts": datetime.datetime.utcnow().isoformat()}
    ]
    if reply.next_step == "end":
        conv.status = "completed"
        conv.ended_at = datetime.datetime.utcnow()
        # Evaluate the conversation transcript.
        transcript = "\n".join(m.get("text", "") for m in conv.messages if m.get("role") == "user")
        analysis = ai_analysis.analyze_speaking(transcript, topic=conv.scenario, duration_ms=0)
        conv.report = analysis.dict()
        _record_result(db, user.id, "speaking", analysis.dict(), source="conversation", source_id=conv.id)
        _persist_feedback(db, user.id, analysis.dict())
    db.commit()
    return {"message": reply.message, "next_step": reply.next_step, "report": conv.report if conv.report else None}


@router.get("/conversation/history")
def conversation_history(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    rows = db.query(Conversation).filter(Conversation.student_id == user.id).order_by(Conversation.started_at.desc()).limit(20).all()
    return [
        {"id": c.id, "scenario": c.scenario, "status": c.status,
         "started_at": c.started_at.isoformat() if c.started_at else None,
         "report": c.report}
        for c in rows
    ]


# ---- Mock interview ----

@router.post("/interview/start")
def start_interview(body: InterviewStartRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    iv = Interview(student_id=user.id, job_role=body.job_role)
    iv.questions = [{"question": q, "order": i} for i, q in enumerate(MOCK_INTERVIEW_QUESTIONS)]
    db.add(iv)
    db.commit()
    db.refresh(iv)
    return {"interview_id": iv.id, "questions": iv.questions}


@router.post("/interview/{interview_id}/answer")
def interview_answer(
    interview_id: int,
    body: InterviewAnswerRequest,
    user: User = Depends(student_guard),
    db: Session = Depends(get_db),
):
    iv = db.query(Interview).filter(Interview.id == interview_id, Interview.student_id == user.id).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
    transcript = body.transcript
    analysis = ai_analysis.analyze_speaking(transcript, topic=body.question, duration_ms=body.duration_ms)
    iv.answers = (iv.answers or []) + [
        {"question": body.question, "transcript": transcript, "score": analysis.overall,
         "scores": analysis.scores, "mistakes": [m.dict() for m in analysis.mistakes]}
    ]
    if len(iv.answers) >= len(iv.questions or []):
        iv.status = "completed"
        iv.ended_at = datetime.datetime.utcnow()
        iv.report = _interview_report(iv)
        _record_result(db, user.id, "speaking", iv.report, source="interview", source_id=iv.id)
        _persist_feedback(db, user.id, iv.report)
    db.commit()
    return {"analysis": analysis.dict(), "remaining": max(0, len(iv.questions or []) - len(iv.answers)), "report": iv.report if iv.report else None}


def _interview_report(iv: Interview) -> dict:
    answers = iv.answers or []
    if not answers:
        return {}
    scores = {}
    for key in ("grammar", "vocabulary", "pronunciation", "fluency", "confidence"):
        vals = [a["scores"].get(key) for a in answers if a["scores"].get(key) is not None]
        scores[key] = round(sum(vals) / len(vals), 1) if vals else 0
    relevance = round(sum(a["score"] for a in answers) / len(answers), 1)
    overall = round((sum(scores.values()) + relevance) / (len(scores) + 1), 1)
    return {
        "overall": overall,
        "scores": {**scores, "relevance": relevance, "communication_quality": overall},
        "answers": [
            {"question": a["question"], "transcript": a["transcript"], "score": a["score"]}
            for a in answers
        ],
        "strengths": [f"Strong {k}" for k, v in scores.items() if v >= 75],
        "weaknesses": [f"{k.replace('_', ' ').title()} needs work" for k, v in scores.items() if v < 60],
        "recommendations": ["Practice STAR answers for behavior questions.", "Record and review your mock interviews."],
        "mistakes": [],
        "feedback": f"Interview completed. Overall score: {overall}.",
    }


@router.get("/interview/history")
def interview_history(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    rows = db.query(Interview).filter(Interview.student_id == user.id).order_by(Interview.started_at.desc()).limit(20).all()
    return [
        {"id": i.id, "job_role": i.job_role, "status": i.status,
         "started_at": i.started_at.isoformat() if i.started_at else None,
         "report": i.report}
        for i in rows
    ]


# ---- Presentation ----

@router.post("/presentation")
def practice_presentation(body: PresentationRequest, user: User = Depends(student_guard), db: Session = Depends(get_db)):
    transcript = body.transcript
    result = ai_analysis.analyze_speaking(transcript, topic=body.topic, duration_ms=body.duration_seconds * 1000)
    data = result.dict()
    data["presentation_score"] = data["overall"]
    data["structure"] = _structure_score(transcript)
    data["delivery"] = data["scores"].get("fluency", 0)
    p = Presentation(
        student_id=user.id, topic=body.topic, duration_seconds=body.duration_seconds,
        difficulty=body.difficulty, status="completed", transcript=transcript, report=data,
    )
    db.add(p)
    db.flush()
    _record_result(db, user.id, "speaking", data, source="presentation", source_id=p.id)
    _persist_feedback(db, user.id, data)
    db.commit()
    return data


def _structure_score(transcript: str) -> float:
    t = (transcript or "").lower()
    signals = ["first", "second", "third", "finally", "in conclusion", "to summarize", "firstly", "next", "then", "lastly"]
    found = sum(1 for s in signals if s in t)
    return round(min(100, 40 + found * 10), 1)


@router.get("/presentation/topics")
def presentation_topics(user: User = Depends(student_guard)):
    return {"topics": PRESENTATION_TOPICS}


@router.get("/presentation/history")
def presentation_history(user: User = Depends(student_guard), db: Session = Depends(get_db)):
    rows = db.query(Presentation).filter(Presentation.student_id == user.id).order_by(Presentation.started_at.desc()).limit(20).all()
    return [
        {"id": p.id, "topic": p.topic, "duration_seconds": p.duration_seconds,
         "started_at": p.started_at.isoformat() if p.started_at else None,
         "report": p.report}
        for p in rows
    ]