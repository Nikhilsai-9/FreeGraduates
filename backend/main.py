"""FreeGraduates AI Resume Builder — backend entry point.

Run with:
    uvicorn main:app --reload --port 8000

All configuration is read from environment variables (see `.env.example`).
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes_health import router as health_router
from app.api.routes_profile import router as profile_router
from app.api.routes_resume import router as resume_router
from app.config import get_settings


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("freegraduates")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="FreeGraduates AI Resume Builder",
        version="2.0.0",
        description=(
            "AI-powered resume builder for FreeGraduates. "
            "Generates ATS-safe, truth-constrained resumes from "
            "candidate-supplied data, with a deterministic fallback "
            "when the AI path is unavailable."
        ),
    )

    # ---------- CORS ----------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.client_origins_list,
        allow_origin_regex=settings.client_origins_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "x-user-uid", "x-user-email"],
    )

    # ---------- Routes ----------
    for r in (health_router, profile_router, resume_router):
        app.include_router(r)

    # ---------- Global error handler ----------
    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "detail": "An unexpected error occurred. Please try again.",
            },
        )

    @app.get("/", tags=["meta"])
    async def root():
        return {
            "service": "FreeGraduates AI Resume Builder",
            "version": app.version,
            "docs": "/docs",
            "health": "/api/health",
        }

    return app


app = create_app()


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
