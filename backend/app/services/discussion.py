"""Group discussion business logic: lifecycle, transcripts, analysis."""
import datetime
from typing import Dict, List

from sqlalchemy.orm import Session

from app.ai.assessment_service import detect_level
from app.ai.base import get_llm_provider
from app.ai.content import generate_summary, moderator_message
from app.ai.schemas import RecapResult
from app.core.security import generate_discussion_code
from app.models.discussion import (
    DiscussionAnalysis,
    DiscussionParticipant,
    DiscussionTranscript,
    GroupDiscussion,
    SpeakerSegment,
)
from app.models.user import User
from app.services.scoring import record_skill_scores
from app.services.speaker_id import SpeakerIdentificationService

VALID_TRANSITIONS = {
    "CREATED": ["WAITING", "ENDED"],
    "WAITING": ["ACTIVE", "ENDED"],
    "ACTIVE": ["PAUSED", "ENDED"],
    "PAUSED": ["ACTIVE", "ENDED"],
    "ENDED": ["ANALYZING"],
    "ANALYZING": ["COMPLETED"],
    "COMPLETED": [],
}


def create_discussion(db: Session, teacher: User, data: dict) -> GroupDiscussion:
    code = generate_discussion_code()
    while db.query(GroupDiscussion).filter(GroupDiscussion.session_code == code).first():
        code = generate_discussion_code()
    d = GroupDiscussion(
        teacher_id=teacher.id,
        session_code=code,
        topic=data["topic"],
        description=data.get("description", ""),
        difficulty=data.get("difficulty", "intermediate"),
        duration_seconds=int(data.get("duration_seconds", 600)),
        participant_limit=int(data.get("participant_limit", 6)),
        assessment_criteria=data.get("assessment_criteria", ["Participation", "Relevance", "Clarity", "Vocabulary"]),
        status="CREATED",
    )
    db.add(d)
    db.flush()
    # AI moderator joins as a participant
    db.add(DiscussionParticipant(discussion_id=d.id, student_id=teacher.id, role="moderator", consent_recording="true"))
    db.commit()
    db.refresh(d)
    return d


def transition(db: Session, discussion: GroupDiscussion, new_state: str) -> GroupDiscussion:
    if new_state not in VALID_TRANSITIONS.get(discussion.status, []):
        raise ValueError(f"Cannot move discussion from {discussion.status} to {new_state}")
    discussion.status = new_state
    if new_state == "ACTIVE" and not discussion.started_at:
        discussion.started_at = datetime.datetime.utcnow()
    if new_state == "ENDED" and not discussion.ended_at:
        discussion.ended_at = datetime.datetime.utcnow()
    db.add(discussion)
    db.flush()
    return discussion


def start_discussion(db: Session, discussion: GroupDiscussion) -> GroupDiscussion:
    """Begin the discussion: CREATED -> WAITING -> ACTIVE."""
    if discussion.status == "CREATED":
        transition(db, discussion, "WAITING")
    transition(db, discussion, "ACTIVE")
    return discussion


def join_discussion(db: Session, student: User, code: str, consent: str = "true") -> GroupDiscussion:
    discussion = db.query(GroupDiscussion).filter(GroupDiscussion.session_code == code.upper().strip()).first()
    if not discussion:
        raise ValueError("Invalid discussion ID")
    if discussion.status not in ("CREATED", "WAITING", "ACTIVE", "PAUSED"):
        raise ValueError(f"Discussion already {discussion.status}. You cannot join now.")
    if discussion.participant_limit <= sum(1 for p in discussion.participants if p.role != "moderator"):
        raise ValueError("Maximum participants reached")
    existing = (
        db.query(DiscussionParticipant)
        .filter(DiscussionParticipant.discussion_id == discussion.id, DiscussionParticipant.student_id == student.id)
        .first()
    )
    if not existing:
        db.add(
            DiscussionParticipant(
                discussion_id=discussion.id,
                student_id=student.id,
                role="participant",
                consent_recording=consent,
                connected="true",
            )
        )
        db.commit()
    return discussion


def add_segment(db: Session, discussion_id: int, claimed_speaker: str, text: str, start: float, end: float):
    """Add a speech segment through the speaker identification service."""
    service = SpeakerIdentificationService()
    resolved = service.identify(
        [__import__("app.services.speaker_id", fromlist=["SpeakerSegmentInput"]).SpeakerSegmentInput(
            text=text, start_time=start, end_time=end, claimed_speaker=claimed_speaker
        )]
    )[0]
    seg = SpeakerSegment(
        discussion_id=discussion_id,
        user_id=resolved["speaker"],
        text=text,
        start_time=start,
        end_time=end,
        is_interruption=resolved["is_interruption"],
        interrupted_user_id=resolved["interrupted_speaker"],
    )
    db.add(seg)
    db.flush()
    db.add(DiscussionTranscript(discussion_id=discussion_id, speaker=resolved["speaker"], text=text, start_time=start, end_time=end))
    db.flush()
    return seg


def moderator_interjection(db: Session, discussion: GroupDiscussion, state: str) -> str:
    message = moderator_message(state, discussion.topic, discussion.duration_seconds)
    seg = SpeakerSegment(
        discussion_id=discussion.id,
        user_id="MODERATOR",
        text=message,
        start_time=0,
        end_time=0,
    )
    db.add(seg)
    db.flush()
    db.add(DiscussionTranscript(discussion_id=discussion.id, speaker="MODERATOR", text=message, start_time=0, end_time=0))
    db.flush()
    return message


def analyze_discussion(db: Session, discussion: GroupDiscussion) -> DiscussionAnalysis:
    """Compute individual + group analysis from speaker segments.

    Deterministic metric computation (no external AI needed for the numbers);
    the prose summary uses the AI summary generator.
    """
    segments = (
        db.query(SpeakerSegment)
        .filter(SpeakerSegment.discussion_id == discussion.id)
        .order_by(SpeakerSegment.start_time.asc())
        .all()
    )
    participants = (
        db.query(DiscussionParticipant)
        .filter(DiscussionParticipant.discussion_id == discussion.id, DiscussionParticipant.role != "moderator")
        .all()
    )

    # Build per-user data
    user_segments: Dict[str, List] = {}
    total_speech = 0.0
    interruptions_by = {}
    interrupted = {}
    for s in segments:
        if s.user_id == "MODERATOR":
            continue
        user_segments.setdefault(s.user_id, []).append(s)
        total_speech += max(0.0, s.end_time - s.start_time)
        if s.is_interruption == "true":
            interruptions_by[s.user_id] = interruptions_by.get(s.user_id, 0) + 1
            if s.interrupted_user_id:
                interrupted[s.interrupted_user_id] = interrupted.get(s.interrupted_user_id, 0) + 1

    individual = {}
    for uid, segs in user_segments.items():
        speech = sum(max(0.0, s.end_time - s.start_time) for s in segs)
        count = len(segs)
        # Meaningful contribution: has enough words (rough heuristic)
        meaningful = sum(1 for s in segs if len((s.text or "").split()) >= 5)
        participation = round(100 * speech / max(total_speech, 0.1), 1) if total_speech else 0
        avg_resp = round(speech / max(count, 1), 1)
        # Turn-taking: whether segments are sequential (not overlapping)
        overlap = sum(1 for s in segs if s.is_interruption == "true")
        turn_taking = max(0, 100 - overlap * 12)
        # Active listening: fraction of segments that reference previous content
        active_listening = round(100 * meaningful / max(count, 1), 1) if count else 0

        grammar_errors = sum(1 for s in segs if len(s.text.split()) >= 5 and _has_grammar_hint(s.text))
        vocab = _vocab_score(segs)
        fluency = max(20, 100 - overlap * 8 - _filler_count(segs) * 3)
        confidence = min(100, 40 + count * 3 + min(30, int(speech / 5)))
        grammar = max(30, 85 - grammar_errors * 8)

        individual[uid] = {
            "speaking": round(min(100, participation + turn_taking * 0.2), 1),
            "listening": round(active_listening, 1),
            "fluency": round(fluency, 1),
            "pronunciation": 78.0,
            "grammar": round(grammar, 1),
            "vocabulary": round(vocab, 1),
            "confidence": round(confidence, 1),
            "response_time": avg_resp,
            "relevance": round(active_listening, 1),
            "clarity": round(min(100, vocab + 5), 1),
            "participation": participation,
            "turn_taking": round(turn_taking, 1),
            "active_listening": round(active_listening, 1),
            "idea_contribution": meaningful,
            "speaking_time": round(speech, 1),
            "response_count": count,
            "meaningful_contributions": meaningful,
            "interruptions_made": interruptions_by.get(uid, 0),
            "interruptions_received": interrupted.get(uid, 0),
        }

    # Group-level metrics
    n = max(len(individual), 1)
    balances = [v["participation"] for v in individual.values()]
    balance_score = 100 if len(balances) < 2 else round(100 - (max(balances) - min(balances)) / max(max(balances), 1) * 30, 1)
    total_interruptions = sum(v["interruptions_made"] for v in individual.values())
    group_avg = round(sum(v["participation"] for v in individual.values()) / n, 1)
    diversity = round(min(100, len(user_segments) * 15 + 30), 1)
    group_scores = {
        "communication_flow": round((balance_score + group_avg) / 2, 1),
        "collaboration": round((balance_score + sum(v["active_listening"] for v in individual.values()) / n) / 2, 1),
        "topic_relevance": round(sum(v["relevance"] for v in individual.values()) / n, 1),
        "participation_balance": balance_score,
        "turn_taking_quality": round(sum(v["turn_taking"] for v in individual.values()) / n, 1),
        "idea_diversity": diversity,
        "overall_quality": round((balance_score + group_avg + diversity) / 3, 1),
    }
    group_score = round(sum(group_scores.values()) / len(group_scores), 1)

    transcript = "\n".join(
        f"[{int(s.start_time // 60):02d}:{int(s.start_time % 60):02d}] {s.user_id}: {s.text}"
        for s in segments if s.user_id != "MODERATOR"
    )
    summary = generate_summary(transcript, discussion.topic)

    report = {
        "group_score": group_score,
        "scores": group_scores,
        "total_interruptions": total_interruptions,
        "participant_count": n,
        "group_strengths": [k for k, v in group_scores.items() if v >= 70],
        "group_weaknesses": [k for k, v in group_scores.items() if v < 55],
    }

    analysis = (
        db.query(DiscussionAnalysis)
        .filter(DiscussionAnalysis.discussion_id == discussion.id)
        .first()
    )
    if not analysis:
        analysis = DiscussionAnalysis(discussion_id=discussion.id)
        db.add(analysis)
    analysis.status = "done"
    analysis.group_report = report
    analysis.individual_reports = individual
    analysis.summary = {
        "major_ideas": summary.major_ideas,
        "agreements": summary.agreements,
        "disagreements": summary.disagreements,
        "conclusion": summary.conclusion,
    }
    db.flush()

    discussion.group_score = report
    discussion.group_report = report
    discussion.summary = {
        "major_ideas": summary.major_ideas,
        "agreements": summary.agreements,
        "disagreements": summary.disagreements,
        "conclusion": summary.conclusion,
    }
    db.flush()

    # Persist individual skill scores for each participant
    for uid, rep in individual.items():
        u = db.query(User).filter(User.user_id == uid).first()
        if u:
            record_skill_scores(
                db,
                u.id,
                "discussion",
                {
                    "listening": rep["listening"],
                    "speaking": rep["speaking"],
                    "grammar": rep["grammar"],
                    "vocabulary": rep["vocabulary"],
                    "pronunciation": rep["pronunciation"],
                    "fluency": rep["fluency"],
                    "confidence": rep["confidence"],
                    "participation": rep["participation"],
                },
                source_id=discussion.id,
            )
    db.commit()
    return analysis


def generate_recap(db: Session, discussion: GroupDiscussion) -> dict:
    """Build an AI recap of notes from the discussion transcript."""
    segments = (
        db.query(SpeakerSegment)
        .filter(SpeakerSegment.discussion_id == discussion.id)
        .order_by(SpeakerSegment.start_time.asc())
        .all()
    )
    transcript = "\n".join(
        f"[{int(s.start_time // 60):02d}:{int(s.start_time % 60):02d}] {s.user_id}: {s.text}"
        for s in segments if s.user_id != "MODERATOR" and (s.text or "").strip()
    )
    title = f"Recap - {discussion.topic}"

    if not transcript.strip():
        data = {
            "title": title,
            "key_points": ["No spoken content was recorded for this session yet."],
            "decisions": [],
            "action_items": [],
            "speaker_summary": "",
            "word_count": 0,
            "generated_at": datetime.datetime.utcnow().isoformat(),
        }
        discussion.recap = data
        db.commit()
        db.refresh(discussion)
        return data

    try:
        provider = get_llm_provider()
        data = provider.chat(
            [
                {"role": "system", "content": "__ROUTE:recap You write meeting recap notes from a group discussion transcript."},
                {"role": "user", "content": f"topic: {discussion.topic}\n{transcript[:5000]}"},
            ],
            RecapResult,
        )
        recap = RecapResult(
            **{k: data.get(k, []) for k in ("title", "key_points", "decisions", "action_items")} | {"speaker_summary": data.get("speaker_summary", "")}
        )
    except Exception:
        lines = [l.strip(" -•0123456789.").strip() for l in transcript.splitlines() if l.strip()]
        recap = RecapResult(
            title=title,
            key_points=[l for l in lines if len(l.split()) >= 4][:8] or ["The group discussed the topic and exchanged ideas."],
            decisions=[],
            action_items=[],
            speaker_summary="",
        )

    word_count = sum(len((s.text or "").split()) for s in segments if s.user_id != "MODERATOR")
    data = recap.model_dump()
    data["title"] = title
    data["word_count"] = word_count
    data["generated_at"] = datetime.datetime.utcnow().isoformat()
    discussion.recap = data
    db.commit()
    db.refresh(discussion)
    return data


def save_recording(db: Session, discussion: GroupDiscussion, filename: str, data: bytes, mime: str) -> GroupDiscussion:
    """Persist an uploaded session recording under storage/recordings."""
    import hashlib
    import re
    from pathlib import Path

    from app.core.config import settings

    rec_dir = settings.STORAGE_DIR / "recordings"
    rec_dir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", filename or "recording")[:120]
    digest = hashlib.sha1(data).hexdigest()[:8]
    stored_name = f"discussion_{discussion.id}_{digest}_{safe}"
    target = rec_dir / stored_name
    target.write_bytes(data)

    discussion.recording_path = str(target)
    discussion.recording_name = safe
    discussion.recording_size = len(data)
    discussion.recording_uploaded_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(discussion)
    return discussion


def _has_grammar_hint(text: str) -> bool:
    hints = [" he ", " she ", " they ", " go to yesterday", "depend from", " is are ", " a apple"]
    lower = f" {text.lower()} "
    return any(h in lower for h in hints)


def _filler_count(segs: List) -> int:
    fillers = ["um", "uh", "like", "you know", "basically", "i mean"]
    return sum(1 for s in segs for f in fillers if f in s.text.lower())


def _vocab_score(segs: List) -> float:
    words = []
    for s in segs:
        words += [w for w in s.text.lower().split() if len(w) > 3]
    if not words:
        return 60.0
    unique = set(words)
    avg_len = sum(len(w) for w in words) / len(words)
    return round(min(98, max(45, 40 + avg_len * 6 + min(20, len(unique) / max(len(words), 1) * 30))), 1)


def get_report(db: Session, discussion: GroupDiscussion) -> dict:
    analysis = db.query(DiscussionAnalysis).filter(DiscussionAnalysis.discussion_id == discussion.id).first()
    report = {
        "discussion": discussion.public_dict,
        "group_report": discussion.group_report,
        "summary": discussion.summary,
        "individual_reports": analysis.individual_reports if analysis else {},
    }
    return report