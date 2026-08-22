# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NEXA — team-work app (Spanish UI, cyberpunk-minimal aesthetic): demo login, groups ("salas"), WebRTC voice/video calls with screen share, per-group kanban planner + calendar, room chat with attachments, and a GitHub-backed IDE. Code comments and docs are written in Spanish; keep that convention.

## Commands

### Backend (FastAPI, port 8000)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Run against throwaway SQLite instead of MySQL/Postgres:

```bash
DATABASE_URL=sqlite:////tmp/nexa-dev.db backend/.venv/bin/python -m uvicorn app.main:app --port 8000 --app-dir backend
```

### Frontend (Next.js 16 / React 19 / Tailwind v4, port 3000)

```bash
cd frontend
npm install
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
```

There are no automated tests in this repo.

`.claude/launch.json` defines preview configs: `nexa-frontend`, `nexa-backend`, `nexa-backend-sqlite`. (Note: `nexa-backend` uses a Windows `Scripts/python.exe` path; on macOS use `nexa-backend-sqlite` or run uvicorn manually.)

Demo login: `demo@nexa.dev` / `demo1234` (also `luis@`, `ana@`, `dana@nexa.dev`, same password) — seeded on backend startup along with the `daily-sync` group.

## Architecture

Two independent apps; the frontend **proxies** the backend so one origin serves everything:

- `frontend/next.config.ts` rewrites `/api/*` and `/ws/*` → `http://127.0.0.1:8000` (override with `BACKEND_URL`). This makes a single `ngrok http 3000` tunnel serve app + API + WebRTC signaling.
- `frontend/lib/api.ts` therefore uses same-origin URLs by default; `NEXT_PUBLIC_API_URL` switches to a direct backend (production on Vercel). `assetUrl()` must wrap any backend-served file path (`/api/avatars/…`, `/api/files/…`) so it works in both modes.

### Backend (`backend/app/`)

- `main.py` — app assembly; on startup (lifespan): `create_all` → `run_light_migrations` → `seed`.
- **No Alembic.** `create_all` never alters existing tables, so new columns are added by hand in `migrate.py` (`NEW_COLUMNS` dict, MySQL+Postgres-compatible SQL). When adding a column to an existing table, add it to both `models.py` and `NEW_COLUMNS`.
- `config.py` — env via `backend/.env`. DB engine is MySQL by default (`DB_ENGINE=mysql|postgres`, database `appdb`); a full `DATABASE_URL` (Railway/Render style) takes priority and gets its driver normalized (`postgresql+psycopg`, `mysql+pymysql`). Also GitHub OAuth creds (`GITHUB_CLIENT_ID`/`SECRET`), upload dirs and size limits.
- `models.py` — tables: `users`, `github_accounts`, `groups_` (note the trailing underscore — `groups` is reserved in MySQL 8), `group_members`, `tasks`, `chat_messages`.
- `auth.py` + `routers/auth.py` — JWT (HS256, passlib/bcrypt).
- `routers/` — auth, users (avatars), groups, tasks (planner), chat (+ `files_router` for attachments), github (OAuth + repo API via `services/github_api.py`).
- `signaling.py` — WebRTC signaling at `WS /ws/call/{group_id}`. Rooms are **in-memory** (`group_id -> {user_id: Participant}`); the joining client receives the peer list and creates an offer toward each existing peer (avoids glare); the server only relays offer/answer/ice-candidate to `target`. Media is P2P mesh with Google STUN (no TURN yet).
- Uploads go to `backend/uploads/` (avatars served via StaticFiles mount at `/api/avatars`, chat files by uuid names).

### Frontend (`frontend/`)

- Routes in `app/`: `login`, `register`, and the authed shell under `app/app/` (`calls/[groupId]`, `planner`, `calendar`, `ide`, `profile`) with a sidebar layout.
- Auth state is client-side: JWT in localStorage (`nexa_token`), user in `nexa_user`; `lib/auth.ts` broadcasts a `nexa:user-updated` CustomEvent so mounted `useSession()` hooks refresh without reload.
- Calls: `hooks/useVoiceCall.ts` holds the WebRTC/WS logic; `contexts/CallContext.tsx` mounts it at layout level so an active call survives navigation between sections (only `leaveCall()` disconnects). UI in `components/` (ParticipantTile, ShareStage, ActiveCallBar…).
- Planner/calendar share the same per-group `tasks` data (`lib/planner.ts`, `lib/dates.ts`): kanban columns Pendiente · En progreso · En prueba · Terminado with persisted ordering; the calendar draws each task as a bar from `start_date` to `end_date` colored by its column.
- IDE (`components/ide/`, `lib/github.ts`): Monaco editor + react-arborist file tree over the GitHub API through the backend's OAuth'd endpoints (repo picker, commit, pull-conflict handling).
