"""WebSocket connection manager for real-time discussion events.

Each discussion gets a room. Clients connect with the discussion code and a
token; the manager broadcasts events (participant joined/left, speech segment,
speaker change, timer, moderator message, state change) to the room and can
target individual users (WebRTC signaling).
"""
import asyncio
import json
from typing import Dict, Set, Tuple

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # room_key (discussion code) -> set of websockets
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # room_key -> {user_key: websocket} for targeted signaling
        self.user_sockets: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, room: str, ws: WebSocket, user_key: str = ""):
        await ws.accept()
        self.rooms.setdefault(room, set()).add(ws)
        if user_key:
            self.user_sockets.setdefault(room, {})[user_key] = ws

    def disconnect(self, room: str, ws: WebSocket, user_key: str = ""):
        if room in self.rooms:
            self.rooms[room].discard(ws)
            if not self.rooms[room]:
                del self.rooms[room]
        if room in self.user_sockets and user_key:
            self.user_sockets[room].pop(user_key, None)
            if not self.user_sockets[room]:
                del self.user_sockets[room]

    async def send_to_user(self, room: str, user_key: str, message: dict) -> bool:
        data = json.dumps(message, default=str)
        ws = self.user_sockets.get(room, {}).get(user_key)
        if not ws:
            return False
        try:
            await ws.send_text(data)
            return True
        except Exception:
            self.disconnect(room, ws, user_key)
            return False

    async def send_to_room(self, room: str, message: dict):
        data = json.dumps(message, default=str)
        if room not in self.rooms:
            return
        dead = []
        for ws in list(self.rooms[room]):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(room, ws)

    async def broadcast(self, message: dict):
        data = json.dumps(message, default=str)
        for room in list(self.rooms.keys()):
            dead = []
            for ws in list(self.rooms[room]):
                try:
                    await ws.send_text(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(room, ws)


manager = ConnectionManager()