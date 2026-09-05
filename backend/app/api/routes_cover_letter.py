"""HTTP routes for the Cover Letter feature.

Mirrors the Optimizer/Coach workflow:

    POST   /api/cover-letter             create + generate a new letter
    GET    /api/cover-letter             list the user\'s letters
    GET    /api/cover-letter/{id}        fetch one
    PUT    /api/cover-letter/{id}        update subject/body/tone/length/status
    POST   /api/cover-letter/{id}/regenerate
                                        rebuild subject + body from current resume + JD
    DELETE /api/cover-letter/{id}        remove one
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.models import AuthUser
from app.security import get_current_user
from app.services.cover_letter import (
    CoverLetterStorage,
    generate_cover_letter,
    get_cover_letter_storage,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cover-letter", tags=["cover-letter"])


# ---------- Helpers ----------


def _storage_dep() -> CoverLetterStorage:
    return get_cover_letter_storage()


def _load_or_404(storage: CoverLetterStorage, uid: str, letter_id: str) -> dict:
    rec = storage.get(uid, letter_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cover letter not found.",
        )
    return rec


# ---------- Routes ----------


@router.post("")
async def create_cover_letter(
    payload: dict,
    user: AuthUser = Depends(get_current_user),
    storage: CoverLetterStorage = Depends(_storage_dep),
):
    """Create a new cover letter from a saved resume + JD + tone + length."""
    from app.storage import ResumeStorage, get_storage

    resume_id = payload.get("resumeId")
    jd_text = (payload.get("jobDescription") or "").strip()
    if not resume_id or not jd_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="resumeId and jobDescription are required.",
        )

    resume_storage: ResumeStorage = get_storage()
    rec = resume_storage.get_resume(user.uid, resume_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source resume not found.",
        )

    target_role = payload.get("targetRole") or (rec.job and rec.job.role) or ""
    target_company = payload.get("targetCompany") or (rec.job and rec.job.company) or ""
    tone = (payload.get("tone") or "professional").lower()
    length = (payload.get("length") or "medium").lower()

    letter = generate_cover_letter(
        rec.candidate,
        jd_text=jd_text,
        target_role=target_role,
        target_company=target_company,
        tone=tone,
        length=length,
    )

    record = storage.create(
        uid=user.uid,
        source_filename=rec.versionName,
        candidate=rec.candidate,
        job_description=jd_text,
        target_role=target_role or None,
        target_company=target_company or None,
        tone=tone,
        length=length,
        letter=letter,
    )
    return record


@router.get("")
async def list_cover_letters(
    user: AuthUser = Depends(get_current_user),
    storage: CoverLetterStorage = Depends(_storage_dep),
):
    return storage.list(user.uid)


@router.get("/{letter_id}")
async def get_cover_letter(
    letter_id: str,
    user: AuthUser = Depends(get_current_user),
    storage: CoverLetterStorage = Depends(_storage_dep),
):
    return _load_or_404(storage, user.uid, letter_id)


@router.put("/{letter_id}")
async def update_cover_letter(
    letter_id: str,
    payload: dict,
    user: AuthUser = Depends(get_current_user),
    storage: CoverLetterStorage = Depends(_storage_dep),
):
    """Edit subject, body, tone, length, or status of a stored letter."""
    _load_or_404(storage, user.uid, letter_id)
    allowed = {"subject", "body", "tone", "length", "status"}
    changes = {k: v for k, v in payload.items() if k in allowed and v is not None}
    if not changes:
        return _load_or_404(storage, user.uid, letter_id)
    updated = storage.update(user.uid, letter_id, **changes)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cover letter not found.",
        )
    return updated


@router.post("/{letter_id}/regenerate")
async def regenerate_cover_letter(
    letter_id: str,
    payload: Optional[dict] = None,
    user: AuthUser = Depends(get_current_user),
    storage: CoverLetterStorage = Depends(_storage_dep),
):
    """Re-run generation. Optional body may override tone/length/jobDescription."""
    payload = payload or {}
    rec = _load_or_404(storage, user.uid, letter_id)

    jd_text = (payload.get("jobDescription") or rec.get("jobDescription") or "").strip()
    if not jd_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No job description available to regenerate from.",
        )

    tone = (payload.get("tone") or rec.get("tone") or "professional").lower()
    length = (payload.get("length") or rec.get("length") or "medium").lower()
    target_role = payload.get("targetRole") or rec.get("targetRole") or ""
    target_company = payload.get("targetCompany") or rec.get("targetCompany") or ""

    letter = generate_cover_letter(
        rec.get("sourceResume") or {},
        jd_text=jd_text,
        target_role=target_role,
        target_company=target_company,
        tone=tone,
        length=length,
    )

    updated = storage.update(
        user.uid,
        letter_id,
        jobDescription=jd_text,
        targetRole=target_role or None,
        targetCompany=target_company or None,
        tone=tone,
        length=length,
        subject=letter.get("subject", ""),
        body=letter.get("body", ""),
        recipientHint=letter.get("recipientHint", "Hiring Team"),
        generatedBy=letter.get("generatedBy", "rules"),
        status="draft",
    )
    return updated


@router.delete("/{letter_id}")
async def delete_cover_letter(
    letter_id: str,
    user: AuthUser = Depends(get_current_user),
    storage: CoverLetterStorage = Depends(_storage_dep),
):
    ok = storage.delete(user.uid, letter_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cover letter not found.",
        )
    return {"success": True, "id": letter_id}
