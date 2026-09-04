# Layer A — Mandatory Operational Rules (Revised)

### (One-page maximum — ALL rules here are MANDATORY)

## 1. Core Principles

1. **NEVER invent information.**
2. **Use ONLY the data provided in the JSON.**
3. **Do NOT modify dates, job titles, companies, education, or links.**
4. If any field is missing, **omit it** — never create content.

---

## 2. Decision Priority (strict hierarchy)

If two rules conflict, the rule with higher priority ALWAYS wins:

1. **Data Integrity**
2. **ATS Compatibility**
3. **Job Description Alignment**
4. **Seniority Fit**
5. **Character Limit**
6. **Style & Readability**

---

## 3. Mandatory CV Structure (fixed and immutable order)

1. **Header / Personal Information**
2. **Professional Summary**
3. **Core Skills & Technologies**
4. **Work Experience** (reverse chronological)
5. **Education**
6. **Optional Sections** (only if they exist in the JSON):
   - Leadership & Executive Profile  
   - Selected Projects / Research  
   - Teaching Experience  
   - Publications & Patents  
   - Awards  
   - Languages  

**This order must NEVER change.**

---

## 4. Hard ATS Requirements

- No tables, no columns, no text boxes.
- No images, icons, logos, or emojis.
- ASCII characters only.
- Bullet points **must** use `-`.
- Date format: `MMM YYYY – MMM YYYY` or `MMM YYYY – Present`.
- All links must be full URLs (e.g., `https://...`).
- Email displayed as plain text (no markdown links, no anchor text, no `mailto:`).
- No special characters or fancy formatting.

---

## 5. Critical Content Rules

### 5.1 Professional Summary

- 3–5 lines.
- Voice controlled by `generation_params.summary_person`:
  - If `"first"` → first person ("I am..." / "I have...")
  - If `"third"` → third person ("Professional with..." / "Experienced...")
  - If absent → default to **third person**.
- Adapt tone and focus to seniority level.
- MUST include **3–5 relevant keywords** from the job description (if provided).

### 5.2 Core Skills & Technologies

- Group skills into 3–5 categories.
- Use ONLY skills that exist in the JSON.
- Skill ordering priority:
  1. Required skills from the job description
  2. Skills used in Work Experience
  3. Skills used in Projects
  4. Skills listed in technical knowledge only

### 5.3 Work Experience

- Sort by most recent start date (reverse chronological).
- For parallel/simultaneous roles: list both with overlapping date ranges.
- Bullet count rules:
  - Current role: 4–8 bullets  
  - Last 5 years: 3–5 bullets  
  - Older roles: 2–3 bullets  
- Each bullet MUST follow the structure:
  **Action Verb + What You Did + Technology/Method + Impact (preferably quantified)**  
- **All critical job-description skills MUST appear here at least once** (if job description provided).

---

## 6. Character Limits (strict caps)

- **Executive roles:** up to 8,000 characters  
- **Senior/Lead:** up to 4,200  
- **Mid-level:** up to 3,200  
- **Junior:** up to 2,200  

If limits are exceeded, apply size-reduction algorithm (see Layer B Section 8).

---

## 7. Language Policy (deterministic)

1. If `generation_params.language` exists → use it.
2. Else detect the job description language.
3. If ambiguous or no job description → default to **English**.

Mixed-language content in JSON: preserve original language for proper nouns, company names, and technologies; translate only narrative content.

---

## 8. Mandatory JSON Validations

Before generating the CV:

- Validate date formats (never correct them — just use them as is).
- If two roles are identical with different dates → KEEP both.
- If location is missing → omit location gracefully.
- If summary is missing → generate a **neutral summary** based on the job description and JSON data.
- If skills appear multiple times → consolidate into the most relevant category.

---

## 9. Style & Language Rules

- Professional, clear, direct tone.
- Use active voice and strong action verbs.
- NO buzzwords ("guru", "ninja", "rockstar", etc.).
- NO exaggerations or fabricated claims.
- Every sentence must add value — no filler.

---

## 10. Output Objective

The generated CV MUST be:

- Authentic  
- Clear and concise  
- Fully ATS-compatible  
- Aligned with the job description (if provided)  
- Adapted to the correct seniority  
- 100% consistent with the JSON  
- Structured in the exact order defined above  

---

## 11. Quality Assertions (mandatory checks)

Before finalizing, assert:

- `assert no_invented_content` — all data from JSON only
- `assert links_are_full_urls` — all links are `https://...` format
- `assert email_has_no_markdown` — email is plain text only
- `assert section_order == [Header, Summary, Skills, Work Experience, Education, Optional...]`
- `assert cv_length <= max_chars` — respects seniority-based limits
- `assert only_hyphen_bullets` — only `-` used for bullets
- `assert no_tables_no_emojis_no_icons` — ATS-compliant formatting only

---

# End of Layer A

