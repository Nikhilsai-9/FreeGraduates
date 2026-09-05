"""Tests for ``app.services.optimizer.scorer``.

These tests pin down the deterministic sub-scoring rules and the
substring-matching hygiene that we rely on. They live in the
project-root ``tests/`` folder (not under ``backend/``) per the
FreeGraduates convention; see ``tests/conftest.py``.

Coverage areas:

* Weight constants - the four sub-weights must sum to exactly 100.
* ``score_resume_against_jd`` happy path - strong resume beats weak.
* Substring pitfalls - "JavaScript" must NOT count as "Java",
  "leader" must NOT count as "lead", "internal" must NOT count as
  "intern", "managed" must NOT count as "manage".
* ``estimate_resume_years`` - explicit dates, "Present" sentinel,
  overlapping jobs, year-only fallback, absent section.
* ``flatten_resume`` - shape tolerance (None values, nested dicts,
  skills-as-list, skills-as-dict, missing fields).
* Boundary handling - missing JD raises, None resume degrades
  gracefully, scores clamped to [0, 100].
* Seniority-vs-years alignment - 1-year band full marks, 5-year gap
  zero, out-of-band returns 60 (neutral).
"""
from __future__ import annotations

from datetime import date

import pytest

from app.services.optimizer.jd_analyzer import analyze_job_description
from app.services.optimizer.scorer import (
    WEIGHT_ATS_READINESS,
    WEIGHT_EXPERIENCE_MATCH,
    WEIGHT_KEYWORD_MATCH,
    WEIGHT_SKILLS_MATCH,
    _parse_date,
    _score_ats_readiness,
    _score_experience_match,
    _score_keyword_match,
    _score_skills_match,
    _split_date_range,
    estimate_resume_years,
    flatten_resume,
    score_resume_against_jd,
)
from app.services.optimizer.schemas import JdAnalysisResult, KeywordBucket


# ---------------------------------------------------------------------------
# Weight constants
# ---------------------------------------------------------------------------


def test_sub_score_weights_sum_to_100():
    """The scoring weights are the source of truth; this test fails
    the moment someone tunes a weight without re-checking that the
    overall score stays in [0, 100] and sums to 1.0.
    """
    total = (
        WEIGHT_KEYWORD_MATCH
        + WEIGHT_SKILLS_MATCH
        + WEIGHT_EXPERIENCE_MATCH
        + WEIGHT_ATS_READINESS
    )
    assert total == 100.0
    assert WEIGHT_KEYWORD_MATCH == 40.0
    assert WEIGHT_SKILLS_MATCH == 25.0
    assert WEIGHT_EXPERIENCE_MATCH == 15.0
    assert WEIGHT_ATS_READINESS == 20.0


# ---------------------------------------------------------------------------
# Score the JD pipeline end-to-end
# ---------------------------------------------------------------------------


_STRONG_JD = """\
Senior Python Developer

We are looking for a Senior Python Developer to join our team.

Requirements:
- 5+ years experience with Python
- Strong knowledge of AWS, Docker, PostgreSQL
- Experience with REST APIs and microservices
- Excellent communication skills

Responsibilities:
- Design and build scalable services
- Mentor junior developers
"""


def _strong_resume():
    return {
        "personal_info": {
            "fullName": "Jane Doe",
            "email": "jane@example.com",
            "summary": "Software engineer with 8 years building distributed systems in Python.",
        },
        "work_experience": [
            {
                "title": "Senior Software Engineer",
                "company": "Acme",
                "startDate": "2018-01",
                "endDate": "2024-06",
                "bullets": [
                    "Built Python services on AWS using Docker and PostgreSQL",
                    "Designed REST APIs handling 10k req/s",
                    "Mentored 3 junior engineers",
                ],
            },
            {
                "title": "Software Engineer",
                "company": "Beta",
                "startDate": "2016-01",
                "endDate": "2017-12",
                "bullets": ["Wrote microservices in Python"],
            },
        ],
        "skills": [
            "Python", "AWS", "Docker", "PostgreSQL", "Kubernetes", "REST",
        ],
        "education": [{"institution": "State U", "degree": "BSc Computer Science"}],
    }


def _empty_resume():
    return {
        "personal_info": {},
        "work_experience": [],
        "skills": [],
        "education": [],
    }


def test_end_to_end_strong_resume_beats_empty_resume():
    strong_jd = analyze_job_description(_STRONG_JD)
    strong_score = score_resume_against_jd(_strong_resume(), strong_jd)
    weak_score = score_resume_against_jd(_empty_resume(), strong_jd)

    assert strong_score.overall.overall > weak_score.overall.overall
    assert strong_score.overall.overall >= 60.0
    assert weak_score.overall.atsReadiness < 30.0


def test_overall_score_is_in_unit_interval():
    jd = analyze_job_description(_STRONG_JD)
    score = score_resume_against_jd(_strong_resume(), jd)
    overall = score.overall.overall
    assert 0.0 <= overall <= 100.0
    for f in (
        score.overall.keywordMatch,
        score.overall.skillsMatch,
        score.overall.experienceMatch,
        score.overall.atsReadiness,
    ):
        assert 0.0 <= f <= 100.0


def test_strong_resume_lands_in_passing_band():
    jd = analyze_job_description(_STRONG_JD)
    score = score_resume_against_jd(_strong_resume(), jd)
    assert score.overall.overall >= 65.0


# ---------------------------------------------------------------------------
# Substring pitfalls (word-boundary safety)
# ---------------------------------------------------------------------------


def test_javascript_does_not_count_as_java():
    """The original bug case: a JS-heavy resume must NOT count as
    matching a JD that asks for Java.
    """
    jd = analyze_job_description(
        "Java Engineer required. Must know Java, Spring, REST APIs."
    )
    parsed = {
        "personal_info": {"fullName": "JS Dev", "email": "x@y.com"},
        "work_experience": [
            {
                "title": "Frontend Engineer",
                "startDate": "2020-01",
                "endDate": "Present",
                "bullets": [
                    "Built SPAs in JavaScript and TypeScript using React.",
                ],
            }
        ],
        "skills": ["JavaScript", "TypeScript", "React"],
    }
    score = score_resume_against_jd(parsed, jd)
    assert "java" not in [k.lower() for k in score.matchedKeywords]
    assert "java" in [k.lower() for k in score.missingKeywords]


def test_lead_substring_does_not_match_leader_only():
    """The resume says 'leader' but does NOT use 'lead' as a verb.
    The JD's keyword 'lead' must not be inflated by the 'leader'
    substring.
    """
    jd = analyze_job_description(
        "Engineering Lead. Cross-functional teams. Must lead initiatives."
    )
    parsed = {
        "personal_info": {"fullName": "L Dev", "email": "x@y.com"},
        "work_experience": [
            {
                "title": "Team leader",
                "startDate": "2019-01",
                "endDate": "Present",
                "bullets": [
                    "Was the team leader. Handled HR duties.",
                ],
            }
        ],
        "skills": ["management"],
    }
    score = score_resume_against_jd(parsed, jd)
    assert "lead" not in [k.lower() for k in score.matchedKeywords]


def test_intern_substring_does_not_match_internal():
    jd = analyze_job_description("Build internal tooling for our team.")
    parsed = {
        "personal_info": {"fullName": "Dev", "email": "x@y.com"},
        "work_experience": [
            {
                "title": "Engineer",
                "startDate": "2020-01",
                "endDate": "Present",
                "bullets": ["Maintained internal dashboards."],
            }
        ],
        "skills": ["Python"],
    }
    score = score_resume_against_jd(parsed, jd)
    assert "intern" not in [k.lower() for k in score.matchedKeywords]


# ---------------------------------------------------------------------------
# Score-keyword-match helper (white-box)
# ---------------------------------------------------------------------------


def test_score_keyword_match_empty_jd_returns_neutral_100():
    """No JD-side keywords -> we can't penalise. Return 100."""
    jd = JdAnalysisResult(
        roleTitle=None,
        seniority=None,
        keywords=KeywordBucket(matched=[], missing=[], extra=[]),
        mustHave=[],
    )
    score, matched, missing = _score_keyword_match(
        jd, type("FakeKw", (), {"technical": [], "soft": [], "general": []})(),
    )
    assert score == 100.0
    assert matched == []
    assert missing == []


def test_score_keyword_match_returns_fraction():
    """3 of 5 JD keywords matched -> 60."""
    jd = JdAnalysisResult(
        roleTitle=None, seniority=None,
        keywords=KeywordBucket(
            matched=[],
            missing=["python", "aws", "docker", "graphql", "redis"],
            extra=[],
        ),
        mustHave=[],
    )

    class FakeKw:
        technical = ["python", "aws", "docker"]
        soft = []
        general = []

    score, matched, missing = _score_keyword_match(jd, FakeKw())
    assert score == 60.0
    assert sorted(matched) == ["aws", "docker", "python"]
    assert sorted(missing) == ["graphql", "redis"]


# ---------------------------------------------------------------------------
# Skills-match
# ---------------------------------------------------------------------------


def test_skills_match_all_present():
    jd = JdAnalysisResult(
        roleTitle=None, seniority=None,
        keywords=KeywordBucket(),
        mustHave=["3+ years Python", "AWS experience", "Docker knowledge"],
    )

    class FakeKw:
        technical = ["python", "aws", "docker", "kubernetes"]
        soft = []
        general = []

    assert _score_skills_match(jd, FakeKw()) == 100.0


def test_skills_match_partial():
    jd = JdAnalysisResult(
        roleTitle=None, seniority=None,
        keywords=KeywordBucket(),
        mustHave=["Python experience", "AWS experience", "Cobol experience"],
    )

    class FakeKw:
        technical = ["python", "aws"]
        soft = []
        general = []

    # 2 of 3 must-have bullets covered -> 66.67% -> 66.7.
    assert _score_skills_match(jd, FakeKw()) == pytest.approx(66.7, abs=0.1)


def test_skills_match_empty_must_have_returns_100():
    """If the JD has no structured must-haves, don't penalise."""
    jd = JdAnalysisResult(
        roleTitle=None, seniority=None,
        keywords=KeywordBucket(),
        mustHave=[],
    )
    assert _score_skills_match(jd, None) == 100.0


def test_skills_match_bullet_with_no_recognised_term_is_free_pass():
    """A bullet like 'Strong work ethic' should not unfairly drop the score."""
    jd = JdAnalysisResult(
        roleTitle=None, seniority=None,
        keywords=KeywordBucket(),
        mustHave=["Strong work ethic"],
    )
    assert _score_skills_match(jd, None) == 100.0


# ---------------------------------------------------------------------------
# Skills-match - raw-text fallback regression tests
# ---------------------------------------------------------------------------
#
# These tests pin down the behaviour of the *unrecognised-bullet* fallback
# in :func:`_score_skills_match`. The fallback exists because niche
# technologies (Cobol, Haskell, Erlang, DB2, ...) are not in our keyword
# lexicon and so can never match under Branch A. The fallback must:
#
#   * Tokenise the raw bullet, strip generic JD fluff (experience, skills,
#     knowledge, working, ...), then require at least one remaining
#     candidate term to appear as a WHOLE WORD in the raw resume text.
#   * Not produce false positives from generic JD words alone (the word
#     "experience" on its own must never satisfy a requirement).
#   * Not match substrings (Java must not match JavaScript).
#
# Policy for "multiple unknown terms": "at least one" wins. A JD asking
# for "Kafka and Cassandra experience" matches if the resume mentions
# either Kafka or Cassandra; it does not require both. This matches the
# "per-bullet unit" semantics of Branch A (all terms must be present) in
# spirit - both bullets still resolve to "the resume shows *some*
# relevant experience" - and avoids spurious zero scores caused by a
# single missing niche term.


class _ResumeKw:
    """Minimal stand-in for ``ExtractedKeywords`` used by the fallback
    tests below. The keyword lexicon does NOT include niche tech terms
    such as Cobol / Haskell / DB2, so this fixture mirrors what
    :func:`extract_resume_keywords` would actually produce for a
    Python-only resume."""

    def __init__(self, technical=None, soft=None, general=None):
        self.technical = technical or []
        self.soft = soft or []
        self.general = general or []


def _make_jd(*must_have: str) -> JdAnalysisResult:
    return JdAnalysisResult(
        roleTitle=None, seniority=None,
        keywords=KeywordBucket(),
        mustHave=list(must_have),
    )


def test_skills_match_known_tech_present_matches():
    """Recognised tech terms present in the resume -> match."""
    jd = _make_jd("Python and AWS experience")
    resume_kw = _ResumeKw(technical=["python", "aws"])
    assert _score_skills_match(
        jd, resume_kw, resume_text="Senior Python AWS engineer"
    ) == 100.0


def test_skills_match_known_tech_missing_does_not_match():
    """Recognised tech terms missing from the resume -> no match."""
    jd = _make_jd("Python and AWS experience")
    resume_kw = _ResumeKw(technical=["python"])  # no AWS
    assert _score_skills_match(
        jd, resume_kw, resume_text="Senior Python engineer"
    ) == 0.0


def test_skills_match_unknown_tech_present_cobol_matches():
    """Cobol is NOT in the keyword lexicon. Raw-text fallback must
    still match if the resume contains the whole word 'Cobol'."""
    jd = _make_jd("Cobol experience")
    resume_kw = _ResumeKw(technical=["python", "aws"])
    assert _score_skills_match(
        jd, resume_kw,
        resume_text="Worked with COBOL on mainframe systems",
    ) == 100.0


def test_skills_match_unknown_tech_missing_cobol_does_not_match():
    """Cobol is NOT in the keyword lexicon and the resume does not
    mention it -> no match."""
    jd = _make_jd("Cobol experience")
    resume_kw = _ResumeKw(technical=["python", "aws"])
    assert _score_skills_match(
        jd, resume_kw, resume_text="Senior Python developer",
    ) == 0.0


def test_skills_match_soft_skill_only_is_free_pass():
    """A recognised soft-skill term ('communication') makes the bullet
    a free pass - resume is not penalised for not listing it."""
    jd = _make_jd("Excellent communication skills")
    resume_kw = _ResumeKw(technical=["python"])
    # No 'communication' in resume text or keywords - still 100.
    assert _score_skills_match(
        jd, resume_kw, resume_text="Senior Python developer",
    ) == 100.0


def test_skills_match_strong_work_ethic_is_free_pass():
    """A purely fluff bullet with no recognisable terms at all is a
    free pass (after stop-word filtering nothing remains)."""
    jd = _make_jd("Strong work ethic")
    assert _score_skills_match(jd, None) == 100.0


def test_skills_match_multiple_unknown_terms_any_matches():
    """Policy: with multiple unknown terms, *at least one* match is
    enough.

    Both DB2 and Fortran are intentionally NOT in our keyword
    lexicon, so this bullet goes down Branch C (raw-text fallback).
    """
    jd = _make_jd("DB2 and Fortran experience")
    resume_kw = _ResumeKw(technical=["python"])
    assert _score_skills_match(
        jd, resume_kw,
        resume_text="Wrote legacy DB2 stored procedures on the mainframe",
    ) == 100.0


def test_skills_match_multiple_unknown_terms_none_matches():
    """If none of the unknown terms appear, the bullet does not match."""
    jd = _make_jd("DB2 and Fortran experience")
    resume_kw = _ResumeKw(technical=["python"])
    assert _score_skills_match(
        jd, resume_kw, resume_text="Senior Python developer",
    ) == 0.0


def test_skills_match_generic_word_does_not_cause_false_positive():
    """'experience' is a generic JD word. It must NEVER satisfy a
    requirement on its own - only Cobol is in this bullet's domain
    signal and it is absent from the resume."""
    jd = _make_jd("Strong experience with Cobol")
    resume_kw = _ResumeKw(technical=["python"])
    # Resume mentions 'experience' and 'Python' but NOT 'Cobol'.
    # The stop-word filter removes 'strong', 'experience', 'with' ->
    # only 'cobol' remains as a candidate -> not found -> 0%.
    assert _score_skills_match(
        jd, resume_kw,
        resume_text="Five years of experience as a Python developer",
    ) == 0.0


def test_skills_match_word_boundary_java_not_javascript():
    """The whole-word match must keep 'Java' from matching 'JavaScript'."""
    jd = _make_jd("Java experience")
    resume_kw = _ResumeKw(technical=["javascript"])  # only JavaScript
    assert _score_skills_match(
        jd, resume_kw, resume_text="Senior JavaScript engineer",
    ) == 0.0


def test_skills_match_word_boundary_cobol_not_coboldians():
    """Same protection for niche terms: 'Cobol' must not match the
    substring 'coboldians'."""
    jd = _make_jd("Cobol experience")
    resume_kw = _ResumeKw(technical=["python"])
    assert _score_skills_match(
        jd, resume_kw,
        resume_text="Worked with coboldians and Python",
    ) == 0.0


def test_skills_match_resume_text_none_does_not_crash():
    """Edge case: ``resume_text=None`` (e.g. if the parsed resume is
    malformed) must not raise. Falls back gracefully to no raw-text
    matches."""
    jd = _make_jd("Cobol experience")
    resume_kw = _ResumeKw(technical=["python"])
    # resume_text=None -> Branch C cannot find candidates -> 0%.
    assert _score_skills_match(jd, resume_kw, resume_text=None) == 0.0


def test_skills_match_resume_kw_none_and_text_present():
    """resume_kw=None is tolerated; only raw-text fallback is used."""
    jd = _make_jd("Cobol experience")
    assert _score_skills_match(
        jd, None, resume_text="Worked with COBOL on mainframe",
    ) == 100.0


def test_skills_match_punct_term_fsharp_whole_word():
    """Multi-char punctuation tech names (Node.js, C++, F#) match as
    whole units in the resume text. ``F#`` is intentionally NOT in
    the keyword lexicon so this bullet goes through Branch C."""
    jd = _make_jd("F# experience")
    resume_kw = _ResumeKw(technical=["python"])
    assert _score_skills_match(
        jd, resume_kw, resume_text="Built analytics with F# on .NET",
    ) == 100.0


def test_skills_match_punct_term_false_prefix_does_not_match():
    """A fictitious prefix of a punctuation term (e.g. ``NodeJS`` vs
    ``Node.js``) must NOT satisfy the requirement."""
    jd = _make_jd("Node.js experience")  # Node.js IS in the lexicon
    resume_kw = _ResumeKw(technical=["NodeJS"])  # only the prefix
    # The bullet resolves under Branch A: Node.js must be in
    # resume_words; NodeJS is not the same word.
    assert _score_skills_match(
        jd, resume_kw, resume_text="Built APIs with NodeJS",
    ) == 0.0


# ---------------------------------------------------------------------------
# Experience-match
# ---------------------------------------------------------------------------


def test_experience_match_within_one_year_full_marks():
    """+/- 1 year of the centre -> 100."""
    assert _score_experience_match("junior", 3.0) == 100.0
    assert _score_experience_match("mid", 4.0) == 100.0
    assert _score_experience_match("senior", 7.0) == 100.0


def test_experience_match_falls_off_linearly():
    """Between +/- 1 and +/- 5 years the score falls off linearly."""
    mid_score = _score_experience_match("junior", 5.5)  # delta 3.5
    assert 0.0 < mid_score < 100.0
    # Closer to the centre -> higher score.
    closer = _score_experience_match("junior", 3.0)
    farther = _score_experience_match("junior", 5.5)
    assert closer > farther


def test_experience_match_far_overshoot_is_zero():
    """A 30-year resume vs an intern JD should score 0 (way over)."""
    assert _score_experience_match("intern", 30.0) == 0.0


def test_experience_match_far_undershoot_is_zero():
    """A 0-year resume vs a principal JD should score 0 (way under)."""
    assert _score_experience_match("principal", 0.0) == 0.0


def test_experience_match_unknown_seniority_returns_neutral():
    assert _score_experience_match(None, 5.0) == 60.0
    assert _score_experience_match("principalV2", 5.0) == 60.0


def test_experience_match_none_years_returns_neutral():
    """Resume with no work_experience must NOT zero out the experience score."""
    assert _score_experience_match("senior", None) == 60.0


# ---------------------------------------------------------------------------
# ATS readiness
# ---------------------------------------------------------------------------


def test_ats_full_marks_for_complete_resume():
    parsed = _strong_resume()
    assert _score_ats_readiness(parsed) == 100.0


def test_ats_zero_for_empty():
    assert _score_ats_readiness({}) == 0.0
    assert _score_ats_readiness(None) == 0.0


def test_ats_partial_credit():
    parsed = {
        "personal_info": {"fullName": "X", "email": "x@y.com"},
        "skills": ["Python"],
        # no work_experience / education / summary / bullets
    }
    # name(12.5) + email(12.5) + skills(15) = 40.0
    assert _score_ats_readiness(parsed) == 40.0


def test_ats_bullet_density_below_three_gives_partial_credit():
    parsed = {
        "personal_info": {"fullName": "X", "email": "x@y.com", "summary": "Hi"},
        "work_experience": [
            {"title": "A", "bullets": ["x", "y"]},
            {"title": "B", "bullets": ["x"]},
        ],
        "skills": ["Python"],
        "education": [{"degree": "BSc"}],
    }
    # name(12.5)+email(12.5)+work(15)+edu(15)+skills(15)+bullets-avg-1.5(10)+summary(10) = 90
    assert _score_ats_readiness(parsed) == 90.0


# ---------------------------------------------------------------------------
# estimate_resume_years
# ---------------------------------------------------------------------------


def test_parse_date_basic_forms():
    assert _parse_date("January 2020") == 202001
    assert _parse_date("Jan 2020") == 202001
    assert _parse_date("jan. 2020") == 202001
    assert _parse_date("2020-01") == 202001
    assert _parse_date("01/2020") == 202001
    assert _parse_date("just 2020") == 202001  # year-only fallback


def test_parse_date_present_and_unknown():
    today_ym = date.today().year * 100 + date.today().month
    assert _parse_date("Present") == today_ym
    assert _parse_date("current") == today_ym
    assert _parse_date("") is None
    assert _parse_date("nothing here") is None


def test_split_date_range_two_token_form():
    s, e = _split_date_range("Jan 2020 - Mar 2023")
    assert s == 202001 and e == 202303
    s, e = _split_date_range("2020-01 to 2023-03")
    assert s == 202001 and e == 202303


def test_split_date_range_single_token_returns_start_only():
    s, e = _split_date_range("Jan 2020")
    assert s == 202001 and e is None


def test_estimate_years_two_consecutive_jobs():
    parsed = {"work_experience": [
        {"startDate": "2016-01", "endDate": "2017-12"},
        {"startDate": "2018-01", "endDate": "2024-06"},
    ]}
    # Inclusive end-month semantics: both endpoints counted.
    #   2016-01 -> 2017-12 = 24 months (2y)
    #   2018-01 -> 2024-06 = 78 months (6y 6m)
    #   total = 102 months = 8.5 years.
    years = estimate_resume_years(parsed)
    assert years == pytest.approx(8.5, abs=0.05)


def test_estimate_years_overlapping_jobs_do_not_double_count():
    parsed = {"work_experience": [
        {"startDate": "2020-01", "endDate": "2022-12"},
        {"startDate": "2021-01", "endDate": "2023-06"},
    ]}
    # Union: 2020-01 to 2023-06 = 42 months = 3.5 years.
    years = estimate_resume_years(parsed)
    assert years == pytest.approx(3.5, abs=0.05)


def test_estimate_years_present_open_ended():
    parsed = {"work_experience": [
        {"startDate": "2020-01", "endDate": "Present"},
    ]}
    years = estimate_resume_years(parsed)
    assert years is not None and years >= 4.5


def test_estimate_years_no_dates_falls_back_to_entry_count():
    parsed = {"work_experience": [
        {"title": "A"}, {"title": "B"}, {"title": "C"},
    ]}
    # 3 entries * 2.0 years each = 6.0
    assert estimate_resume_years(parsed) == 6.0


def test_estimate_years_no_work_experience_returns_none():
    assert estimate_resume_years({"work_experience": []}) is None
    assert estimate_resume_years({}) is None
    assert estimate_resume_years(None) is None


def test_estimate_years_is_capped():
    """Resist garbage dates by clamping to 50 years."""
    parsed = {"work_experience": [{"startDate": "1000-01", "endDate": "9999-12"}]}
    assert estimate_resume_years(parsed) <= 50.0


# ---------------------------------------------------------------------------
# flatten_resume
# ---------------------------------------------------------------------------


def test_flatten_resume_handles_missing_fields():
    """All fields optional - flatten_resume must not raise."""
    assert flatten_resume(None) == ""
    assert flatten_resume({}) == ""
    assert flatten_resume({"personal_info": {}}) == ""


def test_flatten_resume_collects_strings():
    parsed = {
        "personal_info": {
            "fullName": "Jane Doe",
            "summary": "Engineer.",
            "headline": "Senior Eng",
        },
        "work_experience": [
            {
                "title": "Eng",
                "company": "Acme",
                "description": "Backend",
                "location": "Remote",
                "bullets": ["did X", "did Y"],
            }
        ],
        "education": [
            {
                "institution": "State U",
                "degree": "BSc",
                "field": "CS",
                "description": "4 years",
            }
        ],
        "skills": ["Python", {"name": "AWS", "level": "expert"}],
        "projects": [
            {"name": "P", "description": "scrape", "tech": ["Python", "AWS"]}
        ],
    }
    out = flatten_resume(parsed)
    for needle in (
        "Jane Doe", "Engineer.", "Senior Eng", "Eng", "Backend",
        "did X", "did Y", "BSc", "Python", "AWS", "expert", "scrape",
    ):
        assert needle in out, f"missing {needle!r} in flattened output"


def test_flatten_resume_skips_none_and_empty():
    parsed = {
        "personal_info": {"fullName": None, "summary": ""},
        "work_experience": [{"title": None, "bullets": [None, "", "x"]}],
        "skills": [None, "", "Python"],
    }
    out = flatten_resume(parsed)
    assert "x" in out
    assert "Python" in out
    # No stray 'None' string.
    assert "None" not in out


# ---------------------------------------------------------------------------
# Boundary handling on score_resume_against_jd
# ---------------------------------------------------------------------------


def test_missing_jd_raises_value_error():
    """JD is the only required input."""
    with pytest.raises(ValueError):
        score_resume_against_jd(_strong_resume(), None)


def test_none_resume_does_not_crash():
    """Resume=None must yield a well-formed (if low) score, not raise."""
    jd = analyze_job_description(_STRONG_JD)
    score = score_resume_against_jd(None, jd)
    assert 0.0 <= score.overall.overall <= 100.0
    for f in (
        score.overall.keywordMatch,
        score.overall.skillsMatch,
        score.overall.experienceMatch,
        score.overall.atsReadiness,
    ):
        assert 0.0 <= f <= 100.0


def test_empty_resume_does_not_crash():
    jd = analyze_job_description(_STRONG_JD)
    score = score_resume_against_jd({}, jd)
    assert 0.0 <= score.overall.overall <= 100.0


def test_jd_with_no_keywords_does_not_divide_by_zero():
    """A JD that strips down to no keywords must still return a finite score."""
    jd = JdAnalysisResult(
        roleTitle="Generic",
        seniority=None,
        keywords=KeywordBucket(matched=[], missing=[], extra=[]),
        mustHave=[],
    )
    score = score_resume_against_jd(_strong_resume(), jd)
    assert 0.0 <= score.overall.overall <= 100.0


# ---------------------------------------------------------------------------
# Lists (strengths / gaps / matched / missing / suggestions)
# ---------------------------------------------------------------------------


def test_matched_and_missing_keywords_are_unique():
    jd = analyze_job_description(_STRONG_JD)
    score = score_resume_against_jd(_strong_resume(), jd)
    assert sorted(score.matchedKeywords) == sorted(set(score.matchedKeywords))
    assert sorted(score.missingKeywords) == sorted(set(score.missingKeywords))


def test_strengths_and_gaps_are_lists_of_strings():
    jd = analyze_job_description(_STRONG_JD)
    score = score_resume_against_jd(_strong_resume(), jd)
    assert isinstance(score.strengths, list)
    assert isinstance(score.gaps, list)
    assert isinstance(score.suggestions, list)
    for s in score.strengths + score.gaps + score.suggestions:
        assert isinstance(s, str)
        assert s  # no empty strings


def test_low_ats_score_triggers_an_ats_gap():
    """Empty resume -> very low ATS sub-score -> narrative gap shows up."""
    jd = analyze_job_description(_STRONG_JD)
    score = score_resume_against_jd(_empty_resume(), jd)
    assert any(
        "ATS" in s or "structure" in s.lower() for s in score.gaps
    ), f"Expected an ATS-related gap; got {score.gaps!r}"


def test_perfect_match_resume_emits_no_suggestion_to_add_skills():
    """A resume that matches every must-have need not be told to add skills."""
    jd = JdAnalysisResult(
        roleTitle="Eng",
        seniority=None,
        keywords=KeywordBucket(matched=[], missing=[], extra=[]),
        mustHave=["Python knowledge", "AWS experience"],
    )
    parsed = {
        "personal_info": {
            "fullName": "X", "email": "x@y.com", "summary": "Hi",
        },
        "work_experience": [
            {
                "title": "Eng", "company": "A",
                "startDate": "2020-01", "endDate": "Present",
                "bullets": [
                    "Worked on Python services using AWS.",
                    "More details.",
                    "Even more.",
                ],
            }
        ],
        "skills": ["Python", "AWS"],
        "education": [{"degree": "BSc"}],
    }
    score = score_resume_against_jd(parsed, jd)
    assert score.overall.skillsMatch == 100.0
    # suggestions list should not include "Add a short 'Skills' section".
    assert not any("'Skills' section" in s for s in score.suggestions)
