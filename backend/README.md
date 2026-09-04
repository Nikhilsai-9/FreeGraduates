# FreeGraduates AI Resume Builder — Backend

The Python backend that powers FreeGraduates' resume generation. Built on
FastAPI, LangGraph, and OpenAI, with the rule system inherited from
[`haderalva/ai-resume-builder`](https://github.com/haderalva/ai-resume-builder)
(CC BY-NC 4.0).

> **Attribution** — The rule system in `app/data/rules/layer_*.md` and the
> LangGraph workflow architecture are adapted from the original repository.
> See `LICENSE` and the project root README for details.

## Architecture

```
app/
├── api/                 FastAPI route handlers
├── data/
│   └── rules/           Layer A, B, C, D (the AI constitution)
├── engine/
│   ├── agents.py        rules / input / job / generator / QA agents
│   ├── graph.py         Top-level `generate_resume(...)` entry point
│   ├── llm.py           Provider-agnostic OpenAI wrapper
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
copy .env.example .env            # then fill in OPENAI_API_KEY etc.

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
| `OPENAI_API_KEY` | **yes for AI** | OpenAI server-side key |
| `OPENAI_MODEL` | no (`gpt-4o`) | Model used for generation |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | yes (prod) | Path to Firebase service account JSON |
| `FIREBASE_PROJECT_ID` | no | Firebase project id |
| `DEV_AUTH_BYPASS` | no (default `false`) | Skip Firebase verification (local dev) |
| `CLIENT_ORIGINS` | no | CORS allow-list (comma-separated) |
| `DATA_DIR` | no (default `./app/data`) | Where users' resumes live |
| `MAX_UPLOAD_BYTES` | no (default 16 MB) | Max upload size |
| `POPPLER_PATH` | Windows only | Path to Poppler's `bin/` |

If `OPENAI_API_KEY` is **not** set, the engine falls back to a safe
non-AI template generator that only re-shapes the candidate data — no
fabrication is possible in this mode.

## API contract

All routes require a Bearer token issued by the Firebase JS SDK.

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

## Rule layers (the constitution)

* **Layer A** — Mandatory operational rules (data integrity, length caps).
* **Layer B** — Detailed reference rules (seniority, dates, contacts).
* **Layer C** — Hybrid output mode (HTML + Markdown + JSON schema).
* **Layer D** — Quality assurance (validation, length & safety checks).

These files are *never* modified at runtime; they are injected verbatim
into the LLM's system context for every generation call.

## License

Source repository: haderalva/ai-resume-builder
Licensed under Creative Commons Attribution-NonCommercial 4.0 International.
FreeGraduates' modifications are released under the same terms — see `LICENSE`.
