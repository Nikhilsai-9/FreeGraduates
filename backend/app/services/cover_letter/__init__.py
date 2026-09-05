"""FreeGraduates Cover Letter backend services.

Generates a JD-tailored cover letter from a saved resume. Truth-constrained
like the Optimizer: only restates experience that already exists in the
candidate dict. Falls back to a deterministic rule-based generator when the
LLM is unavailable.

Storage: per-user JSON files under ``<data_dir>/cover_letter/<uid>/``.
"""

from __future__ import annotations

__all__ = [
    "generate_cover_letter",
    "CoverLetterStorage",
    "get_cover_letter_storage",
]


def __getattr__(name: str):
    if name == "generate_cover_letter":
        from app.services.cover_letter.generator import generate_cover_letter
        return generate_cover_letter
    if name in ("CoverLetterStorage", "get_cover_letter_storage"):
        from app.services.cover_letter.storage import (
            CoverLetterStorage, get_cover_letter_storage,
        )
        return CoverLetterStorage if name == "CoverLetterStorage" else get_cover_letter_storage
    raise AttributeError(f"module 'app.services.cover_letter' has no attribute {name!r}")
