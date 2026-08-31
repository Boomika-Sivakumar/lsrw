"""WebSocket endpoint for real-time group discussion events.

Flow:
  client connects with ?room=<session_code>&token=<jwt>
  server accepts, marks participant connected, and relays:
    - participant events
    - speech segments (speaker identification service resolves the user)
    - moderator messages
    - discussion state changes (start/end)

Clients are authenticated with the same JWT used for REST APIs.
"""
import json

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.auth.jwt import decode_token
from app.database.db import SessionLocal
from app.models.discussion import DiscussionParticipant, GroupDiscussion
from app.models.user import User
from app.services import discussion as discussion_service
from app.websocket.manager import manager

router = APIRouter()


def _get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.websocket("/ws/discussion/{room}")
async def discussion_ws(websocket: WebSocket, room: str):
    token = websocket.query_params.get("token", "")
    payload = decode_token(token)
    user_id = payload.get("sub")

    # Authenticate via token before accepting.
    if not user_id:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            await websocket.close(code=4401)
            return
        room = room.upper().strip()
        discussion = db.query(GroupDiscussion).filter(GroupDiscussion.session_code == room).first()
        if not discussion:
            await websocket.close(code=4404)
            return

        user_key = user.user_id or str(user.id)

        # Mark participant connected
        participant = (
            db.query(DiscussionParticipant)
            .filter(DiscussionParticipant.discussion_id == discussion.id, DiscussionParticipant.student_id == user.id)
            .first()
        )
        if participant:
            participant.connected = "true"
            db.commit()

        await manager.connect(room, websocket, user_key)
        await manager.send_to_room(
            room,
            {
                "type": "participant_joined",
                "user_id": user_key,
                "full_name": user.full_name,
                "room": room,
            },
        )

        try:
            while True:
                raw = await websocket.receive_text()
                msg = json.loads(raw)
                mtype = msg.get("type", "")

                if mtype == "segment":
                    # A client sends its own speech segment tagged with its user_id.
                    speaker = msg.get("user_id") or (user.user_id or str(user.id))
                    seg = discussion_service.add_segment(
                        db,
                        discussion.id,
                        speaker,
                        msg.get("text", ""),
                        float(msg.get("start_time", 0)),
                        float(msg.get("end_time", 0)),
                    )
                    await manager.send_to_room(
                        room,
                        {
                            "type": "segment",
                            "speaker": seg.user_id,
                            "text": seg.text,
                            "start_time": seg.start_time,
                            "end_time": seg.end_time,
                            "is_interruption": seg.is_interruption,
                            "interrupted_speaker": seg.interrupted_user_id,
                            "created_at": seg.created_at.isoformat() if seg.created_at else None,
                        },
                    )

                elif mtype == "speaking":
                    await manager.send_to_room(
                        room,
                        {"type": "speaking", "user_id": msg.get("user_id") or (user.user_id or str(user.id)), "speaking": bool(msg.get("speaking"))},
                    )

                elif mtype == "chat":
                    await manager.send_to_room(
                        room,
                        {"type": "chat", "user_id": user_key, "text": msg.get("text", "")},
                    )

                elif mtype == "rtc":
                    # WebRTC signaling relay (offer / answer / ICE) to a peer.
                    target = msg.get("target", "")
                    if target:
                        await manager.send_to_user(
                            room,
                            target,
                            {
                                "type": "rtc",
                                "from": user_key,
                                "target": target,
                                "rtc": msg.get("rtc", {}),
                            },
                        )

                elif mtype == "hello":
                    # Announce media presence so peers start negotiation.
                    await manager.send_to_room(
                        room,
                        {"type": "rtc_peers", "from": user_key, "video": bool(msg.get("video"))},
                    )

                elif mtype == "moderator":
                    state = msg.get("state", "encourage")
                    text = discussion_service.moderator_interjection(db, discussion, state)
                    await manager.send_to_room(room, {"type": "moderator", "text": text, "state": state})

                elif mtype == "state":
                    # Only the teacher (discussion owner) can change state.
                    if discussion.teacher_id == user.id:
                        new_state = msg.get("status", "").upper()
                        try:
                            if new_state == "ACTIVE":
                                discussion_service.start_discussion(db, discussion)
                            else:
                                discussion_service.transition(db, discussion, new_state)
                            if new_state == "ANALYZING":
                                discussion_service.analyze_discussion(db, discussion)
                                discussion_service.transition(db, discussion, "COMPLETED")
                            db.commit()
                            await manager.send_to_room(room, {"type": "state", "status": discussion.status})
                        except ValueError as e:
                            await websocket.send_text(json.dumps({"type": "error", "detail": str(e)}))

                elif mtype == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

        except WebSocketDisconnect:
            if participant:
                participant.connected = "false"
                db.commit()
            manager.disconnect(room, websocket, user_key)
            await manager.send_to_room(
                room,
                {
                    "type": "participant_left",
                    "user_id": user_key,
                    "room": room,
                },
            )
    finally:
        db.close()