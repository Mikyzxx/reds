from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401 — registra los modelos en Base.metadata
from . import signaling
from .config import AVATAR_DIR, CORS_ORIGINS
from .database import Base, SessionLocal, engine
from .routers import auth, github, groups, tasks, users
from .seed import seed


AVATAR_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="NEXA API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.(ngrok(-free)?\.(app|dev|io)|vercel\.app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(github.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(tasks.router)
app.include_router(signaling.router)
app.mount("/api/avatars", StaticFiles(directory=AVATAR_DIR), name="avatars")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "nexa-api"}  
