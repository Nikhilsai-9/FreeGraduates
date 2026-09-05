# FreeGraduates AI Resume Builder — Backend

The Python backend that powers FreeGraduates' resume generation. Built on
FastAPI, LangGraph, and Google Gemini. The rule system in
`app/data/rules/layer_*.md` is original FreeGraduates content authored
in-house for this project.

## Architecture

```
app/
├── api/                 FastAPI route handlers
├── data/
│   └── rules/           Layer A, B, C, D (the AI constitution)
├── engine/
│   ├── agents.py        rules / input / job / generator / QA agents
│   ├── graph.py         Top-level `generate_resume(...)` entry point
│   ├── llm.py           Provider-agnostic Gemini wrapper
│   ├── rules_loader.py  Loads the four Layer files
│   └── schemas.py       Structured-resume Pydantic contract
├── services/            PDF extraction + DOCX / PDF / Markdown export
├── config.py            Pydantic settings (env vars)
├── models.py            HTTP request/response models
├── security.py          Firebase ID-token verification
└── storage.py           Per-user JSON-file resume store
```

## Running

```bash
# 1. Install dependencies (Python 3.12+ recommended)
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt

# 2. Configure
copy .env.example .env            # then fill in GEMINI_API_KEY etc.

# 3. Start the server
python main.py
# or
uvicorn main:app --reload --port 8000
```

The backend listens on `http://localhost:8000` by default. The FreeGraduates
frontend expects it on this port — see `frontend/.env.example`.

## Environment

| Variable | Required | Description |
|---|---|---|
| `PORT` | no (default 8000) | HTTP port |
| `GEMINI_API_KEY` | **yes for AI** | Google Gemini server-side key |
| `GEMINI_MODEL` | no (`gemini-1.5-flash`) | Model used for generation |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | yes (prod) | Path to Firebase service account JSON |
| `FIREBASE_PROJECT_ID` | no | Firebase project id |
| `DEV_AUTH_BYPASS` | no (default `false`) | Skip Firebase verification (local dev) |
| `CLIENT_ORIGINS` | no | CORS allow-list (comma-separated) |
| `CLIENT_ORIGINS_REGEX` | no (`https://.*\.vercel\.app`) | Scoped regex of extra CORS origins (Vercel) |
| `DATA_DIR` | no (default `./app/data`) | Where users' resumes live |
| `MAX_UPLOAD_BYTES` | no (default 16 MB) | Max upload size |
| `POPPLER_PATH` | Windows only | Path to Poppler's `bin/` |

If `GEMINI_API_KEY` is **not** set, the engine falls back to a safe
non-AI template generator that only re-shapes the candidate data — no
fabrication is possible in this mode.

## API contract

All routes require a Bearer token issued by the Firebase JS SDK.
In development (`DEV_AUTH_BYPASS=true`) the `x-user-uid` header is
honored instead.

### Core

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/health` | Liveness + configuration |
| `GET`  | `/api/templates` | Available resume templates |
| `POST` | `/api/resume/extract` | Upload a PDF, get candidate JSON |
| `POST` | `/api/resume/generate` | Run the AI engine |
| `POST` | `/api/resume/save` | Persist a resume record |
| `GET`  | `/api/resume/list` | List the user's saved resumes |
| `GET`  | `/api/resume/{id}` | Fetch one resume |
| `DELETE` | `/api/resume/{id}` | Delete a resume |
| `POST` | `/api/resume/{id}/export?format=docx\|pdf\|md\|json` | Stream an export |

### Profile & onboarding (Commit 1)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/profile` | Fetch the authenticated user's profile |
| `PUT`  | `/api/profile` | Upsert the profile |
| `POST` | `/api/profile/onboarding` | Mark the onboarding wizard as completed |

### Workspace (Commit 2)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/workspace/resume` | Create a blank resume shell |
| `GET`  | `/api/workspace/resume/{id}` | Fetch a workspace draft |

### Analyzer & ATS (Commits 3-4)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/analyzer` | Score a resume against a job description |
| `POST` | `/api/ats` | Detailed ATS-compliance scan |

### Optimizer (Commit 5)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/optimizer` | Tailor a resume to a JD (LLM, rules fallback) |
| `GET`  | `/api/optimizer` | List optimisations |
| `GET`  | `/api/optimizer/{id}` | Fetch one |
| `DELETE` | `/api/optimizer/{id}` | Delete one |

### AI Coach & interview prep (Commit 6)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/coach` | Generate interview / behavioural questions |
| `GET`  | `/api/coach` | List sessions |
| `GET`  | `/api/coach/{id}` | Fetch one (with `questions[]`) |
| `PUT`  | `/api/coach/{id}` | Update answers / status |
| `POST` | `/api/coach/{id}/regenerate` | Regenerate questions with new params |
| `DELETE` | `/api/coach/{id}` | Delete one |

### Cover letter generator (Commit 7)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/cover-letter` | Generate a JD-tailored cover letter |
| `GET`  | `/api/cover-letter` | List letters |
| `GET`  | `/api/cover-letter/{id}` | Fetch one |
| `PUT`  | `/api/cover-letter/{id}` | Update subject / body / status |
| `POST` | `/api/cover-letter/{id}/regenerate` | Regenerate with new tone / length |
| `DELETE` | `/api/cover-letter/{id}` | Delete one |

## Rule layers (the constitution)

* **Layer A** — Truth & Source Authority. The non-negotiable rules:
  no fabrication, no JD-echo, only candidate-supplied facts.
* **Layer B** — Candidate Input Contract. Schema tiers, seniority
  inference, length budgets, missing-field protocol.
* **Layer C** — Structured Output & Presentation. Canonical section
  order, Markdown conventions, ATS-safe rendering hooks.
* **Layer D** — Validation & Recovery. QA checklist, auto-correction
  loop, deterministic fallback path.

These files are *never* modified at runtime; they are injected verbatim
into the LLM's system context for every generation call.

## License

This backend module of FreeGraduates is released under the same terms
as the project root — see the root `LICENSE` (MIT, © 2026 Nikhil Sai
Kenguri). Sub-modules retain their original licenses as recorded in
their respective `ATTRIBUTION.md` files.
