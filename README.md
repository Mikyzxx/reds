# NEXA — Planner · Llamadas · IDE

App de trabajo en equipo con estética minimalista cyberpunk. **Fase 1**: login demo, usuarios, grupos (salas) y llamadas de voz por WebRTC.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript |
| Backend | Python · FastAPI · SQLAlchemy · MySQL |
| Llamadas | WebRTC mesh (P2P) · señalización por WebSocket · STUN de Google |

## Requisitos

- Node.js ≥ 20, Python ≥ 3.11
- MySQL accesible en `127.0.0.1:3306` con la base `appdb` (credenciales en `backend/.env`)

## Arranque

### Backend (puerto 8000)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Al arrancar crea las tablas en `appdb` y siembra 4 usuarios demo y el grupo `daily-sync`.

### Frontend (puerto 3000)

```bash
cd frontend
npm install
npm run dev
```

Abrir <http://localhost:3000>.

## Usuario demo

| Email | Contraseña |
|---|---|
| `demo@nexa.dev` | `demo1234` |

También existen `luis@nexa.dev`, `ana@nexa.dev` y `dana@nexa.dev` (misma contraseña) para probar llamadas con varios participantes: abre dos ventanas/perfiles del navegador, inicia sesión con usuarios distintos y entra a la misma sala.

## Compartir por ngrok

El frontend proxea el backend (`/api` y `/ws` → puerto 8000, ver `frontend/next.config.ts`), así que basta **un solo túnel** al puerto 3000:

```bash
ngrok http 3000
```

Comparte la URL `https://xxxx.ngrok-free.app` — sirve la app, la API y la señalización WebRTC. No expongas el 8000 ni configures nada más.

> Nota: el audio de las llamadas es P2P con STUN; entre redes muy restrictivas (NAT simétrico corporativo) puede requerir un servidor TURN (pendiente, Fase 2).

## Estructura

```
backend/   FastAPI: auth JWT, usuarios, grupos, señalización WebRTC (WS /ws/call/{group_id})
frontend/  Next.js: login, shell con sidebar, salas de llamada, hook useVoiceCall (WebRTC)
```

## Fase 2 (pendiente)

Planner kanban, calendario semanal, videollamada + compartir pantalla, chat de sala, IDE multi-lenguaje.
