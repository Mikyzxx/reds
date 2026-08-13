from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .auth import hash_password

DEMO_USERS = [
    {
        "email": "demo@nexa.dev",
        "username": "demo",
        "display_name": "Usuario Demo",
        "initials": "DM",
        "password": "demo1234",
    },
    {
        "email": "luis@nexa.dev",
        "username": "luis",
        "display_name": "Luis Mora",
        "initials": "LM",
        "password": "demo1234",
    },
    {
        "email": "ana@nexa.dev",
        "username": "ana",
        "display_name": "Ana Cruz",
        "initials": "AC",
        "password": "demo1234",
    },
    {
        "email": "dana@nexa.dev",
        "username": "dana",
        "display_name": "Dana Ríos",
        "initials": "DR",
        "password": "demo1234",
    },
]


def seed(db: Session) -> None:
    if db.scalar(select(models.User).limit(1)) is not None:
        return

    users = []
    for data in DEMO_USERS:
        user = models.User(
            email=data["email"],
            username=data["username"],
            display_name=data["display_name"],
            initials=data["initials"],
            password_hash=hash_password(data["password"]),
        )
        db.add(user)
        users.append(user)
    db.flush()

    group = models.Group(
        name="daily-sync",
        slug="daily-sync",
        description="Sala diaria del equipo",
        created_by=users[0].id,
    )
    db.add(group)
    db.flush()
    for user in users:
        db.add(models.GroupMember(group_id=group.id, user_id=user.id))
    db.commit()
