"""Loads the four "Layer" rule files that govern generation. These files
are the constitution of the FreeGraduates AI resume system — nothing
in the code is allowed to contradict them.

Layer A — Truth & Source Authority (the non-negotiable constitution).
Layer B — Candidate Input Contract (input schema, seniority, length budgets).
Layer C — Structured Output & Presentation (Markdown, ATS-safe rendering).
Layer D — Validation & Recovery (post-generation QA, correction loop).

The layer files in ``backend/app/data/rules/`` are original FreeGraduates
content authored in-house for this project. They are not adapted from
any upstream source.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from app.config import get_settings


LAYER_FILES = {
    "A": "layer_a.md",
    "B": "layer_b.md",
    "C": "layer_c.md",
    "D": "layer_d.md",
}


@lru_cache(maxsize=1)
def load_all_rules() -> str:
    """Concatenate all four layers into a single rules string.

    Returns an empty string if the rules directory is missing — callers
    must check `is_rules_loaded()` and fail loudly.
    """
    rules_dir: Path = get_settings().rules_dir
    parts: list[str] = []
    for layer, filename in LAYER_FILES.items():
        path = rules_dir / filename
        if not path.exists():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="latin-1", errors="replace")
        parts.append(f"\n\n===== LAYER {layer} =====\n{text.strip()}\n===== END LAYER {layer} =====\n")
    return "\n".join(parts).strip()


def is_rules_loaded() -> bool:
    """True when at least one layer was found and loaded."""
    return bool(load_all_rules())


def clear_cache() -> None:
    """Used in tests / when rules are hot-reloaded."""
    load_all_rules.cache_clear()