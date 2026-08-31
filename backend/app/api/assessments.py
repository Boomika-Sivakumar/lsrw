"""Assessment routes: create, get, submit, report."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai import analysis as ai_analysis
from app.ai.assessment_service import (
    build_learning_path,
    compute_overall,
    default_recommendations,
    detect_level,
    strengths_and_weaknesses,
    upsert_mistake,
)
from app.ai.speech_service import transcribe_audio
from app.data.banks import LISTENING_SCRIPTS, READING_PASSAGES, SPEAKING_TOPICS, WRITING_PROMPTS
from app.auth.deps import get_current_user, require_role
from app.database.db import get_db
from app.models.assessment import Assessment, AssessmentAnswer, AssessmentQuestion
from app.models.practice import LearningPath, Recommendation
from app.models.user import User
from app.schemas.api import AssessmentSubmitRequest
from app.services.scoring import record_progress_snapshot, record_skill_scores

router = APIRouter(prefix="/api/assessments", tags=["assessments"])

student_guard = require_role("student")


def _answer_matches(actual: str, expected: str) -> bool:
    a = (actual or "").strip().lower()
    e = (expected or "").strip().lower()
    if not a:
        return False
    # Accept if the expected answer appears in the actual answer (fuzzy match).
    return any(part.strip() in a for part in e.split(" or ") if part.strip())


def _build_assessment(db: Session, student: User, kind: str) -> Assessment:
    a = Assessment(student_id=student.id, title="Final LSRW Assessment" if kind == "final" else "Initial LSRW Assessment", kind=kind)
    db.add(a)
    db.flush()

    # Listening
    for script in LISTENING_SCRIPTS:
        a.questions.append(
            AssessmentQuestion(
                assessment_id=a.id, skill="listening", type="listening",
                prompt=script["title"], passage=script["script"],
                reference_answer="\n".join(q["answer"] for q in script["questions"]),
                order_no=len(a.questions),
            )
        )

    # Reading
    for passage in READING_PASSAGES:
        for q in passage["questions"]:
            a.questions.append(
                AssessmentQuestion(
                    assessment_id=a.id, skill="reading", type=q["type"],
                    prompt=q["q"], passage=passage["text"],
                    options=q.get("options", []), correct_answer=str(q.get("answer", "")),
                    order_no=len(a.questions),
                )
            )

    # Writing
    for prompt in WRITING_PROMPTS:
        a.questions.append(
            AssessmentQuestion(
                assessment_id=a.id, skill="writing", type="writing",
                prompt=prompt["prompt"], order_no=len(a.questions),
            )
        )

    # Speaking
    for topic in SPEAKING_TOPICS:
        a.questions.append(
            AssessmentQuestion(
                assessment_id=a.id, skill="speaking", type="speaking",
                prompt=topic["topic"], order_no=len(a.questions),
            )
        )

    db.commit()
    db.refresh(a)
    return a


@router.post("")
def create_assessment(
    kind: str = "initial",
    user: User = Depends(student_guard),
    db: Session = Depends(get_db),
):
    # Only allow creating an assessment if none is in progress for this student.
    existing = (
        db.query(Assessment)
        .filter(Assessment.student_id == user.id, Assessment.status == "in_progress")
        .first()
    )
    if existing:
        return {"assessment_id": existing.id, "detail": "An assessment is already in progress."}
    a = _build_assessment(db, user, kind)
    return {"assessment_id": a.id}


@router.get("")
def list_assessments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Assessment)
    if user.role == "student":
        q = q.filter(Assessment.student_id == user.id)
    rows = q.order_by(Assessment.started_at.desc()).limit(100).all()
    return [
        {
            "id": a.id, "title": a.title, "kind": a.kind, "status": a.status,
            "overall_score": a.overall_score, "level": a.level,
            "started_at": a.started_at.isoformat() if a.started_at else None,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        }
        for a in rows
    ]


@router.get("/{assessment_id}")
def get_assessment(
    assessment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if user.role == "student" and a.student_id != user.id:
        raise HTTPException(status_code=403, detail="Not your assessment")
    return {
        "id": a.id,
        "title": a.title,
        "kind": a.kind,
        "status": a.status,
        "questions": [
            {
                "id": q.id, "skill": q.skill, "type": q.type, "prompt": q.prompt,
                "passage": q.passage, "options": q.options, "order_no": q.order_no,
            }
            for q in a.questions
        ],
    }


@router.post("/{assessment_id}/submit")
def submit_assessment(
    assessment_id: int,
    body: AssessmentSubmitRequest,
    user: User = Depends(student_guard),
    db: Session = Depends(get_db),
):
    a = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not a or a.student_id != user.id:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if a.status != "in_progress":
        raise HTTPException(status_code=400, detail="Assessment already submitted")

    # Map answers by question id.
    answers = {str(x.get("question_id")): x for x in body.answers if x.get("question_id")}

    skill_scores = {}
    section_feedback = {}
    all_mistakes = []

    for q in a.questions:
        ans = answers.get(str(q.id), {})
        actual = ans.get("text", "") or ""
        answer_row = AssessmentAnswer(
            question_id=q.id,
            student_id=user.id,
            answer_text=actual,
            duration_ms=ans.get("duration_ms", 0),
        )
        db.add(answer_row)
        db.flush()

        if q.skill == "listening":
            refs = (q.reference_answer or "").split("\n")
            matched = sum(1 for r in refs if _answer_matches(actual, r))
            score = round(100 * matched / max(len(refs), 1), 1)
            answer_row.score = score
            answer_row.is_correct = "true" if score == 100 else ("partial" if score > 0 else "false")
            skill_scores.setdefault("listening", []).append(score)

        elif q.skill == "reading":
            if q.type == "mcq":
                try:
                    correct = int(q.correct_answer)
                    selected = int(actual) if actual.isdigit() else (int(actual) if actual in q.options else -1)
                except Exception:
                    correct, selected = -1, -1
                score = 100.0 if selected == correct else 0.0
            elif q.type == "truefalse":
                score = 100.0 if actual.strip().lower() == q.correct_answer.strip().lower() else 0.0
            else:
                score = 100.0 if _answer_matches(actual, q.correct_answer) else 0.0
            answer_row.score = score
            answer_row.is_correct = "true" if score == 100 else "false"
            skill_scores.setdefault("reading", []).append(score)

        elif q.skill == "writing":
            w = ai_analysis.analyze_writing(actual, prompt=q.prompt)
            answer_row.score = w.overall
            answer_row.feedback = w.dict()
            skill_scores.setdefault("writing", []).append(w.overall)
            section_feedback["writing"] = w.dict()
            for m in w.mistakes:
                all_mistakes.append({"category": "writing", "text": m.text, "corrected_text": m.corrected_text, "explanation": m.explanation})

        elif q.skill == "speaking":
            # Transcript is captured client-side (Web Speech API) and sent as text.
            # A real STT provider could transcribe `audio_bytes` here instead.
            sp = ai_analysis.analyze_speaking(actual, topic=q.prompt, duration_ms=ans.get("duration_ms", 0))
            answer_row.score = sp.overall
            answer_row.feedback = sp.dict()
            skill_scores.setdefault("speaking", []).append(sp.overall)
            section_feedback["speaking"] = sp.dict()
            for m in sp.mistakes:
                all_mistakes.append({"category": m.category, "text": m.text, "corrected_text": m.corrected_text, "explanation": m.explanation})

    def section(scores_key):
        vals = skill_scores.get(scores_key, [])
        return round(sum(vals) / len(vals), 1) if vals else None

    scores = {
        "listening": section("listening"),
        "reading": section("reading"),
        "writing": section("writing"),
        "speaking": section("speaking"),
    }
    if section_feedback.get("speaking"):
        for k in ("grammar", "vocabulary", "pronunciation", "fluency", "confidence"):
            scores[k] = section_feedback["speaking"]["scores"].get(k)
    if section_feedback.get("writing"):
        for k in ("grammar", "vocabulary"):
            scores[k] = section_feedback["writing"]["scores"].get(k)
    scores = {k: v for k, v in scores.items() if v is not None}

    overall = compute_overall(scores)
    level = detect_level(scores)
    strengths, weaknesses = strengths_and_weaknesses(scores)
    recs = default_recommendations(scores, all_mistakes)

    a.status = "scored"
    a.submitted_at = __import__("datetime").datetime.utcnow()
    a.overall_score = overall
    a.level = level
    a.scores = scores
    a.strengths = strengths
    a.weaknesses = weaknesses
    a.recommendations = [r["title"] for r in recs]
    a.summary = (
        f"Overall communication score: {overall} (Level: {level}). "
        f"Strengths: {', '.join(strengths) if strengths else 'none recorded'}. "
        f"Weaknesses: {', '.join(weaknesses) if weaknesses else 'none recorded'}."
    )

    # Persist mistakes
    for m in all_mistakes:
        upsert_mistake(db, user.id, m["category"], m["text"], m.get("corrected_text", ""), m.get("explanation", ""))

    # Persist recommendations
    for r in recs:
        db.add(Recommendation(student_id=user.id, category=r["category"], title=r["title"], detail=r["detail"], activity=r["activity"], source="assessment"))

    # Record scores + progress + learning path
    record_skill_scores(db, user.id, "assessment", scores, source_id=a.id)
    record_progress_snapshot(db, user.id, scores, activities=1)
    profile = user.student_profile
    path = build_learning_path(scores, weaknesses, profile.goals if profile else [])
    db.add(LearningPath(student_id=user.id, weeks=path, based_on={"assessment_id": a.id, "level": level}))

    db.commit()
    return {
        "assessment_id": a.id,
        "overall": overall,
        "level": level,
        "scores": scores,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recs,
        "learning_path": path,
        "summary": a.summary,
    }


@router.get("/{assessment_id}/report")
def assessment_report(
    assessment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if user.role == "student" and a.student_id != user.id:
        raise HTTPException(status_code=403, detail="Not your assessment")
    if a.status != "scored":
        raise HTTPException(status_code=400, detail="Assessment not scored yet")
    return {
        "id": a.id,
        "title": a.title,
        "kind": a.kind,
        "overall_score": a.overall_score,
        "level": a.level,
        "scores": a.scores,
        "strengths": a.strengths,
        "weaknesses": a.weaknesses,
        "mistakes": a.mistakes,
        "recommendations": a.recommendations,
        "summary": a.summary,
        "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
    }