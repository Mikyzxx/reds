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


# --- GitHub / IDE ---


class GhStatusOut(BaseModel):
    connected: bool
    login: str | None = None
    avatar_url: str | None = None


class GhConnectOut(BaseModel):
    authorize_url: str


class GhRepoOut(BaseModel):
    full_name: str
    name: str
    owner: str
    private: bool
    default_branch: str
    pushed_at: datetime | None = None
    description: str | None = None


class GhBranchOut(BaseModel):
    name: str
    sha: str


class GhTreeEntryOut(BaseModel):
    path: str
    type: str  # "blob" | "tree"
    size: int | None = None
    sha: str


class GhTreeOut(BaseModel):
    head_sha: str
    truncated: bool = False
    entries: list[GhTreeEntryOut]


class GhFileOut(BaseModel):
    path: str
    sha: str
    size: int
    is_binary: bool = False
    is_image: bool = False
    too_large: bool = False
    content: str | None = None  # texto plano; base64 si is_image


class GhCommitFileIn(BaseModel):
    path: str = Field(min_length=1, max_length=512)
    content: str


class GhCommitIn(BaseModel):
    branch: str = Field(min_length=1, max_length=255)
    expected_head_sha: str = Field(min_length=7, max_length=64)
    message: str = Field(min_length=1, max_length=2000)
    files: list[GhCommitFileIn] = Field(min_length=1, max_length=100)


class GhCommitOut(BaseModel):
    new_head_sha: str
    commit_url: str


class GhPullFileOut(BaseModel):
    filename: str
    status: str  # added | modified | removed | renamed
    previous_filename: str | None = None


class GhPullOut(BaseModel):
    up_to_date: bool
    head_sha: str
    full_refresh: bool = False
    files: list[GhPullFileOut] = []


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


# --- Chat de sala ---


class ChatAttachmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=255)
    size: int = Field(ge=0, le=20 * 1024 * 1024)
    mime: str = Field(min_length=1, max_length=128)


class ChatMessageIn(BaseModel):
    body: str = Field(default="", max_length=2000)
    attachment: ChatAttachmentIn | None = None


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    user_id: int
    body: str
    attachment_name: str | None = None
    attachment_url: str | None = None
    attachment_size: int | None = None
    attachment_mime: str | None = None
    created_at: datetime
    user: UserOut


class ChatUploadOut(BaseModel):
    name: str
    url: str
    size: int
    mime: str


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
