"""Health + templates routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.config import get_settings
from app.engine.llm import get_llm
from app.models import AuthUser, HealthResponse
from app.security import get_current_user
from app.services.template_renderer import list_templates

router = APIRouter(tags=["meta"])


@router.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        gemini_configured=settings.is_gemini_configured,
        firebase_configured=settings.is_firebase_configured,
        model=get_llm().model,
        data_dir=str(settings.data_dir_resolved),
    )


@router.get("/api/templates")
async def templates(_user: AuthUser = Depends(get_current_user)):
    """List the available resume templates."""
    return {"templates": list_templates()}
