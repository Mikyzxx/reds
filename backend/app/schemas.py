from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    display_name: str
    initials: str
    avatar_url: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=128)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class GroupIn(BaseModel):
    name: str
    description: str = ""


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str
    created_by: int
    created_at: datetime
    members: list[UserOut] = []
    is_member: bool = False
    active_call_count: int = 0


# Columnas del kanban y prioridades; el frontend usa estos mismos literales.
TASK_STATUSES = ("pendiente", "en_progreso", "en_prueba", "terminado")
TASK_PRIORITIES = ("alta", "media", "baja")


class TaskIn(BaseModel):
    group_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    status: str = "pendiente"
    priority: str = "media"
    assignee_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    priority: str | None = None
    assignee_id: int | None = None


class TaskMove(BaseModel):
    status: str
    position: int = 0


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    title: str
    description: str
    status: str
    priority: str
    assignee_id: int | None = None
    assignee: UserOut | None = None
    created_by: int
    position: int
    created_at: datetime
    updated_at: datetime
