"""Interview question generation with optional Gemini call + rules fallback.

Public API:
    generate_questions(resume, job_description, target_role=None,
                       target_company=None, n=8) -> tuple[list[dict], str]

The LLM path asks Gemini to produce a structured JSON list of questions.
The rules path mixes four buckets:
    - behavioral  (STAR prompts)
    - technical   (driven by the JD top skills)
    - resume      (driven by the candidate most recent roles)
    - role        (driven by the target role)
"""
from __future__ import annotations

import json as _json
import logging
import random
from typing import Any

from app.engine import llm

logger = logging.getLogger(__name__)


_SYSTEM = (
    "You are an expert technical interviewer. Produce interview questions "
    "as a JSON array of objects with fields: type, prompt, category, "
    "difficulty, modelAnswer, tip. The candidate resume (JSON) and the "
    "job description are below. Produce around {n} questions that cover "
    "behavioral, technical (driven by the JD skills), and resume-specific "
    "questions. Vary difficulty. Return JSON only - no prose."
)

_TEMPLATE = (
    "Resume:\n{resume}\n\n"
    "Job description:\n{jd}\n\n"
    "Target role: {role}\n"
    "Target company: {company}\n"
    "Number of questions: {n}\n\n"
    "Return JSON only, in this exact shape:\n"
    "[\n"
    "  {{\n"
    '    "type": "behavioral|technical|resume|role",\n'
    '    "prompt": "...",\n'
    '    "category": "...",\n'
    '    "difficulty": "easy|medium|hard",\n'
    '    "modelAnswer": "...",\n'
    '    "tip": "..."\n'
    "  }}\n"
    "]\n"
)


def generate_questions(
    resume,
    job_description,
    target_role=None,
    target_company=None,
    n=8,
):
    """Return (questions, source) where source is gemini or rules."""
    jd = (job_description or "").strip()
    role = (target_role or "").strip()
    company = (target_company or "").strip()

    prompt = _TEMPLATE.format(
        resume=_json.dumps(resume or {}, ensure_ascii=False, indent=2)[:6000],
        jd=jd[:6000],
        role=role or "(unspecified)",
        company=company or "(unspecified)",
        n=n,
    )

    client = llm.get_llm()
    if getattr(client, 'is_available', False):
        try:
            raw = llm.chat_json(
                [
                    {"role": "system", "content": _SYSTEM.format(n=n)},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )
            if isinstance(raw, list) and raw:
                cleaned = _normalize_llm_questions(raw, n)
                if cleaned:
                    logger.info("Coach used Gemini, %d questions", len(cleaned))
                    return cleaned, "gemini"
            if isinstance(raw, dict):
                arr = raw.get("questions") or raw.get("items") or raw.get("data")
                if isinstance(arr, list) and arr:
                    cleaned = _normalize_llm_questions(arr, n)
                    if cleaned:
                        return cleaned, "gemini"
        except Exception as e:
            logger.warning("LLM coach failed, falling back to rules: %s", e)

    return _rule_based(resume or {}, jd, role, company, n), "rules"


def _normalize_llm_questions(items, n):
    out = []
    for i, it in enumerate(items[:n]):
        if not isinstance(it, dict):
            continue
        prompt = (it.get("prompt") or it.get("question") or "").strip()
        if not prompt:
            continue
        qtype = (it.get("type") or "behavioral").lower()
        if qtype not in {"behavioral", "technical", "resume", "role"}:
            qtype = "behavioral"
        diff = (it.get("difficulty") or "medium").lower()
        if diff not in {"easy", "medium", "hard"}:
            diff = "medium"
        out.append(
            {
                "id": f"q{i + 1}",
                "type": qtype,
                "prompt": prompt,
                "category": (it.get("category") or "").strip() or qtype.title(),
                "difficulty": diff,
                "modelAnswer": (it.get("modelAnswer") or it.get("sample_answer") or "").strip(),
                "tip": (it.get("tip") or "").strip(),
            }
        )
    return out


_BEHAVIORAL_TEMPLATES = [
    "Tell me about a time you had to {challenge}. What did you do, and what was the outcome?",
    "Describe a project where you disagreed with a teammate about {topic}. How did you resolve it?",
    "Walk me through a situation where you had to {challenge} under a tight deadline.",
    "Give me an example of when you {challenge}. What trade-offs did you consider?",
    "Tell me about a time you made a mistake at work. How did you recover?",
]

_BEHAVIORAL_CHALLENGES = [
    "ship a feature with incomplete requirements",
    "debug a production incident",
    "convince stakeholders to change direction",
    "mentor a junior engineer",
    "learn a new technology quickly to deliver a project",
    "balance quality vs. speed on a release",
]

_BEHAVIORAL_TIPS = [
    "Use the STAR format: Situation, Task, Action, Result.",
    "Quantify the impact (numbers, percent, dollars) wherever possible.",
    "Keep the answer under 2 minutes; follow up with metrics.",
]

_ROLE_TEMPLATES = {
    "software": "How do you approach designing a system that needs to {goal}?",
    "engineer": "How do you approach designing a system that needs to {goal}?",
    "developer": "How do you approach designing a system that needs to {goal}?",
    "manager": "How would you structure your team first 30 days to {goal}?",
    "lead": "How would you structure your team first 30 days to {goal}?",
    "data": "Walk me through how you would {goal} with the data described in the JD.",
    "product": "How would you prioritize the roadmap if the goal is to {goal}?",
    "design": "Walk me through your process when you need to {goal}.",
    "marketing": "How would you design a campaign intended to {goal}?",
    "sales": "How would you approach prospecting when you need to {goal}?",
}


def _detect_role_bucket(role):
    role_l = role.lower()
    for key, tmpl in _ROLE_TEMPLATES.items():
        if key in role_l:
            return key, [tmpl]
    return "general", [
        "What does success look like in this role during the first 90 days?",
        "What skills from your background do you think transfer best to this role?",
        "Why are you interested in this role specifically?",
    ]


def _top_jd_skills(jd, k=4):
    text = (jd or "").lower()
    stop = {
        "the", "and", "with", "for", "you", "are", "our", "this", "that",
        "have", "from", "will", "your", "their", "they", "them", "role",
        "team", "work", "working", "years", "year", "experience", "knowledge",
        "ability", "strong", "plus", "must", "should", "can", "able",
        "using", "use", "etc", "via", "into", "such",
        "all", "any", "across", "within", "about", "than", "more", "less",
    }
    words = [w.strip(".,:;()[]{}!?\"'") for w in text.split()]
    seen = {}
    for w in words:
        if len(w) < 4 or w in stop or not w.isalpha():
            continue
        seen[w] = seen.get(w, 0) + 1
    ranked = sorted(seen.items(), key=lambda kv: (-kv[1], kv[0]))
    return [w for w, _ in ranked[:k]]


def _latest_roles(resume, k=2):
    items = resume.get("work_experience") or resume.get("experience") or []
    out = []
    for it in items[:k]:
        role = it.get("role") or it.get("title") or ""
        company = it.get("company") or ""
        if role or company:
            out.append({"role": role, "company": company})
    return out


def _rule_based(resume, jd, role, company, n):
    questions = []

    challenges = random.sample(_BEHAVIORAL_CHALLENGES, k=min(3, len(_BEHAVIORAL_CHALLENGES)))
    for ch in challenges:
        tmpl = random.choice(_BEHAVIORAL_TEMPLATES)
        questions.append(
            {
                "id": f"q{len(questions) + 1}",
                "type": "behavioral",
                "prompt": tmpl.format(challenge=ch, topic="a technical decision"),
                "category": "Behavioral",
                "difficulty": random.choice(["medium", "hard"]),
                "modelAnswer": "",
                "tip": random.choice(_BEHAVIORAL_TIPS),
            }
        )

    skills = _top_jd_skills(jd, k=3)
    if not skills:
        skills = ["this technology"]
    for skill in skills:
        questions.append(
            {
                "id": f"q{len(questions) + 1}",
                "type": "technical",
                "prompt": f"Walk me through how you have used {skill} in production. What trade-offs did you make?",
                "category": f"Technical - {skill}",
                "difficulty": random.choice(["medium", "hard"]),
                "modelAnswer": "",
                "tip": "Anchor in a specific project and quantify the result.",
            }
        )

    latest = _latest_roles(resume, k=2)
    for r in latest:
        title = r.get("role") or "your most recent role"
        co = r.get("company") or ""
        suffix = f" at {co}" if co else ""
        questions.append(
            {
                "id": f"q{len(questions) + 1}",
                "type": "resume",
                "prompt": f"Tell me more about your work as {title}{suffix}. What were you responsible for, and what was the biggest impact?",
                "category": "Resume",
                "difficulty": "easy",
                "modelAnswer": "",
                "tip": "Mirror the wording from your resume and add measurable outcomes.",
            }
        )

    bucket, role_templates = _detect_role_bucket(role)
    tmpl = role_templates[0]
    questions.append(
        {
            "id": f"q{len(questions) + 1}",
            "type": "role",
            "prompt": tmpl.format(goal="deliver measurable impact quickly"),
            "category": f"Role - {bucket.title()}",
            "difficulty": "medium",
            "modelAnswer": "",
            "tip": "Show that you understand the role first-90-days outcomes.",
        }
    )

    if len(questions) > n:
        questions = questions[:n]
    while len(questions) < n and questions:
        questions.append(
            {
                "id": f"q{len(questions) + 1}",
                "type": "role",
                "prompt": "What questions do you have for me about the team and the role?",
                "category": "Role",
                "difficulty": "easy",
                "modelAnswer": "",
                "tip": "Always have 2-3 thoughtful questions prepared.",
            }
        )
    return questions