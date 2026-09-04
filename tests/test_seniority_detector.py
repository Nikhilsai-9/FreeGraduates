"""Tests for the JD seniority detector in ``app.services.optimizer.jd_analyzer``.

These tests lock in the resolution order:

  1. Title (strongest signal - wins even when responsibility text mentions
     a different seniority level).
  2. Requirements / qualifications section.
  3. Years of experience anywhere in the JD.
  4. Whole-JD keyword fallback (lowest priority).
"""
from __future__ import annotations

import pytest

from app.services.optimizer.jd_analyzer import (
    _detect_seniority,
    _parse_years_of_experience,
    _seniority_in_text,
    _years_to_seniority,
    analyze_job_description,
)


def _jd(title: str, body: str) -> str:
    """Compose a JD where the first non-empty line is the title."""
    return f"{title}\n\n{body}"


# ---------------------------------------------------------------------------
# Title-vs-responsibility precedence
# ---------------------------------------------------------------------------


def test_senior_title_with_junior_mentorship_returns_senior():
    """The original bug: Senior title + 'Mentor junior engineers' must NOT
    collapse to 'junior'. The title outranks responsibility-level mentions.
    """
    jd = _jd(
        "Senior Full Stack Engineer",
        "Responsibilities:\n"
        "- Mentor junior engineers\n"
        "- Lead architectural decisions\n\n"
        "Requirements:\n"
        "- 5+ years of experience with React and Node.js\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "senior"
    assert result.roleTitle == "Senior Full Stack Engineer"


def test_junior_title_with_senior_collaboration_returns_junior():
    """Junior title + 'Work with senior engineers' should stay 'junior'."""
    jd = _jd(
        "Junior Software Engineer",
        "Responsibilities:\n"
        "- Work with senior engineers to ship features\n\n"
        "Requirements:\n"
        "- 0-1 years of experience\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "junior"
    assert result.roleTitle == "Junior Software Engineer"


def test_staff_title_with_junior_mentorship_returns_staff():
    jd = _jd(
        "Staff Software Engineer",
        "Responsibilities:\n"
        "- Mentor junior engineers\n"
        "- Drive technical direction\n\n"
        "Requirements:\n"
        "- 8+ years of experience\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "staff"


def test_principal_title_with_mixed_responsibilities_returns_principal():
    """Mentoring 'senior and junior engineers' must not displace the principal title."""
    jd = _jd(
        "Principal Software Engineer",
        "Responsibilities:\n"
        "- Mentor senior and junior engineers\n"
        "- Set long-term technical strategy\n\n"
        "Requirements:\n"
        "- 12+ years of experience\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "principal"


def test_intern_title_with_senior_collaboration_returns_intern():
    jd = _jd(
        "Software Engineering Intern",
        "Responsibilities:\n"
        "- Work with senior engineers on bug fixes\n\n"
        "Requirements:\n"
        "- Currently enrolled in a CS program\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "intern"


# ---------------------------------------------------------------------------
# Years-of-experience precedence (no seniority word in title)
# ---------------------------------------------------------------------------


def test_no_title_seniority_with_5_plus_years_returns_senior():
    jd = _jd(
        "Software Engineer",
        "Requirements:\n"
        "- 5+ years of experience with Python\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "senior"


def test_no_title_seniority_with_2_to_4_years_returns_mid():
    jd = _jd(
        "Software Engineer",
        "Requirements:\n"
        "- 2-4 years of experience with Python\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "mid"


def test_no_title_seniority_with_8_plus_years_returns_staff():
    jd = _jd(
        "Software Engineer",
        "Requirements:\n"
        "- 8+ years of experience with Python\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "staff"


def test_at_least_phrase_parses_correctly():
    """'At least 8 years' should be picked up by the years parser."""
    jd = _jd(
        "Software Engineer",
        "Requirements:\n"
        "- At least 8 years of experience\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "staff"


def test_minimum_phrase_parses_correctly():
    jd = _jd(
        "Software Engineer",
        "Requirements:\n"
        "- Minimum 5 years of experience\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "senior"


def test_range_to_form_takes_upper_bound():
    """'2 to 4 years' must resolve to mid (upper bound = 4)."""
    jd = _jd(
        "Software Engineer",
        "Requirements:\n"
        "- 2 to 4 years of experience\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "mid"


def test_over_phrase_parses_correctly():
    jd = _jd(
        "Software Engineer",
        "Requirements:\n"
        "- Over 10 years of experience\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "staff"


# ---------------------------------------------------------------------------
# Direct helper coverage
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Lead Software Engineer", "lead"),
        ("Engineering Lead", "lead"),
        ("Senior Software Engineer", "senior"),
        ("Junior Software Engineer", "junior"),
        ("Staff Engineer", "staff"),
        ("Principal Engineer", "principal"),
        ("Engineering Manager", "manager"),
        ("Director of Engineering", "director"),
        ("Software Engineering Intern", "intern"),
        ("Mid-level Engineer", "mid"),
        ("leader of a small team", None),  # 'lead' inside 'leader' must NOT match
        ("internal tooling", None),         # 'intern' inside 'internal' must NOT match
    ],
)
def test_seniority_in_text_helper(text, expected):
    assert _seniority_in_text(text) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("5+ years of experience", 5),
        ("5 years of experience", 5),
        ("minimum 5 years", 5),
        ("at least 5 years", 5),
        ("over 8 years", 8),
        ("more than 3 years", 3),
        ("5-7 years", 7),
        ("2 to 4 years", 4),
    ],
)
def test_parse_years_of_experience_helper(text, expected):
    assert _parse_years_of_experience(text) == expected


def test_parse_years_returns_none_when_absent():
    assert _parse_years_of_experience("we love curious people") is None


@pytest.mark.parametrize(
    ("years", "expected"),
    [
        (0, "junior"),
        (1, "junior"),
        (2, "mid"),
        (4, "mid"),
        (5, "senior"),
        (7, "senior"),
        (8, "staff"),
        (10, "staff"),
        (11, "principal"),
        (20, "principal"),
    ],
)
def test_years_to_seniority_helper(years, expected):
    assert _years_to_seniority(years) == expected


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


def test_empty_text_returns_none():
    assert _detect_seniority("") is None


def test_no_seniority_information_returns_none():
    jd = _jd(
        "Software Engineer",
        "We are an equal-opportunity employer.\n"
        "We offer flexible working hours.\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority is None


def test_direct_helper_with_no_matches():
    assert _detect_seniority("Just some random job posting text") is None


def test_title_wins_over_years_in_responsibilities():
    """Title 'Junior' with '5+ years' in responsibilities should still be junior."""
    jd = _jd(
        "Junior Software Engineer",
        "Requirements:\n"
        "- 5+ years of relevant project experience (personal, academic, internship)\n",
    )
    result = analyze_job_description(jd)
    assert result.seniority == "junior"

