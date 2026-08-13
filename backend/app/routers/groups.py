import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..signaling import room_manager

router = APIRouter(prefix="/api/groups", tags=["groups"])


def slugify(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "grupo"


def to_group_out(group: models.Group, current_user_id: int) -> schemas.GroupOut:
    return schemas.GroupOut(
        id=group.id,
        name=group.name,
        slug=group.slug,
        description=group.description,
        created_by=group.created_by,
        created_at=group.created_at,
        members=[schemas.UserOut.model_validate(m.user) for m in group.members],
        is_member=any(m.user_id == current_user_id for m in group.members),
        active_call_count=room_manager.participant_count(group.id),
    )


@router.get("", response_model=list[schemas.GroupOut])
def list_groups(
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    groups = db.scalars(
        select(models.Group)
        .options(selectinload(models.Group.members).selectinload(models.GroupMember.user))
        .order_by(models.Group.created_at)
    ).all()
    return [to_group_out(g, current.id) for g in groups]


@router.post("", response_model=schemas.GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    body: schemas.GroupIn,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio")

    base_slug = slugify(name)
    slug = base_slug
    n = 2
    while db.scalar(select(models.Group).where(models.Group.slug == slug)) is not None:
        slug = f"{base_slug}-{n}"
        n += 1

    group = models.Group(
        name=name, slug=slug, description=body.description.strip(), created_by=current.id
    )
    db.add(group)
    db.flush()
    db.add(models.GroupMember(group_id=group.id, user_id=current.id))
    db.commit()
    db.refresh(group)
    return to_group_out(group, current.id)


def _get_group(db: Session, group_id: int) -> models.Group:
    group = db.get(models.Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return group


@router.post("/{group_id}/join", response_model=schemas.GroupOut)
def join_group(
    group_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    group = _get_group(db, group_id)
    exists = db.scalar(
        select(models.GroupMember).where(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == current.id,
        )
    )
    if exists is None:
        db.add(models.GroupMember(group_id=group_id, user_id=current.id))
        db.commit()
    db.refresh(group)
    return to_group_out(group, current.id)


@router.post("/{group_id}/leave", response_model=schemas.GroupOut)
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    group = _get_group(db, group_id)
    membership = db.scalar(
        select(models.GroupMember).where(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == current.id,
        )
    )
    if membership is not None:
        db.delete(membership)
        db.commit()
    db.refresh(group)
    return to_group_out(group, current.id)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    group = _get_group(db, group_id)
    if group.created_by != current.id:
        raise HTTPException(status_code=403, detail="Solo quien creó el grupo puede borrarlo")
    db.delete(group)
    db.commit()
