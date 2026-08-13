import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..config import ALLOWED_AVATAR_TYPES, AVATAR_DIR, MAX_AVATAR_BYTES
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

AVATAR_MAX_DIMENSION = 512


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
    path = AVATAR_DIR / filename
    if path.is_file():
        path.unlink(missing_ok=True)


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

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    image.save(AVATAR_DIR / filename, format="JPEG", quality=85)

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
