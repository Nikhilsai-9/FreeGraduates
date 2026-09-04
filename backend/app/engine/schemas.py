"""Structured resume schema (the AI output contract).

This schema is the "DNA" of every generated resume. It is derived directly
from the haderalva/ai-resume-builder project (Layer C — Hybrid Output Mode)
and is the single source of truth that:

* The LangGraph generator targets with `response_format={"type": "json_schema"}`.
* The QA layer validates against.
* The export pipelines (DOCX, PDF, Markdown) render from.

Adapting it for FreeGraduates:
* Field naming stays snake_case so the upstream rule text remains valid.
* Optional sections are preserved so student-friendly resumes (projects,
  achievements, certifications) are first-class.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# -------------------- Header / Contact --------------------


class Header(BaseModel):
    full_name: str = Field(..., description="Candidate full name.")
    title: str = Field(..., description="Professional title (e.g. 'Software Engineer').")
    location: Optional[str] = Field(None, description="City, Country.")
    contacts: list[str] = Field(
        default_factory=list,
        description="Contact lines (email, phone, LinkedIn, GitHub, website).",
    )


# -------------------- Summary --------------------


class Summary(BaseModel):
    summary_text: str = Field(..., description="Professional summary paragraph.")


# -------------------- Skills --------------------


class SkillGroup(BaseModel):
    group_name: str = Field(..., description="Group name (e.g. 'Languages').")
    items: list[str] = Field(default_factory=list)


class Skills(BaseModel):
    groups: list[SkillGroup] = Field(default_factory=list)


# -------------------- Experience --------------------


class ExperienceEntry(BaseModel):
    role: str = Field(..., description="Job title.")
    company: str = Field(..., description="Employer / organisation.")
    location: Optional[str] = None
    start_date: str = Field(..., description="YYYY-MM or freeform ('Jun 2025').")
    end_date: str = Field(..., description="YYYY-MM, freeform, or 'Present'.")
    highlights: list[str] = Field(
        default_factory=list,
        description="Bulleted achievements — only facts supplied by the candidate.",
    )


# -------------------- Education --------------------


class EducationEntry(BaseModel):
    institution: str
    degree: str
    field: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = Field(
        None,
        description="Optional CGPA / GPA — only emitted when provided by the candidate.",
    )


# -------------------- Languages --------------------


class LanguageEntry(BaseModel):
    name: str
    level: str = Field(..., description="e.g. 'Native', 'Fluent', 'B2'.")


# -------------------- Optional sections --------------------


class OptionalSection(BaseModel):
    """Generic container for optional sections: Projects, Certifications,
    Awards, Publications, Volunteering, etc."""

    title: str
    items: list[str] = Field(default_factory=list)


# -------------------- Top-level structured resume --------------------


class ResumeStructured(BaseModel):
    """The complete generated resume.

    This Pydantic model is also used as the Gemini `response_schema` target so
    the model is forced to emit strict JSON that downstream tools can rely on.
    """

    header: Header
    summary: Summary
    skills: Skills
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    languages: Optional[list[LanguageEntry]] = None
    optional_sections: Optional[list[OptionalSection]] = None


# -------------------- Candidate input (frontend payload) --------------------


class CandidateInput(BaseModel):
    """What the FreeGraduates frontend sends to the AI engine.

    This is *candidate-controlled* data: the AI must NEVER invent any field
    that is null/empty. Layer A of the rules enforces this.
    """

    personal_info: dict = Field(default_factory=dict)
    summary: Optional[str] = None
    work_experience: list[dict] = Field(default_factory=list)
    education: list[dict] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    projects: list[dict] = Field(default_factory=list)
    certifications: list[dict] = Field(default_factory=list)
    awards: list[dict] = Field(default_factory=list)
    publications: list[dict] = Field(default_factory=list)
    languages: list[dict] = Field(default_factory=list)
    teaching: list[dict] = Field(default_factory=list)
    volunteering: list[dict] = Field(default_factory=list)


class JobTarget(BaseModel):
    """Optional job-description targeting block."""

    role: Optional[str] = Field(None, description="Target job title, e.g. 'Software Engineer'.")
    company: Optional[str] = Field(None, description="Optional target company.")
    description: Optional[str] = Field(None, description="Raw job-description text.")