"""Señalización WebRTC para llamadas de voz por grupo.

Salas en memoria: group_id -> {user_id: conexión}. El cliente que entra recibe
la lista de peers presentes y crea una offer hacia cada uno (así nunca hay
glare). El servidor solo hace relay de offer/answer/ice-candidate al `target`.
"""

import json
from dataclasses import dataclass

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from . import models
from .auth import decode_token
from .database import SessionLocal

router = APIRouter()


@dataclass
class Participant:
    ws: WebSocket
    user_id: int
    display_name: str
    initials: str
    avatar_url: str | None = None
    muted: bool = False
    cam_on: bool = False
    share_stream_id: str | None = None

    def info(self) -> dict:
        return {
            "userId": self.user_id,
            "displayName": self.display_name,
            "initials": self.initials,
            "avatarUrl": self.avatar_url,
            "muted": self.muted,
            "camOn": self.cam_on,
            "shareStreamId": self.share_stream_id,
        }


class RoomManager:
    def __init__(self) -> None:
        self.rooms: dict[int, dict[int, Participant]] = {}

    def participant_count(self, group_id: int) -> int:
        return len(self.rooms.get(group_id, {}))

    def join(self, group_id: int, participant: Participant) -> list[Participant]:
        room = self.rooms.setdefault(group_id, {})
        existing = list(room.values())
        room[participant.user_id] = participant
        return existing

    def leave(self, group_id: int, user_id: int) -> None:
        room = self.rooms.get(group_id)
        if room is not None:
            room.pop(user_id, None)
            if not room:
                self.rooms.pop(group_id, None)

    def get(self, group_id: int, user_id: int) -> Participant | None:
        return self.rooms.get(group_id, {}).get(user_id)

    def peers(self, group_id: int, exclude: int | None = None) -> list[Participant]:
        return [
            p for uid, p in self.rooms.get(group_id, {}).items() if uid != exclude
        ]


room_manager = RoomManager()


async def _send(participant: Participant, message: dict) -> None:
    if participant.ws.client_state == WebSocketState.CONNECTED:
        try:
            await participant.ws.send_text(json.dumps(message))
        except RuntimeError:
            pass


async def _broadcast(group_id: int, message: dict, exclude: int | None = None) -> None:
    for peer in room_manager.peers(group_id, exclude=exclude):
        await _send(peer, message)


@router.websocket("/ws/call/{group_id}")
async def call_ws(ws: WebSocket, group_id: int, token: str = ""):
    try:
        user_id = decode_token(token)
    except Exception:
        await ws.close(code=4401)
        return

    with SessionLocal() as db:
        user = db.get(models.User, user_id)
    if user is None:
        await ws.close(code=4401)
        return

    # una sola conexión por usuario y sala
    previous = room_manager.get(group_id, user_id)
    if previous is not None:
        await previous.ws.close(code=4409)
        room_manager.leave(group_id, user_id)

    await ws.accept()
    me = Participant(
        ws=ws,
        user_id=user.id,
        display_name=user.display_name,
        initials=user.initials,
        avatar_url=user.avatar_url,
    )
    existing = room_manager.join(group_id, me)

    await _send(me, {"type": "peers", "peers": [p.info() for p in existing]})
    await _broadcast(group_id, {"type": "peer-joined", "peer": me.info()}, exclude=user.id)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            kind = msg.get("type")
            if kind in ("offer", "answer", "ice-candidate"):
                target = room_manager.get(group_id, msg.get("target"))
                if target is not None:
                    msg["from"] = user.id
                    await _send(target, msg)
            elif kind in ("mute", "unmute"):
                me.muted = kind == "mute"
                await _broadcast(
                    group_id,
                    {"type": "peer-mute", "userId": user.id, "muted": me.muted},
                    exclude=user.id,
                )
            elif kind in ("cam-on", "cam-off"):
                me.cam_on = kind == "cam-on"
                await _broadcast(
                    group_id,
                    {"type": "peer-cam", "userId": user.id, "camOn": me.cam_on},
                    exclude=user.id,
                )
            elif kind in ("share-start", "share-stop"):
                stream_id = msg.get("streamId")
                me.share_stream_id = (
                    stream_id if kind == "share-start" and isinstance(stream_id, str) else None
                )
                await _broadcast(
                    group_id,
                    {
                        "type": "peer-share",
                        "userId": user.id,
                        "shareStreamId": me.share_stream_id,
                    },
                    exclude=user.id,
                )
    except WebSocketDisconnect:
        pass
    finally:
        # otra conexión pudo habernos reemplazado; solo salir si seguimos siendo nosotros
        if room_manager.get(group_id, user_id) is me:
            room_manager.leave(group_id, user_id)
            await _broadcast(group_id, {"type": "peer-left", "userId": user.id})
