"""PDF export — structured resume → ATS-friendly PDF (via WeasyPrint)."""

from __future__ import annotations

import io

from app.engine.schemas import ResumeStructured
from app.services.markdown_generator import render_resume_to_markdown


_PDF_CSS = """
@page { size: A4; margin: 18mm 18mm 18mm 18mm; }
body  { font-family: Calibri, Arial, sans-serif; font-size: 10.5pt; color: #111; line-height: 1.4; }
h1    { font-size: 20pt; margin: 0; text-align: center; }
.subtitle { text-align: center; font-style: italic; font-size: 11pt; margin: 2pt 0 4pt 0; }
.contact   { text-align: center; font-size: 9.5pt; color: #444; margin-bottom: 14pt; }
h2    { font-size: 12pt; text-transform: uppercase; letter-spacing: 0.4pt;
        border-bottom: 1px solid #ccc; padding-bottom: 2pt; margin-top: 14pt; }
h3    { font-size: 11pt; margin: 6pt 0 2pt 0; }
ul    { margin: 0 0 0 18pt; padding: 0; }
li    { margin: 0 0 2pt 0; }
p     { margin: 0 0 6pt 0; }
.dates { color: #555; font-style: italic; font-size: 10pt; }
"""


def render_resume_to_pdf(resume: ResumeStructured) -> bytes:
    """Build a single-page-friendly PDF from a structured resume."""
    # We render via Markdown → HTML → PDF so we can reuse one implementation.
    from weasyprint import HTML  # type: ignore
    from markdown import markdown  # type: ignore

    md = render_resume_to_markdown(resume)
    html = markdown(md, extensions=["extra"])
    full_html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{_PDF_CSS}</style></head><body>{html}</body></html>"

    buf = io.BytesIO()
    HTML(string=full_html).write_pdf(target=buf)
    return buf.getvalue()
