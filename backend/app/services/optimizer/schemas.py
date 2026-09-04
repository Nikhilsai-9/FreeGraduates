"""Pydantic schemas for the Resume Optimizer API.

These models are the HTTP contract between the FreeGraduates React frontend
and the Optimizer backend. They are intentionally separate from
``app.models`` (which describes the Resume Builder) so the two systems
can evolve independently while sharing storage conventions.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Analysis surface
# ---------------------------------------------------------------------------


class KeywordBucket(BaseModel):
    matched: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    extra: list[str] = Field(
        default_factory=list,
        description="JD keywords not relevant to this role (informational).",
    )


class JdAnalysisResult(BaseModel):
    """Result of analysing a Job Description text."""

    roleTitle: Optional[str] = None
    seniority: Optional[str] = Field(
        default=None,
        description="intern | junior | mid | senior | staff | principal | lead | manager | director",
    )
    keywords: KeywordBucket
    mustHave: list[str] = Field(default_factory=list)
    niceToHave: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    atsReadiness: dict = Field(
        default_factory=dict,
        description="Heuristic ATS-readiness signals for the JD itself (length, structure).",
    )


class ScoreBreakdown(BaseModel):
    keywordMatch: float = Field(
        ..., ge=0, le=100,
        description="% of JD keywords found in the resume (technical + soft).",
    )
    skillsMatch: float = Field(
        ..., ge=0, le=100,
        description="% of JD must-have technical skills found in the resume.",
    )
    experienceMatch: float = Field(
        ..., ge=0, le=100,
        description="Heuristic alignment between JD seniority and resume experience count.",
    )
    atsReadiness: float = Field(
        ..., ge=0, le=100,
        description="ATS-friendliness of the resume structure (sections present, contact info).",
    )
    overall: float = Field(..., ge=0, le=100)


class MatchScore(BaseModel):
    """Result of comparing a parsed resume against a JD."""

    overall: ScoreBreakdown
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    matchedKeywords: list[str] = Field(default_factory=list)
    missingKeywords: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# API request/response payloads
# ---------------------------------------------------------------------------


class OptimizeUploadResponse(BaseModel):
    """Returned by ``POST /api/resume-optimizer/upload``."""

    success: bool = True
    id: str
    sourceFilename: str
    parsed: dict = Field(
        ...,
        description="Structured candidate extracted from the PDF (frontend shape).",
    )


class AnalyzeRequest(BaseModel):
    """Body for ``POST /api/resume-optimizer/{id}/analyze``."""

    jobDescription: str = Field(..., min_length=20)
    role: Optional[str] = None
    company: Optional[str] = None


class TailorRequest(BaseModel):
    """Body for ``POST /api/resume-optimizer/{id}/tailor``."""

    jobDescription: Optional[str] = Field(
        default=None,
        description="Optional override; falls back to the stored JD.",
    )
    preserveFactualIntegrity: bool = Field(
        default=True,
        description="Layer A — forbids AI from inventing experience, metrics, or skills.",
    )


class UpdateOptimizationRequest(BaseModel):
    """Body for ``PUT /api/resume-optimizer/{id}``."""

    tailoredResume: Optional[dict] = None
    labels: Optional[dict] = Field(
        default=None,
        description="Optional labels (versionName, targetRole, targetCompany) for the UI.",
    )
    status: Optional[str] = Field(
        default=None,
        description="draft | analyzing | tailored | exported | archived",
    )


class OptimizationSummary(BaseModel):
    id: str
    sourceFilename: Optional[str] = None
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None
    overallScore: Optional[float] = None
    status: str = "draft"
    createdAt: datetime
    updatedAt: datetime


class OptimizationRecord(BaseModel):
    """Full optimizer record returned to the frontend."""

    id: str
    userId: str
    sourceFilename: Optional[str] = None
    sourceResume: dict = Field(
        default_factory=dict,
        description="Structured candidate extracted from the source PDF.",
    )
    jobDescription: Optional[str] = None
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None
    jdAnalysis: Optional[JdAnalysisResult] = None
    matchScore: Optional[MatchScore] = None
    tailoredResume: Optional[dict] = None
    labels: dict = Field(default_factory=dict)
    status: str = "draft"
    error: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


class ExportResponse(BaseModel):
    """Returned by ``GET /api/resume-optimizer/{id}/export`` metadata query."""

    id: str
    format: str
    filename: str
    downloadUrl: str
    bytes: Optional[int] = None
