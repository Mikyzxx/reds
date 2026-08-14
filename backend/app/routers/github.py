"""Integración GitHub del IDE: OAuth + proxy de la REST API.

El token OAuth vive cifrado en `github_accounts`; el frontend solo habla
con estos endpoints usando su JWT de NEXA.
"""

import re
from datetime import datetime, timedelta, timezone
from urllib.parse import quote, urlencode

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..config import (
    CORS_ORIGINS,
    FRONTEND_URL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_OAUTH_SCOPES,
    JWT_ALGORITHM,
    SECRET_KEY,
)
from ..database import get_db
from ..services import github_api as gh

router = APIRouter(prefix="/api/github", tags=["github"])

STATE_PURPOSE = "gh_oauth"
STATE_TTL_MINUTES = 10

# Mismos dominios que el allow_origin_regex del CORS en main.py
_ORIGIN_RE = re.compile(r"^https://[^/]+\.(ngrok(-free)?\.(app|dev|io)|vercel\.app)$")


def _safe_origin(origin: str | None) -> str | None:
    """Valida el origen que manda el frontend para el redirect post-callback."""
    if not origin:
        return None
    origin = origin.rstrip("/")
    if origin in CORS_ORIGINS or _ORIGIN_RE.match(origin):
        return origin
    return None


def _ide_redirect(origin: str | None = None, **params: str) -> RedirectResponse:
    base = origin or FRONTEND_URL
    return RedirectResponse(f"{base}/app/ide?{urlencode(params)}", status_code=302)


def _require_oauth_config() -> None:
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Falta configurar GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET en backend/.env",
        )


def _get_account(db: Session, user_id: int) -> models.GitHubAccount | None:
    return db.scalar(
        select(models.GitHubAccount).where(models.GitHubAccount.user_id == user_id)
    )


def get_github_token(
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    account = _get_account(db, current.id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub no conectado",
        )
    return gh.decrypt_token(account.encrypted_token)


# --- OAuth ---


@router.get("/connect", response_model=schemas.GhConnectOut)
def connect(origin: str | None = None, current: models.User = Depends(get_current_user)):
    _require_oauth_config()
    state = jwt.encode(
        {
            "sub": str(current.id),
            "purpose": STATE_PURPOSE,
            # origen real del frontend (localhost/ngrok/vercel) para volver ahí
            "origin": _safe_origin(origin),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=STATE_TTL_MINUTES),
        },
        SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )
    query = urlencode(
        {"client_id": GITHUB_CLIENT_ID, "scope": GITHUB_OAUTH_SCOPES, "state": state}
    )
    return schemas.GhConnectOut(
        authorize_url=f"https://github.com/login/oauth/authorize?{query}"
    )


@router.get("/callback")
async def callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    # GitHub redirige el navegador aquí sin header Authorization: la identidad
    # del usuario viaja en el `state` (JWT firmado en /connect).
    if error or not code or not state:
        return _ide_redirect(github="error", reason=error or "missing_code")
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("purpose") != STATE_PURPOSE:
            raise jwt.InvalidTokenError("wrong purpose")
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return _ide_redirect(github="error", reason="invalid_state")

    origin = _safe_origin(payload.get("origin"))

    user = db.get(models.User, user_id)
    if user is None:
        return _ide_redirect(origin, github="error", reason="unknown_user")

    try:
        token_data = await gh.exchange_code(code)
        gh_user = await gh.get_github_user(token_data["access_token"])
    except HTTPException as e:
        return _ide_redirect(origin, github="error", reason=quote(str(e.detail)))

    account = _get_account(db, user_id)
    if account is None:
        account = models.GitHubAccount(user_id=user_id)
        db.add(account)
    account.encrypted_token = gh.encrypt_token(token_data["access_token"])
    account.github_login = gh_user.get("login", "")
    account.github_avatar_url = gh_user.get("avatar_url")
    account.scopes = token_data.get("scope", "")
    db.commit()
    return _ide_redirect(origin, github="connected")


@router.get("/status", response_model=schemas.GhStatusOut)
def github_status(
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_account(db, current.id)
    if account is None:
        return schemas.GhStatusOut(connected=False)
    return schemas.GhStatusOut(
        connected=True, login=account.github_login, avatar_url=account.github_avatar_url
    )


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(
    current: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_account(db, current.id)
    if account is not None:
        db.delete(account)
        db.commit()


# --- lectura ---


@router.get("/repos", response_model=list[schemas.GhRepoOut])
async def list_repos(page: int = 1, token: str = Depends(get_github_token)):
    repos = await gh.list_repos(token, page=page)
    return [
        schemas.GhRepoOut(
            full_name=r["full_name"],
            name=r["name"],
            owner=r["owner"]["login"],
            private=r["private"],
            default_branch=r.get("default_branch", "main"),
            pushed_at=r.get("pushed_at"),
            description=r.get("description"),
        )
        for r in repos
    ]


@router.get("/repos/{owner}/{repo}/branches", response_model=list[schemas.GhBranchOut])
async def list_branches(owner: str, repo: str, token: str = Depends(get_github_token)):
    branches = await gh.list_branches(token, owner, repo)
    return [schemas.GhBranchOut(name=b["name"], sha=b["commit"]["sha"]) for b in branches]


@router.get("/repos/{owner}/{repo}/tree", response_model=schemas.GhTreeOut)
async def get_tree(
    owner: str, repo: str, branch: str, token: str = Depends(get_github_token)
):
    head_sha = await gh.get_branch_head(token, owner, repo, branch)
    tree = await gh.get_tree(token, owner, repo, head_sha)
    return schemas.GhTreeOut(
        head_sha=head_sha,
        truncated=tree.get("truncated", False),
        entries=[
            schemas.GhTreeEntryOut(
                path=e["path"], type=e["type"], size=e.get("size"), sha=e["sha"]
            )
            for e in tree.get("tree", [])
            if e["type"] in ("blob", "tree")
        ],
    )


@router.get("/repos/{owner}/{repo}/file", response_model=schemas.GhFileOut)
async def get_file(
    owner: str, repo: str, path: str, ref: str, token: str = Depends(get_github_token)
):
    return await gh.get_file(token, owner, repo, path, ref)


# --- escritura / sincronización ---


@router.post("/repos/{owner}/{repo}/commit", response_model=schemas.GhCommitOut)
async def commit(
    owner: str,
    repo: str,
    body: schemas.GhCommitIn,
    token: str = Depends(get_github_token),
):
    return await gh.create_commit(
        token,
        owner,
        repo,
        branch=body.branch,
        expected_head_sha=body.expected_head_sha,
        message=body.message,
        files=[f.model_dump() for f in body.files],
    )


@router.get("/repos/{owner}/{repo}/pull", response_model=schemas.GhPullOut)
async def pull(
    owner: str,
    repo: str,
    branch: str,
    since_sha: str,
    token: str = Depends(get_github_token),
):
    head_sha = await gh.get_branch_head(token, owner, repo, branch)
    if head_sha == since_sha:
        return schemas.GhPullOut(up_to_date=True, head_sha=head_sha)

    diff = await gh.compare(token, owner, repo, base=since_sha, head=head_sha)
    if diff is None:
        # since_sha ya no existe en el remoto (force push): refrescar todo
        return schemas.GhPullOut(up_to_date=False, head_sha=head_sha, full_refresh=True)
    return schemas.GhPullOut(
        up_to_date=False,
        head_sha=head_sha,
        files=[
            schemas.GhPullFileOut(
                filename=f["filename"],
                status=f["status"],
                previous_filename=f.get("previous_filename"),
            )
            for f in diff.get("files", [])
        ],
    )
