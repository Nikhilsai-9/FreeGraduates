# Attribution

The Resume Optimizer module in this package adapts selected, useful
**backend** logic from the open-source project
[`JeevansSP/resume-optimizer`](https://github.com/JeevansSP/resume-optimizer)
(© Cydratech, MIT License).

Specifically, the inspiration for the following patterns was taken from
that project:

- **Dual PDF extraction** — text path (pdfplumber / pypdf) with a
  Gemini-vision OCR fallback for scanned / image-only PDFs.
- **Layer A fact preservation** — when the AI rewrites a resume, it is
  forbidden from inventing companies, job titles, degrees, dates,
  metrics, technologies, certifications, or achievements that are not
  present in the user's source resume.
- **Two-phase generation** — analysis (deterministic scoring) is separate
  from AI tailoring so the user can review and edit before exporting.
- **Background task tracking** — long-running tailoring runs are tracked
  with a status so the UI can poll for completion.

What is **NOT** taken from the source repository:

- The Vue 3 frontend — FreeGraduates has its own React UI.
- OAuth, Razorpay payments, Google ADK chat agents, GCS file storage,
  Alembic / Postgres migrations, Docker-compose infrastructure.
- The `resume.cls` LaTeX file (FreeGraduates renders resumes through its
  own `services/pdf_generator.py` / `services/docx_generator.py`).
- Any branding, navigation, marketing copy, or visual design.

The FreeGraduates keyword/skill lexicons, scoring formulas, JD analysis
structure, schemas, API surface, and React UI are **original to
FreeGraduates** and built specifically for this codebase.

## License

The upstream `JeevansSP/resume-optimizer` project is licensed under the
MIT License:

```
MIT License

Copyright (c) Cydratech

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

FreeGraduates itself is MIT-licensed. See `LICENSE` at the repository root.
