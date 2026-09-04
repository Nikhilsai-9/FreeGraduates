"""Resume API routes — the HTTP contract the FreeGraduates frontend uses.

All routes require a valid Firebase ID token (resolved in `app.security`)
and are scoped to the authenticated `uid` — never to a client-supplied id.

Endpoints:
    POST   /api/resume/extract            → parse a PDF into candidate JSON
    POST   /api/resume/generate           → run the AI engine
    POST   /api/resume/save               → persist a resume record
    GET    /api/resume/list               → list the current user's resumes
    GET    /api/resume/{resume_id}        → fetch one resume
    DELETE /api/resume/{resume_id}        → delete a resume
    POST   /api/resume/{resume_id}/export → download DOCX / PDF / Markdown
"""

from __future__ import annotations

import json as jsonlib
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.config import get_settings
from app.engine.graph import generate_resume
from app.engine.llm import get_llm
from app.engine.schemas import JobTarget, ResumeStructured
from app.models import (
    AuthUser,
    ExtractPdfResponse,
    GenerateResumeRequest,
    JobDescriptionInput,
    ResumeRecord,
    ResumeSummary,
    SaveResumeRequest,
)
from app.security import get_current_user
from app.services.docx_generator import render_resume_to_docx
from app.services.markdown_generator import render_resume_to_markdown
from app.services.pdf_extractor import extract_candidate_from_pdf
from app.services.pdf_generator import render_resume_to_pdf
from app.storage import ResumeStorage, get_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume", tags=["resume"])


# ---------- Helpers ----------


def _job_target_to_model(job):
    if job is None:
        return None
    return JobTarget(role=job.role, company=job.company, description=job.description)
# ---------- Routes: extract ----------


@router.post("/extract", response_model=ExtractPdfResponse)
async def extract_pdf(file: UploadFile = File(...), user: AuthUser = Depends(get_current_user)):
    """Extract candidate data from a PDF (LinkedIn export or existing resume).

    Failure modes are categorised so the frontend can show a precise message:

    * 415 - Wrong MIME (not a PDF at all)
    * 413 - File too large
    * 422 - PDF is valid but we couldn't extract any readable text
            (scanned PDF, image-only, corrupted)
    * 500 - Unexpected server-side error (we log the full traceback)

    Every stage logs so a failure is easy to localise in the terminal.
    """
    settings = get_settings()

    # ----- Stage 1: MIME validation -----
    logger.info(
        "PDF extract request: uid=%s filename=%r content_type=%s",
        user.uid, file.filename, file.content_type,
    )
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        logger.warning("PDF extract rejected: bad content_type=%s", file.content_type)
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported.",
        )

    # ----- Stage 2: Read + size validation -----
    pdf_bytes = await file.read()
    logger.info("PDF extract: received %d bytes", len(pdf_bytes))
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )
    if len(pdf_bytes) > settings.max_upload_bytes:
        logger.warning(
            "PDF extract rejected: %d bytes > limit %d",
            len(pdf_bytes), settings.max_upload_bytes,
        )
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max {settings.max_upload_bytes // (1024 * 1024)} MB.",
        )

    # Lightweight magic-number sniff: a real PDF starts with "%PDF-".
    # This catches "I renamed a .docx to .pdf" uploads before we hand them
    # to the parser.
    if not pdf_bytes.startswith(b"%PDF-"):
        logger.warning("PDF extract rejected: %s does not have PDF magic header", file.filename)
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="That file doesn't look like a PDF. Please upload a real .pdf resume.",
        )

    # ----- Stage 3: Text / AI extraction -----
    llm = get_llm() if _llm_is_runnable() else None
    try:
        parsed = extract_candidate_from_pdf(
            pdf_bytes,
            poppler_path=settings.poppler_path or None,
            llm=llm,
        )
    except Exception as exc:
        # Genuine extraction crash (corrupted PDF, parser bug, etc.).
        logger.exception("PDF extraction crashed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't read this PDF. It may be corrupted or password-protected.",
        ) from exc

    # ----- Stage 4: Validate we actually got something useful -----
    pi = parsed.get("personal_info") or {}
    has_anything = bool(
        pi.get("fullName") or pi.get("email")
        or (parsed.get("work_experience") or [])
        or (parsed.get("education") or [])
        or (parsed.get("skills") or [])
        or (parsed.get("projects") or [])
    )
    if not has_anything:
        # PDF parsed but no recognisable fields - almost always a scanned /
        # image-only PDF without OCR, and the Gemini vision fallback isn't
        # configured (placeholder API key).
        logger.warning(
            "PDF extract: parsed but no recognisable fields (filename=%s)",
            file.filename,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "We couldn't read any text from this PDF. "
                "If it's a scanned resume, please add a Gemini API key to enable OCR, "
                "or paste your information manually below."
            ),
        )

    logger.info(
        "PDF extract OK: uid=%s filename=%s fields=%s",
        user.uid, file.filename, _candidate_summary(parsed),
    )
    return ExtractPdfResponse(success=True, parsed=parsed, warnings=[])


def _candidate_summary(c: dict) -> str:
    """Compact debug string for a parsed candidate (avoid logging full PII)."""
    pi = c.get("personal_info") or {}
    return (
        f"name={'yes' if pi.get('fullName') else 'no'} "
        f"email={'yes' if pi.get('email') else 'no'} "
        f"exp={len(c.get('work_experience') or [])} "
        f"edu={len(c.get('education') or [])} "
        f"skills={len(c.get('skills') or [])} "
        f"projects={len(c.get('projects') or [])}"
    )


# ---------- Routes: generate ----------


@router.post("/generate")
async def generate(payload: GenerateResumeRequest, user: AuthUser = Depends(get_current_user)):
    """Run the AI engine against the supplied candidate + optional JD."""
    result = generate_resume(candidate=payload.candidate, job=_job_target_to_model(payload.job))
    return {
        "success": True,
        "data": {
            "resume": result["resume"],
            "qa": result["qa"],
            "warnings": result["warnings"],
            "seniority": result["seniority"],
            "jd_keywords": result["jd_keywords"],
        },
    }


# ---------- Routes: CRUD ----------


@router.post("/save", response_model=ResumeRecord)
async def save_resume(payload: SaveResumeRequest, user: AuthUser = Depends(get_current_user), storage: ResumeStorage = Depends(get_storage)):
    try:
        rec = storage.save_resume(user.uid, payload)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return rec


@router.get("/list", response_model=list)
async def list_resumes(user: AuthUser = Depends(get_current_user), storage: ResumeStorage = Depends(get_storage)):
    return storage.list_resumes(user.uid)


@router.get("/{resume_id}", response_model=ResumeRecord)
async def get_resume(resume_id: str, user: AuthUser = Depends(get_current_user), storage: ResumeStorage = Depends(get_storage)):
    return _load_resume_or_404(storage, user.uid, resume_id)


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user: AuthUser = Depends(get_current_user), storage: ResumeStorage = Depends(get_storage)):
    ok = storage.delete_resume(user.uid, resume_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return {"success": True}


# ---------- Routes: export ----------


@router.post("/{resume_id}/export")
async def export_resume(resume_id: str, format: str = "docx", user: AuthUser = Depends(get_current_user), storage: ResumeStorage = Depends(get_storage)):
    """Stream a DOCX, PDF, Markdown or JSON export of the resume's latest content."""
    rec = _load_resume_or_404(storage, user.uid, resume_id)
    structured = _resume_structured_from_record(rec)
    if format == "docx":
        data = render_resume_to_docx(structured)
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif format == "pdf":
        try:
            data = render_resume_to_pdf(structured)
        except Exception as exc:
            logger.exception("PDF export failed: %s", exc)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PDF export failed. Please try DOCX instead.")
        media = "application/pdf"
    elif format == "md":
        data = render_resume_to_markdown(structured).encode("utf-8")
        media = "text/markdown; charset=utf-8"
    elif format == "json":
        data = jsonlib.dumps(structured.model_dump(), indent=2, ensure_ascii=False).encode("utf-8")
        media = "application/json"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported format '{format}'. Use docx, pdf, md or json.")
    filename = f"{rec.versionName.replace(' ', '_')}.{format}"
    return Response(content=data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{filename}"'})



def _load_resume_or_404(storage, uid, resume_id):
    rec = storage.get_resume(uid, resume_id)
    if rec is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return rec


def _llm_is_runnable():
    return get_llm().is_available


def _resume_structured_from_record(rec):
    if rec.generated:
        return ResumeStructured.model_validate(rec.generated)
    result = generate_resume(candidate=rec.candidate, job=_job_target_to_model(rec.job))
    return ResumeStructured.model_validate(result["resume"])
