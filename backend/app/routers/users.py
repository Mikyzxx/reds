import io
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..config import ALLOWED_AVATAR_TYPES, MAX_AVATAR_BYTES
from ..database import get_db
from ..storage import storage

router = APIRouter(prefix="/api/users", tags=["users"])

# Servido de avatares (sin prefijo; reemplaza al antiguo mount de StaticFiles
# para que local y s3 pasen por el mismo código)
avatars_router = APIRouter(tags=["users"])

AVATAR_MAX_DIMENSION = 512
_AVATAR_FILENAME_RE = re.compile(r"^[0-9a-f]{32}\.jpg$")


@router.get("", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return db.scalars(select(models.User).order_by(models.User.display_name)).all()


def _delete_avatar_file(avatar_url: str | None) -> None:
    if not avatar_url:
        return
    filename = avatar_url.rsplit("/", 1)[-1]
    if _AVATAR_FILENAME_RE.match(filename):
        storage.delete("avatars", filename)


@avatars_router.get("/api/avatars/{filename}")
def get_avatar(filename: str):
    # Sin auth e inline, como el mount de StaticFiles al que sustituye
    if not _AVATAR_FILENAME_RE.match(filename) or not storage.exists("avatars", filename):
        raise HTTPException(status_code=404, detail="No encontrado")
    return storage.response("avatars", filename, disposition="inline")


@router.post("/me/avatar", response_model=schemas.UserOut)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de imagen no soportado (usa JPG, PNG o WEBP)",
        )

    data = file.file.read(MAX_AVATAR_BYTES + 1)
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen supera el tamaño máximo permitido (5MB)",
        )

    try:
        image = Image.open(io.BytesIO(data))
        image.verify()
        image = Image.open(io.BytesIO(data))
        image = image.convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo no es una imagen válida"
        )

    image.thumbnail((AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION))

    filename = f"{uuid.uuid4().hex}.jpg"
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    storage.save("avatars", filename, buffer.getvalue(), "image/jpeg")

    _delete_avatar_file(user.avatar_url)
    user.avatar_url = f"/api/avatars/{filename}"
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me/avatar", response_model=schemas.UserOut)
def delete_avatar(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _delete_avatar_file(user.avatar_url)
    user.avatar_url = None
    db.commit()
    db.refresh(user)
    return user
