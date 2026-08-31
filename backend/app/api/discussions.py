"""Group discussion REST routes."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.ai.base import get_provider_info
from app.auth.deps import get_current_user, require_role
from app.core.config import settings
from app.database.db import get_db
from app.models.discussion import DiscussionAnalysis, DiscussionParticipant, GroupDiscussion, SpeakerSegment
from app.models.user import User
from app.schemas.api import DiscussionCreateRequest, DiscussionJoinRequest
from app.services import discussion as ds
from app.services.report import discussion_report_payload

router = APIRouter(prefix="/api/discussions", tags=["discussions"])

teacher_guard = require_role("teacher")
student_guard = require_role("student")


@router.post("")
def create_discussion(body: DiscussionCreateRequest, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    d = ds.create_discussion(db, teacher, body.dict())
    return d.public_dict


@router.get("")
def list_discussions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(GroupDiscussion)
    if user.role == "teacher":
        q = q.filter(GroupDiscussion.teacher_id == user.id)
    rows = q.order_by(GroupDiscussion.created_at.desc()).limit(50).all()
    out = []
    for d in rows:
        item = d.public_dict
        item["participant_count"] = len([p for p in d.participants if p.role != "moderator"])
        item["moderator_message"] = ds.moderator_message("start", d.topic, d.duration_seconds)
        out.append(item)
    return out


@router.get("/{discussion_id}")
def get_discussion(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.query(GroupDiscussion).filter(GroupDiscussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Discussion not found")
    if user.role == "teacher" and d.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your discussion")
    item = d.public_dict
    item["participants"] = [
        {
            "id": p.id, "user_id": p.student.user_id or str(p.student.id), "full_name": p.student.full_name,
            "role": p.role, "connected": p.connected,
            "joined_at": p.joined_at.isoformat() if p.joined_at else None,
        }
        for p in d.participants
    ]
    item["is_joined"] = any(p.student_id == user.id for p in d.participants) if user.role == "student" else True
    item["moderator_message"] = ds.moderator_message("start", d.topic, d.duration_seconds)
    return item


@router.post("/join")
def join_discussion(body: DiscussionJoinRequest, student: User = Depends(student_guard), db: Session = Depends(get_db)):
    try:
        d = ds.join_discussion(db, student, body.session_code, body.consent_recording)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.refresh(d)
    item = d.public_dict
    item["participants"] = [{"user_id": p.student.user_id or str(p.student.id), "full_name": p.student.full_name} for p in d.participants]
    return item


@router.post("/{discussion_id}/start")
def start_discussion(discussion_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    d = _get_discussion_for_teacher(db, discussion_id, teacher)
    try:
        ds.start_discussion(db, d)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    msg = ds.moderator_interjection(db, d, "start")
    db.commit()
    return {"status": d.status, "moderator_message": msg}


@router.post("/{discussion_id}/pause")
def pause_discussion(discussion_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    d = _get_discussion_for_teacher(db, discussion_id, teacher)
    try:
        ds.transition(db, d, "PAUSED")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    msg = ds.moderator_interjection(db, d, "pause")
    db.commit()
    return {"status": d.status, "moderator_message": msg}


@router.post("/{discussion_id}/resume")
def resume_discussion(discussion_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    d = _get_discussion_for_teacher(db, discussion_id, teacher)
    try:
        ds.transition(db, d, "ACTIVE")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    return {"status": d.status}


@router.post("/{discussion_id}/end")
def end_discussion(discussion_id: int, teacher: User = Depends(teacher_guard), db: Session = Depends(get_db)):
    d = _get_discussion_for_teacher(db, discussion_id, teacher)
    try:
        ds.transition(db, d, "ENDED")
        ds.transition(db, d, "ANALYZING")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    ds.analyze_discussion(db, d)
    ds.transition(db, d, "COMPLETED")
    db.commit()
    return {"status": d.status}


@router.get("/{discussion_id}/transcript")
def discussion_transcript(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.query(GroupDiscussion).filter(GroupDiscussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Discussion not found")
    segments = (
        db.query(SpeakerSegment)
        .filter(SpeakerSegment.discussion_id == discussion_id)
        .order_by(SpeakerSegment.start_time.asc())
        .all()
    )
    return {
        "transcript": [
            {"speaker": s.user_id, "text": s.text, "start_time": s.start_time, "end_time": s.end_time,
             "is_interruption": s.is_interruption, "interrupted_speaker": s.interrupted_user_id}
            for s in segments
        ]
    }


@router.get("/{discussion_id}/participants")
def discussion_participants(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.query(GroupDiscussion).filter(GroupDiscussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Discussion not found")
    rows = db.query(DiscussionParticipant).filter(DiscussionParticipant.discussion_id == discussion_id).all()
    return [
        {"user_id": p.student.user_id or str(p.student.id), "full_name": p.student.full_name,
         "role": p.role, "connected": p.connected}
        for p in rows
    ]


@router.get("/{discussion_id}/report")
def discussion_report(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return discussion_report_payload(db, discussion_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{discussion_id}/leaderboard")
def discussion_leaderboard(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.query(GroupDiscussion).filter(GroupDiscussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Discussion not found")
    analysis = db.query(DiscussionAnalysis).filter(DiscussionAnalysis.discussion_id == discussion_id).first()
    if not analysis or not analysis.individual_reports:
        return {"leaderboard": [], "enabled": True}
    reps = analysis.individual_reports
    board = {
        "best_communicator": max(reps.items(), key=lambda kv: kv[1]["speaking"])[0],
        "best_listener": max(reps.items(), key=lambda kv: kv[1]["active_listening"])[0],
        "best_idea_contributor": max(reps.items(), key=lambda kv: kv[1]["idea_contribution"])[0],
        "most_active": max(reps.items(), key=lambda kv: kv[1]["participation"])[0],
        "overall": max(reps.items(), key=lambda kv: (kv[1]["speaking"] + kv[1]["active_listening"] + kv[1]["participation"]) / 3)[0],
    }
    return {"leaderboard": board, "enabled": True}


@router.post("/{discussion_id}/recap")
def generate_recap(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = _get_discussion_for_participant(db, discussion_id, user)
    try:
        return ds.generate_recap(db, d)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{discussion_id}/recap")
def get_recap(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = _get_discussion_for_participant(db, discussion_id, user)
    return d.recap or {}


@router.post("/{discussion_id}/recording")
async def upload_recording(
    discussion_id: int,
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    d = _get_discussion_for_participant(db, discussion_id, user)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Recording exceeds the upload limit")
    d = ds.save_recording(db, d, file.filename or "recording.webm", data, file.content_type or "video/webm")
    return {
        "name": d.recording_name,
        "size": d.recording_size,
        "uploaded_at": d.recording_uploaded_at.isoformat() if d.recording_uploaded_at else None,
        "download_url": f"/api/discussions/{d.id}/recording/file",
    }


@router.get("/{discussion_id}/recording")
def get_recording(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = _get_discussion_for_participant(db, discussion_id, user)
    if not d.recording_path:
        raise HTTPException(status_code=404, detail="No recording uploaded yet")
    return {
        "name": d.recording_name,
        "size": d.recording_size,
        "uploaded_at": d.recording_uploaded_at.isoformat() if d.recording_uploaded_at else None,
        "download_url": f"/api/discussions/{d.id}/recording/file",
    }


@router.get("/{discussion_id}/recording/file")
def download_recording(discussion_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = _get_discussion_for_participant(db, discussion_id, user)
    if not d.recording_path:
        raise HTTPException(status_code=404, detail="No recording uploaded yet")
    from pathlib import Path

    path = Path(d.recording_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Recording file missing")
    return FileResponse(path, media_type="application/octet-stream", filename=d.recording_name or path.name)


def _get_discussion_for_participant(db: Session, discussion_id: int, user: User) -> GroupDiscussion:
    d = db.query(GroupDiscussion).filter(GroupDiscussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Discussion not found")
    if user.role == "teacher" and d.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your discussion")
    return d


def _get_discussion_for_teacher(db: Session, discussion_id: int, teacher: User) -> GroupDiscussion:
    d = db.query(GroupDiscussion).filter(GroupDiscussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Discussion not found")
    if d.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not your discussion")
    return d