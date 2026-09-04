"""LangGraph-style resume-generation agents.

The workflow runs five sequential agents:

    1. agent_rules_loader        -> loads Layer A/B/C/D rules.
    2. agent_input_loader        -> normalises the candidate payload.
    3. agent_job_analyzer        -> extracts keywords from the JD.
    4. agent_resume_generator    -> calls the LLM with strict JSON schema.
    5. agent_resume_qa           -> validates data-integrity.

If the Gemini client is not configured the engine returns a deterministic
safe fallback built only from the candidate data.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.engine.schemas import JobTarget, ResumeStructured

logger = logging.getLogger(__name__)


# ---------- Workflow state ----------


@dataclass
class WorkflowState:
    candidate: dict
    job: Optional[JobTarget] = None
    rules_text: str = ""
    jd_keywords: list = field(default_factory=list)
    jd_role: Optional[str] = None
    jd_company: Optional[str] = None
    seniority: str = "mid"
    generated: Optional[ResumeStructured] = None
    qa_report: dict = field(default_factory=dict)
    warnings: list = field(default_factory=list)
    rewrite_used: bool = False


_STOPWORDS = {
    "the", "and", "for", "with", "from", "this", "that", "have", "has", "are",
    "you", "your", "our", "will", "must", "can", "able", "such", "into", "via",
    "their", "they", "them", "all", "any", "etc", "etc.", "using", "use", "used",
    "across", "should", "would", "could", "may", "might", "also", "more", "than",
    "within", "while", "where", "what", "who", "whom", "how", "why", "been",
    "being", "do", "does", "did", "we", "us", "our", "ours", "i", "me", "my",
    "mine", "he", "she", "it", "its", "as", "of", "in", "on", "to", "by",
    "or", "an", "a", "is", "be", "at", "if", "so", "no", "not", "but",
}

_GENERATION_SYSTEM_PROMPT = (
    "You are FreeGraduates — an expert resume writer for students, fresh graduates, "
    "and early-career professionals. You must follow the rules provided in the context "
    "verbatim. NEVER invent information: if a field is not present in the candidate "
    "data, you must omit it or mark it 'Not provided'. Match keywords from the job "
    "description conservatively and naturally — never keyword-stuff."
)

_QA_EMOJI_PATTERN = re.compile(
    "[\\U0001F300-\\U0001FAFF\\U00002600-\\U000027BF\\U0001F000-\\U0001F02F\\U0001F0A0-\\U0001F0FF]",
    flags=re.UNICODE,
)


# ---------- 1. Rules loader ----------


def agent_rules_loader(state: WorkflowState) -> WorkflowState:
    from app.engine.rules_loader import load_all_rules

    state.rules_text = load_all_rules()
    if not state.rules_text:
        state.warnings.append("Rule layers not found — AI will fall back to built-in safety rules.")
    return state


# ---------- 2. Input loader ----------


def agent_input_loader(state: WorkflowState) -> WorkflowState:
    cand = dict(state.candidate or {})
    pi = {k: v for k, v in (cand.get("personal_info") or {}).items() if v not in (None, "")}
    if pi:
        cand["personal_info"] = pi

    def _nonempty(items, keys):
        return [i for i in (items or []) if any((i.get(k) not in (None, "") for k in keys))]

    cand["work_experience"] = _nonempty(cand.get("work_experience") or [], ("role", "company"))
    cand["education"] = _nonempty(cand.get("education") or [], ("school", "degree", "institution"))
    cand["projects"] = _nonempty(cand.get("projects") or [], ("name", "title"))
    cand["certifications"] = _nonempty(cand.get("certifications") or [], ("name",))
    cand["awards"] = _nonempty(cand.get("awards") or [], ("title",))
    cand["publications"] = _nonempty(cand.get("publications") or [], ("title",))
    cand["teaching"] = _nonempty(cand.get("teaching") or [], ("role", "title", "course"))
    cand["volunteering"] = _nonempty(cand.get("volunteering") or [], ("role", "organization"))

    skills = cand.get("skills")
    if isinstance(skills, list):
        cand["skills"] = {"technical": [s for s in skills if s]}
    elif isinstance(skills, dict):
        cand["skills"] = {
            "technical": [s for s in (skills.get("technical") or []) if s],
            "tools": [s for s in (skills.get("tools") or []) if s],
            "soft": [s for s in (skills.get("soft") or []) if s],
        }

    state.candidate = cand
    years = _estimate_years_experience(cand.get("work_experience") or [])
    state.seniority = _classify_seniority(years, cand)
    return state


def _parse_date(text: str):
    text = text.strip()
    if not text:
        return None
    for fmt in ("%Y-%m", "%Y-%m-%d", "%b %Y", "%B %Y", "%Y", "%m/%Y"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _safe_dates(item: dict):
    raw_a = item.get("startDate") or item.get("start_date") or ""
    raw_b = item.get("endDate") or item.get("end_date") or ""
    a = _parse_date(str(raw_a))
    if str(raw_b).lower() in ("present", "current", ""):
        b = datetime.now()
    else:
        b = _parse_date(str(raw_b))
    return a, b


def _estimate_years_experience(items) -> float:
    total = 0.0
    for it in items:
        a, b = _safe_dates(it)
        if a and b:
            total += max(0.0, (b - a).days / 365.25)
    return total


def _classify_seniority(years: float, cand: dict) -> str:
    if years < 1:
        return "junior"
    if years < 4:
        return "mid"
    if years < 8:
        return "senior"
    return "executive"



# ---------- 3. Job analyzer ----------


def agent_job_analyzer(state: WorkflowState) -> WorkflowState:
    if state.job is None:
        return state
    state.jd_role = state.job.role
    state.jd_company = state.job.company
    jd = (state.job.description or "").strip()
    if jd:
        state.jd_keywords = _extract_keywords(jd, top_n=15)
    return state


def _extract_keywords(text: str, top_n: int = 15) -> list:
    text = text.lower()
    tokens = re.findall(r"[a-z][a-z0-9+#.\-]{2,}", text)
    counts: dict = {}
    for t in tokens:
        if t in _STOPWORDS:
            continue
        counts[t] = counts.get(t, 0) + 1
    return [w for w, _ in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:top_n]]


# ---------- 4. Resume generator ----------


def agent_resume_generator(state: WorkflowState) -> WorkflowState:
    from app.engine.llm import get_llm

    llm = get_llm()
    if not llm.is_available:
        state.generated = _fallback_resume(state)
        state.warnings.append("GEMINI_API_KEY not set - returning a non-AI template generated from the supplied data only.")
        return state

    schema = _json_schema_for(ResumeStructured.model_json_schema())
    messages = [
        {"role": "system", "content": _GENERATION_SYSTEM_PROMPT},
        {"role": "user", "content": _build_prompt(state)},
    ]
    try:
        payload = llm.chat_json(
            messages=messages,
            response_schema=schema,
            schema_name="resume_structured",
            temperature=0.2,
        )
        state.generated = ResumeStructured.model_validate(payload)
    except Exception as exc:
        logger.warning("AI generation failed (%s) - falling back to safe template.", exc)
        state.warnings.append("AI generation failed (" + exc.__class__.__name__ + "); using safe fallback.")
        state.generated = _fallback_resume(state)
    return state


def _build_prompt(state: WorkflowState) -> str:
    rules = state.rules_text or "(rule files missing - rely on your safety training)"
    cand = json.dumps(state.candidate, ensure_ascii=False, indent=2)
    job: dict = {}
    if state.job and (state.job.role or state.job.company or state.job.description):
        job = {"role": state.job.role, "company": state.job.company, "keywords": state.jd_keywords, "description": state.job.description or ""}
    job_block = json.dumps(job, ensure_ascii=False, indent=2) if job else "(no job description)"
    return (
        "=== CONSTITUTION (the 4 rule layers) ===\n" + rules + "\n\n"
        "=== TASK ===\n"
        "Generate a strictly JSON-structured resume following the schema.\n"
        "Output JSON only - no prose, no markdown fences.\n\n"
        "=== SENIORITY ===\n" + state.seniority + "\n\n"
        "=== CANDIDATE DATA (this is the ONLY source of facts) ===\n" + cand + "\n\n"
        "=== TARGET JOB (optional) ===\n" + job_block + "\n"
    )


def _json_schema_for(pydantic_schema: dict) -> dict:
    cleaned = json.loads(json.dumps(pydantic_schema))

    def _strip(node):
        if isinstance(node, dict):
            return {k: _strip(v) for k, v in node.items() if k not in {"title", "description", "$schema", "examples"}}
        if isinstance(node, list):
            return [_strip(item) for item in node]
        return node

    return _strip(cleaned)



# ---------- 5. QA validator ----------


def agent_resume_qa(state: WorkflowState) -> WorkflowState:
    issues: list = []
    if state.generated is None:
        issues.append("Resume was not generated.")
        state.qa_report = {"passed": False, "issues": issues}
        return state

    cand_pi = state.candidate.get("personal_info") or {}
    cand_email = (cand_pi.get("email") or "").strip().lower()
    gen = state.generated

    # 1. Name must match candidate
    cand_name = (cand_pi.get("fullName") or cand_pi.get("full_name") or "").strip().lower()
    gen_name = (gen.header.full_name or "").strip().lower()
    if cand_name and gen_name and gen_name != cand_name:
        issues.append("Header name '" + gen.header.full_name + "' does not match candidate data - corrected.")
        gen.header.full_name = (
            cand_pi.get("fullName") or cand_pi.get("full_name") or gen.header.full_name
        )

    # 2. Email in contacts must be candidate's email if present
    if gen.header.contacts:
        gen.header.contacts = [
            c for c in gen.header.contacts
            if (
                (cand_email and cand_email in c.lower())
                or "linkedin" in c.lower()
                or "github" in c.lower()
                or c.lower().startswith("http")
                or "@" not in c
            )
        ]

    # 3. Experience entries must come from candidate
    cand_roles = {
        (e.get("role") or "").strip().lower(): (e.get("company") or "").strip().lower()
        for e in (state.candidate.get("work_experience") or [])
    }
    cleaned_exp: list = []
    for exp in gen.experience:
        key = (exp.role or "").strip().lower()
        if key and key not in cand_roles:
            issues.append("Experience role '" + exp.role + "' not found in candidate data - dropped.")
            continue
        if key and cand_roles[key] and exp.company and exp.company.strip().lower() != cand_roles[key]:
            issues.append("Experience company mismatch for '" + exp.role + "' - corrected.")
            exp.company = next(
                (e.get("company") for e in (state.candidate.get("work_experience") or []) if (e.get("role") or "").strip().lower() == key),
                exp.company,
            )
        cleaned_exp.append(exp)
    gen.experience = cleaned_exp

    # 4. Education entries must come from candidate
    cand_schools = {(e.get("school") or e.get("institution") or "").strip().lower() for e in (state.candidate.get("education") or [])}
    gen.education = [e for e in gen.education if not (e.institution or "").strip() or (e.institution.strip().lower() in cand_schools)]

    # 5. Strip emojis
    def _clean_text(t):
        if not t:
            return t or ""
        return _QA_EMOJI_PATTERN.sub("", t).strip()

    if gen.summary and gen.summary.summary_text:
        gen.summary.summary_text = _clean_text(gen.summary.summary_text)
    for grp in gen.skills.groups:
        grp.items = [_clean_text(i) for i in grp.items if i]
    for exp in gen.experience:
        exp.highlights = [_clean_text(h) for h in exp.highlights if h]
    if gen.optional_sections:
        for sec in gen.optional_sections:
            sec.items = [_clean_text(i) for i in sec.items if i]

    state.generated = gen
    state.qa_report = {"passed": len(issues) == 0, "issues": issues, "rewritten": False}
    return state



# ---------- Safe fallback (no AI required) ----------


def _fallback_resume(state: WorkflowState):
    """Generate a deterministic resume from the candidate data when no LLM is available."""
    from app.engine.schemas import (
        EducationEntry,
        ExperienceEntry,
        Header,
        LanguageEntry,
        OptionalSection,
        SkillGroup,
        Skills,
        Summary,
    )

    pi = state.candidate.get("personal_info") or {}
    name = pi.get("fullName") or pi.get("full_name") or "Candidate"
    title = pi.get("title") or _infer_title(state.candidate) or state.jd_role or "Aspiring Professional"

    contacts: list = []
    for key in ("location", "phone", "email", "linkedin", "github", "portfolio"):
        val = pi.get(key) or pi.get(key.lower())
        if val:
            contacts.append(str(val))

    summary_text = state.candidate.get("summary") or _build_fallback_summary(state.candidate)

    skills_dict = state.candidate.get("skills") or {}
    groups: list = []
    if isinstance(skills_dict, dict):
        if skills_dict.get("technical"):
            groups.append(SkillGroup(group_name="Technical", items=list(skills_dict["technical"])))
        if skills_dict.get("tools"):
            groups.append(SkillGroup(group_name="Tools", items=list(skills_dict["tools"])))
        if skills_dict.get("soft"):
            groups.append(SkillGroup(group_name="Soft Skills", items=list(skills_dict["soft"])))
    elif isinstance(skills_dict, list):
        if skills_dict:
            groups.append(SkillGroup(group_name="Skills", items=list(skills_dict)))

    experience_entries: list = []
    for e in state.candidate.get("work_experience") or []:
        bullets = _split_bullets(e.get("description"))
        experience_entries.append(
            ExperienceEntry(
                role=e.get("role") or "",
                company=e.get("company") or "",
                location=e.get("location"),
                start_date=e.get("startDate") or e.get("start_date") or "",
                end_date=e.get("endDate") or e.get("end_date") or "",
                highlights=bullets,
            )
        )

    education_entries: list = []
    for ed in state.candidate.get("education") or []:
        education_entries.append(
            EducationEntry(
                institution=ed.get("school") or ed.get("institution") or "",
                degree=ed.get("degree") or "",
                field=ed.get("field"),
                location=ed.get("location"),
                start_date=ed.get("startDate") or ed.get("start_date"),
                end_date=ed.get("endDate") or ed.get("end_date"),
                grade=ed.get("gpa") or ed.get("grade"),
            )
        )

    lang_entries: list = []
    for l in state.candidate.get("languages") or []:
        if isinstance(l, dict) and l.get("name"):
            lang_entries.append(LanguageEntry(name=l["name"], level=l.get("level") or "Fluent"))

    optional_sections: list = []
    if state.candidate.get("projects"):
        proj_items = []
        for p in state.candidate["projects"]:
            title_p = p.get("name") or p.get("title") or ""
            stack = p.get("techStack") or p.get("tech_stack")
            desc = p.get("description") or ""
            line = title_p + (" - " + stack if stack else "") + (": " + desc if desc else "")
            proj_items.append(line.strip(": "))
        if proj_items:
            optional_sections.append(OptionalSection(title="Projects", items=proj_items))
    if state.candidate.get("certifications"):
        cert_items = [c.get("name") for c in state.candidate["certifications"] if c.get("name")]
        if cert_items:
            optional_sections.append(OptionalSection(title="Certifications", items=cert_items))
    if state.candidate.get("awards"):
        award_items = [a.get("title") for a in state.candidate["awards"] if a.get("title")]
        if award_items:
            optional_sections.append(OptionalSection(title="Awards", items=award_items))

    return ResumeStructured(
        header=Header(full_name=name, title=title, location=pi.get("location"), contacts=contacts),
        summary=Summary(summary_text=summary_text),
        skills=Skills(groups=groups),
        experience=experience_entries,
        education=education_entries,
        languages=lang_entries or None,
        optional_sections=optional_sections or None,
    )



def _split_bullets(text) -> list:
    if not text:
        return []
    parts = re.split(r"\n+|;\s*(?=[A-Z])", text)
    return [p.strip(" •-*").strip() for p in parts if p.strip(" •-*").strip()]


def _build_fallback_summary(cand: dict) -> str:
    pi = cand.get("personal_info") or {}
    role = _infer_title(cand) or pi.get("title") or "professional"
    yrs = _estimate_years_experience(cand.get("work_experience") or [])
    if yrs < 1:
        yrs_text = "early-career"
    elif yrs < 4:
        yrs_text = str(int(yrs)) + "-year"
    elif yrs < 8:
        yrs_text = str(int(yrs)) + "-year"
    else:
        yrs_text = "senior"
    skills = []
    skills_dict = cand.get("skills") or {}
    if isinstance(skills_dict, dict):
        skills = list(skills_dict.get("technical") or [])
    elif isinstance(skills_dict, list):
        skills = list(skills_dict)
    skills_text = ", ".join(skills[:5]) if skills else "modern technologies"
    return (
        yrs_text.capitalize() + " " + role + " with hands-on experience delivering solutions "
        "using " + skills_text + ". Passionate about building reliable, well-designed products and "
        "continuously expanding technical depth."
    )


def _infer_title(cand: dict):
    for e in cand.get("work_experience") or []:
        r = e.get("role") or ""
        if r:
            return r
    return None
