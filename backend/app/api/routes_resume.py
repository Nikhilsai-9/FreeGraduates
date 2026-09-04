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
    """Extract candidate data from a PDF (LinkedIn export or existing resume)."""
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only PDF files are supported.")
    settings = get_settings()
    pdf_bytes = await file.read()
    if len(pdf_bytes) > settings.max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"File too large. Max {settings.max_upload_bytes // (1024 * 1024)} MB.")
    llm = get_llm() if _llm_is_runnable() else None
    try:
        parsed = extract_candidate_from_pdf(pdf_bytes, poppler_path=settings.poppler_path or None, llm=llm)
    except Exception as exc:
        logger.exception("PDF extraction failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="We couldn't read this file. Please try another PDF.") from exc
    return ExtractPdfResponse(success=True, parsed=parsed, warnings=[])


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
