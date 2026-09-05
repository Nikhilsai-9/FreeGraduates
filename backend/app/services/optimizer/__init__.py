"""FreeGraduates AI Resume Optimizer backend services.

Adapts selected, useful logic from the open-source project
``JeevansSP/resume-optimizer`` (MIT License) — primarily the dual-extraction
PDF pipeline, deterministic keyword/skill extraction, and Layer A
fact-preservation rules for AI tailoring — and integrates it cleanly into
the FreeGraduates architecture.

No code from the source repository's Vue frontend is copied. The
FreeGraduates React UI is the canonical UI.

See ``ATTRIBUTION.md`` in this package for license details.
"""

# Re-export public symbols lazily so partial installs (during incremental
# development) don't break. Each symbol is resolved on first access.
from __future__ import annotations

__all__ = [
    "extract_keywords",
    "TECH_LEXICON",
    "SOFT_LEXICON",
    "analyze_job_description",
    "JdAnalysisResult",
    "score_resume_against_jd",
    "MatchScore",
    "tailor_resume",
    "TailoringResult",
    "OptimizerStorage",
    "get_optimizer_storage",
    "OptimizationRecord",
    "OptimizationSummary",
    "AnalyzeRequest",
    "TailorRequest",
    "UpdateOptimizationRequest",
    "ExportResponse",
]


def __getattr__(name: str):
    if name in ("extract_keywords", "TECH_LEXICON", "SOFT_LEXICON"):
        from app.services.optimizer.keywords import (
            extract_keywords, TECH_LEXICON, SOFT_LEXICON,
        )
        if name == "extract_keywords":
            return extract_keywords
        if name == "TECH_LEXICON":
            return TECH_LEXICON
        return SOFT_LEXICON
    if name in ("analyze_job_description",):
        from app.services.optimizer.jd_analyzer import analyze_job_description
        return analyze_job_description
    if name == "JdAnalysisResult":
        from app.services.optimizer.schemas import JdAnalysisResult
        return JdAnalysisResult
    if name == "score_resume_against_jd":
        from app.services.optimizer.scorer import score_resume_against_jd
        return score_resume_against_jd
    if name == "MatchScore":
        from app.services.optimizer.schemas import MatchScore
        return MatchScore
    if name in ("tailor_resume", "TailoringResult"):
        from app.services.optimizer.tailor import tailor_resume, TailoringResult
        return tailor_resume if name == "tailor_resume" else TailoringResult
    if name in ("OptimizerStorage", "get_optimizer_storage"):
        from app.services.optimizer.storage import (
            OptimizerStorage, get_optimizer_storage,
        )
        return OptimizerStorage if name == "OptimizerStorage" else get_optimizer_storage
    if name in (
        "OptimizationRecord", "OptimizationSummary",
        "AnalyzeRequest", "TailorRequest",
        "UpdateOptimizationRequest", "ExportResponse",
    ):
        from app.services.optimizer import schemas as _schemas
        return getattr(_schemas, name)
    raise AttributeError(f"module 'app.services.optimizer' has no attribute {name!r}")

