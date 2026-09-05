# FreeGraduates - Production Deployment Guide

This guide covers taking FreeGraduates from a local clone to a
containerised, internet-facing deployment on a single host (or a small
VM). It assumes you already have:

- Docker Engine 24+ and the Compose plugin
- A registered domain with DNS control
- A Firebase project (Auth + optional Admin SDK service account)
- A Google AI Studio API key (for Gemini)

For most stages we rely on `docker compose` and the provided
`Makefile`. Targets are intentionally minimal so they map cleanly onto
Render, Fly.io, Railway, or a plain VPS.

---

## 1. Architecture at a glance

```
                    +--------------------+
                    |   Browser (React)  |
                    |   Vite SPA bundle  |
                    +---------+----------+
                              | HTTPS
                              v
                +--------------------------+
                |  nginx  (frontend:80)    |
                |  - SPA history fallback  |
                |  - /api/*  -> backend    |
                +---------+----------------+
                          | internal Docker network
                          v
                +--------------------------+
                | FastAPI / uvicorn        |
                | (backend:8000)           |
                | - Firebase ID-token auth |
                | - Gemini generation      |
                | - Per-user JSON storage  |
                +---------+----------------+
                          |
                +---------+--------+
                v                  v
       Volume: backend-data   External APIs:
       (JSON files per user)  - Google Gemini
                              - Firebase Auth verify
```

Both services are defined in `docker-compose.yml` at the repo root.

---

## 2. Configure environment

### 2.1 Backend

```bash
cp backend/.env.example backend/.env
$EDITOR backend/.env
```

Required for production:

| Variable                          | Notes                                                              |
|-----------------------------------|--------------------------------------------------------------------|
| `GEMINI_API_KEY`                  | From <https://aistudio.google.com/apikey>                          |
| `FIREBASE_SERVICE_ACCOUNT_PATH`   | Path inside the container: `/app/firebase-service-account.json`    |
| `FIREBASE_PROJECT_ID`             | Matches your Firebase web app                                      |
| `DEV_AUTH_BYPASS`                 | **`false`** in production (never bypass Firebase ID-token verify)   |
| `CLIENT_ORIGINS`                  | Comma-separated list of allowed frontend origins (CORS)            |
| `CLIENT_ORIGINS_REGEX`            | Optional regex (e.g. `https://.*\.vercel\.app`)                    |
| `DATA_DIR`                        | **`/data`** when running in the compose stack                      |

### 2.2 Frontend

The frontend container builds with a baked-in `VITE_API_URL`. Set it at
build time:

```bash
# Example: backend behind https://api.freegraduates.app
export VITE_API_URL=https://api.freegraduates.app
docker compose build frontend
```

There is no `.env` file consumed by the frontend container - Vite
inlines the value during the `npm run build` stage.

---

## 3. Firebase service account

1. Firebase Console -> Project Settings -> **Service accounts**.
2. Click **Generate new private key** -> downloads `*.json`.
3. Rename to `firebase-service-account.json` and place it next to
   `docker-compose.yml` (or anywhere reachable by the
   `FIREBASE_SERVICE_ACCOUNT_PATH_HOST` env var).
4. **Do not commit this file.** It's in both `backend/.gitignore` and
   `backend/.dockerignore`.

The compose file bind-mounts it read-only into the backend container.

---

## 4. First run

```bash
make up           # builds images and starts both services in background
make logs         # tail combined logs
make health       # curl the backend /api/health endpoint
```

You should see:

- Backend at `http://<host>:8000` (interactive OpenAPI docs at `/docs`).
- Frontend at `http://<host>:8080`.

Open the frontend URL in a browser; sign in via Firebase Auth and walk
through the onboarding wizard.

---

## 5. Reverse proxy / TLS termination

`docker-compose.yml` exposes plain HTTP on `8000` (backend) and `8080`
(frontend). For production, put them behind a TLS reverse proxy.

### 5.1 Caddy (recommended - automatic Let's Encrypt)

```caddyfile
api.freegraduates.app {
    reverse_proxy 127.0.0.1:8000
}

freegraduates.app, www.freegraduates.app {
    reverse_proxy 127.0.0.1:8080
}
```

### 5.2 Nginx on the host

```nginx
server {
    listen 443 ssl http2;
    server_name freegraduates.app;
    ssl_certificate     /etc/letsencrypt/live/freegraduates.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/freegraduates.app/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}

server {
    listen 443 ssl http2;
    server_name api.freegraduates.app;
    ssl_certificate     /etc/letsencrypt/live/freegraduates.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/freegraduates.app/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

### 5.3 Behind a PaaS (Render / Fly / Railway)

- Build from this repo, root Dockerfile paths:
  - backend service -> `backend/Dockerfile`, exposes `PORT`
  - frontend service -> `frontend/Dockerfile`, exposes `80`
- Set the same environment variables in the PaaS dashboard.
- The PaaS terminates TLS in front of the containers - no need for
  Caddy/nginx.

---

## 6. Updating

```bash
git pull
make rebuild      # rebuild images without cache
make up           # restart with the new images
```

The `backend-data` volume persists all user resumes, optimisations,
coach sessions, and cover letters across restarts.

---

## 7. Backups

The named volume `backend-data` contains every user artefact. To
snapshot it:

```bash
docker run --rm \
    -v freegraduates_backend-data:/data:ro \
    -v $(pwd)/backups:/backup \
    busybox tar czf /backup/backend-data-$(date +%F).tgz -C /data .
```

Restore by extracting into the volume:

```bash
docker run --rm \
    -v freegraduates_backend-data:/data \
    -v $(pwd)/backups:/backup:ro \
    busybox sh -c "tar xzf /backup/backend-data-YYYY-MM-DD.tgz -C /data"
```

---

## 8. Operational checks

| Check                | How                                                          |
|----------------------|--------------------------------------------------------------|
| Backend reachable    | `curl -fsS http://127.0.0.1:8000/api/health`                |
| Backend config       | same endpoint returns `gemini_configured`, `auth_bypass`, etc.|
| Frontend reachable   | `curl -fsS http://127.0.0.1:8080/healthz`                   |
| Data dir writable    | `docker compose exec backend ls -la /data`                  |
| Outbound HTTPS       | `docker compose exec backend curl -fsS https://generativelanguage.googleapis.com` |

---

## 9. Security checklist

- [ ] `DEV_AUTH_BYPASS=false` in production.
- [ ] `GEMINI_API_KEY` only ever set via env, never in the image.
- [ ] `firebase-service-account.json` is not committed; mounted
      read-only.
- [ ] `CLIENT_ORIGINS` does not contain `*` - use the regex variant
      with a tightly scoped pattern instead.
- [ ] Host firewall restricts ports 8000 / 8080 to localhost; only the
      reverse proxy is reachable from the internet.
- [ ] Backups are stored off-host (e.g. S3, Backblaze B2) and
      encrypted at rest.

---

## 10. Troubleshooting

**Frontend loads but API calls fail with CORS errors.**
`CLIENT_ORIGINS` in `backend/.env` does not include the frontend's
public origin. Add it (or use `CLIENT_ORIGINS_REGEX`).

**`/api/health` reports `gemini_configured: false`.**
`GEMINI_API_KEY` is unset or empty. All AI features gracefully fall
back to the deterministic rules path, so the app still functions but
generation quality will be lower.

**`make up` exits with "port already in use".**
Override the host ports via env vars before invoking compose:
`BACKEND_PORT=9000 FRONTEND_PORT=9080 make up`.

**Container is healthy but uploads fail.**
Verify the bind mount for the Firebase service account exists at the
path the compose file expects (`./backend/firebase-service-account.json`
by default), or override `FIREBASE_SERVICE_ACCOUNT_PATH_HOST`.
