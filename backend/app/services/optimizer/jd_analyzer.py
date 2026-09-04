"""Job-description analysis.

Produces a structured ``JdAnalysisResult`` (role title, seniority,
must-have / nice-to-have buckets, responsibilities, keywords) from raw
JD text.

Deterministic layer is always on. When a configured ``llm`` is supplied
(``GEMINI_API_KEY`` present), an LLM-assisted pass can refine the
output. The deterministic pass is the source of truth — the LLM only
fills in ambiguous fields.

Adapted from the analysis-pass idea in ``JeevansSP/resume-optimizer``
(MIT). Implementation is original to FreeGraduates.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Iterable, Optional

from app.services.optimizer.keywords import ExtractedKeywords, extract_keywords
from app.services.optimizer.schemas import JdAnalysisResult, KeywordBucket

logger = logging.getLogger(__name__)


# Seniority detection is split into two layers:
#
# 1. ``_SENIORITY_WORD_NEEDLES`` — plain substring needles (used for the
#    *whole-JD fallback*). Order matters here: the detector picks the
#    highest-priority tag whose needle appears in the text.
#
# 2. ``_SENIORITY_WORD_REGEX`` — word-boundary regexes (used for the
#    *title* and *requirements* priority passes). These prevent false
#    matches like "intern" inside "internal" or "lead" inside "leader".
#
# Priority (highest → lowest):
#   principal > staff > lead > manager > director > senior > mid > junior > intern

_SENIORITY_ORDER: tuple[str, ...] = (
    "principal", "staff", "lead", "manager", "director",
    "senior", "mid", "junior", "intern",
)

_SENIORITY_WORD_NEEDLES: dict[str, tuple[str, ...]] = {
    "intern":    ("intern", "internship", "co-op", "coop"),
    "junior":    ("junior", "entry level", "entry-level", "graduate role", "new grad"),
    "mid":       ("mid level", "mid-level", "intermediate"),
    "senior":    ("senior", "sr."),
    "staff":     ("staff engineer", "staff software"),
    "principal": ("principal", "distinguished"),
    "lead":      ("tech lead", "team lead"),
    "manager":   ("engineering manager", "people manager"),
    "director":  ("head of", "vice president"),
}

_SENIORITY_WORD_REGEX: dict[str, str] = {
    "intern":    r"\bintern(?:ship)?\b",
    "junior":    r"\bjunior\b|\bentry[- ]level\b|\bnew\s+grad(?:uate)?\b",
    "mid":       r"\bmid[- ]?level\b|\bintermediate\b",
    "senior":    r"\bsenior\b|\bsr\.?(?=\s|\.|$)",
    "staff":     r"\bstaff\b(?!\s+member)",
    "principal": r"\bprincipal\b|\bdistinguished\b",
    "lead":      r"\btech[- ]?lead\b|\bteam\s+lead\b|\blead\s+(?:software|engineer|developer|scientist|architect|designer|pm|backend|frontend|full[- ]?stack|data|mobile|qa|test)\b|\blead\b",
    "manager":   r"\bmanager\b|\bhead\s+of\b",
    "director":  r"\bdirector\b|\bvice\s+president\b|\bvp\b",
}


def _seniority_in_text(text: str) -> Optional[str]:
    """Highest-priority seniority word found anywhere in *text*.

    Uses word-boundary regex so that substrings like "lead" inside
    "leader" or "intern" inside "internal" do not match. Returns
    ``None`` if no seniority word is found.
    """
    if not text:
        return None
    for tag in _SENIORITY_ORDER:
        pat = _SENIORITY_WORD_REGEX.get(tag)
        if pat and re.search(pat, text, re.IGNORECASE):
            return tag
    return None


def _parse_years_of_experience(text: str) -> Optional[int]:
    """Return the largest years-of-experience number found in *text*.

    Recognises:
        - ``5+ years``, ``5 years``, ``5 years of experience``
        - ``minimum 5 years``, ``at least 5 years``
        - ``2-4 years`` / ``2 to 4 years`` → upper bound (4)
        - ``minimum of 5 years`` / ``over 8 years``

    Returns ``None`` when nothing credible is found. We cap the
    candidate pool at 30 to avoid picking up unrelated numbers (e.g.
    ``"500 employees"`` followed by ``"years"``).
    """
    if not text:
        return None
    candidates: list[int] = []

    # Single-number forms: "5+ years", "5 years", "minimum 5 years",
    # "at least 5 years", "over 8 years", "more than 3 years".
    single_pat = re.compile(
        r"(?:minimum(?:\s+of)?|at\s+least|over|more\s+than)?\s*"
        r"(\d{1,2})\s*\+?\s*years?(?:\s+of\s+(?:professional\s+)?experience)?",
        re.IGNORECASE,
    )
    for m in single_pat.finditer(text):
        n = int(m.group(1))
        if 0 < n <= 30:
            candidates.append(n)

    # Range forms: "5-7 years", "2 to 4 years" — take upper bound.
    range_dash_pat = re.compile(
        r"(\d{1,2})\s*[-–]\s*(\d{1,2})\s*years?",
        re.IGNORECASE,
    )
    for m in range_dash_pat.finditer(text):
        a, b = int(m.group(1)), int(m.group(2))
        if 0 < a < b <= 30:
            candidates.append(b)

    range_to_pat = re.compile(
        r"(\d{1,2})\s+to\s+(\d{1,2})\s*years?",
        re.IGNORECASE,
    )
    for m in range_to_pat.finditer(text):
        a, b = int(m.group(1)), int(m.group(2))
        if 0 < a < b <= 30:
            candidates.append(b)

    return max(candidates) if candidates else None


def _years_to_seniority(n: int) -> str:
    """Map a years-of-experience count to a seniority tag."""
    if n <= 1:
        return "junior"
    if n <= 4:
        return "mid"
    if n <= 7:
        return "senior"
    if n <= 10:
        return "staff"
    return "principal"


_MUST_HAVE_HINTS: tuple[str, ...] = (
    "required", "must have", "must-have", "you must", "you should have",
    "requirements", "we require", "minimum qualifications",
    "what you'll bring", "what you bring",
)
_NICE_TO_HAVE_HINTS: tuple[str, ...] = (
    "nice to have", "nice-to-have", "bonus", "preferred", "a plus",
    "would be a plus", "good to have", "optional", "we'd love",
)


def _split_sections(text: str) -> dict[str, str]:
    """Split a JD into rough sections (best-effort)."""
    if not text:
        return {"body": ""}
    lower = text.lower()
    markers = [
        ("responsibilities", r"\b(responsibilities|what you.ll do|what the role|key responsibilities|your impact)\b"),
        ("must_have",        r"\b(required|must have|must-have|requirements|minimum qualifications|what you.ll bring|what you bring)\b"),
        ("nice_to_have",     r"\b(nice to have|nice-to-have|preferred|bonus|a plus|good to have)\b"),
        ("about",            r"\b(about (the role|you|the company|the team|the position)|company overview|about us)\b"),
    ]
    positions: list[tuple[int, int, str]] = []
    for name, pat in markers:
        for m in re.finditer(pat, lower):
            positions.append((m.start(), m.end(), name))
    if not positions:
        return {"body": text.strip()}
    positions.sort()
    sections: dict[str, str] = {}
    cursor = 0
    last_name = "prelude"
    for start, end, name in positions:
        if start > cursor:
            sections.setdefault(last_name, "")
            sections[last_name] += text[cursor:start].strip() + "\n"
        last_name = name
        cursor = end
    if cursor < len(text):
        sections.setdefault(last_name, "")
        sections[last_name] += text[cursor:].strip() + "\n"
    prelude = sections.pop("prelude", "") or sections.get("body", "")
    if prelude:
        sections["body"] = prelude
    return sections


def _detect_seniority(text: str) -> Optional[str]:
    """Determine the role's seniority with a strict priority order.

    Resolution order (first non-empty result wins):

      1. **Title / role title** - the strongest signal. A title like
         "Senior Software Engineer" with responsibilities that mention
         "mentor junior engineers" still resolves to ``senior`` because
         the title outranks responsibility-level mentions.
      2. **Requirements / qualifications section** - second tier.
         Phrases like "5+ years of experience" or "Mid-level engineer"
         live here. Explicit years-of-experience numbers in this
         section also win here, before we look at the full text.
      3. **Years of experience anywhere in the JD** - third tier. We
         pick the largest credible number we can find and map it to
         a seniority tag.
      4. **Whole-JD keyword fallback** - last resort. We pick the
         highest-priority seniority word found anywhere. This is
         intentionally the last pass because responsibilities
         frequently mention other seniority levels ("work with senior
         engineers", "mentor interns").

    Returns ``None`` only when no seniority information is present.
    """
    if not text:
        return None

    # The helpers below operate on the same parsed fields the rest of
    # this module already produces, so we re-use the existing parsers
    # rather than duplicating the work.
    sections = _split_sections(text)
    title = _detect_role_title(text)
    must_have = sections.get("must_have", "")

    # 1. Title (highest priority).
    if title:
        hit = _seniority_in_text(title)
        if hit:
            return hit

    # 2. Must-have / requirements section.
    if must_have:
        hit = _seniority_in_text(must_have)
        if hit:
            return hit
        yrs = _parse_years_of_experience(must_have)
        if yrs is not None:
            return _years_to_seniority(yrs)

    # 3. Years of experience anywhere in the JD.
    yrs = _parse_years_of_experience(text)
    if yrs is not None:
        return _years_to_seniority(yrs)

    # 4. Whole-JD keyword fallback.
    return _seniority_in_text(text)


def _detect_role_title(text: str) -> Optional[str]:
    """Best-effort guess at the role title from a JD."""
    if not text:
        return None
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if lines:
        first = lines[0]
        if 0 < len(first) <= 120:
            return first
    m = re.search(
        r"(?:job title|position|role)\s*[:\-]\s*([^\n,;]{3,80})",
        text,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).strip()
    m = re.search(
        r"(?:hiring|looking for|seeking)\s+(?:a|an)\s+([A-Z][A-Za-z\-/& ]{3,80})",
        text,
    )
    if m:
        return m.group(1).strip()
    return None


def _extract_bullets(text: str, limit: int = 12) -> list[str]:
    """Pull bullet-line items from text."""
    if not text:
        return []
    out: list[str] = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        for prefix in ("\u2022", "\u00b7", "\u25aa", "\u2023", "\u25e6", "\u25cb", "\u25cf"):
            if s.startswith(prefix):
                s = s[len(prefix):].strip()
                break
        s = re.sub(r"^(\d{1,2}[\.\)]|\*|-)\s+", "", s)
        if 5 <= len(s) <= 240 and not s.endswith(":"):
            out.append(s)
        if len(out) >= limit:
            break
    return out


def _must_vs_nice(sections: dict[str, str]) -> tuple[list[str], list[str]]:
    """Bucket JD requirements into must-have and nice-to-have."""
    if not sections:
        return [], []
    must_pool: list[str] = []
    nice_pool: list[str] = []
    for name, body in sections.items():
        if "must" in name or "required" in name or "requirement" in name:
            must_pool.extend(_extract_bullets(body, limit=16))
        elif "nice" in name or "preferred" in name or "bonus" in name:
            nice_pool.extend(_extract_bullets(body, limit=12))
    if not must_pool and not nice_pool:
        body = sections.get("body", "")
        currently_must = False
        currently_nice = False
        for line in body.splitlines():
            low = line.lower()
            if any(h in low for h in _MUST_HAVE_HINTS):
                currently_must = True
                currently_nice = False
                continue
            if any(h in low for h in _NICE_TO_HAVE_HINTS):
                currently_nice = True
                currently_must = False
                continue
            for b in _extract_bullets(line, limit=1):
                if currently_must:
                    must_pool.append(b)
                elif currently_nice:
                    nice_pool.append(b)

    def _dedup(items: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        out_list: list[str] = []
        for x in items:
            key = x.strip().lower()
            if key and key not in seen:
                seen.add(key)
                out_list.append(x.strip())
        return out_list

    return _dedup(must_pool), _dedup(nice_pool)


def _ats_readiness_signals(text: str) -> dict:
    """Lightweight signals about the JD itself (not the resume)."""
    if not text:
        return {"structured": False, "wordCount": 0, "signals": []}
    words = len(re.findall(r"\b\w+\b", text))
    lower = text.lower()
    signals: list[str] = []
    structured = False
    if any(k in lower for k in ("responsibilities", "requirements", "qualifications")):
        signals.append("Has clear sections")
        structured = True
    if re.search(r"\d+\s*\+?\s*years?", lower):
        signals.append("Mentions years of experience")
    if words >= 200:
        signals.append("Adequate length")
    if words < 100:
        signals.append("Very short - may lack detail")
    return {"structured": structured, "wordCount": words, "signals": signals}


def analyze_job_description(text: str) -> JdAnalysisResult:
    """Produce a structured analysis of a JD.

    Args:
        text: Raw JD text.

    Returns:
        ``JdAnalysisResult`` ready for the frontend.
    """
    if not text or not text.strip():
        raise ValueError("Job description is empty.")

    sections = _split_sections(text)
    role = _detect_role_title(text)
    seniority = _detect_seniority(text)

    keywords: ExtractedKeywords = extract_keywords(text)
    must, nice = _must_vs_nice(sections)

    responsibilities = _extract_bullets(sections.get("responsibilities", ""), limit=8)
    if len(responsibilities) < 3:
        for b in _extract_bullets(sections.get("body", ""), limit=8):
            if b not in responsibilities:
                responsibilities.append(b)
            if len(responsibilities) >= 6:
                break

    must_text = "\n".join(must)
    must_keywords = extract_keywords(must_text)
    nice_text = "\n".join(nice)
    nice_keywords = extract_keywords(nice_text)
    required_pool: set[str] = set()
    required_pool |= set(must_keywords.technical)
    required_pool |= set(nice_keywords.technical)
    required_pool |= set(keywords.technical)
    required_pool |= set(must_keywords.soft)
    required_pool |= set(keywords.soft)

    bucket = KeywordBucket(
        matched=[],
        missing=sorted(required_pool, key=str.lower),
        extra=[],
    )

    return JdAnalysisResult(
        roleTitle=role,
        seniority=seniority,
        keywords=bucket,
        mustHave=must,
        niceToHave=nice,
        responsibilities=responsibilities,
        atsReadiness=_ats_readiness_signals(text),
    )


def diff_keywords_against_resume(
    jd: JdAnalysisResult,
    resume_keywords: ExtractedKeywords,
) -> tuple[list[str], list[str]]:
    """Return (matched, missing) keyword lists given the JD's bucket.

    The JD-side ``missing`` field already contains the union of relevant
    keywords; we test each one against the resume's keyword set.
    """
    if not jd or not resume_keywords:
        return [], list(jd.keywords.missing) if jd else []
    resume_words = {
        w.lower()
        for w in (
            resume_keywords.technical
            + resume_keywords.soft
            + resume_keywords.general
        )
    }
    jd_targets = list(jd.keywords.missing) if jd.keywords else []
    matched: list[str] = []
    missing: list[str] = []
    for kw in jd_targets:
        kl = kw.lower()
        tokens = [t for t in re.split(r"[\s/_\-]+", kl) if t]
        in_resume = all(t in resume_words for t in tokens) if tokens else kl in resume_words
        if in_resume:
            matched.append(kw)
        else:
            missing.append(kw)
    return matched, missing


_LLM_JD_REFINE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "roleTitle": {"type": "string"},
        "seniority": {"type": "string"},
        "responsibilities": {"type": "array", "items": {"type": "string"}},
        "mustHave": {"type": "array", "items": {"type": "string"}},
        "niceToHave": {"type": "array", "items": {"type": "string"}},
    },
}


def _refine_with_llm(text: str, base: JdAnalysisResult, llm) -> Optional[JdAnalysisResult]:
    """Ask Gemini to refine title / seniority / responsibilities."""
    if llm is None or not getattr(llm, "is_available", False):
        return None
    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a precise job-description analyst. "
                    "Refine the roleTitle, seniority, and bullet lists. "
                    "If the deterministic values are already correct, return them unchanged. "
                    "Do not invent facts that are not in the job description. "
                    "Return JSON matching the schema only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Job description text:\n---\n{text}\n---\n\n"
                    f"Deterministic baseline:\n{json.dumps(base.model_dump(), indent=2)}\n\n"
                    "Return refined JSON. Empty fields mean 'use baseline'."
                ),
            },
        ]
        out = llm.chat_json(
            messages=messages,
            response_schema=_LLM_JD_REFINE_SCHEMA,
            schema_name="jd_refine",
            temperature=0.0,
            max_tokens=1500,
        )
    except Exception as exc:
        logger.info("JD refine LLM call failed: %s", exc)
        return None
    if not isinstance(out, dict):
        return None
    merged = {**base.model_dump()}
    for k, v in out.items():
        if v:
            merged[k] = v
    return JdAnalysisResult(**merged)


def analyze_job_description_with_llm(text: str, llm=None) -> JdAnalysisResult:
    """Public entry point combining deterministic + LLM analysis."""
    base = analyze_job_description(text)
    refined = _refine_with_llm(text, base, llm)
    return refined or base
