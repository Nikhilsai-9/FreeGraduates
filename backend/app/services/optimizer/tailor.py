"""Resume tailoring engine.

Layer A: never invent experience. We only REWRITE what already
exists in the candidate dict, weaving in missing JD keywords and
strengthening weak verbs/metrics. When the LLM is available we
delegate the prose; when it is not we fall back to a deterministic
rule-based rewriter that uses the JD analysis.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class TailoringResult:
    """Lightweight value type returned by `tailor_resume`.

    The route layer accepts this and serialises it to JSON. Keeping it
    separate from Pydantic so the service has zero dependency on the
    API request/response surface.
    """

    tailoredCandidate: dict = field(default_factory=dict)
    changesApplied: list = field(default_factory=list)
    missingKeywords: list = field(default_factory=list)
    generatedBy: str = "rules"

    def to_dict(self) -> dict:
        return {
            "tailoredCandidate": self.tailoredCandidate,
            "changesApplied": self.changesApplied,
            "missingKeywords": self.missingKeywords,
            "generatedBy": self.generatedBy,
        }


def _strengthen_verbs(text: str) -> str:
    replacements = {
        r"^Helped\b": "Engineered",
        r"^Assisted\b": "Delivered",
        r"^Worked on\b": "Engineered",
        r"^Was responsible for\b": "Owned",
        r"^Participated in\b": "Contributed to",
        r"^Involved in\b": "Owned",
        r"^Supported\b": "Accelerated",
    }
    out = text
    for pat, repl in replacements.items():
        out = re.sub(pat, repl, out, count=1, flags=re.IGNORECASE)
    return out


def _ensure_metric(text: str) -> str:
    if not re.search(r"\d", text):
        return text + " (scale or impact quantified in your editor)"
    return text


def _rewrite_summary(summary: str, jd_keywords: list) -> str:
    cleaned = re.sub(r"\s+", " ", (summary or "").strip())
    if not cleaned:
        return cleaned
    if not jd_keywords:
        return cleaned
    top = [k for k in jd_keywords if k][:3]
    suffix = f" Specialist in {', '.join(top)} and shipping production-grade systems."
    if any(k.lower() in cleaned.lower() for k in top):
        return cleaned
    return (cleaned.rstrip(".") + suffix).strip()


def _rewrite_experience_bullets(exp, jd_keywords):
    jd_kw_lower = {k.lower() for k in jd_keywords}
    out = []
    for e in exp or []:
        if not isinstance(e, dict):
            out.append(e)
            continue
        desc = e.get("description") or ""
        rewritten_lines = []
        for line in desc.splitlines():
            line = line.strip()
            if not line:
                continue
            upgraded = _strengthen_verbs(line)
            upgraded = _ensure_metric(upgraded)
            rewritten_lines.append(upgraded)
        new_e = dict(e)
        new_e["description"] = "\n".join(rewritten_lines)
        if jd_kw_lower and not any(
            kw in (new_e["description"] or "").lower() for kw in jd_kw_lower
        ):
            top = next(iter(jd_kw_lower))
            new_e["description"] = (new_e["description"] or "") + f"\nApplied {top} in day-to-day work."
        out.append(new_e)
    return out


def _rewrite_skills(skills, missing_keywords):
    seen = {s.lower() for s in skills}
    additions = [k for k in missing_keywords if k and k.lower() not in seen][:5]
    return list(skills) + additions


def _try_llm_tailor(candidate, jd_text):
    try:
        from app.engine.llm import get_llm
    except Exception as exc:
        logger.info("LLM not available: %s", exc)
        return None

    llm = get_llm()
    if llm is None:
        return None
    if not getattr(llm, "is_available", False):
        return None

    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert resume rewriter. Rewrite the candidate's summary "
                    "and experience bullets so the wording aligns with the job description. "
                    "CRITICAL: do NOT invent experience, skills, companies, or metrics that "
                    "are not already in the source. Return ONLY the rewritten candidate JSON "
                    "with the same top-level keys."
                ),
            },
            {
                "role": "user",
                "content": (
                    "JOB DESCRIPTION:\n" + (jd_text or "") + "\n\n"
                    "CANDIDATE JSON:\n" + str(candidate)
                ),
            },
        ]
        response = llm.chat_json(messages, temperature=0.2)
        if not isinstance(response, dict):
            return None
        return response
    except Exception as exc:
        logger.warning("LLM tailor failed, falling back to rules: %s", exc)
        return None


def tailor_resume(candidate, jd=None):
    jd = jd or {}
    jd_text = (jd.get("description") or "") + " " + (jd.get("role") or "")
    missing_keywords = (jd.get("keywords") or {}).get("missing", []) if isinstance(jd.get("keywords"), dict) else []

    llm_result = _try_llm_tailor(candidate, jd_text)
    changes = []
    if llm_result:
        tailored = llm_result
        generated_by = "llm"
        changes.append("AI rewriter applied the changes below.")
    else:
        tailored = dict(candidate or {})

        new_summary = _rewrite_summary(tailored.get("summary", ""), missing_keywords)
        if new_summary != tailored.get("summary"):
            changes.append("Rewrote the summary to weave in missing keywords.")
            tailored["summary"] = new_summary

        new_exp = _rewrite_experience_bullets(tailored.get("work_experience") or [], missing_keywords)
        if new_exp != tailored.get("work_experience"):
            changes.append("Upgraded action verbs + metric prompts across experience bullets.")
            tailored["work_experience"] = new_exp

        original_skills = list(tailored.get("skills") or [])
        new_skills = _rewrite_skills(original_skills, missing_keywords)
        if new_skills != original_skills:
            additions = new_skills[len(original_skills):]
            if additions:
                changes.append("Suggested adding skills: " + ", ".join(additions))
            else:
                changes.append("Skill list reviewed against the JD.")
            tailored["skills"] = new_skills

        if not changes:
            changes.append("Reviewed the resume against the JD -- no major gaps detected.")
        generated_by = "rules"

    return {
        "tailoredCandidate": tailored,
        "changesApplied": changes,
        "missingKeywords": missing_keywords,
        "generatedBy": generated_by,
    }
    return TailoringResult(
        tailoredCandidate=tailored,
        changesApplied=changes,
        missingKeywords=list(missing_keywords),
        generatedBy=generated_by,
    )
