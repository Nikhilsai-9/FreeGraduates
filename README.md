# FreeGraduates - AI Resume Builder, Real-Time Editor & Firebase Auth

A production-quality FastAPI + React + Firebase + Google Gemini web
application that helps candidates build ATS-safe resumes, analyse them
against a target job description, optimise the content with AI, prep
for interviews, and generate matching cover letters.

---

## Features

1. **Authentication (Firebase)**:
   - Email & Password Login & Registration with user profiles.
   - "Continue with Google" OAuth provider integration.
   - Protected dashboard and resume editor routes with Firebase Admin token verification on the backend.
2. **Resume ingestion**:
   - **Path A - LinkedIn PDF import**: parses LinkedIn profile PDF exports into structured resume fields.
   - **Path B - Resume file import**: parses standard PDF and DOCX files.
   - **Path C - Manual wizard**: multi-step onboarding form for candidates building their first resume.
3. **Split-screen interactive editor**:
   - **Left canvas**: real-time WYSIWYG paper preview with 4 interchangeable ATS templates (*Modern Tech*, *Minimal SDE*, *Student / Campus*, *Executive Classic*).
   - **Right AI panel**: real-time AI diff cards with `[Accept]`, `[Reject]`, `[Accept All]` actions, plus a target JD keyword inserter and form editor.
4. **AI analyser & ATS scanner**: score a resume against a job description, identify missing keywords, and surface ATS-compliance issues (commits 3-4).
5. **Resume optimiser**: JD-driven tailoring with truthful insertion of candidate skills (commit 5).
6. **AI coach**: JD-aware interview and behavioural question generator with answer tracking (commit 6).
7. **Cover letter generator**: produces a JD-tailored cover letter with tone / length controls, edit, regenerate, and copy-to-clipboard (commit 7).
8. **Dual export**: high-fidelity PDF (browser print) and native Microsoft Word `.docx` (backend streaming).
9. **Production deployment**: `docker compose` stack with nginx-served SPA + reverse-proxied FastAPI, healthchecks, persistent volume, Caddy/Nginx reverse-proxy guides (commit 8).

---

## Tech stack

| Layer        | Tech                                                                                  |
|--------------|----------------------------------------------------------------------------------------|
| Frontend     | React 18 + Vite, React Router, Firebase JS SDK, Lucide icons                           |
| Backend      | Python 3.12, FastAPI, uvicorn, Pydantic v2, Firebase Admin SDK                         |
| AI           | Google Gemini (via LangGraph) with deterministic rules fallback                        |
| Auth         | Firebase Authentication (email/password + Google OAuth)                                |
| Storage      | Per-user JSON files under `backend/app/data/<feature>/<uid>/...`                      |
| Packaging    | Docker + docker-compose, multi-stage frontend build, hardened nginx                   |

---

## Quick start (Docker - recommended)

The fastest way to run the full stack locally:

```bash
cp backend/.env.example backend/.env      # then edit GEMINI_API_KEY + Firebase
cp frontend/.env.example frontend/.env    # then edit VITE_FIREBASE_* values

make up            # build images + start both services in the background
make logs          # tail combined logs
make health        # curl the backend /api/health endpoint
```

| Service     | URL                                |
|-------------|------------------------------------|
| Frontend    | <http://localhost:8080>            |
| Backend     | <http://localhost:8000>            |
| Backend API docs (Swagger) | <http://localhost:8000/docs> |

`make down` stops the stack; the `backend-data` Docker volume
preserves every user artefact across restarts.

---

## Quick start (local dev, no Docker)

Two terminals, no containers:

```bash
# Terminal 1 - backend (Python 3.12, port 8000)
cd backend
python -m venv .venv && . .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env && $EDITOR .env
DEV_AUTH_BYPASS=true uvicorn main:app --reload --port 8000

# Terminal 2 - frontend (Node 20+, port 5173)
cd frontend
npm ci
cp .env.example .env && $EDITOR .env
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*`
to the backend on `:8000`.

For `DEV_AUTH_BYPASS=true`, the API trusts an `x-user-uid: <uid>`
header instead of a Firebase bearer token - keep it `false` in
production.

---

## Environment variables

### Backend (`backend/.env`)

See [`backend/.env.example`](backend/.env.example) for the full list.
The non-negotiables:

| Variable                        | Required | Notes                                                              |
|---------------------------------|----------|--------------------------------------------------------------------|
| `GEMINI_API_KEY`                | **yes for AI** | From <https://aistudio.google.com/apikey>; falls back to rules path if unset |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | prod     | Path to the Firebase service account JSON                          |
| `FIREBASE_PROJECT_ID`           | prod     | Your Firebase project id                                           |
| `DEV_AUTH_BYPASS`               | dev only | `true` skips Firebase ID-token verification (uses `x-user-uid`)    |
| `CLIENT_ORIGINS`                | yes      | Comma-separated list of allowed frontend origins (CORS)            |
| `CLIENT_ORIGINS_REGEX`          | optional | Scoped regex (e.g. `https://.*\.vercel\.app`)                     |
| `DATA_DIR`                      | optional | Where user artefacts live (default `./app/data`)                   |

### Frontend (`frontend/.env`)

| Variable                        | Required | Notes                                                              |
|---------------------------------|----------|--------------------------------------------------------------------|
| `VITE_API_URL`                  | yes      | Backend base URL (e.g. `http://localhost:8000`)                    |
| `VITE_FIREBASE_API_KEY`         | yes      | Firebase web app config                                            |
| `VITE_FIREBASE_AUTH_DOMAIN`     | yes      | Firebase web app config                                            |
| `VITE_FIREBASE_PROJECT_ID`      | yes      | Firebase web app config                                            |
| `VITE_FIREBASE_STORAGE_BUCKET`  | yes      | Firebase web app config                                            |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes  | Firebase web app config                                            |
| `VITE_FIREBASE_APP_ID`          | yes      | Firebase web app config                                            |

---

## Project structure

```
FreeGraduates/
|-- backend/                          FastAPI + LangGraph + Gemini
|   |-- app/
|   |   |-- api/                      Route handlers (resume, profile, optimizer, coach, cover-letter, ...)
|   |   |-- data/
|   |   |   `-- rules/               Layer A, B, C, D (the AI constitution)
|   |   |-- engine/
|   |   |   |-- agents.py            rules / input / job / generator / QA agents
|   |   |   |-- graph.py             Top-level `generate_resume(...)` entry point
|   |   |   |-- llm.py               Provider-agnostic Gemini wrapper
|   |   |   |-- rules_loader.py      Loads the four Layer files
|   |   |   `-- schemas.py           Structured-resume Pydantic contract
|   |   |-- services/                Feature services (analyzer, ats, optimizer, coach, cover_letter, export, ...)
|   |   |-- config.py                Pydantic settings (env vars)
|   |   |-- models.py                HTTP request/response models
|   |   |-- security.py              Firebase ID-token verification
|   |   `-- storage.py               Per-user JSON-file resume store
|   |-- main.py                      FastAPI app entrypoint + router registration
|   |-- Dockerfile                   python:3.12-slim + uvicorn
|   `-- requirements.txt
|
|-- frontend/                         React 18 + Vite
|   |-- src/
|   |   |-- api/                      Typed wrappers over the FastAPI surface
|   |   |-- components/               Sidebar, TopBar, Onboarding, ResumeBuilder, Analyzer, ATS, Optimizer, Coach, CoverLetterView, ...
|   |   |-- pages/                    Top-level route components
|   |   `-- App.jsx                   Router + protected routes
|   |-- Dockerfile                    node:20-alpine (build) -> nginx:1.27-alpine (serve)
|   `-- nginx.conf                    SPA fallback + /api reverse proxy
|
|-- scripts/
|   `-- smoke_backend.py             End-to-end API smoke test (`make smoke`)
|
|-- docs/
|   `-- DEPLOYMENT.md                Full production deployment guide
|
|-- docker-compose.yml                Backend + frontend orchestration
|-- Makefile                          Convenience targets
`-- README.md                         (this file)
```

---

## End-to-end smoke test

After `make up` (or running both services locally):

```bash
make smoke
```

This drives every primary endpoint (profile, resume, analyser, ATS,
optimizer, coach, cover letter) with a synthesized user and prints a
green `OK   METHOD PATH -> status` line per call. Non-zero exit means
the first failed call.

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full production
guide, covering:

- TLS reverse-proxy setups (Caddy / Nginx / PaaS)
- Backup and restore of the `backend-data` volume
- Operational health checks
- Security checklist (no `DEV_AUTH_BYPASS` in prod, scoped CORS
  origins, secrets handling, host firewall, off-host encrypted
  backups)
- Troubleshooting (CORS errors, missing `GEMINI_API_KEY`, port
  conflicts, Firebase service account bind-mount)

---

## License

MIT - (c) 2026 Nikhil Sai Kenguri.
