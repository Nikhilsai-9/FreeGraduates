"""Markdown export — structured resume → plain text Markdown.

Used both for the "Export Markdown" button in the UI and as an
intermediate format for PDF generation.
"""

from __future__ import annotations

from app.engine.schemas import ResumeStructured


def render_resume_to_markdown(resume: ResumeStructured) -> str:
    parts: list[str] = []

    # Header
    parts.append(f"# {resume.header.full_name or ''}")
    if resume.header.title:
        parts.append(f"### {resume.header.title}")
    if resume.header.location:
        parts.append(f"_{resume.header.location}_")
    if resume.header.contacts:
        parts.append(" • ".join(resume.header.contacts))
    parts.append("")

    # Summary
    if resume.summary and resume.summary.summary_text:
        parts.append("## Summary")
        parts.append(resume.summary.summary_text)
        parts.append("")

    # Skills
    if resume.skills.groups:
        parts.append("## Skills")
        for grp in resume.skills.groups:
            if not grp.items:
                continue
            parts.append(f"**{grp.group_name}:** " + ", ".join(grp.items))
        parts.append("")

    # Experience
    if resume.experience:
        parts.append("## Experience")
        for exp in resume.experience:
            head = f"### {exp.role} — {exp.company}"
            if exp.location:
                head += f" ({exp.location})"
            parts.append(head)
            parts.append(f"*{exp.start_date} – {exp.end_date}*")
            for h in exp.highlights:
                parts.append(f"- {h}")
            parts.append("")

    # Education
    if resume.education:
        parts.append("## Education")
        for ed in resume.education:
            line = f"### {ed.institution}"
            if ed.degree:
                line += f" — {ed.degree}"
            if ed.field:
                line += f", {ed.field}"
            parts.append(line)
            if ed.start_date or ed.end_date:
                parts.append(f"*{ed.start_date or ''} – {ed.end_date or ''}*")
            if ed.grade:
                parts.append(f"Grade: {ed.grade}")
            parts.append("")

    # Languages
    if resume.languages:
        parts.append("## Languages")
        parts.append(", ".join(f"{l.name} ({l.level})" for l in resume.languages))
        parts.append("")

    # Optional sections
    if resume.optional_sections:
        for sec in resume.optional_sections:
            if not sec.items:
                continue
            parts.append(f"## {sec.title}")
            for item in sec.items:
                parts.append(f"- {item}")
            parts.append("")

    return "\n".join(parts).rstrip() + "\n"
