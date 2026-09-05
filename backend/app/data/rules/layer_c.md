# Layer C — Structured Output & Presentation

> **Purpose.** Defines the exact shape of the rendered resume. The
> output is a `ResumeStructured` object (Pydantic) that the renderer
> converts to ATS-safe Markdown, then to PDF/DOCX. Truth constraints
> from Layer A and the input contract from Layer B still apply.

---

## C.1 Section order (canonical, immutable)

Every rendered resume MUST emit sections in this exact order. Skipping
a section is allowed when its data is absent (Layer B); reordering is
not.

```
1. Header           (always)
2. Summary          (always; may be auto-generated, see B.4)
3. Core Skills      (always; "skills" key in input)
4. Work Experience  (always; reverse chronological)
5. Education        (when data present)
6. Projects         (optional, when data present)
7. Certifications   (optional)
8. Languages        (optional)
9. Awards           (optional)
10. Publications    (optional)
```

The renderer MUST NOT introduce new top-level sections.

---

## C.2 Markdown conventions

The intermediate Markdown must obey these rules so it survives ATS
parsers and downstream DOCX/PDF conversion cleanly:

- **Headings.** Use `##` for section names. One blank line above and
  below every heading.
- **Bullets.** Use `-` (hyphen + space). No `*`, no `•`, no nested
  bullets deeper than two levels.
- **Emphasis.** `**bold**` for company / institution / degree names.
  No italics (ATS strip).
- **Inline code / monospace.** Use backticks for technology tokens
  (`React`, `PostgreSQL`, `gRPC`) only inside bullet prose. Never as
  a replacement for plain noun phrases.
- **Links.** Always full URLs (`https://...`). Never `[anchor](url)`
  form in the rendered output; the renderer flattens to bare URL.
- **Horizontal rules.** Never used inside the resume body.
- **Tables.** Forbidden. Two-column layouts in source become stacked
  label + value pairs in render.
- **Code blocks.** Forbidden.
- **Images / icons / emojis.** Forbidden.

---

## C.3 Header block

```
# Full Name
City, Country · email@example.com · +1 555 0100 · linkedin.com/in/handle
```

Rules:

- Name on its own line, level-1 heading.
- Contact items separated by ` · ` (middle dot, U+00B7), single line.
- Each link is the bare URL, not an anchor.
- If `phone` is missing, omit the phone segment cleanly.
- If `location` is missing, drop the city entirely; do not pad.
- If the candidate supplies multiple links, render left-to-right in
  the order provided, capped at 4 to keep the header under one line
  at the typical font width.

---

## C.4 Summary block

- 2–4 sentences (target ~280 characters, hard cap 420).
- Voice determined by `generation_params.summary_person`:
  - `first`  → first person ("I build...", "I led...")
  - `third`  → third person ("Builds scalable...", "Led a team of...")
  - absent   → default to **third person**.
- If a JD is supplied, weave 3–5 keywords from the JD into the summary
  without quoting the JD verbatim (Layer A, T-8).
- If the candidate did not provide a summary, auto-generate one from
  `(current_title, years_of_experience, top_skills)` — neutral tone,
  no superlatives.

## C.6 Work experience block

Each role renders as:

```
### Company Name — Role Title
*Jan 2022 – Present · City, Country*

- Action verb + what you did + tech/method + quantified impact.
- ...
```

Rules:

- Company name and role title on the same heading, separated by ` — `
  (em dash + spaces).
- Date line is italic, monospaced only when explicitly requested.
  Format: `MMM YYYY – MMM YYYY` or `MMM YYYY – Present`.
- Bullets: minimum 2, maximum per seniority per role (Layer B budgets).
- Each bullet starts with a strong action verb (Layer A.6).
- Technologies are referenced inline (`Built a gRPC service in Go`),
  not collected into a separate line.
- Roles are sorted by start date, descending. Overlapping roles keep
  both entries; both date ranges are shown as supplied.
- When the role has no bullets supplied, render a single placeholder
  bullet with the role title as the verb phrase: `- Held role of X.`
  This is the only allowed fabrication-free placeholder.

---

## C.7 Education block

```
### Institution Name
*Degree, Field · 2018 – 2022*
```

- One entry per degree/certification supplied.
- Honours (`First Class`, `Magna Cum Laude`) are rendered only when
  the candidate supplied them.
- GPA only when the candidate supplied it.
- Expected graduation rendered as `Expected MMM YYYY` (italic).

---

## C.8 Optional sections

| Section | Format |
|---------|--------|
| Projects | Same shape as Work Experience but without employer; include role if supplied. |
| Certifications | `- Certification Name — Issuer · Year` |
| Languages | `- Language · Proficiency (CEFR where supplied)` |
| Awards | `- Award Name — Issuer · Year` |
| Publications | `- Title — Venue · Year · URL` |

The renderer MUST honour the order in C.1 when more than one optional
section is present.

---

## C.9 Date format (canonical)

- Internal storage: ISO `YYYY-MM`.
- Rendered: `MMM YYYY` ("Jan 2022", "Sep 2024").
- Ongoing: `Present` (capitalised, no `current` / `now` / `till date`).
- Always include the year. Never "Jan 22" (no two-digit years).
- For ranges: `Jan 2022 – Present` with en-dash + spaces. The
  renderer must use en-dash (U+2013), not hyphen-minus.

---

## C.10 Renderer hooks

The Markdown produced under these rules is consumed by:

1. **PDF renderer.** `app.services.pdf_renderer`. Uses WeasyPrint
   with a single-column stylesheet. ATS-safe fonts only (no ligatures
   that confuse parsers).
2. **DOCX renderer.** `app.services.docx_renderer`. Uses python-docx
   with built-in heading styles. No custom styles to avoid ATS
   breakage.
3. **Markdown preview.** Returned to the caller as `rendered_markdown`
   for in-app preview.

All three renderers MUST produce output that, when parsed back to
plain text, contains the same key tokens in the same order as the
`ResumeStructured` object.

---

## C.11 ATS-specific format rules

The rendered output (any format) MUST satisfy:

- All section names are in the ATS-friendly vocabulary (Layer C.1).
- No two-column layouts, sidebars, or floating elements.
- All contact info is plain text — no images of text, no QR codes.
- Font is a single, ubiquitous family (no symbol fonts).
- Special characters limited to ASCII plus a small set: `– · • © ®`.
- No header / footer text (page numbers, "Resume of...") — these
  confuse ATS keyword extraction.

Violation of any item above is a quality failure. Layer D's QA agent
must flag it.

---

# End of Layer C

---

## C.5 Skills block

- Render as bullet list, one bullet per logical group:

  ```
  - **Languages**: Python, TypeScript, Go
  - **Frameworks**: React, FastAPI, Django
  - **Datastores**: PostgreSQL, Redis, BigQuery
  - **Cloud**: AWS (Lambda, S3, RDS), GCP (Cloud Run)
  - **Practices**: CI/CD, observability, incident response
  ```

- 3–6 groups recommended; never more than 8 (readability).
- Each group lists skills comma-separated. The candidate's order within
  a group is preserved.
- Skills the candidate never explicitly listed MUST NOT appear (Layer A,
  T-5). The only allowed derivation is re-grouping existing skills
  (e.g. moving "Docker" from "Cloud" to "Containerisation").
- When a JD is supplied, the JD's required skills are surfaced *first*
  within each group, but only when the candidate actually has them.

---

