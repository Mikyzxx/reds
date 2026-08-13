import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _derive_initials(display_name: str) -> str:
    words = display_name.split()
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    return display_name[:2].upper()


def _derive_username(db: Session, email: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", email.split("@")[0].lower()).strip("-") or "user"
    username = base
    n = 2
    while db.scalar(select(models.User).where(models.User.username == username)) is not None:
        username = f"{base}-{n}"
        n += 1
    return username


@router.post("/login", response_model=schemas.TokenOut)
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.email == body.email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas"
        )
    return schemas.TokenOut(access_token=create_access_token(user.id), user=user)


@router.post(
    "/register", response_model=schemas.TokenOut, status_code=status.HTTP_201_CREATED
)
def register(body: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    display_name = " ".join(body.display_name.split())

    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Email inválido")
    if len(display_name) < 2:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio")
    if db.scalar(select(models.User).where(models.User.email == email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Ese email ya está registrado"
        )

    user = models.User(
        email=email,
        username=_derive_username(db, email),
        display_name=display_name,
        initials=_derive_initials(display_name),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.TokenOut(access_token=create_access_token(user.id), user=user)


@router.get("/me", response_model=schemas.UserOut)
def me(current: models.User = Depends(get_current_user)):
    return current
