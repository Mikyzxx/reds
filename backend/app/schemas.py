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
