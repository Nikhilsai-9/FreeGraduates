"""AI resume-generation engine package.

The engine exposes a single high-level entry point — `generate_resume` —
which builds and runs a LangGraph workflow:

    rules_loader → job_analyzer → resume_generator → qa_validator

The engine is provider-agnostic in shape but currently bound to OpenAI
via the `OPENAI_API_KEY` env var. Swapping providers means implementing
a new `LLMClient` in `engine/llm.py`.
"""
from __future__ import annotations

from app.engine.schemas import (
    CandidateInput,
    EducationEntry,
    ExperienceEntry,
    Header,
    JobTarget,
    LanguageEntry,
    OptionalSection,
    ResumeStructured,
    SkillGroup,
    Skills,
    Summary,
)

__all__ = [
    "CandidateInput",
    "EducationEntry",
    "ExperienceEntry",
    "Header",
    "JobTarget",
    "LanguageEntry",
    "OptionalSection",
    "ResumeStructured",
    "SkillGroup",
    "Skills",
    "Summary",
]