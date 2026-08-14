"""Cliente de la REST API de GitHub + cifrado del token OAuth.

Todo el tráfico hacia GitHub sale de aquí; el frontend nunca ve el token.
"""

import base64
import hashlib
import os

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, status

from ..config import GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SECRET_KEY

# Sobrescribible para GitHub Enterprise o stubs de prueba
GITHUB_API = os.getenv("GITHUB_API_URL", "https://api.github.com")
_TIMEOUT = httpx.Timeout(30.0)

# Contents API solo devuelve JSON con contenido hasta ~1 MB
MAX_FILE_BYTES = 1024 * 1024


# --- cifrado del token (Fernet con clave derivada del SECRET_KEY) ---

def _fernet() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest())
    return Fernet(key)


def encrypt_token(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    try:
        return _fernet().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        # SECRET_KEY cambió desde que se guardó el token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de GitHub ilegible; reconecta tu cuenta",
        )


# --- cliente HTTP ---

def _headers(token: str) -> dict:
    return {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Authorization": f"Bearer {token}",
    }


def _raise_for_github(res: httpx.Response) -> None:
    if res.status_code < 400:
        return
    if res.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de GitHub inválido o revocado; reconecta tu cuenta",
        )
    if res.status_code == 403 and res.headers.get("x-ratelimit-remaining") == "0":
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Límite de peticiones de GitHub alcanzado; espera unos minutos",
        )
    try:
        message = res.json().get("message", "")
    except ValueError:
        message = ""
    if res.status_code == 404:
        raise HTTPException(status_code=404, detail=message or "No encontrado en GitHub")
    if res.status_code in (403, 409, 422):
        raise HTTPException(status_code=res.status_code, detail=message or "Error de GitHub")
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"GitHub respondió {res.status_code}: {message}",
    )


async def gh_request(
    token: str, method: str, path: str, *, ok_404: bool = False, **kwargs
) -> httpx.Response:
    async with httpx.AsyncClient(base_url=GITHUB_API, timeout=_TIMEOUT) as client:
        res = await client.request(method, path, headers=_headers(token), **kwargs)
    if ok_404 and res.status_code == 404:
        return res
    _raise_for_github(res)
    return res


# --- OAuth ---

async def exchange_code(code: str) -> dict:
    """Cambia el `code` del callback por un access_token. Devuelve el JSON de GitHub."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
    data = res.json() if res.status_code < 500 else {}
    if res.status_code >= 400 or "access_token" not in data:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=data.get("error_description", "GitHub rechazó el código OAuth"),
        )
    return data


async def get_github_user(token: str) -> dict:
    res = await gh_request(token, "GET", "/user")
    return res.json()


# --- lectura ---

async def list_repos(token: str, page: int = 1) -> list[dict]:
    res = await gh_request(
        token,
        "GET",
        "/user/repos",
        params={
            "per_page": 100,
            "page": page,
            "sort": "pushed",
            "affiliation": "owner,collaborator,organization_member",
        },
    )
    return res.json()


async def list_branches(token: str, owner: str, repo: str) -> list[dict]:
    res = await gh_request(
        token, "GET", f"/repos/{owner}/{repo}/branches", params={"per_page": 100}
    )
    return res.json()


async def get_branch_head(token: str, owner: str, repo: str, branch: str) -> str:
    res = await gh_request(token, "GET", f"/repos/{owner}/{repo}/branches/{branch}")
    return res.json()["commit"]["sha"]


async def get_tree(token: str, owner: str, repo: str, sha: str) -> dict:
    res = await gh_request(
        token, "GET", f"/repos/{owner}/{repo}/git/trees/{sha}", params={"recursive": "1"}
    )
    return res.json()


async def get_file(token: str, owner: str, repo: str, path: str, ref: str) -> dict:
    """Devuelve {path, sha, size, is_binary, too_large, content}."""
    res = await gh_request(
        token, "GET", f"/repos/{owner}/{repo}/contents/{path}", params={"ref": ref}
    )
    data = res.json()
    if isinstance(data, list) or data.get("type") != "file":
        raise HTTPException(status_code=422, detail="La ruta no es un archivo")

    out = {
        "path": path,
        "sha": data["sha"],
        "size": data.get("size", 0),
        "is_binary": False,
        "too_large": False,
        "content": None,
    }
    if out["size"] > MAX_FILE_BYTES or not data.get("content"):
        out["too_large"] = True
        return out

    raw = base64.b64decode(data["content"])
    if b"\x00" in raw:
        out["is_binary"] = True
        return out
    try:
        out["content"] = raw.decode("utf-8")
    except UnicodeDecodeError:
        out["is_binary"] = True
    return out


# --- escritura (Git Data API: blobs → tree → commit → ref) ---

async def create_commit(
    token: str,
    owner: str,
    repo: str,
    branch: str,
    expected_head_sha: str,
    message: str,
    files: list[dict],
) -> dict:
    """Commit multi-archivo. `files` = [{path, content}]. Devuelve {new_head_sha, commit_url}."""
    ref_res = await gh_request(token, "GET", f"/repos/{owner}/{repo}/git/ref/heads/{branch}")
    head_sha = ref_res.json()["object"]["sha"]
    if head_sha != expected_head_sha:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El remoto avanzó desde tu última sincronización; haz pull antes de commitear",
        )

    commit_res = await gh_request(token, "GET", f"/repos/{owner}/{repo}/git/commits/{head_sha}")
    base_tree_sha = commit_res.json()["tree"]["sha"]

    tree_entries = []
    for f in files:
        blob_res = await gh_request(
            token,
            "POST",
            f"/repos/{owner}/{repo}/git/blobs",
            json={"content": f["content"], "encoding": "utf-8"},
        )
        tree_entries.append(
            {"path": f["path"], "mode": "100644", "type": "blob", "sha": blob_res.json()["sha"]}
        )

    tree_res = await gh_request(
        token,
        "POST",
        f"/repos/{owner}/{repo}/git/trees",
        json={"base_tree": base_tree_sha, "tree": tree_entries},
    )
    new_commit_res = await gh_request(
        token,
        "POST",
        f"/repos/{owner}/{repo}/git/commits",
        json={"message": message, "tree": tree_res.json()["sha"], "parents": [head_sha]},
    )
    new_sha = new_commit_res.json()["sha"]
    await gh_request(
        token,
        "PATCH",
        f"/repos/{owner}/{repo}/git/refs/heads/{branch}",
        json={"sha": new_sha, "force": False},
    )
    return {
        "new_head_sha": new_sha,
        "commit_url": new_commit_res.json().get("html_url")
        or f"https://github.com/{owner}/{repo}/commit/{new_sha}",
    }


async def compare(token: str, owner: str, repo: str, base: str, head: str) -> dict | None:
    """Diff base...head. None si base ya no existe (force push remoto)."""
    res = await gh_request(
        token, "GET", f"/repos/{owner}/{repo}/compare/{base}...{head}", ok_404=True
    )
    if res.status_code == 404:
        return None
    return res.json()
