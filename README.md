# NEXA — Planner · Llamadas · IDE

App de trabajo en equipo con estética minimalista cyberpunk. **Fase 1**: login demo, usuarios, grupos (salas), llamadas de voz por WebRTC y planner kanban por grupo.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript |
| Backend | Python · FastAPI · SQLAlchemy · MySQL o PostgreSQL |
| Llamadas | WebRTC mesh (P2P) · señalización por WebSocket · STUN de Google |

## Requisitos

- Node.js ≥ 20, Python ≥ 3.11
- Base de datos con la base `appdb`: MySQL en `127.0.0.1:3306` (por defecto) o PostgreSQL en `127.0.0.1:5432` (credenciales en `backend/.env`)

### Variables de entorno (`backend/.env`)

| Variable | Default | Descripción |
|---|---|---|
| `DB_ENGINE` | `mysql` | Motor de BD: `mysql` o `postgres` |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` ó `5432` | Host y puerto (el puerto default depende del motor) |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `admin` / — / `appdb` | Credenciales y nombre de la base |
| `DATABASE_URL` | — | URL completa; si existe tiene prioridad sobre lo anterior (formato Railway/Render, se acepta `postgresql://` o `mysql://`) |
| `STORAGE_BACKEND` | `local` | Dónde se guardan avatares y adjuntos del chat: `local` o `s3` (ver *Almacenamiento de archivos*) |

Hay una plantilla completa en `backend/.env.example`.

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
backend/   FastAPI: auth JWT, usuarios, grupos, tareas del planner, señalización WebRTC (WS /ws/call/{group_id})
frontend/  Next.js: login, shell con sidebar, salas de llamada, planner kanban, hook useVoiceCall (WebRTC)
```

## Planner

Tablero kanban **por grupo**: cada sala tiene su propio tablero y solo sus miembros lo ven y editan. Las tarjetas llevan título, descripción, prioridad (alta/media/baja), usuario asignado y **fechas de inicio y fin** (opcionales), y se arrastran entre las cuatro columnas — **Pendiente · En progreso · En prueba · Terminado** — con el orden persistido en la tabla `tasks` (`GET/POST /api/tasks`, `PATCH /api/tasks/{id}`, `PATCH /api/tasks/{id}/move`, `DELETE /api/tasks/{id}`).

## Calendario

Vista mensual de las tareas del mismo grupo que el planner: cada tarea se dibuja como una barra continua de su fecha de inicio a la de fin, con el color de su columna del kanban, y las que cruzan semanas o meses se parten en tramos. Al hacer clic en una barra se abre un panel de detalle donde se editan las dos fechas; las tareas sin fechas aparecen en la tira *sin programar* del pie.

> Las columnas `start_date` / `end_date` se añaden solas al arrancar el backend (ver `backend/app/migrate.py`): `create_all` no altera tablas ya creadas y el proyecto no usa Alembic.

## Almacenamiento de archivos

Los avatares y los adjuntos del chat se guardan según `STORAGE_BACKEND` (ver `backend/app/storage.py`):

- **`local`** (default): en `backend/uploads/` — perfecto para desarrollo, pero se pierde en deploys con disco efímero (Railway/Render).
- **`s3`**: en un bucket **privado** de AWS S3 (o compatible: Cloudflare R2, MinIO vía `S3_ENDPOINT_URL`). Las URLs guardadas en BD no cambian (`/api/avatars/…`, `/api/files/…`): el backend responde a esas rutas con un redirect 307 a una URL presignada temporal, así que el bucket nunca se expone directamente y el frontend no necesita cambios.

Variables: `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, y opcionales `S3_ENDPOINT_URL` y `S3_PRESIGN_EXPIRES` (default 3600s). Política IAM mínima para el usuario: `s3:PutObject`, `s3:GetObject` y `s3:DeleteObject` sobre `arn:aws:s3:::<bucket>/*`. **No** actives acceso público en el bucket.

Notas:

- Un adjunto subido pero nunca enviado en un mensaje queda huérfano (igual que en disco, limitación aceptada). No configures reglas de lifecycle que expiren `chat/` — borrarían adjuntos vivos.
- Para migrar archivos ya existentes en disco: `aws s3 sync backend/uploads/avatars s3://$BUCKET/avatars` y `aws s3 sync backend/uploads/chat s3://$BUCKET/chat`.
- Prueba local sin AWS: MinIO (`docker run -p 9000:9000 minio/minio server /data`) con `STORAGE_BACKEND=s3 S3_BUCKET=nexa S3_ENDPOINT_URL=http://localhost:9000 AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin`.

## Donaciones

Apartado `/app/donaciones` (módulo **05** del sidebar) para recibir aportes por Binance: Pay ID copiable para transferencia interna sin comisión, y una tarjeta por red on-chain (USDT BEP20, USDT TRC20, BTC) con la dirección copiable y su QR generado en el navegador. Es puramente estático — sin API de Binance, sin credenciales y sin tocar el backend.

Los datos de cobro se editan en un único sitio, `frontend/lib/donations.ts`; mientras sigan los valores de ejemplo la página muestra un aviso rojo. El QR de Binance Pay es opcional: expórtalo desde la app (Pay → Recibir → guardar imagen) a `frontend/public/donaciones/binance-pay-qr.png` y aparecerá solo. No se genera a partir del Pay ID porque el QR oficial lleva un payload propio de Binance que no se puede reconstruir.

## Fase 2 (pendiente)

Videollamada + compartir pantalla, chat de sala, IDE multi-lenguaje.
