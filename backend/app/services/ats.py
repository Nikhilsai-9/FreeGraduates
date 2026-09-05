"""ATS compliance scanner.

Unlike the resume-vs-JD analyzer (`services/analyzer.py`), the ATS scanner
is about FORMAT and STRUCTURE -- not content. It returns a checklist of
pass/fail items so the UI can render a visual rubric, plus an overall
0-100 score weighted by impact.

We deliberately do not call the LLM here: every check is a deterministic
rule. Same input -> same output.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

# Strong action verbs reused from the analyzer so the two checkers agree
# on what counts as a measurable verb.
_ACTION_VERBS = {
    "architected", "built", "created", "delivered", "deployed", "designed",
    "developed", "engineered", "implemented", "improved", "increased",
    "launched", "led", "migrated", "modernized", "optimized", "orchestrated",
    "owned", "reduced", "refactored", "scaled", "shipped", "slashed",
    "spearheaded", "streamlined", "transformed", "validated",
}

_METRIC_RE = re.compile(
    r"\b(?:\d+(?:\.\d+)?%?|\$[\d,.]+|\d+\s?(?:x|ms|s|sec|secs|seconds|minutes|hours|days|weeks|months|years|mins|hrs|kb|mb|gb|tb))",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class _CheckResult:
    id: str
    label: str
    status: str          # 'pass' | 'warn' | 'fail'
    weight: int          # contribution to the overall score
    detail: str = ""     # human-friendly elaboration
    fix: str = ""        # one-line fix suggestion


def _personal_info(candidate: dict) -> dict:
    return candidate.get("personal_info") or candidate.get("personal") or {}


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _experience_bullets(candidate: dict) -> list[dict]:
    out: list[dict] = []
    for e in _safe_list(candidate.get("work_experience") or candidate.get("experience")):
        if not isinstance(e, dict):
            continue
        desc = e.get("description") or ""
        for line in desc.splitlines():
            line = line.strip()
            if line:
                out.append({
                    "id": e.get("id"),
                    "role": e.get("role"),
                    "company": e.get("company"),
                    "text": line,
                })
    return out


def _check_personal(candidate: dict) -> list[_CheckResult]:
    pi = _personal_info(candidate)
    results: list[_CheckResult] = []

    # Name -- critical for ATS pairing with the application
    name = (pi.get("fullName") or "").strip()
    results.append(_CheckResult(
        id="ats-name",
        label="Full name present",
        status="pass" if name else "fail",
        weight=10,
        detail="Recruiters and ATS systems rely on the candidate's name to route applications.",
        fix="Add your full name to Personal Information.",
    ))

    # Email
    email = (pi.get("email") or "").strip()
    email_ok = bool(email) and "@" in email and "." in email.split("@")[-1]
    results.append(_CheckResult(
        id="ats-email",
        label="Email address present",
        status="pass" if email_ok else ("warn" if email else "fail"),
        weight=10,
        detail="A valid email is required for ATS systems to send status updates.",
        fix="Add a reachable email address.",
    ))

    # Phone
    phone = (pi.get("phone") or "").strip()
    phone_ok = bool(re.search(r"\d", phone)) and len(re.sub(r"\D", "", phone)) >= 7
    results.append(_CheckResult(
        id="ats-phone",
        label="Phone number present",
        status="pass" if phone_ok else ("warn" if phone else "fail"),
        weight=5,
        detail="Most ATS forms require at least one contact channel besides email.",
        fix="Add a phone number with country/area code.",
    ))

    # Location
    location = (pi.get("location") or "").strip()
    results.append(_CheckResult(
        id="ats-location",
        label="Location provided",
        status="pass" if location else "warn",
        weight=3,
        detail="Helps ATS systems route by region and visa-sponsorship filters.",
        fix="Add city, country, or 'Remote' to Personal Information.",
    ))

    # LinkedIn
    linkedin = (pi.get("linkedin") or "").strip()
    results.append(_CheckResult(
        id="ats-linkedin",
        label="LinkedIn URL provided",
        status="pass" if linkedin else "warn",
        weight=3,
        detail="Recruiters cross-check LinkedIn; ATS systems often score higher when present.",
        fix="Paste your LinkedIn profile URL.",
    ))

    return results


def _check_summary(candidate: dict) -> list[_CheckResult]:
    summary = (candidate.get("summary") or "").strip()
    if not summary:
        # fallback -- the editor sometimes stuffs summary inside personal_info
        summary = (_personal_info(candidate).get("summary") or "").strip()
    length = len(summary)

    if not summary:
        return [_CheckResult(
            id="ats-summary",
            label="Professional summary",
            status="fail",
            weight=8,
            detail="A summary helps the ATS -- and a human reviewer -- understand your positioning in seconds.",
            fix="Add a 2-3 sentence summary describing your target role and core strengths.",
        )]

    if length < 50:
        return [_CheckResult(
            id="ats-summary",
            label="Professional summary",
            status="warn",
            weight=8,
            detail="Your summary is short -- consider expanding to 50-300 characters.",
            fix="Add measurable impact, target role, or signature tech.",
        )]

    if length > 600:
        return [_CheckResult(
            id="ats-summary",
            label="Professional summary",
            status="warn",
            weight=8,
            detail="Your summary is very long; aim for 2-3 crisp sentences (300 chars).",
            fix="Tighten the summary -- recruiters spend <10s here.",
        )]

    return [_CheckResult(
        id="ats-summary",
        label="Professional summary",
        status="pass",
        weight=8,
        detail=f"{length} characters, within the recommended range.",
    )]


def _check_experience(candidate: dict) -> list[_CheckResult]:
    exp = _safe_list(candidate.get("work_experience") or candidate.get("experience"))
    bullets = _experience_bullets(candidate)
    out: list[_CheckResult] = []

    if not exp:
        return [_CheckResult(
            id="ats-experience",
            label="At least one work-experience entry",
            status="fail",
            weight=12,
            detail="ATS scoring collapses to ~0% without an Experience section.",
            fix="Add at least one role, even if it is an internship or research position.",
        )]

    # Header completeness across entries
    missing_headers = sum(
        1 for e in exp if not isinstance(e, dict) or
        not (e.get("role") and e.get("company") and (e.get("startDate") or e.get("start_date")))
    )
    if missing_headers:
        out.append(_CheckResult(
            id="ats-experience-headers",
            label="Every role has Role + Company + Start date",
            status="warn",
            weight=5,
            detail=f"{missing_headers} of {len(exp)} entries are missing role/company/dates.",
            fix="Open each experience entry and complete the header fields.",
        ))
    else:
        out.append(_CheckResult(
            id="ats-experience-headers",
            label="Every role has Role + Company + Start date",
            status="pass",
            weight=5,
            detail="All entries have the metadata ATS systems need to parse dates correctly.",
        ))

    # Bullet density
    if not bullets:
        out.append(_CheckResult(
            id="ats-experience-bullets",
            label="Actionable bullet points",
            status="warn",
            weight=8,
            detail="No bullet points found -- ATS ranking drops sharply without them.",
            fix="Convert each role's description into 2-4 bullet points starting with action verbs.",
        ))
    else:
        action = sum(1 for b in bullets if b["text"].split(maxsplit=1)[0].lower().rstrip(",.;:") in _ACTION_VERBS)
        metric = sum(1 for b in bullets if _METRIC_RE.search(b["text"]))
        action_pct = round(100 * action / len(bullets))
        metric_pct = round(100 * metric / len(bullets))
        status = "pass" if action_pct >= 70 and metric_pct >= 50 else "warn"
        detail = (
            f"{len(bullets)} bullets -- {action_pct}% start with action verbs, "
            f"{metric_pct}% include measurable outcomes."
        )
        out.append(_CheckResult(
            id="ats-experience-bullets",
            label="Actionable bullet points",
            status=status,
            weight=8,
            detail=detail,
            fix="Start each bullet with an action verb and add a numeric outcome.",
        ))

    return out


def _check_education(candidate: dict) -> list[_CheckResult]:
    edu = _safe_list(candidate.get("education"))
    if not edu:
        return [_CheckResult(
            id="ats-education",
            label="At least one education entry",
            status="fail",
            weight=8,
            detail="Most ATS scoring rubrics deduct points when Education is missing.",
            fix="Add your most recent degree (school, degree, dates).",
        )]

    missing = sum(
        1 for e in edu if not isinstance(e, dict) or
        not (e.get("school") and (e.get("degree") or e.get("field")))
    )
    if missing:
        return [_CheckResult(
            id="ats-education",
            label="Education entries complete",
            status="warn",
            weight=8,
            detail=f"{missing} of {len(edu)} entries are missing school or degree.",
            fix="Open each education entry and complete school, degree, and dates.",
        )]
    return [_CheckResult(
        id="ats-education",
        label="Education entries complete",
        status="pass",
        weight=8,
        detail=f"{len(edu)} entries with school and degree on file.",
    )]


def _check_skills(candidate: dict) -> list[_CheckResult]:
    skills = candidate.get("skills")
    if isinstance(skills, str):
        items = [s.strip() for s in skills.split(",") if s.strip()]
    elif isinstance(skills, list):
        items = [str(s).strip() for s in skills if str(s).strip()]
    elif isinstance(skills, dict):
        items = []
        for v in skills.values():
            if isinstance(v, list):
                items.extend(str(x).strip() for x in v if str(x).strip())
    else:
        items = []

    deduped = {s.lower() for s in items}
    if not items:
        return [_CheckResult(
            id="ats-skills",
            label="Skills list present",
            status="fail",
            weight=8,
            detail="An empty skills section sinks ATS keyword scoring.",
            fix="Add 5-10 technologies you actually have hands-on experience with.",
        )]
    if len(items) < 3:
        return [_CheckResult(
            id="ats-skills",
            label="Skills list present",
            status="warn",
            weight=8,
            detail=f"Only {len(items)} skill(s). ATS keyword coverage improves with more breadth.",
            fix="Add 3-5 more relevant skills (frameworks, databases, cloud, tools).",
        )]
    if len(items) != len(deduped):
        return [_CheckResult(
            id="ats-skills",
            label="Skills list present",
            status="warn",
            weight=8,
            detail=f"{len(items) - len(deduped)} duplicate(s) detected.",
            fix="Remove duplicate skill entries.",
        )]
    return [_CheckResult(
        id="ats-skills",
        label="Skills list present",
        status="pass",
        weight=8,
        detail=f"{len(items)} skills, no duplicates.",
    )]


def _check_summary_length(candidate: dict) -> list[_CheckResult]:
    """Bonus check: total bullet count (too few/many -> warn)."""
    bullets = _experience_bullets(candidate)
    n = len(bullets)
    if n == 0:
        return []
    if n < 3:
        return [_CheckResult(
            id="ats-bullet-count",
            label="Sufficient bullet-point density",
            status="warn",
            weight=3,
            detail=f"Only {n} bullet(s) across all roles -- aim for 5-12 total.",
            fix="Add 1-2 more bullets per role describing measurable impact.",
        )]
    if n > 25:
        return [_CheckResult(
            id="ats-bullet-count",
            label="Sufficient bullet-point density",
            status="warn",
            weight=3,
            detail=f"{n} bullets is unusually high -- recruiters stop reading after ~15.",
            fix="Trim older or low-impact bullets to keep the resume focused.",
        )]
    return [_CheckResult(
        id="ats-bullet-count",
        label="Sufficient bullet-point density",
        status="pass",
        weight=3,
        detail=f"{n} bullets across all roles -- well-scoped.",
    )]


# ---------- Public entry point ----------


def ats_check(candidate: dict) -> dict:
    """Run the full ATS checklist and return a score + per-check results.

    The score is the sum of `weight` over all checks that pass, normalised
    to a 0-100 scale. Warnings still earn half credit; failures earn zero.
    """
    candidate = candidate or {}
    raw_checks: list[_CheckResult] = []
    raw_checks += _check_personal(candidate)
    raw_checks += _check_summary(candidate)
    raw_checks += _check_experience(candidate)
    raw_checks += _check_education(candidate)
    raw_checks += _check_skills(candidate)
    raw_checks += _check_summary_length(candidate)

    total_weight = sum(c.weight for c in raw_checks) or 1
    earned = 0.0
    for c in raw_checks:
        if c.status == "pass":
            earned += c.weight
        elif c.status == "warn":
            earned += c.weight * 0.5
        # fail -> 0

    score = round(100.0 * earned / total_weight, 1)

    if score >= 85:
        verdict = "ats-ready"
    elif score >= 65:
        verdict = "minor-fixes"
    else:
        verdict = "needs-work"

    return {
        "score": score,
        "verdict": verdict,
        "passed": sum(1 for c in raw_checks if c.status == "pass"),
        "warned": sum(1 for c in raw_checks if c.status == "warn"),
        "failed": sum(1 for c in raw_checks if c.status == "fail"),
        "total": len(raw_checks),
        "checks": [
            {
                "id": c.id,
                "label": c.label,
                "status": c.status,
                "weight": c.weight,
                "detail": c.detail,
                "fix": c.fix,
            }
            for c in raw_checks
        ],
    }
