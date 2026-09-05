# Layer D — Validation & Recovery

> **Purpose.** Defines the QA pipeline that runs after generation:
> what the engine asserts, how it auto-corrects, when it gives up, and
> what the deterministic fallback produces when the AI path fails.

---

## D.1 Pipeline overview

```
   ┌────────────┐    ┌─────────────┐    ┌────────────┐
   │ rules_loader│ -> │ generator    │ -> │ qa_agent    │
   └────────────┘    └─────────────┘    └────────────┘
                          │                   │
                          v                   v
                    state.draft         state.qa_report
                                              │
                                              v
                                       auto-corrector (loop)
                                              │
                                              v
                                       state.final
```

Every box is a node in the LangGraph workflow defined in
`app.engine.graph`. Each emits a `WorkflowState` patch; none mutates
state outside that contract.

---

## D.2 Pre-generation validation

Before the generator runs, `rules_loader` asserts:

- `CandidateInput` schema passes Pydantic validation.
- At least one `experience` entry exists.
- `skills` is non-empty.
- `email` is a syntactically valid address (RFC 5322 light check).
- `rules_text` is non-empty after concatenation (all four layers
  loaded).

Failure at this stage raises `EnginePrecheckError` and short-circuits
to the deterministic fallback (D.6).

---

## D.3 Post-generation assertions

The `qa_agent` runs a checklist over `state.draft`. Each item returns
`pass | warn | fail`. The full report is attached to
`state.qa_report` and surfaced in the API response.

### Truth invariants (must pass)

| ID    | Check                                                         |
|-------|---------------------------------------------------------------|
| Q-T1  | No token in the draft appears that was not in the candidate input or a generator-generated connector word. |
| Q-T2  | No metric in the draft exceeds the candidate's stated metric. |
| Q-T3  | No role title in the draft was changed from the candidate's input. |
| Q-T4  | No company name in the draft was changed from the candidate's input. |
| Q-T5  | No date in the draft is later than the candidate's `is_current` flag indicates. |

### Structure invariants (must pass)

| ID    | Check                                                         |
|-------|---------------------------------------------------------------|
| Q-S1  | Sections appear in canonical order (C.1).                     |
| Q-S2  | All five required sections present (Header, Summary, Skills, Work Experience, Education or omitted-with-warning). |
| Q-S3  | No tables, images, or emojis in `rendered_markdown`.          |
| Q-S4  | All bullets start with `- ` and a verb.                       |

### Length invariants (warn / fail)

| ID    | Check                                                         |
|-------|---------------------------------------------------------------|
| Q-L1  | Total draft character count <= seniority hard cap (B.3). Fail if exceeded. |
| Q-L2  | Total draft character count within 90%–110% of target. Warn if outside. |

### Coverage invariants (warn)

| ID    | Check                                                         |
|-------|---------------------------------------------------------------|
| Q-C1  | Each required JD skill is mentioned at least once (only when JD supplied). |
| Q-C2  | Each top-3 candidate skill (by frequency in experience) appears in Skills section. |

---

## D.4 Auto-correction loop

When `qa_report` contains any `fail`, the engine enters the correction
loop:

1. Compose a focused revision prompt that quotes the failed checks
   and the offending lines.
2. Call the generator again with `(state.draft, rules_text, revision_prompt)`.
3. Re-run the QA checklist on the new draft.
4. Repeat until either:
   - all checks pass, **or**
   - 3 attempts have been made.

The attempt counter is `state.correction_attempts`. Exceeding 3 triggers
the deterministic fallback (D.6). The candidate is never re-billed for
tokens spent in the loop; the cost is absorbed by the pipeline.

---

## D.5 Failure modes and give-up conditions

The engine gives up and returns `EngineFallbackResult` when:

- LLM call returns a schema-invalid `ResumeStructured` after 2 retries.
- Pre-generation validation fails (D.2).
- Correction loop exhausts 3 attempts (D.4).
- LLM call raises a transient error and the circuit breaker is open
  (see `app.services.circuit_breaker`).

The HTTP response code for fallback is `200` with a `degraded: true`
flag — callers can choose to display a "we used a simplified version"
banner.

---

## D.6 Deterministic fallback

When the AI path is unavailable, `app.engine.fallback` produces a
minimal-but-correct resume directly from the candidate input:

- Header, Summary (auto-generated from title + skills, Layer B.4),
  Skills (sorted alphabetically), Work Experience (candidate bullets
  verbatim, lightly trimmed), Education.
- No JD alignment (cannot be done without generation).
- Length hard cap = senior band (5,500 chars). Excess content is
  trimmed from the oldest role first.

The fallback output is guaranteed to satisfy Q-T1, Q-S1, Q-S2, Q-S3,
Q-S4, and Q-L1 by construction.

---

## D.7 Audit log

Every generation writes a structured record to the audit log
(`app.services.audit`):

```
{
  "request_id": "uuid",
  "ts": "iso8601",
  "seniority": "mid",
  "has_jd": true,
  "draft_chars": 4123,
  "qa": {"pass": 11, "warn": 2, "fail": 0},
  "correction_attempts": 0,
  "fallback_used": false,
  "warnings": ["..."]
}
```

The audit log is append-only and never contains candidate content
beyond the metrics above. It exists to support post-hoc pipeline tuning
without leaking candidate data.

---

# End of Layer D
