# DailyDrop — Docker Lab Guide

> **Goal:** Learn Docker by running Redis + FastAPI in containers while keeping **Supabase** (Postgres + Auth) in the cloud.  
> **You run every command** below in PowerShell or Command Prompt. Check off each step as you go.

---

## 0. What Docker gives you

| Concept | Meaning in DailyDrop |
|---------|----------------------|
| **Image** | Blueprint (Python + dependencies + your code snapshot) |
| **Container** | Running instance of that image |
| **Dockerfile** | Recipe to build the backend image |
| **docker-compose.yml** | Runs **redis** + **backend** together with one command |
| **Volume** | `./backend:/app` — edit code on Windows, container sees changes (with `--reload`) |

**We do NOT containerize Postgres yet** — your existing Supabase DB and Auth keep working.

**Frontend:** still run with `npm run dev` on your machine (faster hot reload). Only API + Redis use Docker in Phase 1.

---

## 1. Prerequisites

### 1.1 Install Docker Desktop (Windows)

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
2. Install and restart if prompted.
3. Enable **WSL 2** backend if the installer asks (recommended).

### 1.2 Verify Docker works

Open **PowerShell** and run:

```powershell
docker --version
```

Expected: `Docker version 28.x...` or similar.

```powershell
docker compose version
```

Expected: `Docker Compose version v2.x...`

```powershell
docker run hello-world
```

Expected: `Hello from Docker!` in the output.

**If any command fails:** fix Docker Desktop before continuing (Settings → ensure engine is running).

---

## 2. Project files (already in repo)

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Builds Python 3.12 image with FastAPI deps |
| `backend/.dockerignore` | Excludes `.env`, `__pycache__`, tests from image |
| `docker-compose.yml` | Starts `redis` + `backend` |

---

## 3. Prepare environment (one-time)

### 3.1 Backend `.env` must exist

You should already have `backend/.env` (copy from `.env.example` with your Supabase credentials).

```powershell
cd backend
```

If `.env` is missing:

```powershell
copy .env.example .env
```

Then edit `.env` with your real Supabase `user`, `password`, `host`, `SUPABASE_URL`, etc.

### 3.2 Frontend `.env.local`

Keep frontend pointing at the API on your machine:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

(LAN demo: use your PC IP, e.g. `http://192.168.1.4:8000`.)

---

## 4. Build and run

All commands below are from the **project root** unless noted.

### Step 1 — Pull the Redis image (no Dockerfile needed)

```powershell
docker pull redis:7-alpine
```

**Learn:** `pull` downloads a pre-built image from Docker Hub.

---

### Step 2 — Build the backend image

```powershell
docker compose build backend
```

**Learn:** Reads `backend/Dockerfile`, installs `requirements.txt`, creates image tagged like `dailydrop-backend`.

**Optional — see built images:**

```powershell
docker images
```

Look for `dailydrop-backend` or similar.

---

### Step 3 — Start Redis + backend

```powershell
docker compose up
```

Or run in background:

```powershell
docker compose up -d
```

**Learn:**

- `up` = create containers + start
- `-d` = detached (terminal free)

**First run may take 1–2 minutes** (pip install during build).

---

### Step 4 — Verify services

**API docs (browser):**

```
http://localhost:8000/docs
```

**Redis ping (new PowerShell window):**

```powershell
docker exec -it dailydrop-redis redis-cli ping
```

Expected: `PONG`

**List running containers:**

```powershell
docker ps
```

You should see `dailydrop-redis` and `dailydrop-api`.

---

### Step 5 — Run frontend (separate terminal, not in Docker)

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000` — app should talk to API at `localhost:8000`.

---

### Step 6 — Stop everything

```powershell
docker compose down
```

**Learn:** Stops and removes containers. **Volume `redis_data` keeps Redis data** until you remove volumes.

To also delete Redis data:

```powershell
docker compose down -v
```

---

## 5. Command cheat sheet

### Daily workflow

| Task | Command |
|------|---------|
| Start stack | `docker compose up -d` |
| Stop stack | `docker compose down` |
| Rebuild after changing `requirements.txt` | `docker compose up --build -d` |
| View logs | `docker compose logs -f` |
| API logs only | `docker compose logs -f backend` |
| Redis logs only | `docker compose logs -f redis` |

### Inspecting containers

| Task | Command |
|------|---------|
| Running containers | `docker ps` |
| All containers (incl. stopped) | `docker ps -a` |
| Shell inside API container | `docker exec -it dailydrop-api bash` |
| Shell inside Redis | `docker exec -it dailydrop-redis redis-cli` |

### Images & cleanup

| Task | Command |
|------|---------|
| List images | `docker images` |
| Remove unused images | `docker image prune` |
| Nuclear cleanup (careful) | `docker system prune -a` |

### Compose variants

| Task | Command |
|------|---------|
| Build without starting | `docker compose build` |
| Start one service | `docker compose up redis -d` |
| Restart one service | `docker compose restart backend` |

---

## 6. What happens when you change code?

| Change | What you do |
|--------|-------------|
| Edit Python file in `backend/` | **Nothing** — volume mount + `--reload` auto-restarts uvicorn |
| Add package to `requirements.txt` | `docker compose up --build -d` |
| Change `backend/.env` | `docker compose restart backend` |
| Change `docker-compose.yml` | `docker compose down` then `docker compose up -d` |

**This is why Docker helps demo day:** one `docker compose up -d` after git pull + rebuild if deps changed.

---

## 7. Architecture diagram (Phase 1)

```text
┌─────────────────────────────────────────────┐
│  Your Windows PC                            │
│                                             │
│  Browser → localhost:3000 (npm run dev)     │
│       │                                     │
│       ▼                                     │
│  localhost:8000 ──► ┌──────────────────┐  │
│                     │ dailydrop-api     │  │
│                     │ (Docker container)│  │
│                     └────────┬─────────┘  │
│                              │            │
│                     ┌────────▼─────────┐  │
│                     │ dailydrop-redis   │  │
│                     │ (Docker container)│  │
│                     └──────────────────┘  │
└─────────────────────────────────────────────┘
                              │
                              ▼ (SSL)
                     ┌──────────────────┐
                     │ Supabase Cloud    │
                     │ Postgres + Auth   │
                     └──────────────────┘
```

---

## 8. Troubleshooting

### Port 8000 already in use

You may still have local uvicorn running. Stop it, or change compose port to `"8001:8000"` and set `NEXT_PUBLIC_API_URL=http://localhost:8001`.

```powershell
docker compose down
# Stop any local:  Ctrl+C on uvicorn terminal
docker compose up -d
```

### Port 6379 already in use

Another Redis installed locally. Stop it or change compose to `"6380:6379"`.

### `Missing DB credentials` in logs

`backend/.env` not loaded or incomplete. Check `env_file: ./backend/.env` in compose.

### API works in Docker but frontend cannot connect (LAN phone)

Use your PC IP in `NEXT_PUBLIC_API_URL`, add IP to CORS in `backend/main.py`, run frontend with `-H 0.0.0.0`.

### Build fails on `pip install`

```powershell
docker compose build backend --no-cache
```

### See full error log

```powershell
docker compose logs backend
```

---

## 9. Smoke test

1. `docker --version` and `docker compose version` succeed.
2. `docker compose up -d` starts `dailydrop-redis` and `dailydrop-api`.
3. [http://localhost:8000/docs](http://localhost:8000/docs) loads.
4. `docker exec -it dailydrop-redis redis-cli ping` returns `PONG`.
5. The frontend at `http://localhost:3000` can sign in and load stores.

---

## 10. Next phases

| Phase | Add | Learn | Status |
|-------|-----|--------|--------|
| **2** | Wire Redis in FastAPI (catalog cache) | Redis client in Python | **Done** — see §10.1 |
| **3** | WebSocket endpoint for order events | Real-time push | Next |
| **4** | `frontend/Dockerfile` + compose service | Full stack in Docker | Later |
| **5** | GitHub Actions: `docker compose up` + pytest | CI | Later |

### 10.1 Phase 2 — what was wired

FastAPI now uses Redis to cache **read-heavy catalog** responses:

| Endpoint | Redis key prefix | TTL |
|----------|------------------|-----|
| `GET /api/v1/stores` | `dd:stores:{lat}:{lng}` | 60s |
| `GET /api/v1/stores/{id}` | `dd:store:{id}:{lat}:{lng}` | 60s |
| `GET /api/v1/stores/{id}/products` | `dd:store:{id}:products` | 90s |
| `GET /api/v1/categories/{cat}/stores` | `dd:category:{cat}:…` | 60s |
| `GET /api/v1/products/search` | `dd:search:…` | 30s |

Writes **bust the cache**: merchant/admin product create/update, admin store create/update, place order (stock down), cancel order (stock restored).

If Redis is down, the API still works — it just hits Postgres every time.

**Rebuild once** (new `redis` Python package):

```powershell
docker compose up --build
```

**Cache check**

1. [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) → `{"status":"ok","redis":"up"}`
2. Request stores twice (DevTools → Network, or):

```powershell
curl.exe -s -D - "http://localhost:8000/api/v1/stores" -o NUL
curl.exe -s -D - "http://localhost:8000/api/v1/stores" -o NUL
```

First response header `X-Cache: MISS`, second `X-Cache: HIT`.

```powershell
docker exec -it dailydrop-redis redis-cli KEYS "dd:*"
```

You should see keys after browsing the home page.
