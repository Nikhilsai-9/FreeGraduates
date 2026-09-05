"""Cover-letter generator.

Layer A: never invent experience. The cover letter only restates facts that
already live in the candidate dict -- latest role, top skills, university.
When an LLM is available we ask it to compose a tight, three-paragraph
letter; otherwise we fall back to a deterministic rule-based composer.

The generator returns a dict shaped like:

    {
      "subject":       "Application: <role> at <company>",
      "body":          "<greeting>\\n\\n<p1>\\n\\n<p2>\\n\\n<p3>\\n\\n<sign-off>",
      "recipientHint": "Hiring Team",
      "tone":          "professional|enthusiastic|concise",
      "length":        "short|medium|long",
      "generatedBy":   "gemini|rules",
    }
"""

from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------- helpers ----------------


def _pi(candidate):
    return candidate.get("personal_info") or candidate.get("personalInfo") or {}


def _full_name(candidate):
    info = _pi(candidate)
    return (info.get("fullName") or info.get("full_name") or "Candidate").strip()


def _first_name(candidate):
    full = _full_name(candidate)
    return (full.split(" ")[0] if full else "Candidate").strip()


def _latest_role(candidate):
    for key in ("work_experience", "workExperience"):
        exp = candidate.get(key) or []
        if isinstance(exp, list) and exp:
            e = exp[0] if isinstance(exp[0], dict) else {}
            role = (e.get("role") or "").strip()
            company = (e.get("company") or "").strip()
            return role, company
    return "", ""


def _top_skills(candidate, jd_text="", limit=5):
    skills = candidate.get("skills") or []
    skills = [str(s).strip() for s in skills if isinstance(s, (str, int, float))]
    if not jd_text:
        return skills[:limit]
    jd_l = jd_text.lower()
    matched = [s for s in skills if s and s.lower() in jd_l]
    rest = [s for s in skills if s and s.lower() not in jd_l]
    return (matched + rest)[:limit]


def _education_line(candidate):
    edu = candidate.get("education") or []
    if isinstance(edu, list) and edu:
        e = edu[0] if isinstance(edu[0], dict) else {}
        degree = (e.get("degree") or "").strip()
        field = (e.get("field") or e.get("major") or "").strip()
        school = (e.get("school") or e.get("university") or "").strip()
        bits = [b for b in (degree, field, school) if b]
        if bits:
            return ", ".join(bits)
    return ""


def _summary_sentence(candidate):
    summary = (candidate.get("summary") or "").strip()
    if not summary:
        return ""
    cleaned = re.sub(r"\s+", " ", summary)
    if len(cleaned) > 280:
        cleaned = cleaned[:277].rstrip(" ,;:") + "..."
    return cleaned


def _paragraph_targets(length):
    return {
        "short": (60, 90, 50),
        "medium": (90, 140, 70),
        "long": (120, 200, 90),
    }.get((length or "medium").lower(), (90, 140, 70))


def _tone_prompt(tone):
    return {
        "enthusiastic": "Warm, energetic, and confident without being informal.",
        "concise": "Direct, tight, and to the point -- minimal fluff.",
        "professional": "Polished, professional, and confident.",
    }.get((tone or "professional").lower(), "Polished, professional, and confident.")


# ---------------- LLM path ----------------


def _try_llm_generate(candidate, jd_text, target_role, target_company, tone, length):
    try:
        from app.engine.llm import get_llm
    except Exception as exc:
        logger.info("LLM not available for cover letter: %s", exc)
        return None

    llm = get_llm()
    if llm is None or not getattr(llm, "is_available", False):
        return None

    schema = {
        "type": "object",
        "properties": {
            "subject": {"type": "string"},
            "body": {"type": "string"},
            "recipientHint": {"type": "string"},
        },
        "required": ["subject", "body"],
    }

    intro_n, body_n, close_n = _paragraph_targets(length)

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert career-coach copywriter. Write a cover letter for the candidate. "
                "Tone: " + _tone_prompt(tone) + " "
                "Format: 3 paragraphs. "
                "Approximate word counts: intro {} , body {} , close {} . ".format(intro_n, body_n, close_n) +
                " CRITICAL RULES:\n"
                "1. ONLY use facts present in the candidate JSON. Do NOT invent roles, "
                "   companies, degrees, metrics, or skills that are not in the source.\n"
                "2. Address the letter to the target company by name when provided.\n"
                "3. Reference 2-3 skills that overlap between the candidate and the JD.\n"
                "4. Close with a clear call to action.\n"
                "5. Return JSON with keys: subject, body, recipientHint."
            ),
        },
        {
            "role": "user",
            "content": (
                "TARGET ROLE: " + (target_role or "(unspecified)") + "\n"
                "TARGET COMPANY: " + (target_company or "(unspecified)") + "\n\n"
                "JOB DESCRIPTION:\n" + (jd_text or "").strip()[:6000] + "\n\n"
                "CANDIDATE JSON:\n" + str(candidate)
            ),
        },
    ]
    try:
        resp = llm.chat_json(messages, response_schema=schema, temperature=0.5)
    except Exception as exc:
        logger.warning("LLM cover-letter generation failed: %s", exc)
        return None
    if not isinstance(resp, dict):
        return None
    subject = (resp.get("subject") or "").strip()
    body = (resp.get("body") or "").strip()
    if not body:
        return None
    if not subject:
        subject = "Application: " + (target_role or "Open Role") + " at " + (target_company or "your company")
    return {
        "subject": subject[:200],
        "body": body.strip(),
        "recipientHint": (resp.get("recipientHint") or "Hiring Team").strip(),
        "tone": tone or "professional",
        "length": length or "medium",
        "generatedBy": "gemini",
    }


# ---------------- Rules path ----------------


def _rules_generate(candidate, jd_text, target_role, target_company, tone, length):
    full = _full_name(candidate)
    first = _first_name(candidate)
    role = (target_role or "").strip()
    company = (target_company or "").strip() or "your company"
    role_clause = " the " + role + " role" if role else " this role"
    latest_role, latest_company = _latest_role(candidate)
    top_skills = _top_skills(candidate, jd_text, limit=4)
    edu_line = _education_line(candidate)
    summary = _summary_sentence(candidate)
    closing_name = full or first

    skills_phrase = ""
    if top_skills:
        if len(top_skills) == 1:
            skills_phrase = top_skills[0]
        elif len(top_skills) == 2:
            skills_phrase = top_skills[0] + " and " + top_skills[1]
        else:
            skills_phrase = ", ".join(top_skills[:-1]) + ", and " + top_skills[-1]

    intro_n, body_n, _ = _paragraph_targets(length)

    # Intro paragraph
    greeting = "Dear " + company + " Hiring Team,"
    intro_para = (
        "I am writing to apply for" + role_clause + " at " + company + ". "
        "As " + first + ", I bring a focused background in "
        + (skills_phrase or "software engineering") + " that maps directly to the priorities in your job description."
    )
    intro_words = intro_para.split()
    if len(intro_words) > intro_n:
        intro_para = " ".join(intro_words[: max(intro_n, 30)]).rstrip(",;:") + "..."
    intro = greeting + "\n\n" + intro_para

    # Body paragraph -- collapsed into one paragraph for tightness.
    body_parts = []
    if latest_role:
        if latest_company:
            body_parts.append(
                "In my current role as " + latest_role + " at " + latest_company + ", "
                "I work hands-on with the same stack and practices your team relies on."
            )
        else:
            body_parts.append(
                "As a " + latest_role + ", I work hands-on with the same stack and practices your team relies on."
            )
    elif summary:
        body_parts.append(summary)
    if skills_phrase:
        body_parts.append(
            "My day-to-day work is anchored in " + skills_phrase + ", and I have shipped projects "
            "that put each of these into production rather than just using them in isolation."
        )
    if edu_line:
        body_parts.append(
            "My academic grounding (" + edu_line + ") reinforces how I approach problem-solving "
            "and collaboration on cross-functional teams."
        )

    body_text = " ".join(body_parts).strip()
    body_words = body_text.split()
    if len(body_words) > body_n:
        body_text = " ".join(body_words[: max(body_n, 40)]).rstrip(",;:") + "..."

    # Close paragraph
    close = (
        "I would welcome the chance to discuss how my background translates to " + company + "'s roadmap.\n\n"
        "Thank you for your time -- I look forward to hearing from you.\n\n"
        "Best,\n" + closing_name
    )

    body_full = intro + "\n\n" + body_text + "\n\n" + close
    subject = "Application: " + (role or "Open Role") + " at " + company

    return {
        "subject": subject[:200],
        "body": body_full,
        "recipientHint": (company + " Hiring Team") if company != "your company" else "Hiring Team",
        "tone": tone or "professional",
        "length": length or "medium",
        "generatedBy": "rules",
    }


# ---------------- Public API ----------------


def generate_cover_letter(
    candidate,
    jd_text="",
    target_role="",
    target_company="",
    tone="professional",
    length="medium",
):
    """Return ``{subject, body, recipientHint, tone, length, generatedBy}``."""
    candidate = candidate or {}
    llm_result = _try_llm_generate(
        candidate, jd_text, target_role, target_company, tone, length
    )
    if llm_result:
        return llm_result
    return _rules_generate(candidate, jd_text, target_role, target_company, tone, length)
