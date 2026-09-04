"""Generate a realistic test resume PDF for end-to-end testing.

Used by the manual upload verification script. Produces
`scripts/sample-resume.pdf` with actual text content (name, email,
phone, education, experience, skills, projects) so pypdf can extract
it without needing OCR.
"""
from __future__ import annotations

import os
import sys

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    KeepTogether,
)

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample-resume.pdf")


def build():
    styles = getSampleStyleSheet()
    name_style = ParagraphStyle(
        "Name", parent=styles["Title"], fontSize=22, spaceAfter=4, alignment=TA_LEFT,
    )
    contact_style = ParagraphStyle(
        "Contact", parent=styles["Normal"], fontSize=10, textColor="#444",
    )
    h2 = ParagraphStyle(
        "H2", parent=styles["Heading2"], fontSize=13, spaceBefore=10, spaceAfter=4,
        textColor="#1a1a1a",
    )
    body = styles["BodyText"]
    body.fontSize = 10
    body.leading = 13

    doc = SimpleDocTemplate(
        OUT_PATH, pagesize=LETTER,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        title="Aarav Sharma - Software Engineer Resume",
    )

    story = []
    story.append(Paragraph("Aarav Sharma", name_style))
    story.append(Paragraph(
        "Software Engineer | aarav.sharma@example.com | +1-415-555-0142 | "
        "San Francisco, CA | linkedin.com/in/aaravsharma | github.com/aaravsharma",
        contact_style,
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Summary", h2))
    story.append(Paragraph(
        "Final-year Computer Science student with hands-on experience building "
        "full-stack web applications and ML pipelines. Looking for a new-grad "
        "software engineering role where I can ship product features that real users use.",
        body,
    ))

    story.append(Paragraph("Experience", h2))
    story.append(KeepTogether([
        Paragraph("<b>Software Engineering Intern</b> &mdash; Acme Corp", body),
        Paragraph("Jun 2024 &ndash; Aug 2024", contact_style),
        Paragraph(
            "Built an internal dashboard in React + TypeScript used by 200+ sales reps.<br/>"
            "Migrated a legacy Python ETL job to Airflow, cutting nightly run time by 38%.<br/>"
            "Wrote pytest suites that took feature coverage from 41% to 78%.",
            body,
        ),
    ]))
    story.append(KeepTogether([
        Paragraph("<b>Undergraduate Research Assistant</b> &mdash; State University CS Lab", body),
        Paragraph("Sep 2023 &ndash; May 2024", contact_style),
        Paragraph(
            "Implemented a retrieval-augmented generation pipeline over 12k scientific abstracts.<br/>"
            "Co-authored a workshop paper on evaluation of long-context LLM summarisation.",
            body,
        ),
    ]))

    story.append(Paragraph("Education", h2))
    story.append(KeepTogether([
        Paragraph("<b>B.S. Computer Science</b> &mdash; State University", body),
        Paragraph("Expected May 2026 &mdash; GPA 3.8 / 4.0", contact_style),
        Paragraph(
            "Relevant coursework: Algorithms, Operating Systems, Databases, "
            "Distributed Systems, Machine Learning, Human-Computer Interaction.",
            body,
        ),
    ]))

    story.append(Paragraph("Projects", h2))
    story.append(Paragraph(
        "<b>GradTrack</b> &mdash; React, Node.js, PostgreSQL, Docker. "
        "A degree-audit tool 400+ students use to plan remaining courses.<br/>"
        "<b>PaperLens</b> &mdash; Python, FastAPI, OpenAI. "
        "RAG app that lets researchers ask questions of a paper archive.<br/>"
        "<b>HabitGarden</b> &mdash; Swift, SwiftUI. "
        "iOS habit tracker with on-device streak analytics (2.1k App Store downloads).",
        body,
    ))

    story.append(Paragraph("Skills", h2))
    story.append(Paragraph(
        "Python, TypeScript, JavaScript, React, Node.js, FastAPI, Django, "
        "PostgreSQL, Docker, Git, pytest, scikit-learn, PyTorch, Linux, "
        "REST APIs, GraphQL, CI/CD, AWS (S3, Lambda, ECS)",
        body,
    ))

    story.append(Paragraph("Awards", h2))
    story.append(Paragraph(
        "Dean's List (Fall 2023, Spring 2024). HackMIT 2024 - First Place, Education Track.",
        body,
    ))

    doc.build(story)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    sys.exit(build())
