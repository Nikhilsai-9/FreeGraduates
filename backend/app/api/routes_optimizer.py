"""HTTP routes for the Resume Optimizer.

The Optimizer is a parallel workflow to the Builder:

    POST /api/resume-optimizer              create a new optimization
                                             from a saved resume + JD
    GET  /api/resume-optimizer              list user'\''s optimizations
    GET  /api/resume-optimizer/{id}         fetch one
    PUT  /api/resume-optimizer/{id}         update tailored / labels
    DELETE /api/resume-optimizer/{id}       remove one

All routes are uid-scoped via the auth dependency.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.models import AuthUser
from app.security import get_current_user
from app.services.optimizer import (
    OptimizerStorage,
    analyze_job_description,
    get_optimizer_storage,
    score_resume_against_jd,
    tailor_resume,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume-optimizer", tags=["optimizer"])


# ---------- Helpers ----------


def _storage_dep() -> OptimizerStorage:
    return get_optimizer_storage()


def _load_or_404(storage: OptimizerStorage, uid: str, optimization_id: str) -> dict:
    rec = storage.get(uid, optimization_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optimization not found.",
        )
    return rec


def _present(rec: dict) -> dict:
    """Return a UI-friendly view of an optimization record.

    The storage layer keeps two candidate slots:

    * ``tailoredResume`` / ``changesApplied`` / ``generatedBy`` -- committed
      (user-approved) tailored candidate.
    * ``tailoredPreview`` / ``previewChangesApplied`` / ``previewGeneratedBy`` --
      pending review; promoted to the committed slot only after the user
      clicks **Apply Changes**.

    The frontend historically reads ``tailoredResume`` /
    ``changesApplied`` / ``generatedBy``. To preserve that contract without
    forcing the UI to know about the storage split, this helper exposes
    whichever candidate is currently "in front of the user" under those
    field names and adds a ``pendingApproval`` boolean the UI uses to
    decide whether to render the **Apply** / **Reject** buttons.

    Backward compatible with records written by older code that only had
    ``tailoredResume`` / ``status="tailored"``.
    """
    view = dict(rec)
    pending = bool(view.get("tailoredPreview"))
    if pending:
        view["tailoredResume"] = view.get("tailoredPreview")
        view["changesApplied"] = view.get("previewChangesApplied") or []
        view["generatedBy"] = view.get("previewGeneratedBy") or "rules"
        view["pendingApproval"] = True
    else:
        view["pendingApproval"] = False
    return view


# ---------- Routes ----------


@router.post("")
async def create_optimization(
    payload: dict,
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    """Create a new optimization record from a saved resume + JD.

    Body shape:
        {
          "resumeId": "resume-...",   # required: must belong to this user
          "jobDescription": "...",    # required: full JD text
          "targetRole": "...",        # optional
          "targetCompany": "..."      # optional
        }
    """
    from app.storage import ResumeStorage, get_storage

    resume_id = payload.get("resumeId")
    job_description = (payload.get("jobDescription") or "").strip()
    if not resume_id or not job_description:
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

    record = storage.create(
        uid=user.uid,
        source_filename=rec.versionName,
        parsed=rec.candidate,
        jobDescription=job_description,
        targetRole=payload.get("targetRole") or (rec.job and rec.job.role) or None,
        targetCompany=payload.get("targetCompany") or (rec.job and rec.job.company) or None,
    )
    return record


@router.get("")
async def list_optimizations(
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    return storage.list(user.uid)


@router.get("/{optimization_id}")
async def get_optimization(
    optimization_id: str,
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    return _present(_load_or_404(storage, user.uid, optimization_id))


@router.delete("/{optimization_id}")
async def delete_optimization(
    optimization_id: str,
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    ok = storage.delete(user.uid, optimization_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optimization not found.",
        )
    return {"success": True}


@router.post("/{optimization_id}/analyze")
async def analyze_optimization(
    optimization_id: str,
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    """Run JD analysis + deterministic match-score against the resume."""
    rec = _load_or_404(storage, user.uid, optimization_id)
    jd_text = rec.get("jobDescription") or ""
    if not jd_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Optimization has no job description to analyse.",
        )
    jd = analyze_job_description(jd_text)
    score = score_resume_against_jd(rec.get("sourceResume") or {}, jd)

    updated = storage.update(
        user.uid,
        optimization_id,
        jdAnalysis=jd.model_dump(),
        matchScore=score.model_dump(),
        status="analyzing",
        error=None,
    )
    return updated


@router.post("/{optimization_id}/tailor")
async def tailor_optimization(
    optimization_id: str,
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    """Produce a tailored *preview* of the resume against the stored JD.

    The preview is stored under ``tailoredPreview`` and the record status
    flips to ``"previewed"``. The committed ``tailoredResume`` slot -- and
    therefore the user's saved resume -- is **not** touched here. Only
    ``POST /{id}/apply`` promotes the preview into the committed slot.

    Returns the full record in the standard view shape (see ``_present``),
    so the UI keeps reading ``tailoredResume`` / ``changesApplied`` /
    ``generatedBy`` and additionally gets a ``pendingApproval=True`` flag.
    """
    rec = _load_or_404(storage, user.uid, optimization_id)
    jd_text = rec.get("jobDescription") or ""
    jd_analysis = rec.get("jdAnalysis") or {}

    jd_payload = {
        "role": rec.get("targetRole") or "",
        "company": rec.get("targetCompany") or "",
        "description": jd_text,
        "keywords": {"missing": jd_analysis.get("keywords", {}).get("missing", [])},
    }

    tailoring = tailor_resume(rec.get("sourceResume") or {}, jd_payload)
    updated = storage.update(
        user.uid,
        optimization_id,
        tailoredPreview=tailoring.get("tailoredCandidate"),
        previewChangesApplied=tailoring.get("changesApplied", []),
        previewGeneratedBy=tailoring.get("generatedBy", "rules"),
        status="previewed",
        error=None,
    )
    return _present(updated)


@router.post("/{optimization_id}/apply")
async def apply_optimization(
    optimization_id: str,
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    """Promote a pending preview into the committed tailored slot.

    Moves:
        tailoredPreview       -> tailoredResume
        previewChangesApplied -> changesApplied
        previewGeneratedBy    -> generatedBy
        status: "previewed"   -> "tailored"

    Then clears the preview fields. The user's original saved resume
    (``sourceResume``) is never modified.

    Idempotent: if there is no pending preview, returns the current
    record unchanged with an ``applied=True`` flag so the UI can no-op.
    """
    rec = _load_or_404(storage, user.uid, optimization_id)
    if not rec.get("tailoredPreview"):
        view = _present(rec)
        view["applied"] = True
        return view
    updated = storage.update_with_clear(
        user.uid,
        optimization_id,
        clear=[
            "tailoredPreview",
            "previewChangesApplied",
            "previewGeneratedBy",
        ],
        tailoredResume=rec.get("tailoredPreview"),
        changesApplied=rec.get("previewChangesApplied") or [],
        generatedBy=rec.get("previewGeneratedBy") or "rules",
        status="tailored",
        error=None,
    )
    view = _present(updated)
    view["applied"] = True
    return view


@router.post("/{optimization_id}/reject")
async def reject_optimization(
    optimization_id: str,
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    """Discard a pending preview without touching the user's saved resume.

    Clears the preview slot and rolls status back to ``"analyzed"`` (if
    we have a match score) or ``"draft"`` otherwise. ``sourceResume``,
    ``tailoredResume`` (already applied) and any previous committed
    candidate are preserved untouched.
    """
    rec = _load_or_404(storage, user.uid, optimization_id)
    new_status = "analyzed" if rec.get("matchScore") else "draft"
    updated = storage.update_with_clear(
        user.uid,
        optimization_id,
        clear=[
            "tailoredPreview",
            "previewChangesApplied",
            "previewGeneratedBy",
        ],
        status=new_status,
        error=None,
    )
    view = _present(updated)
    view["rejected"] = True
    return view


@router.put("/{optimization_id}")
async def update_optimization(
    optimization_id: str,
    payload: dict,
    user: AuthUser = Depends(get_current_user),
    storage: OptimizerStorage = Depends(_storage_dep),
):
    """Update labels, tailored resume, or status of an optimization."""
    rec = _load_or_404(storage, user.uid, optimization_id)
    changes = {}
    if "tailoredResume" in payload:
        changes["tailoredResume"] = payload["tailoredResume"]
    if "labels" in payload and isinstance(payload["labels"], dict):
        existing = dict(rec.get("labels") or {})
        existing.update(payload["labels"])
        changes["labels"] = existing
    if "status" in payload:
        changes["status"] = payload["status"]
    if not changes:
        return rec
    return storage.update(user.uid, optimization_id, **changes)
