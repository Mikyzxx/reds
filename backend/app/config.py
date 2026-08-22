import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DB_ENGINE = os.getenv("DB_ENGINE", "mysql")  # "mysql" | "postgres"
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306" if DB_ENGINE == "mysql" else "5432"))
DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "appdb")

SECRET_KEY = os.getenv("SECRET_KEY", "nexa-dev-secret")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))

if DB_ENGINE == "postgres":
    _default_url = f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    _default_url = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
    )

# Railway/Render inyectan DATABASE_URL completa; si existe, tiene prioridad
DATABASE_URL = os.getenv("DATABASE_URL", _default_url)
if DATABASE_URL.startswith("postgresql://"):
    # normaliza al driver psycopg3 (las URLs de cloud vienen sin "+psycopg")
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

# Lista separada por comas; sobreescribible con la env CORS_ORIGINS
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://reds-chi.vercel.app",
    ).split(",")
    if o.strip()
]

# Integración GitHub (OAuth App): crear en GitHub → Settings → Developer settings
# → OAuth Apps, con callback http://localhost:3000/api/github/callback
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_OAUTH_SCOPES = "repo"
# A dónde redirige el backend tras el callback OAuth (la pantalla del IDE)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Almacenamiento de archivos subidos: "local" (backend/uploads/) o "s3"
# (bucket privado, servido con redirects a URLs presignadas — ver storage.py).
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")  # "local" | "s3"
S3_BUCKET = os.getenv("S3_BUCKET", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
# Endpoint alternativo compatible con S3 (Cloudflare R2, MinIO…); vacío = AWS
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL") or None
S3_PRESIGN_EXPIRES = int(os.getenv("S3_PRESIGN_EXPIRES", "3600"))

AVATAR_DIR = Path(__file__).resolve().parent.parent / "uploads" / "avatars"
MAX_AVATAR_BYTES = 5 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Adjuntos del chat de sala (cualquier tipo, nombre uuid no adivinable)
CHAT_DIR = Path(__file__).resolve().parent.parent / "uploads" / "chat"
MAX_CHAT_FILE_BYTES = 20 * 1024 * 1024
