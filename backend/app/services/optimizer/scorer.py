"""Resume-vs-JD scoring engine.

Compares a parsed resume (frontend-shape candidate dict) against a
``JdAnalysisResult`` and returns a deterministic ``MatchScore`` with a
weighted breakdown.

Why deterministic?

* Free of LLM cost and latency.
* Reproducible: identical inputs always produce identical scores.
* Auditable: recruiters can read the algorithm and explain any number.

The sub-scores (sum of weights = 100) are:

* ``keywordMatch``  (40) - what fraction of the JD's relevant keywords
  (technical + soft) appear in the resume.
* ``skillsMatch``   (25) - what fraction of the JD's must-have technical
  skills appear in the resume. Each must-have bullet is treated as a
  unit, so a single bullet that asks for "Python, AWS, PostgreSQL"
  counts as one unit only if *all three* are present in the resume.
* ``experienceMatch`` (15) - heuristic alignment between the JD's
  detected seniority band and the resume's estimated years of
  experience.
* ``atsReadiness``  (20) - structural ATS-friendliness of the resume:
  presence of contact info, sections, and bullet density.

Seniority comes from ``jd.seniority`` (which is itself computed by the
priority-based ``_detect_seniority`` in ``jd_analyzer``). The scorer
never re-implements seniority detection.

Substring-matching pitfalls (e.g. ``java`` matching ``javascript``,
``lead`` matching ``leader``) are avoided by reusing
``app.services.optimizer.keywords._build_word_pattern``, which uses
word boundaries and a punctuation-tolerant token joiner.

Adapted from the scoring idea in ``JeevansSP/resume-optimizer`` (MIT).
Implementation, weights, and tolerance bands are original to
FreeGraduates.
"""

from __future__ import annotations

import logging
import re
from typing import Iterable, Optional

from app.services.optimizer.jd_analyzer import diff_keywords_against_resume
from app.services.optimizer.keywords import (
    ExtractedKeywords,
    _build_word_pattern,
    extract_keywords,
)
from app.services.optimizer.schemas import (
    JdAnalysisResult,
    MatchScore,
    ScoreBreakdown,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Sub-score weights (sum = 100).
# Exposed as module constants so tests and the API can reference the
# single source of truth. Change one number, every score changes with it.
# ---------------------------------------------------------------------------

WEIGHT_KEYWORD_MATCH: float = 40.0
WEIGHT_SKILLS_MATCH: float = 25.0
WEIGHT_EXPERIENCE_MATCH: float = 15.0
WEIGHT_ATS_READINESS: float = 20.0

assert (
    WEIGHT_KEYWORD_MATCH
    + WEIGHT_SKILLS_MATCH
    + WEIGHT_EXPERIENCE_MATCH
    + WEIGHT_ATS_READINESS
    == 100.0
), "Sub-score weights must sum to 100"


# ---------------------------------------------------------------------------
# Seniority -> expected years map. Used only for the experienceMatch
# sub-score; the canonical seniority detection lives in jd_analyzer.
# ---------------------------------------------------------------------------

_SENIORITY_EXPECTED_YEARS: dict[str, float] = {
    "intern":    0.0,
    "junior":    2.0,
    "mid":       4.0,
    "senior":    7.0,
    "staff":    10.0,
    "lead":      8.0,
    "manager":  10.0,
    "director": 15.0,
    "principal":12.0,
}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def flatten_resume(parsed: Optional[dict]) -> str:
    """Concatenate every textual field of a parsed resume into one string.

    The output is fed straight to :func:`extract_keywords`, so it is
    tolerant to missing / None fields. List values are joined with a
    space; nested dicts (e.g. ``personal_info``) are flattened one
    level deep.
    """
    if not parsed:
        return ""
    parts: list[str] = []

    pi = parsed.get("personal_info") or {}
    for k in ("fullName", "summary", "headline"):
        v = pi.get(k)
        if v:
            parts.append(str(v))

    for we in parsed.get("work_experience") or []:
        for k in ("title", "company", "description", "location"):
            v = we.get(k)
            if v:
                parts.append(str(v))
        for b in we.get("bullets") or []:
            if b:
                parts.append(str(b))

    for ed in parsed.get("education") or []:
        for k in ("institution", "degree", "field", "description"):
            v = ed.get(k)
            if v:
                parts.append(str(v))

    for sk in parsed.get("skills") or []:
        if isinstance(sk, str):
            if sk:
                parts.append(sk)
        elif isinstance(sk, dict):
            for v in sk.values():
                if v:
                    parts.append(str(v))

    for pr in parsed.get("projects") or []:
        for k in ("name", "description", "tech"):
            v = pr.get(k)
            if v:
                if isinstance(v, list):
                    parts.append(" ".join(str(x) for x in v))
                else:
                    parts.append(str(v))

    return " ".join(parts)


def extract_resume_keywords(parsed: Optional[dict]) -> ExtractedKeywords:
    """Same engine as the JD side, applied to the resume."""
    return extract_keywords(flatten_resume(parsed))


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    """Clamp a sub-score into the schema's [0, 100] range."""
    return max(lo, min(hi, value))


def _round1(value: float) -> float:
    """Round to one decimal so test assertions are stable."""
    return round(value, 1)


# ---------------------------------------------------------------------------
# Date / experience estimation
# ---------------------------------------------------------------------------


_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _parse_date(token: str, default_year: Optional[int] = None) -> Optional[int]:
    """Best-effort: return (year, month) packed as YYYYMM, or None."""
    token = token.strip()
    if not token:
        return None
    low = token.lower()
    if low in ("present", "current", "now"):
        from datetime import date
        today = date.today()
        return today.year * 100 + today.month
    m = re.search(r"([A-Za-z]{3,9})[\s,\-]+(\d{4})", token, re.IGNORECASE)
    if m:
        mon = _MONTHS.get(m.group(1)[:3].lower())
        yr = int(m.group(2))
        if mon and 1900 < yr < 2100:
            return yr * 100 + mon
    m = re.search(r"(\d{4})[-/](\d{1,2})", token)
    if m:
        yr, mon = int(m.group(1)), int(m.group(2))
        if 1900 < yr < 2100 and 1 <= mon <= 12:
            return yr * 100 + mon
    m = re.search(r"\b(\d{4})\b", token)
    if m:
        yr = int(m.group(1))
        if 1900 < yr < 2100:
            yr_in = default_year if default_year is not None else 1
            return yr * 100 + yr_in
    return None


def _split_date_range(text: str) -> tuple[Optional[int], Optional[int]]:
    """Return (start_YYYYMM, end_YYYYMM) from a date-range string."""
    if not text:
        return None, None
    norm = text.replace("\u2013", "-").replace("\u2014", "-")
    parts = re.split(
        r"\s+to\s+|\s+-\s+|\s+through\s+|\s+until\s+",
        norm, maxsplit=1, flags=re.IGNORECASE,
    )
    if len(parts) == 2:
        start = _parse_date(parts[0])
        end = _parse_date(parts[1])
    else:
        start = _parse_date(norm)
        end = None
    return start, end


def estimate_resume_years(parsed: Optional[dict]) -> Optional[float]:
    """Estimate years of experience from ``work_experience`` entries.

    Strategy:
      * Parse each entry's ``startDate`` / ``endDate`` (or ``start`` /
        ``end``) into (year, month).
      * Sum *overlapping* months so two part-time roles don't
        double-count.
      * Cap at a sane upper bound (50 years) to defend against garbage
        dates.
      * If no parseable dates, fall back to a heuristic of 2.5 years
        per role with no end date set and 2.0 years per closed role.

    Returns ``None`` only when the resume has no work-experience section
    at all.
    """
    if not parsed:
        return None
    entries = parsed.get("work_experience") or []
    if not entries:
        return None

    intervals: list[tuple[int, int]] = []
    fallback_durations: list[float] = []
    for we in entries:
        start_text = (
            we.get("startDate")
            or we.get("start_date")
            or we.get("start")
            or ""
        )
        end_text = (
            we.get("endDate")
            or we.get("end_date")
            or we.get("end")
            or ""
        )
        start, end = _split_date_range(start_text) if start_text else (None, None)
        end_p, _ = _split_date_range(end_text) if end_text else (None, None)
        if start and end_p:
            intervals.append((min(start, end_p), max(start, end_p)))
        elif start:
            from datetime import date
            today = date.today().year * 100 + date.today().month
            intervals.append((start, today))
            fallback_durations.append(2.5)
        elif end_p:
            from datetime import date
            today = date.today().year * 100 + date.today().month
            intervals.append((max(1, end_p - 24 * 100 + 1), end_p))
            fallback_durations.append(2.0)
        else:
            fallback_durations.append(2.0)

    if intervals:
        merged = sorted(intervals)
        out: list[list[int]] = []
        for s, e in merged:
            if out and s <= out[-1][1]:
                out[-1][1] = max(out[-1][1], e)
            else:
                out.append([s, e])
        months = 0
        for s, e in out:
            sy, sm = divmod(s, 100)
            ey, em = divmod(e, 100)
            # Inclusive end-month: Jan 2016 -> Dec 2017 is 24 months,
            # Jan 2018 -> Jun 2024 is 78 months. The +1 makes each
            # interval span both endpoints; merging consecutive or
            # overlapping intervals then sums their union correctly.
            months += max(0, (ey - sy) * 12 + (em - sm) + 1)
        years = months / 12.0
        if fallback_durations:
            years += sum(fallback_durations) * 0.5
        return min(50.0, max(0.0, years))

    return min(20.0, 2.0 * len(entries))


# ---------------------------------------------------------------------------
# Generic JD requirement / soft-skill fluff words.
#
# Used by ``_score_skills_match`` to strip non-domain words out of an
# *unrecognised* JD bullet before doing the raw-text fallback. A
# curated list keeps us from accidentally passing a bullet just because
# it contains "experience", "knowledge", "skills", etc.
#
# IMPORTANT: must NOT contain real technology names (Cobol, Haskell,
# Kafka, AWS, Node.js, C++, C#, DB2, GCP, etc.) - those should still
# reach the raw-text matcher.
# ---------------------------------------------------------------------------

_GENERIC_REQUIREMENT_WORDS: frozenset[str] = frozenset({
    # experience / ability framing
    "experience", "experiences",
    "skill", "skills", "skilled",
    "knowledge", "knowledgeable",
    "ability", "abilities", "able",
    "working", "work",
    "familiarity", "familiar",
    "proficient", "proficiency",
    "understanding", "understand",
    "exposure", "background",
    "years", "year", "yr", "yrs",
    # soft-skill adjectives
    "strong", "excellent", "good",
    "demonstrated", "demonstrate",
    "proven", "solid",
    "deep", "extensive", "advanced", "basic",
    "some", "great", "exceptional", "outstanding",
    "expert", "expertise",
    "motivated", "motivation",
    "drive", "driven",
    "passion", "passionate",
    "energetic",
    "detail", "detailed", "oriented",
    "focus", "focused", "thorough",
    "reliable", "dependable",
    "flexible", "adaptable", "independent",
    "learner", "learning", "growth", "mindset",
    # soft-skill nouns
    "communication", "communicator", "communications",
    "ethic", "ethics", "attitude", "leadership",
    # job-title / role words
    "candidate", "candidates",
    "engineer", "developer", "scientist", "programmer", "manager",
    "person", "professional", "individual",
    "team", "member", "members",
    # connectors / verbs / articles
    "must", "should", "required", "desired", "preferred",
    "needed", "need",
    "have", "has", "having",
    "with", "using", "via", "through", "by",
    "in", "of", "for", "to", "and", "or", "the", "a", "an",
    "is", "are", "was", "were", "be", "been", "being",
    "including", "include", "includes",
    "equivalent", "similar", "related", "relevant",
    "minimum", "maximum",
    "at", "least", "most", "more", "less", "very",
    "hands",
})


def _term_in_text(term: str, text: str) -> bool:
    """Whole-word, case-insensitive match of ``term`` in ``text``.

    Uses :func:`_build_word_pattern` so terms with punctuation
    (``Node.js``, ``C++``, ``C#``) match correctly and so a term
    never matches as a substring of an unrelated word (e.g. ``Java``
    must not match ``JavaScript``).
    """
    if not term or not text:
        return False
    pattern = _build_word_pattern(term)
    # ``_build_word_pattern`` already embeds ``re.IGNORECASE`` in the
    # compiled pattern, so we cannot pass flags again here.
    return re.search(pattern, text) is not None


# ---------------------------------------------------------------------------
# Sub-scores
# ---------------------------------------------------------------------------


def _score_keyword_match(
    jd: JdAnalysisResult,
    resume_kw: ExtractedKeywords,
) -> tuple[float, list[str], list[str]]:
    """% of JD keywords found in the resume. Returns (score, matched, missing)."""
    if jd is None:
        return 100.0, [], []
    matched, missing = diff_keywords_against_resume(jd, resume_kw)
    total = len(matched) + len(missing)
    if total == 0:
        # No JD-side keywords at all - neutral pass.
        return 100.0, matched, missing
    score = _clamp(len(matched) / total * 100.0)
    return score, matched, missing


def _score_skills_match(
    jd: JdAnalysisResult,
    resume_kw: Optional[ExtractedKeywords],
    resume_text: str = "",
) -> float:
    """% of JD must-have technical skills present in the resume.

    Each ``mustHave`` bullet is a unit. The rule per bullet depends on
    what ``extract_keywords`` recognises in the bullet:

    * **Branch A — recognised technical terms.** Require *all* of
      them to appear in the resume's keyword set.
    * **Branch B — recognised soft-skill terms only.** Treat the
      bullet as a neutral free-pass (a generic soft-skill requirement
      should not penalise the candidate).
    * **Branch C — completely unrecognised.** Tokenise the raw
      bullet, strip generic requirement / soft-skill fluff words
      (see :data:`_GENERIC_REQUIREMENT_WORDS`), and require at least
      one remaining candidate term to appear as a whole word in the
      raw resume text. This is the safety net for niche
      technologies (Cobol, Haskell, Erlang, DB2, …) that are not yet
      in our keyword lexicon. The whole-word match uses
      :func:`_term_in_text` so ``Java`` cannot satisfy itself inside
      ``JavaScript``.

    ``resume_kw`` may be ``None`` - in that case ``resume_words`` is
    empty but the function still works. ``resume_text`` may be empty,
    in which case the Branch C fallback can never find a candidate
    and the bullet only matches under Branch A or B.
    """
    if jd is None:
        return 100.0
    must_have = list(jd.mustHave or [])
    if not must_have:
        return 100.0

    resume_words: set[str] = set()
    if resume_kw is not None:
        resume_words = {
            w.lower()
            for w in (resume_kw.technical + resume_kw.soft + resume_kw.general)
        }

    matched = 0
    evaluated = 0
    for req in must_have:
        if not req or not req.strip():
            continue
        evaluated += 1
        kw = extract_keywords(req)

        # ---- Branch A: recognised technical terms --------------------
        if kw.technical:
            if all(t.lower() in resume_words for t in kw.technical):
                matched += 1
            continue

        # ---- Branch B: soft-skill-only bullet -> free pass -----------
        if kw.soft:
            matched += 1
            continue

        # ---- Branch C: nothing recognised -> raw-text fallback -------
        tokens = re.findall(r"[A-Za-z][A-Za-z0-9.+#-]{1,}", req)
        candidates = [
            t.lower()
            for t in tokens
            if t.lower() not in _GENERIC_REQUIREMENT_WORDS
        ]
        if not candidates:
            # Bullet is pure fluff (e.g. "Strong work ethic") - free
            # pass.
            matched += 1
            continue
        if any(_term_in_text(term, resume_text) for term in candidates):
            matched += 1

    if evaluated == 0:
        return 100.0
    return _clamp(matched / evaluated * 100.0)


def _score_experience_match(
    jd_seniority: Optional[str],
    resume_years: Optional[float],
) -> float:
    """How well the resume's experience lines up with the JD's seniority.

    The score degrades linearly from the centre of the expected band:

      * Within +/- 1 year of the centre - full marks (100).
      * Up to +/- 5 years - linear fall-off.
      * More than +/- 5 years - score 0.

    If either side is missing (unknown seniority, or no work_experience
    entries), return a neutral 60 rather than guessing.
    """
    if jd_seniority is None or resume_years is None:
        return 60.0
    expected = _SENIORITY_EXPECTED_YEARS.get(jd_seniority.lower())
    if expected is None:
        return 60.0
    delta = abs(resume_years - expected)
    if delta <= 1.0:
        return 100.0
    if delta <= 5.0:
        return _clamp(100.0 * (1.0 - (delta - 1.0) / 4.0))
    return 0.0


def _score_ats_readiness(parsed: Optional[dict]) -> float:
    """Structural ATS-friendliness of the resume.

    Components:

      * Contact info present (full name, email)            - 25
      * Each of: work_experience, education, skills        - 15 each
      * Average bullet density in work_experience (>= 2)   - 20
      * Has a summary / headline                            - 10
    """
    if not parsed:
        return 0.0

    score = 0.0
    pi = parsed.get("personal_info") or {}
    if pi.get("fullName"):
        score += 12.5
    if pi.get("email"):
        score += 12.5
    if parsed.get("work_experience"):
        score += 15.0
    if parsed.get("education"):
        score += 15.0
    if parsed.get("skills"):
        score += 15.0

    work = parsed.get("work_experience") or []
    if work:
        bullet_counts = [len(w.get("bullets") or []) for w in work]
        avg = sum(bullet_counts) / len(bullet_counts)
        # Average >= 2 bullets per role = full 20 points (a complete
        # resume with reasonable detail per role).
        # Average >= 1 bullet per role = partial 10 points.
        if avg >= 2:
            score += 20.0
        elif avg >= 1:
            score += 10.0

    if pi.get("summary") or pi.get("headline"):
        score += 10.0

    return _clamp(score)


# ---------------------------------------------------------------------------
# Qualitative lists (strengths / gaps / suggestions)
# ---------------------------------------------------------------------------


def _format_keyword_list(items: Iterable[str], limit: int = 6) -> str:
    items = list(items)
    if not items:
        return ""
    if len(items) <= limit:
        return ", ".join(items)
    return ", ".join(items[:limit]) + f" (+{len(items) - limit} more)"


def _build_lists(
    parsed: Optional[dict],
    jd: JdAnalysisResult,
    resume_kw: ExtractedKeywords,
    matched: list[str],
    missing: list[str],
    sub_scores: ScoreBreakdown,
) -> tuple[list[str], list[str], list[str]]:
    """Derive the qualitative strengths / gaps / suggestions lists."""
    strengths: list[str] = []
    gaps: list[str] = []
    suggestions: list[str] = []

    if matched:
        strengths.append(
            f"Your resume already covers {len(matched)} of the JD's "
            f"key terms ({_format_keyword_list(matched)})."
        )
    if missing:
        gaps.append(
            f"{len(missing)} JD terms are missing from your resume "
            f"({_format_keyword_list(missing)})."
        )
        suggestions.append(
            "Weave the missing high-signal terms into your bullet "
            "points where you actually have that experience. Don't "
            "stuff keywords you don't genuinely have."
        )

    must_have = list(jd.mustHave or [])
    if must_have:
        if sub_scores.skillsMatch >= 80:
            strengths.append(
                f"You meet {sub_scores.skillsMatch:.0f}% of the must-have "
                "requirements."
            )
        elif sub_scores.skillsMatch <= 40:
            gaps.append(
                f"Only {sub_scores.skillsMatch:.0f}% of the must-have "
                "requirements are visible in your resume."
            )
            suggestions.append(
                "Add a short 'Skills' section that lists the core "
                "tools named in the JD - especially anything in the "
                "must-have section."
            )

    years = estimate_resume_years(parsed)
    if jd.seniority and years is not None:
        expected = _SENIORITY_EXPECTED_YEARS.get(jd.seniority.lower())
        if expected is not None:
            if years >= expected + 1:
                strengths.append(
                    f"Your ~{years:.1f} years of experience exceeds the "
                    f"expected level for a {jd.seniority} role."
                )
            elif years + 2 < expected:
                gaps.append(
                    f"The JD targets a {jd.seniority} level "
                    f"(~{expected:.0f}+ years). Your resume shows "
                    f"~{years:.1f} years - consider emphasising the "
                    "scope and impact of your recent work."
                )

    if sub_scores.atsReadiness < 60:
        gaps.append(
            "Resume structure may not parse cleanly through an ATS. "
            "Make sure contact info, work experience, education, and "
            "skills sections are clearly labelled."
        )
        suggestions.append(
            "Add a plain-text 'Skills' section near the top, keep "
            "your job titles explicit, and ensure your email is on "
            "the first page."
        )
    elif sub_scores.atsReadiness >= 90:
        strengths.append("Resume structure is ATS-friendly.")

    return strengths, gaps, suggestions


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------


def score_resume_against_jd(
    parsed: Optional[dict],
    jd: JdAnalysisResult,
) -> MatchScore:
    """Score a parsed resume against an analysed JD.

    Args:
        parsed: Frontend-shape candidate dict. May be empty / None -
            every sub-score degrades gracefully rather than raising.
        jd: A :class:`JdAnalysisResult`. Required.

    Returns:
        A :class:`MatchScore` ready to ship to the frontend. All numeric
        fields are in ``[0, 100]``.
    """
    if jd is None:
        raise ValueError("jd (JdAnalysisResult) is required")

    resume_kw = extract_resume_keywords(parsed)
    resume_text = flatten_resume(parsed)

    kw_score, matched, missing = _score_keyword_match(jd, resume_kw)
    skills_score = _score_skills_match(jd, resume_kw, resume_text=resume_text)
    years = estimate_resume_years(parsed)
    exp_score = _score_experience_match(jd.seniority, years)
    ats_score = _score_ats_readiness(parsed)

    overall = (
        kw_score * (WEIGHT_KEYWORD_MATCH / 100.0)
        + skills_score * (WEIGHT_SKILLS_MATCH / 100.0)
        + exp_score * (WEIGHT_EXPERIENCE_MATCH / 100.0)
        + ats_score * (WEIGHT_ATS_READINESS / 100.0)
    )

    breakdown = ScoreBreakdown(
        keywordMatch=_round1(kw_score),
        skillsMatch=_round1(skills_score),
        experienceMatch=_round1(exp_score),
        atsReadiness=_round1(ats_score),
        overall=_round1(_clamp(overall)),
    )

    strengths, gaps, suggestions = _build_lists(
        parsed, jd, resume_kw, matched, missing, breakdown,
    )

    logger.info(
        "scorer: kw=%.1f skills=%.1f exp=%.1f ats=%.1f overall=%.1f "
        "(years=%s, seniority=%s)",
        breakdown.keywordMatch, breakdown.skillsMatch,
        breakdown.experienceMatch, breakdown.atsReadiness,
        breakdown.overall, years, jd.seniority,
    )

    return MatchScore(
        overall=breakdown,
        strengths=strengths,
        gaps=gaps,
        matchedKeywords=sorted(
            {m.lower(): m for m in matched}.values(), key=str.lower
        ),
        missingKeywords=sorted(
            {m.lower(): m for m in missing}.values(), key=str.lower
        ),
        suggestions=suggestions,
    )

