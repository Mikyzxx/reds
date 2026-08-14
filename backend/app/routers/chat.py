"""Chat de sala: historial persistente por grupo + adjuntos.

El envío es por REST (persistencia y validación); el tiempo real sale del
mismo POST vía el RoomManager del WebSocket de señalización.
"""

import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..auth import get_current_user
from ..config import CHAT_DIR, MAX_CHAT_FILE_BYTES
from ..database import get_db
from ..signaling import _broadcast

router = APIRouter(prefix="/api/groups", tags=["chat"])

# Servido de adjuntos (sin prefijo de grupo)
files_router = APIRouter(tags=["chat"])

_FILENAME_RE = re.compile(r"^[0-9a-f]{32}(\.[A-Za-z0-9]{1,10})?$")
_EXT_RE = re.compile(r"^[A-Za-z0-9]{1,10}$")


def _require_member(db: Session, group_id: int, user: models.User) -> models.Group:
    group = db.get(models.Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    is_member = db.scalar(
        select(models.GroupMember).where(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == user.id,
        )
    )
    if is_member is None:
        raise HTTPException(status_code=403, detail="No eres miembro de este grupo")
    return group


@router.get("/{group_id}/messages", response_model=list[schemas.ChatMessageOut])
def list_messages(
    group_id: int,
    before_id: int | None = None,
    limit: int = 50,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_member(db, group_id, current)
    query = (
        select(models.ChatMessage)
        .options(selectinload(models.ChatMessage.user))
        .where(models.ChatMessage.group_id == group_id)
    )
    if before_id is not None:
        query = query.where(models.ChatMessage.id < before_id)
    rows = db.scalars(
        query.order_by(models.ChatMessage.id.desc()).limit(min(max(limit, 1), 100))
    ).all()
    return list(reversed(rows))


@router.post(
    "/{group_id}/messages",
    response_model=schemas.ChatMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_message(
    group_id: int,
    body: schemas.ChatMessageIn,
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # async por el broadcast; las llamadas sync a BD bloquean el loop unos ms
    # por mensaje, aceptable a esta escala.
    _require_member(db, group_id, current)

    text = body.body.strip()
    attachment = body.attachment
    if not text and attachment is None:
        raise HTTPException(status_code=422, detail="Mensaje vacío")
    if attachment is not None:
        filename = attachment.url.removeprefix("/api/files/")
        if (
            not attachment.url.startswith("/api/files/")
            or not _FILENAME_RE.match(filename)
            or not (CHAT_DIR / filename).is_file()
        ):
            raise HTTPException(status_code=422, detail="Adjunto inválido")

    msg = models.ChatMessage(
        group_id=group_id,
        user_id=current.id,
        body=text,
        attachment_name=attachment.name if attachment else None,
        attachment_url=attachment.url if attachment else None,
        attachment_size=attachment.size if attachment else None,
        attachment_mime=attachment.mime if attachment else None,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    await _broadcast(
        group_id,
        {
            "type": "chat-message",
            "message": {
                "id": msg.id,
                "groupId": group_id,
                "userId": current.id,
                "displayName": current.display_name,
                "initials": current.initials,
                "avatarUrl": current.avatar_url,
                "body": msg.body,
                "attachment": (
                    {
                        "name": msg.attachment_name,
                        "url": msg.attachment_url,
                        "size": msg.attachment_size,
                        "mime": msg.attachment_mime,
                    }
                    if msg.attachment_url
                    else None
                ),
                "createdAt": msg.created_at.isoformat(),
            },
        },
        exclude=current.id,
    )
    return msg


@router.post("/{group_id}/attachments", response_model=schemas.ChatUploadOut)
def upload_attachment(
    group_id: int,
    file: UploadFile = File(...),
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_member(db, group_id, current)

    data = file.file.read(MAX_CHAT_FILE_BYTES + 1)
    if len(data) > MAX_CHAT_FILE_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera los 20MB")
    if not data:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    original = (file.filename or "archivo").strip()[:255]
    ext = original.rsplit(".", 1)[-1] if "." in original else ""
    suffix = f".{ext.lower()}" if _EXT_RE.match(ext) else ""

    # Nombre uuid no adivinable; si nadie referencia el adjunto en un mensaje
    # queda huérfano en disco (limitación aceptada).
    filename = f"{uuid.uuid4().hex}{suffix}"
    CHAT_DIR.mkdir(parents=True, exist_ok=True)
    (CHAT_DIR / filename).write_bytes(data)

    return schemas.ChatUploadOut(
        name=original,
        url=f"/api/files/{filename}",
        size=len(data),
        mime=file.content_type or "application/octet-stream",
    )


@files_router.get("/api/files/{filename}")
def get_file(filename: str):
    # Content-Disposition: attachment evita servir HTML/SVG subido inline en
    # el origen de la app (XSS almacenado); las <img> de miniaturas lo ignoran.
    if not _FILENAME_RE.match(filename):
        raise HTTPException(status_code=404, detail="No encontrado")
    path = CHAT_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="No encontrado")
    return FileResponse(
        path,
        filename=filename,
        content_disposition_type="attachment",
    )
