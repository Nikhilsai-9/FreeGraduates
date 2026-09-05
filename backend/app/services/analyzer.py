"""Resume vs Job Description analyzer.

Scoring is a transparent weighted formula:
    final = 0.55*keyword + 0.15*action_verb + 0.15*metric
          + 0.10*completeness + 0.05*summary
The LLM (when configured) is used only for free-text explanation
generation -- never for the score itself, so re-runs are reproducible.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Iterable

logger = logging.getLogger(__name__)


TECH_KEYWORDS = {
    "javascript", "typescript", "python", "java", "kotlin", "swift", "go", "rust",
    "c++", "c#", "ruby", "php", "scala",
    "react", "vue", "angular", "svelte", "next.js", "redux", "tailwind", "webpack",
    "vite", "css", "html", "graphql", "rest",
    "node.js", "express", "django", "flask", "fastapi", "spring", "rails", "laravel",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "kafka", "snowflake",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible", "jenkins",
    "github actions", "ci/cd", "linux", "nginx",
    "tensorflow", "pytorch", "scikit-learn", "llm", "rag", "vector search",
    "ios", "android", "react native", "flutter",
    "microservices", "distributed systems", "system design", "agile", "scrum", "tdd",
    "unit testing", "code review",
}

ACTION_VERBS = {
    "architected", "built", "created", "delivered", "deployed", "designed",
    "developed", "engineered", "implemented", "improved", "increased", "launched",
    "led", "migrated", "modernized", "optimized", "orchestrated", "owned",
    "reduced", "refactored", "scaled", "shipped", "slashed", "spearheaded",
    "streamlined", "transformed", "validated",
}

PASSIVE_VERBS = {"helped", "assisted", "worked on", "was responsible", "participated", "involved in", "supported"}


_METRIC_RE = re.compile(
    r"\b(?:\d+(?:\.\d+)?%?|\$[\d,.]+|\d+\s?(?:x|ms|s|sec|secs|seconds|minutes|hours|days|weeks|months|years|mins|hrs|kb|mb|gb|tb))",
    re.IGNORECASE,
)


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _flatten_candidate_text(candidate: dict) -> str:
    pieces: list[str] = []
    def visit(value: Any) -> None:
        if value is None:
            return
        if isinstance(value, str):
            pieces.append(value)
            return
        if isinstance(value, (int, float, bool)):
            return
        if isinstance(value, dict):
            for v in value.values():
                visit(v)
            return
        if isinstance(value, (list, tuple, set)):
            for v in value:
                visit(v)
    visit(candidate)
    return " ".join(pieces)


def _candidate_skills(candidate: dict) -> list[str]:
    skills = candidate.get("skills") if isinstance(candidate, dict) else None
    if isinstance(skills, list):
        return [str(s) for s in skills if s]
    if isinstance(skills, str):
        return [s.strip() for s in skills.split(",") if s.strip()]
    if isinstance(skills, dict):
        out: list[str] = []
        for v in skills.values():
            if isinstance(v, list):
                out.extend(str(x) for x in v if x)
        return out
    return []


def _candidate_experience_bullets(candidate: dict) -> list[dict]:
    out: list[dict] = []
    exp = candidate.get("work_experience") if isinstance(candidate, dict) else None
    if not isinstance(exp, list):
        return out
    for e in exp:
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


@dataclass(frozen=True)
class _Scores:
    keyword: float
    action_verb: float
    metric: float
    completeness: float
    summary: float

    @property
    def final(self) -> float:
        return round(
            0.55 * self.keyword
            + 0.15 * self.action_verb
            + 0.15 * self.metric
            + 0.10 * self.completeness
            + 0.05 * self.summary,
            1,
        )


def _match_keywords(jd_text: str, candidate_text: str) -> tuple[set[str], set[str]]:
    jd_norm = _normalise(jd_text)
    cand_norm = _normalise(candidate_text)
    matched: set[str] = set()
    missing: set[str] = set()
    for kw in TECH_KEYWORDS:
        if kw in jd_norm:
            if kw in cand_norm:
                matched.add(kw)
            else:
                missing.add(kw)
    return matched, missing


def _keyword_score(matched: int, missing: int) -> float:
    total = matched + missing
    if total == 0:
        return 50.0
    return round(100.0 * matched / total, 1)


def _action_verb_score(bullets: Iterable[str]) -> float:
    bullets = [b for b in bullets if b]
    if not bullets:
        return 30.0
    strong = 0
    for b in bullets:
        first = b.strip().split(maxsplit=1)[0].lower().rstrip(",.;:")
        if first in ACTION_VERBS:
            strong += 1
    return round(100.0 * strong / len(bullets), 1)


def _metric_score(bullets: Iterable[str]) -> float:
    bullets = [b for b in bullets if b]
    if not bullets:
        return 20.0
    with_metric = sum(1 for b in bullets if _METRIC_RE.search(b))
    return round(100.0 * with_metric / len(bullets), 1)


def _completeness_score(candidate: dict) -> float:
    sections = {
        "personal_info": bool((candidate.get("personal_info") or {}).get("fullName") or (candidate.get("personal_info") or {}).get("email")),
        "summary": bool((candidate.get("summary") or "").strip()),
        "skills": bool(_candidate_skills(candidate)),
        "experience": bool(candidate.get("work_experience")),
        "education": bool(candidate.get("education")),
        "projects": bool(candidate.get("projects")),
    }
    filled = sum(1 for v in sections.values() if v)
    return round(100.0 * filled / len(sections), 1)


def _summary_score(candidate: dict, missing: set[str]) -> float:
    summary = (candidate.get("summary") or "").strip()
    if not summary:
        return 0.0
    score = 50.0
    if len(summary) >= 80:
        score += 25.0
    if len(summary) <= 300:
        score += 15.0
    if missing and any(kw in _normalise(summary) for kw in missing):
        score += 10.0
    return min(100.0, score)


def _verdict_for(score: float) -> str:
    if score >= 80:
        return "strong match"
    if score >= 60:
        return "moderate match"
    if score >= 40:
        return "weak match"
    return "poor match"


def _build_summary_diff(candidate: dict, missing: list[str]) -> dict | None:
    summary = (candidate.get("summary") or "").strip()
    if not summary or not missing:
        return None
    top = missing[:3]
    recommended = (
        f"{summary} Specialised in {', '.join(top)} and related production-grade systems."
    ).strip()
    return {
        "id": "diff-summary-keywords",
        "section": "summary",
        "targetId": "summary",
        "type": "addition",
        "title": f"Weave in missing keywords ({', '.join(top)})",
        "explanation": (
            "Your summary currently misses keywords that appear in the job description. "
            "Adding them here helps ATS scoring without fabricating any experience."
        ),
        "originalText": summary,
        "recommendedText": recommended,
    }


def _build_skills_diff(missing: list[str]) -> dict | None:
    if not missing:
        return None
    top = missing[:5]
    return {
        "id": "diff-skills-keywords",
        "section": "skills",
        "targetId": "skills",
        "type": "addition",
        "title": "Add missing tech keywords to your Skills list",
        "explanation": (
            "ATS engines weight exact keyword matches. Only add skills you actually have."
        ),
        "originalText": "",
        "recommendedText": ", ".join(top),
        "addedSkills": top,
    }


def _build_action_verb_diff(bullets: list[dict]) -> dict | None:
    weak = [b for b in bullets if b["text"].split(maxsplit=1)[0].lower().rstrip(",.;:") in PASSIVE_VERBS]
    if not weak:
        return None
    sample = weak[0]
    replacement = sample["text"]
    first_word = replacement.split(maxsplit=1)[0]
    swapped = re.sub(re.escape(first_word), "Engineered", replacement, count=1, flags=re.IGNORECASE)
    if swapped == replacement:
        swapped = "Engineered " + replacement
    return {
        "id": f"diff-verb-{sample.get('id') or 'bullet'}",
        "section": "experience",
        "targetId": sample.get("id"),
        "type": "verb_enhancement",
        "title": "Replace passive verb with a stronger action verb",
        "explanation": (
            "Recruiters skim for measurable verbs at the start of every bullet. "
            "Replace passive phrasing to land higher in resume screens."
        ),
        "originalText": replacement,
        "recommendedText": swapped,
    }


def _build_metric_diff(bullets: list[dict]) -> dict | None:
    no_metric = [b for b in bullets if not _METRIC_RE.search(b["text"])]
    if not no_metric:
        return None
    sample = no_metric[0]
    return {
        "id": f"diff-metric-{sample.get('id') or 'bullet'}",
        "section": "experience",
        "targetId": sample.get("id"),
        "type": "verb_enhancement",
        "title": "Add a measurable outcome (number, %, time, or scale)",
        "explanation": (
            "Bullets with concrete numbers are 2-3x more likely to be remembered. "
            "If you don't have hard numbers, use scale (users served, requests/sec, team size)."
        ),
        "originalText": sample["text"],
        "recommendedText": sample["text"] + " (scale or impact to be quantified)",
    }


def _build_education_diff(candidate: dict) -> dict | None:
    if candidate.get("education"):
        return None
    return {
        "id": "diff-education-add",
        "section": "education",
        "targetId": "education",
        "type": "addition",
        "title": "Add an Education entry",
        "explanation": "ATS parsers expect an Education section. Even a single degree entry lifts your completeness score.",
        "originalText": "",
        "recommendedText": "",
    }


def analyze_resume(candidate: dict, job: dict | None) -> dict:
    """Score a candidate's resume against an optional job description."""
    job = job or {}
    jd_text_parts = [job.get("description") or "", job.get("role") or "", job.get("company") or ""]
    jd_text = " ".join(p for p in jd_text_parts if p)

    cand_text = _flatten_candidate_text(candidate)
    bullets = _candidate_experience_bullets(candidate)
    bullet_lines = [b["text"] for b in bullets]

    matched, missing = _match_keywords(jd_text, cand_text)
    missing_list = sorted(missing)

    scores = _Scores(
        keyword=_keyword_score(len(matched), len(missing)),
        action_verb=_action_verb_score(bullet_lines),
        metric=_metric_score(bullet_lines),
        completeness=_completeness_score(candidate),
        summary=_summary_score(candidate, missing),
    )
    final = scores.final

    diffs: list[dict] = []
    for builder in (
        lambda: _build_summary_diff(candidate, missing_list),
        lambda: _build_skills_diff(missing_list),
        lambda: _build_action_verb_diff(bullets),
        lambda: _build_metric_diff(bullets),
        lambda: _build_education_diff(candidate),
    ):
        try:
            d = builder()
        except Exception as exc:
            logger.warning("Suggestion builder failed: %s", exc)
            d = None
        if d:
            d["status"] = "pending"
            diffs.append(d)

    return {
        "score": final,
        "verdict": _verdict_for(final),
        "matchedKeywords": sorted(matched),
        "missingKeywords": missing_list,
        "matchedCount": len(matched),
        "missingCount": len(missing),
        "breakdown": {
            "keywordMatch": scores.keyword,
            "actionVerbs": scores.action_verb,
            "metrics": scores.metric,
            "completeness": scores.completeness,
            "summary": scores.summary,
        },
        "diffs": diffs,
    }
