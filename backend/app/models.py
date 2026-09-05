"""Pydantic models for the API request/response surface.

These are intentionally separate from `engine.schemas`:
* `engine.schemas`  â†’ the AI engine's internal contract (snake_case, OpenAI schema).
* `models.py`        â†’ the HTTP API surface (camelCase, friendly to React).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# -------------------- Candidate data (matches frontend shape) --------------------


class PersonalInfo(BaseModel):
    fullName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    title: Optional[str] = None


class ExperienceItem(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    description: Optional[str] = None
    bullets: Optional[list[str]] = None


class EducationItem(BaseModel):
    id: Optional[str] = None
    school: Optional[str] = None
    degree: Optional[str] = None
    field: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    gpa: Optional[str] = None
    location: Optional[str] = None


class ProjectItem(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    techStack: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    date: Optional[str] = None
    achievements: Optional[list[str]] = None


class CertificationItem(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    issuer: Optional[str] = None
    issueDate: Optional[str] = None


class AwardItem(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    organization: Optional[str] = None
    date: Optional[str] = None


class LanguageItem(BaseModel):
    id: Optional[str] = None
    name: str
    level: str


# -------------------- API payloads --------------------


class JobDescriptionInput(BaseModel):
    role: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None


class GenerateResumeRequest(BaseModel):
    """Body for POST /api/resume/generate.

    `candidate` carries the candidate-controlled data; the AI is forbidden
    from inventing anything that isn't there (Layer A).
    `job` carries optional job-description targeting.
    `templateId` selects the render template for export.
    """

    candidate: dict = Field(..., description="Candidate data (frontend shape).")
    job: Optional[JobDescriptionInput] = None
    templateId: Optional[str] = Field(default="classic")
    versionName: Optional[str] = Field(default=None)


class SaveResumeRequest(BaseModel):
    id: Optional[str] = Field(
        default=None,
        description="Existing resume id to update. Omit to create a new one.",
    )
    versionName: str = Field(..., min_length=1, max_length=120)
    templateStyle: Optional[str] = "classic"
    candidate: dict
    job: Optional[JobDescriptionInput] = None
    generated: Optional[dict] = Field(
        default=None,
        description="Last AI-generated structured resume stored alongside the candidate data.",
    )


class ResumeSummary(BaseModel):
    id: str
    versionName: str
    templateStyle: Optional[str] = None
    updatedAt: datetime
    createdAt: datetime
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None


class ResumeRecord(BaseModel):
    """Full resume record returned to the frontend."""

    id: str
    userId: str
    versionName: str
    templateStyle: Optional[str] = None
    candidate: dict
    job: Optional[JobDescriptionInput] = None
    generated: Optional[dict] = None
    createdAt: datetime
    updatedAt: datetime


class ExtractPdfResponse(BaseModel):
    success: bool
    parsed: dict = Field(
        ...,
        description="Structured candidate data extracted from the PDF (frontend shape).",
    )
    warnings: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    gemini_configured: bool
    firebase_configured: bool
    model: str
    data_dir: str


# -------------------- Analyzer --------------------


class AnalyzeRequest(BaseModel):
    """Body for POST /api/resume/analyze.

    `candidate` is the same shape the builder saves; `job` is optional but
    the score collapses to a generic completeness review without it.
    """

    candidate: dict = Field(..., description="Candidate data (frontend shape).")
    job: Optional[JobDescriptionInput] = None


class AnalyzeSuggestion(BaseModel):
    """A single actionable change the user can apply to their resume."""

    id: str
    section: str
    targetId: Optional[str] = None
    type: str = Field(..., description="One of: addition, verb_enhancement, deletion")
    title: str
    explanation: str
    originalText: Optional[str] = None
    recommendedText: Optional[str] = None
    addedSkills: Optional[list[str]] = None
    status: str = "pending"


class AnalyzeScoreBreakdown(BaseModel):
    keywordMatch: float
    actionVerbs: float
    metrics: float
    completeness: float
    summary: float


class AnalyzeResponse(BaseModel):
    score: float = Field(..., ge=0, le=100)
    verdict: str
    matchedKeywords: list[str] = Field(default_factory=list)
    missingKeywords: list[str] = Field(default_factory=list)
    matchedCount: int = 0
    missingCount: int = 0
    breakdown: AnalyzeScoreBreakdown
    diffs: list[AnalyzeSuggestion] = Field(default_factory=list)


# -------------------- ATS Scanner --------------------


class AtsCheckRequest(BaseModel):
    """Body for POST /api/resume/ats-check."""

    candidate: dict = Field(..., description="Candidate data (frontend shape).")


class AtsCheckItem(BaseModel):
    id: str
    label: str
    status: str = Field(..., description="One of: pass, warn, fail")
    weight: int
    detail: str = ""
    fix: str = ""


class AtsCheckResponse(BaseModel):
    score: float = Field(..., ge=0, le=100)
    verdict: str = Field(..., description="ats-ready | minor-fixes | needs-work")
    passed: int
    warned: int
    failed: int
    total: int
    checks: list[AtsCheckItem]


# -------------------- Interview Coach --------------------


class CoachQuestion(BaseModel):
    """A single interview question surfaced in the Coach UI."""

    id: str
    type: str = Field(..., description="behavioral | technical | resume | role")
    prompt: str
    category: str = ""
    difficulty: str = Field(default="medium", description="easy | medium | hard")
    modelAnswer: str = ""
    tip: str = ""


class CoachAnswer(BaseModel):
    questionId: str
    answer: str = ""
    updatedAt: Optional[str] = None


class CoachSessionCreate(BaseModel):
    """Body for POST /api/coach."""

    resumeId: Optional[str] = None
    jobDescription: str = Field(..., min_length=10)
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None
    questionCount: int = Field(default=8, ge=3, le=15)


class CoachAnswerUpdate(BaseModel):
    """Body for PUT /api/coach/{id}/answer."""

    questionId: str
    answer: str = ""


class CoachSession(BaseModel):
    id: str
    uid: str
    resumeId: Optional[str] = None
    jobDescription: str = ""
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None
    status: str = Field(default="ready", description="ready | in_progress | completed")
    questions: list[CoachQuestion] = Field(default_factory=list)
    answers: list[CoachAnswer] = Field(default_factory=list)
    generatedBy: str = Field(default="rules", description="rules | gemini")
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

# -------------------- Auth context --------------------


class AuthUser(BaseModel):
    """Authenticated user, derived from the Firebase ID token â€” never
    trusted from request body or query parameters."""

    uid: str
    email: Optional[str] = None
    name: Optional[str] = None

    class Config:
        frozen = True
