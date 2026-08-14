from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


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


def _get_task(db: Session, task_id: int, user: models.User) -> models.Task:
    task = db.get(models.Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    _require_member(db, task.group_id, user)
    return task


def _validate_status(value: str) -> str:
    if value not in schemas.TASK_STATUSES:
        raise HTTPException(status_code=422, detail=f"Estado inválido: {value}")
    return value


def _validate_priority(value: str) -> str:
    if value not in schemas.TASK_PRIORITIES:
        raise HTTPException(status_code=422, detail=f"Prioridad inválida: {value}")
    return value


def _validate_assignee(db: Session, group_id: int, assignee_id: int | None) -> None:
    if assignee_id is None:
        return
    member = db.scalar(
        select(models.GroupMember).where(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == assignee_id,
        )
    )
    if member is None:
        raise HTTPException(
            status_code=422, detail="El asignado no es miembro del grupo"
        )


def _column(db: Session, group_id: int, status_: str) -> list[models.Task]:
    return list(
        db.scalars(
            select(models.Task)
            .where(models.Task.group_id == group_id, models.Task.status == status_)
            .order_by(models.Task.position, models.Task.id)
        ).all()
    )


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(
    group_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    _require_member(db, group_id, current)
    return db.scalars(
        select(models.Task)
        .options(selectinload(models.Task.assignee))
        .where(models.Task.group_id == group_id)
        .order_by(models.Task.status, models.Task.position, models.Task.id)
    ).all()


@router.post("", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    body: schemas.TaskIn,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    _require_member(db, body.group_id, current)
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="El título es obligatorio")
    _validate_status(body.status)
    _validate_priority(body.priority)
    _validate_assignee(db, body.group_id, body.assignee_id)

    task = models.Task(
        group_id=body.group_id,
        title=title,
        description=body.description.strip(),
        status=body.status,
        priority=body.priority,
        assignee_id=body.assignee_id,
        created_by=current.id,
        position=len(_column(db, body.group_id, body.status)),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    body: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    task = _get_task(db, task_id, current)
    data = body.model_dump(exclude_unset=True)

    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            raise HTTPException(status_code=422, detail="El título es obligatorio")
        task.title = title
    if "description" in data:
        task.description = (data["description"] or "").strip()
    if "priority" in data:
        task.priority = _validate_priority(data["priority"])
    if "assignee_id" in data:
        _validate_assignee(db, task.group_id, data["assignee_id"])
        task.assignee_id = data["assignee_id"]

    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/move", response_model=schemas.TaskOut)
def move_task(
    task_id: int,
    body: schemas.TaskMove,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    task = _get_task(db, task_id, current)
    target_status = _validate_status(body.status)
    origin_status = task.status

    # Saca la tarea de su columna origen y renumera lo que queda.
    if origin_status != target_status:
        rest = [t for t in _column(db, task.group_id, origin_status) if t.id != task.id]
        for i, t in enumerate(rest):
            t.position = i
        task.status = target_status

    # Inserta en la columna destino en el índice pedido y renumera.
    column = [t for t in _column(db, task.group_id, target_status) if t.id != task.id]
    index = max(0, min(body.position, len(column)))
    column.insert(index, task)
    for i, t in enumerate(column):
        t.position = i

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    task = _get_task(db, task_id, current)
    group_id, origin_status = task.group_id, task.status
    db.delete(task)
    db.flush()
    for i, t in enumerate(_column(db, group_id, origin_status)):
        t.position = i
    db.commit()
