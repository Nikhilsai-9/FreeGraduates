"""Deterministic keyword / skill extraction.

Foundation of the Optimizer's matching engine. Does NOT call an LLM —
tokenises input text and matches against curated lexicons of technical
skills, tools, frameworks, and soft skills.

Why deterministic?

* Free of LLM cost and latency.
* Reproducible: same input => same output.
* Auditable: recruiters can read the lexicons.

The result is used by the scorer to compute real match percentages.

Adapted from the keyword-extraction pattern in
``JeevansSP/resume-optimizer`` (MIT). The lexicons and matcher
implementation here are original to FreeGraduates.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable


# ---------------------------------------------------------------------------
# Lexicons
# ---------------------------------------------------------------------------

TECH_LEXICON: tuple[str, ...] = (
    # Languages
    "python", "javascript", "typescript", "java", "kotlin", "swift",
    "objective-c", "go", "golang", "rust", "c", "c++", "c#", "ruby",
    "php", "scala", "perl", "r", "matlab", "sql", "html", "css", "dart",
    # Frontend
    "react", "react.js", "next.js", "vue", "vue.js", "angular", "svelte",
    "redux", "tailwind", "bootstrap", "webpack", "vite", "sass", "less",
    # Backend / frameworks
    "node.js", "nodejs", "express", "express.js", "nestjs", "fastapi",
    "flask", "django", "spring", "spring boot", "rails", "laravel",
    "asp.net", ".net", "graphql", "rest", "rest api", "rest apis",
    "grpc", "trpc", "websocket", "websockets",
    # Data / DB
    "postgresql", "postgres", "mysql", "mongodb", "redis", "cassandra",
    "elasticsearch", "dynamodb", "firebase", "firestore", "sqlite",
    "oracle", "snowflake", "bigquery", "redshift", "kafka", "rabbitmq",
    # Cloud / DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "terraform", "ansible", "jenkins", "circleci", "github actions",
    "argo", "helm", "prometheus", "grafana", "datadog", "splunk",
    "ci/cd", "devops", "sre",
    # ML / Data
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "spark", "hadoop", "airflow", "dbt", "etl", "data pipeline",
    # Mobile
    "ios", "android", "react native", "flutter", "xamarin",
    # Testing / QA
    "unit testing", "integration testing", "jest", "pytest", "junit",
    "selenium", "cypress", "playwright",
    # Methodologies
    "agile", "scrum", "kanban", "tdd", "bdd", "oop", "design patterns",
    "microservices", "distributed systems", "event-driven", "serverless",
    # Security
    "oauth", "jwt", "oauth2", "openid", "saml", "cryptography",
    # Tools
    "git", "linux", "bash", "powershell", "vscode", "intellij",
    "figma", "jira", "confluence",
)

SOFT_LEXICON: tuple[str, ...] = (
    "leadership", "communication", "collaboration", "teamwork",
    "problem solving", "problem-solving", "analytical", "creative",
    "mentoring", "mentorship", "presentation", "stakeholder management",
    "cross-functional", "ownership", "initiative", "self-starter",
    "time management", "prioritization", "adaptability", "resilience",
    "negotiation", "conflict resolution", "decision making",
    "decision-making", "strategic thinking", "customer focus",
    "attention to detail", "results-driven", "data-driven",
)

STOP_WORDS: frozenset[str] = frozenset(
    """
    a an and are as at be by for from has have he her his i in is it its
    not of on or our she that the their them then they this to was we
    were will with you your our ours
    able also any all but can could did do does doing during each few if
    into just more most other over own same so some such than there these
    those through too under until very when where which while who whom why
    how should would about after again against am because been before being
    below between both doing down during further here himself herself
    themselves itself only out same several through upon us very within
    without
    """.split()
)


# ---------------------------------------------------------------------------
# Matcher
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ExtractedKeywords:
    """The result of keyword extraction on a single piece of text."""

    technical: list[str] = field(default_factory=list)
    soft: list[str] = field(default_factory=list)
    general: list[str] = field(default_factory=list)

    @property
    def all_keywords(self) -> list[str]:
        return self.technical + self.soft + self.general

    def __bool__(self) -> bool:
        return bool(self.technical or self.soft or self.general)


def _build_word_pattern(phrase: str) -> re.Pattern[str]:
    """Build a case-insensitive regex that matches ``phrase`` as whole words.

    Handles single-token ("react") and multi-word ("machine learning")
    phrases. Allows punctuation between tokens (".", "_", "-", "/", "+").
    """
    escaped = re.escape(phrase)
    pattern = (
        r"(?<![A-Za-z0-9])"
        + escaped.replace(r"\ ", r"[\s._\-+#/]*")
        + r"(?![A-Za-z0-9])"
    )
    return re.compile(pattern, re.IGNORECASE)


def _find_in_text(text: str, lexicon: Iterable[str]) -> list[str]:
    """Return all unique lexicon entries that appear in ``text``."""
    if not text:
        return []
    found: dict[str, None] = {}
    for phrase in lexicon:
        pat = _build_word_pattern(phrase)
        if pat.search(text):
            found[phrase] = None
    return list(found.keys())


def _extract_general_keywords(text: str, limit: int = 30) -> list[str]:
    """Pick the most significant non-stop-word tokens from ``text``."""
    if not text:
        return []
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9+#.\-]{1,}", text.lower())
    counts: dict[str, int] = {}
    for tok in tokens:
        if tok in STOP_WORDS or len(tok) < 3:
            continue
        counts[tok] = counts.get(tok, 0) + 1
    ordered = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [w for w, _ in ordered[:limit]]


def extract_keywords(text: str) -> "ExtractedKeywords":
    """Extract keywords from a block of text (resume section, JD, etc.).

    Permissive: if tech / soft skill matches are found, great; if not,
    a general-frequency fallback is still produced.

    Returns:
        ExtractedKeywords with three buckets.
    """
    if not text or not text.strip():
        return ExtractedKeywords()
    tech = _find_in_text(text, TECH_LEXICON)
    soft = _find_in_text(text, SOFT_LEXICON)
    general = _extract_general_keywords(text)
    tech_set = {w.lower() for w in tech}
    soft_set = {w.lower() for w in soft}
    general = [w for w in general if w not in tech_set and w not in soft_set]
    return ExtractedKeywords(
        technical=sorted(set(tech), key=str.lower),
        soft=sorted(set(soft), key=str.lower),
        general=general,
    )
