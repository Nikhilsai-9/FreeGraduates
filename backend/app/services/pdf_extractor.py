"""PDF text + structured extraction.

Two paths:

1. **Text path** (default, fast, no extra deps): `pypdf` reads the text
   directly from the PDF. Best for text-based PDFs (most LinkedIn exports).

2. **Vision path** (fallback, slower, costs tokens): convert the first
   few pages to images and ask the LLM to read them. Used when text
   extraction returns less than `MIN_TEXT_CHARS` characters.

Both paths return a `candidate` dict in the **frontend** shape so the
UI can consume it without translation.
"""

from __future__ import annotations

import base64
import io
import logging
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)

MIN_TEXT_CHARS = 200


def extract_candidate_from_pdf(pdf_bytes: bytes, *, poppler_path: Optional[str] = None, llm=None) -> dict:
    text = _extract_text_pypdf(pdf_bytes)
    if len(text.strip()) < MIN_TEXT_CHARS and llm is not None:
        try:
            return _extract_candidate_via_vision(pdf_bytes, poppler_path, llm)
        except Exception as exc:
            logger.warning("Vision fallback failed (%s); using text-only parse.", exc)
    return _parse_text_to_candidate(text)


def _extract_text_pypdf(pdf_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    chunks = []
    for page in reader.pages:
        try:
            chunks.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(chunks)


def _extract_candidate_via_vision(pdf_bytes: bytes, poppler_path: Optional[str], llm) -> dict:
    from pdf2image import convert_from_bytes
    images = convert_from_bytes(pdf_bytes, dpi=150, first_page=1, last_page=2)
    if not images:
        return _parse_text_to_candidate("")
    image_payloads = []
    for img in images[:2]:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        image_payloads.append({"type": "image_url", "image_url": {"url": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")}})
    messages = [
        {"role": "system", "content": "You are FreeGraduates resume parser. Extract the candidate data from the supplied PDF page images and return a single JSON object with the shape: {personal_info, summary, work_experience, education, skills, projects, certifications, awards, languages}. Each item must be an object with appropriate fields. NEVER invent data - if a section is absent, return an empty array or null."},
        {"role": "user", "content": [{"type": "text", "text": "Parse the following resume images and return JSON only."}, *image_payloads]},
    ]
    schema = _candidate_json_schema()
    payload = llm.chat_json(messages=messages, response_schema=schema, schema_name="candidate", temperature=0.0)
    return _normalise_candidate_shape(payload)


def _candidate_json_schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "personal_info": {"type": "object", "properties": {
                "fullName": {"type": "string"}, "email": {"type": "string"},
                "phone": {"type": "string"}, "location": {"type": "string"},
                "linkedin": {"type": "string"}, "github": {"type": "string"},
                "portfolio": {"type": "string"}, "title": {"type": "string"},
            }},
            "summary": {"type": "string"},
            "work_experience": {"type": "array", "items": {"type": "object"}},
            "education": {"type": "array", "items": {"type": "object"}},
            "skills": {"type": "array", "items": {"type": "string"}},
            "projects": {"type": "array", "items": {"type": "object"}},
            "certifications": {"type": "array", "items": {"type": "object"}},
            "awards": {"type": "array", "items": {"type": "object"}},
            "languages": {"type": "array", "items": {"type": "object"}},
        },
        "required": ["personal_info"],
        "additionalProperties": False,
    }



# ---------- Heuristic text parser ----------


_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE = re.compile(r"(\+?\d[\d\s().\-]{7,}\d)")
_URL = re.compile(
    r"(https?://[^\s]+|www\.[^\s]+|linkedin\.com/[^\s]+|github\.com/[^\s]+)",
    re.IGNORECASE,
)

_SECTION_KEYS = {
    "summary": ["summary", "profile", "objective", "about"],
    "experience": ["experience", "work experience", "professional experience", "employment", "work history"],
    "education": ["education", "academic", "academics"],
    "skills": ["skills", "technical skills", "core competencies", "expertise"],
    "projects": ["projects", "selected projects", "academic projects"],
    "certifications": ["certifications", "certificates", "licenses"],
    "awards": ["awards", "honors", "achievements", "honours"],
    "languages": ["languages"],
}


def _parse_text_to_candidate(text: str) -> dict:
    if not text:
        return _empty_candidate()
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    full_text = "\n".join(lines)
    email = (_EMAIL.search(full_text).group(0) if _EMAIL.search(full_text) else "")
    phone = (_PHONE.search(full_text).group(0) if _PHONE.search(full_text) else "")
    urls = _URL.findall(full_text)
    linkedin = next((u for u in urls if "linkedin" in u.lower()), "")
    github = next((u for u in urls if "github" in u.lower()), "")
    portfolio = next((u for u in urls if "linkedin" not in u.lower() and "github" not in u.lower()), "")
    full_name = ""
    for line in lines[:5]:
        if "@" in line or _PHONE.match(line) or _EMAIL.search(line):
            continue
        if 2 <= len(line.split()) <= 5 and all(w[0].isupper() for w in line.split() if w):
            full_name = line
            break
    sections = _split_sections(lines)
    return {
        "personal_info": {"fullName": full_name, "email": email, "phone": phone, "location": "", "linkedin": linkedin, "github": github, "portfolio": portfolio, "title": ""},
        "summary": sections.get("summary", [""])[0] if sections.get("summary") else "",
        "work_experience": _parse_experience(sections.get("experience", [])),
        "education": _parse_education(sections.get("education", [])),
        "skills": _parse_skills(sections.get("skills", [])),
        "projects": _parse_projects(sections.get("projects", [])),
        "certifications": _parse_simple_items(sections.get("certifications", []), "name"),
        "awards": _parse_simple_items(sections.get("awards", []), "title"),
        "languages": [],
    }


def _empty_candidate() -> dict:
    return {"personal_info": {}, "summary": "", "work_experience": [], "education": [], "skills": [], "projects": [], "certifications": [], "awards": [], "languages": []}


def _split_sections(lines) -> dict:
    sections = {k: [] for k in _SECTION_KEYS}
    current = None
    for line in lines:
        key = _match_section_header(line)
        if key:
            current = key
            continue
        if current:
            sections[current].append(line)
    return sections


def _match_section_header(line: str):
    norm = re.sub(r"[^a-z ]", "", line.lower()).strip()
    for key, aliases in _SECTION_KEYS.items():
        for alias in aliases:
            if norm == alias or norm == alias.replace(" ", ""):
                return key
    return None



def _parse_experience(lines) -> list:
    out = []
    current = None
    for line in lines:
        if re.search(r"(19|20)\d{2}", line) and re.search(r"(–|-|—|to|present)", line, re.IGNORECASE):
            if current:
                out.append(current)
            role, company, dates = _split_experience_line(line)
            current = {"id": "exp-" + str(len(out) + 1), "role": role, "company": company, "location": "", "startDate": dates[0], "endDate": dates[1], "description": ""}
        elif current is not None:
            current["description"] = ((current["description"] + "\n" + line).strip() if current["description"] else line)
    if current:
        out.append(current)
    return out


def _split_experience_line(line: str):
    parts = re.split(r"\s+at\s+|\s+-\s+|\s+\|\s+", line, maxsplit=1)
    if len(parts) == 2:
        role, rest = parts
    else:
        role, rest = line, ""
    dates = re.findall(r"((?:19|20)\d{2}|[A-Z][a-z]{2,8}\s+(?:19|20)\d{2}|Present)", rest)
    if len(dates) >= 2:
        d0, d1 = dates[0], dates[1]
        rest = rest.replace(d0, "").replace(d1, "")
    elif len(dates) == 1:
        d0, d1 = dates[0], "Present"
        rest = rest.replace(d0, "")
    else:
        d0, d1 = "", ""
    company = rest.strip(" -–—|,•")
    return role.strip(" -–—|,•"), company, (d0, d1)


def _parse_education(lines) -> list:
    out = []
    current = None
    for line in lines:
        if re.search(r"(19|20)\d{2}", line) and re.search(r"(–|-|—|to)", line, re.IGNORECASE):
            if current:
                out.append(current)
            dates = re.findall(r"((?:19|20)\d{2})", line)
            current = {"id": "edu-" + str(len(out) + 1), "school": line.split(dates[0])[0].strip(" -–—|,") if dates else line.strip(), "degree": "", "field": "", "startDate": dates[0] if dates else "", "endDate": dates[1] if len(dates) > 1 else "", "gpa": "", "location": ""}
        elif current is not None:
            if not current["degree"]:
                current["degree"] = line
            else:
                current["field"] = ((current["field"] + " " + line).strip() if current["field"] else line)
    if current:
        out.append(current)
    return out


def _parse_skills(lines) -> list:
    out = []
    for line in lines:
        parts = re.split(r"[,;•|/]", line)
        for p in parts:
            token = p.strip(" -–—")
            if token and len(token) <= 40:
                out.append(token)
    return out


def _parse_projects(lines) -> list:
    out = []
    for line in lines:
        if not line:
            continue
        out.append({"id": "proj-" + str(len(out) + 1), "title": line.split("—")[0].split("|")[0].strip()[:120], "description": line, "techStack": "", "link": ""})
    return out


def _parse_simple_items(lines, name_field: str) -> list:
    return [{"id": "item-" + str(i + 1), name_field: line[:160]} for i, line in enumerate(lines) if line]


def _normalise_candidate_shape(payload: Any) -> dict:
    base = _empty_candidate()
    if not isinstance(payload, dict):
        return base
    base["personal_info"] = {
        "fullName": payload.get("personal_info", {}).get("fullName", ""),
        "email": payload.get("personal_info", {}).get("email", ""),
        "phone": payload.get("personal_info", {}).get("phone", ""),
        "location": payload.get("personal_info", {}).get("location", ""),
        "linkedin": payload.get("personal_info", {}).get("linkedin", ""),
        "github": payload.get("personal_info", {}).get("github", ""),
        "portfolio": payload.get("personal_info", {}).get("portfolio", ""),
        "title": payload.get("personal_info", {}).get("title", ""),
    }
    base["summary"] = payload.get("summary") or ""
    base["work_experience"] = payload.get("work_experience") or []
    base["education"] = payload.get("education") or []
    base["skills"] = payload.get("skills") or []
    base["projects"] = payload.get("projects") or []
    base["certifications"] = payload.get("certifications") or []
    base["awards"] = payload.get("awards") or []
    base["languages"] = payload.get("languages") or []
    return base
