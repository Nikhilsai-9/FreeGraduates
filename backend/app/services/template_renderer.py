"""HTML template renderer for the live preview pane.

This is deliberately minimal: a single ATS-friendly block layout with
optional palette swap per template id. The preview shown in the UI is
generated server-side as well so search engines and PDF export can use
the same HTML.
"""

from __future__ import annotations

import html
from typing import Any

from app.engine.schemas import ResumeStructured


_TEMPLATES = {
    "classic": {
        "label": "Classic",
        "accent": "#1e2532",
        "font": "Georgia, serif",
    },
    "professional": {
        "label": "Professional",
        "accent": "#1a1c6a",
        "font": "'Inter', sans-serif",
    },
    "modern": {
        "label": "Modern",
        "accent": "#5660e8",
        "font": "'Inter', sans-serif",
    },
    "minimal": {
        "label": "Minimal",
        "accent": "#444",
        "font": "'Inter', sans-serif",
    },
    "student": {
        "label": "Graduate",
        "accent": "#1a91f0",
        "font": "'Inter', sans-serif",
    },
    "software-engineer": {
        "label": "Software Engineer",
        "accent": "#016fd0",
        "font": "'Inter', sans-serif",
    },
}


def list_templates() -> list[dict]:
    """Return the metadata for every available template."""
    return [{"id": k, **v} for k, v in _TEMPLATES.items()]


def get_template(template_id: str) -> dict:
    return _TEMPLATES.get(template_id, _TEMPLATES["classic"])


def render_resume_to_html(resume: ResumeStructured, template_id: str = "classic") -> str:
    """Render the resume as a self-contained HTML snippet for the preview pane."""
    tmpl = get_template(template_id)

    css = f"""
    body {{ font-family: {tmpl['font']}; color: #1e2532; margin: 0; padding: 24px; }}
    h1 {{ color: {tmpl['accent']}; margin: 0; font-size: 24px; }}
    h2 {{ color: {tmpl['accent']}; font-size: 14px;
          text-transform: uppercase; letter-spacing: 0.05em;
          border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 18px 0 8px; }}
    h3 {{ font-size: 14px; margin: 8px 0 2px; }}
    .subtitle {{ font-style: italic; color: #555; }}
    .contact {{ font-size: 12px; color: #555; margin-top: 4px; }}
    .meta {{ font-style: italic; color: #555; font-size: 12px; }}
    ul {{ padding-left: 20px; margin: 4px 0 12px; }}
    li {{ margin-bottom: 4px; line-height: 1.4; }}
    p {{ line-height: 1.4; margin: 4px 0; }}
    .item {{ margin-bottom: 12px; }}
    """

    parts: list[str] = [f"<style>{css}</style>"]
    parts.append(f"<h1>{html.escape(resume.header.full_name or '')}</h1>")
    if resume.header.title:
        parts.append(f'<div class="subtitle">{html.escape(resume.header.title)}</div>')
    if resume.header.location:
        parts.append(f'<div class="contact">{html.escape(resume.header.location)}</div>')
    if resume.header.contacts:
        contacts = " • ".join(html.escape(c) for c in resume.header.contacts)
        parts.append(f'<div class="contact">{contacts}</div>')

    if resume.summary and resume.summary.summary_text:
        parts.append("<h2>Summary</h2>")
        parts.append(f"<p>{html.escape(resume.summary.summary_text)}</p>")

    if resume.skills.groups:
        parts.append("<h2>Skills</h2>")
        for grp in resume.skills.groups:
            if not grp.items:
                continue
            parts.append(
                f'<p><strong>{html.escape(grp.group_name)}:</strong> '
                + html.escape(", ".join(grp.items))
                + "</p>"
            )

    if resume.experience:
        parts.append("<h2>Experience</h2>")
        for exp in resume.experience:
            parts.append('<div class="item">')
            parts.append(
                f'<h3>{html.escape(exp.role)} '
                f'<span class="meta">— {html.escape(exp.company)}</span></h3>'
            )
            parts.append(
                f'<div class="meta">{html.escape(exp.start_date)} – '
                f'{html.escape(exp.end_date)}</div>'
            )
            if exp.highlights:
                parts.append("<ul>")
                for h in exp.highlights:
                    parts.append(f"<li>{html.escape(h)}</li>")
                parts.append("</ul>")
            parts.append("</div>")

    if resume.education:
        parts.append("<h2>Education</h2>")
        for ed in resume.education:
            parts.append('<div class="item">')
            line = html.escape(ed.institution)
            if ed.degree:
                line += f" — {html.escape(ed.degree)}"
            if ed.field:
                line += f", {html.escape(ed.field)}"
            parts.append(f"<h3>{line}</h3>")
            if ed.start_date or ed.end_date:
                parts.append(
                    f'<div class="meta">{html.escape(ed.start_date or "")} – '
                    f'{html.escape(ed.end_date or "")}</div>'
                )
            if ed.grade:
                parts.append(f"<p>Grade: {html.escape(ed.grade)}</p>")
            parts.append("</div>")

    if resume.languages:
        parts.append("<h2>Languages</h2>")
        parts.append(
            "<p>"
            + ", ".join(
                f"{html.escape(l.name)} ({html.escape(l.level)})"
                for l in resume.languages
            )
            + "</p>"
        )

    if resume.optional_sections:
        for sec in resume.optional_sections:
            if not sec.items:
                continue
            parts.append(f"<h2>{html.escape(sec.title)}</h2>")
            parts.append("<ul>")
            for item in sec.items:
                parts.append(f"<li>{html.escape(item)}</li>")
            parts.append("</ul>")

    return "\n".join(parts)
