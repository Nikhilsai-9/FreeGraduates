# Layer B — Candidate Input Contract

> **Purpose.** Defines how the engine reads the candidate payload,
> how it fills gaps, and how it sizes output to seniority. Truth
> constraints from Layer A still apply; nothing in this layer may
> invent data the candidate did not supply.

---

## B.1 Source-of-truth schema

The candidate payload is validated against `app.engine.schemas.CandidateInput`
(Pydantic v2) before rules are evaluated. Any input that fails validation
must be rejected at the API boundary — the engine never receives malformed
data.

Fields are split into three tiers:

| Tier | Meaning on missing |
|------|--------------------|
| Required | Reject the request. Generation does not start. |
| Recommended | Skip the section, emit a `warning` to the caller, continue. |
| Optional | Silently omit; do not warn. |

The current field tiers are documented in `app.engine.schemas`. If the
schema is amended, this layer does not need to change — it inherits the
tier behaviour by reading the schema at runtime.

---

## B.2 Seniority inference

The engine needs a single `seniority` value to drive length budgets,
summary tone, and bullet style. It is computed once, in this order:

1. **Explicit hint.** If `generation_params.seniority_override` is set,
   trust it.
2. **Candidate-supplied level.** If the candidate payload includes a
   `level` field (free-text or enum), normalise it to one of:
   `intern | junior | mid | senior | lead | principal | executive`.
3. **Years-of-experience heuristic.** Sum the duration of the candidate's
   `experience` entries. Map as:
   - `< 1 yr` → `intern`
   - `1–2 yr` → `junior`
   - `3–5 yr` → `mid`
   - `6–8 yr` → `senior`
   - `9–12 yr` → `lead`
   - `13+ yr` → `principal`
   - Any role title containing `CTO`, `VP`, `Head of`, `Director`,
     `Chief` → upgrade one tier unless already `executive`.
4. **Fallback.** Default to `mid`.

When two heuristics disagree, the higher tier is preferred (it is easier
to compress an over-senior resume than to inflate an under-senior one).

The inferred value is cached on `WorkflowState.seniority` and reused by
every agent.

---

## B.3 Length budget

Total CV character budget, by inferred seniority:

| Seniority  | Target | Hard cap |
|------------|--------|----------|
| intern     | 1,800  | 2,200    |
| junior     | 2,400  | 3,200    |
| mid        | 3,800  | 4,200    |
## B.4 Missing-field protocol

When a field is absent, the engine follows this lookup table. The
default action is **omission**, never invention (see Layer A, T-10).

| Missing field              | Action                                          |
|----------------------------|-------------------------------------------------|
| `summary`                  | Generate a neutral 2–3 line summary from title + skills. Add warning. |
| `location`                 | Omit. Do not invent.                            |
| `phone`                    | Omit.                                           |
| `email`                    | Reject as invalid input.                        |
| `links` (LinkedIn, GitHub) | Omit each individually.                         |
| `experience[].end_date`   | Use "Present" if `is_current=true`, else omit.  |
| `experience[]` (empty)     | Reject as invalid input.                        |
| `education[]` (empty)      | Omit the section.                               |
| `skills[]` (empty)         | Reject as invalid input.                        |
| `projects[]`               | Omit the section.                               |
| `certifications[]`         | Omit.                                           |
| `languages[]`              | Omit.                                           |
| `awards[]`                 | Omit.                                           |

Warnings are appended to `WorkflowState.warnings` and surfaced to the
caller; they never leak into the rendered resume.

---

## B.5 Job-description input behaviour

When `job_description` is supplied, the engine treats it as *evidence
about the role*, not as a source of resume content. Concretely:

1. **Keyword extraction.** Pull noun phrases and named skills. Do not
   treat soft skills ("team player") as required.
2. **Coverage check.** For each required skill, search the candidate's
   experience and skills list. Build:
   - `covered`: candidate has explicit evidence.
   - `adjacent`: candidate has related experience (cite the link).
   - `missing`: candidate has no support. These may be mentioned in
     the summary *only* if the candidate has the adjacent skills; never
     invent the missing skills.
3. **JD language mirror.** If the JD uses a specific term ("stakeholder
   management") and the candidate's work clearly covers it, mirror that
   wording in the bullet — again, only if there is support.
4. **No JD = no bias.** Without a JD, the engine optimises for a
   generalist mid-level reader. It does not invent a target role.

The JD is *never* echoed back into the resume. Quoting phrases from the
JD verbatim is a Layer A violation (T-8).

---

## B.6 Date handling

Input dates may arrive in any of:

- `MMM YYYY` ("Jan 2022")
- `MM/YYYY`
- `YYYY-MM`
- `YYYY-MM-DD`
- Plain text ("Present", "Current", "Now")

The renderer normalises all visible dates to `MMM YYYY` (or
`MMM YYYY – Present`). If the input is ambiguous, the renderer keeps
the candidate's source formatting and adds a warning. Dates are never
silently re-interpreted (Layer A, T-4).

---

## B.7 Language and locale

Output language is selected by this priority:

1. `generation_params.language` if set.
2. Detect from `job_description.language` if a JD is provided.
3. Fall back to English.

Once the target language is fixed:

- Section headings are translated (e.g. "Work Experience" →
  "Expérience professionnelle").
- Proper nouns, company names, institution names, and technology names
  stay in their original form.
- Numbers and dates use the locale's conventions (`2024` in English,
  `2 024` with a thin space in French).

---

# End of Layer B

| senior     | 4,800  | 5,500    |
| lead       | 5,800  | 6,800    |
| principal  | 7,000  | 8,000    |
| executive  | 8,000  | 9,500    |

The renderer is allowed to *compress* within the target band without
warning. Going over the hard cap is a quality failure — Layer D must
trigger a revision pass.

Per-section soft ceilings (percentages of the target total):

- Header & contact block: 8%
- Summary: 15%
- Skills: 15%
- Work experience (all roles combined): 50%
- Education: 7%
- Optional sections: share the remaining 5%

These percentages are guidelines, not assertions. The renderer may
rebalance when the candidate's record demands it.

---

