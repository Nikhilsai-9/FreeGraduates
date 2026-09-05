"""HTTP routes for the Interview Coach.

Endpoints:
    POST   /api/coach                   create session + auto-generate questions
    GET    /api/coach                   list user sessions
    GET    /api/coach/{id}              fetch one
    POST   /api/coach/{id}/regenerate   regenerate questions
    PUT    /api/coach/{id}/answer       save an answer to a question
    DELETE /api/coach/{id}              remove
"""
from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, status

from app.models import (
    AuthUser,
    CoachAnswer,
    CoachAnswerUpdate,
    CoachSession,
    CoachSessionCreate,
)
from app.security import get_current_user
from app.services.coach import generate_questions, get_coach_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/coach", tags=["coach"])


def _session_id() -> str:
    return "coach-" + secrets.token_hex(6)


def _with_status(rec: dict) -> dict:
    answers = rec.get("answers") or []
    questions = rec.get("questions") or []
    if answers and all((a.get("answer") or "").strip() for a in answers) and answers and len(answers) >= max(1, len(questions)):
        rec["status"] = "completed"
    elif any((a.get("answer") or "").strip() for a in answers):
        rec["status"] = "in_progress"
    else:
        rec["status"] = "ready"
    return rec


@router.post("", response_model=CoachSession, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: CoachSessionCreate,
    user: AuthUser = Depends(get_current_user),
):
    storage = get_coach_storage()
    sid = _session_id()

    resume_payload: dict | None = None
    if body.resumeId:
        try:
            from app.storage import get_storage as _get_resume_storage
            resume_store = _get_resume_storage()
            rec = resume_store.get_resume(user.uid, body.resumeId)
            if rec is not None:
                cand = rec.candidate or {}
                resume_payload = {
                    "personal_info": cand.get("personal_info") or {},
                    "summary": cand.get("summary") or "",
                    "work_experience": cand.get("work_experience") or [],
                    "skills": cand.get("skills") or [],
                    "education": cand.get("education") or [],
                }
        except Exception as e:
            logger.info("Resume lookup skipped: %s", e)

    questions, source = generate_questions(
        resume_payload,
        body.jobDescription,
        body.targetRole,
        body.targetCompany,
        n=body.questionCount or 8,
    )

    record = {
        "resumeId": body.resumeId,
        "jobDescription": body.jobDescription,
        "targetRole": body.targetRole or "",
        "targetCompany": body.targetCompany or "",
        "questions": questions,
        "answers": [],
        "generatedBy": source,
        "status": "ready",
    }
    saved = storage.create(user.uid, sid, record)
    return _with_status(saved)


@router.get("", response_model=list[CoachSession])
async def list_sessions(user: AuthUser = Depends(get_current_user)):
    storage = get_coach_storage()
    out = []
    for rec in storage.list(user.uid):
        out.append(_with_status(rec))
    return out


@router.get("/{session_id}", response_model=CoachSession)
async def get_session(
    session_id: str,
    user: AuthUser = Depends(get_current_user),
):
    storage = get_coach_storage()
    rec = storage.get(user.uid, session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Coach session not found")
    return _with_status(rec)


@router.post("/{session_id}/regenerate", response_model=CoachSession)
async def regenerate_session(
    session_id: str,
    user: AuthUser = Depends(get_current_user),
):
    storage = get_coach_storage()
    rec = storage.get(user.uid, session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Coach session not found")

    questions, source = generate_questions(
        None,
        rec.get("jobDescription") or "",
        rec.get("targetRole") or None,
        rec.get("targetCompany") or None,
        n=len(rec.get("questions") or []) or 8,
    )
    updated = storage.update(
        user.uid,
        session_id,
        {
            "questions": questions,
            "answers": [],
            "generatedBy": source,
            "status": "ready",
        },
    )
    return _with_status(updated or {})


@router.put("/{session_id}/answer", response_model=CoachSession)
async def save_answer(
    session_id: str,
    body: CoachAnswerUpdate,
    user: AuthUser = Depends(get_current_user),
):
    storage = get_coach_storage()
    rec = storage.get(user.uid, session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Coach session not found")

    qids = {q["id"] for q in (rec.get("questions") or [])}
    if body.questionId not in qids:
        raise HTTPException(status_code=400, detail="Unknown questionId for this session")

    answers = list(rec.get("answers") or [])
    replaced = False
    for a in answers:
        if a.get("questionId") == body.questionId:
            a["answer"] = body.answer
            replaced = True
            break
    if not replaced:
        answers.append({"questionId": body.questionId, "answer": body.answer})

    updated = storage.update(user.uid, session_id, {"answers": answers})
    return _with_status(updated or {})


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    user: AuthUser = Depends(get_current_user),
):
    storage = get_coach_storage()
    ok = storage.delete(user.uid, session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Coach session not found")
    return {"success": True, "id": session_id}