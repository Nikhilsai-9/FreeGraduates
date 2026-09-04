# Layer B — Detailed Reference Rules (Revised)

### Full Specification for ATS-Optimized CV Generation From JSON Profiles

---

## 1. Input Contract

### 1.1 Required Inputs

#### `candidate_profile_json` (required)

Expected structure:

```json
{
  "personal_info": {
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "location": "string (optional)",
    "linkedin": "string (optional)",
    "github": "string (optional)",
    "website": "string (optional)"
  },
  "professional_summary": "string (optional)",
  "work_experience": [
    {
      "company": "string",
      "role": "string",
      "start_date": "string",
      "end_date": "string (or 'Present')",
      "location": "string (optional)",
      "description": "string (optional)",
      "achievements": ["string"],
      "technologies": ["string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "field": "string",
      "institution": "string",
      "start_year": "number (optional)",
      "end_year": "number (optional)"
    }
  ],
  "skills": {
    "technical": ["string"],
    "languages": ["string"],
    "other": ["string"]
  },
  "projects": [
    {
      "title": "string",
      "description": "string",
      "technologies": ["string"],
      "date": "string (optional)"
    }
  ],
  "publications": ["string (optional)"],
  "awards": ["string (optional)"],
  "teaching": ["string (optional)"],
  "languages": [
    {
      "name": "string",
      "proficiency": "string"
    }
  ]
}
```

**Required fields:**
- `personal_info.full_name`
- `personal_info.email`
- `work_experience` (at least one entry)
- `education` (at least one entry)

**Optional fields:** All others may be omitted.

#### `job_description_text` (optional)

Plain text or structured description of the target role.

#### `generation_params` (optional object)

```json
{
  "target_seniority": "executive | senior | mid | junior (optional)",
  "target_locale": "US | EU | UK | LATAM (optional)",
  "language": "en | pt | es | fr | de (optional)",
  "summary_person": "first | third (optional, default: third)",
  "keyword_mode": "aggressive | conservative (optional, default: conservative)",
  "max_chars_override": "number (optional, overrides seniority-based limits)"
}
```

### 1.2 Fallback Behaviors

- Missing `personal_info.location` → omit location from header
- Missing `professional_summary` → generate neutral summary from job description and work experience
- Missing `work_experience` → CV generation fails (required)
- Missing `education` → CV generation fails (required)
- Missing `generation_params.language` → detect from job description or default to English
- Missing `generation_params.summary_person` → default to third person
- Missing `generation_params.keyword_mode` → default to conservative
- Missing `generation_params.target_seniority` → auto-detect from work experience (see Section 2.2)

---

## 2. Core Principles

### 2.1 Data Integrity

- Use **only** information present in the JSON profile.
- Do **not** invent, infer, guess, or expand unknown data.
- Preserve all dates, company names, job titles, and education entries exactly as provided.
- If a field is missing, omit it without replacing with fabricated content.

### 2.2 ATS Compatibility

- Output must be **plain text or Markdown**.
- No tables, columns, text boxes, images, icons, graphics, emojis, or non-ASCII characters.
- Use consistent formatting and spacing.
- Use only hyphens (`-`) for bullets.
- All links must be full URLs (`https://...`).
- Email displayed as plain text (no markdown, no `mailto:`, no anchor text).

### 2.3 Language & Localization

**Deterministic Language Selection:**

1. If `generation_params.language` exists → use it.
2. Else detect the job description language (if provided).
3. If ambiguous or no job description → default to **English**.

**Mixed-language content in JSON:**
- Preserve original language for: proper nouns, company names, technologies, institution names.
- Translate only narrative content (summaries, descriptions, achievements).

**Date format:** `MMM YYYY – Present` or `MMM YYYY – MMM YYYY`.

**Locations:** `City, Country` or `City, State` depending on JSON data.

---

## 3. Seniority Detection & Classification

### 3.1 Detection Heuristics

If `generation_params.target_seniority` is provided → use it.

Otherwise, detect from work experience using these heuristics:

#### Executive Level
- Titles containing: `Chief`, `C-level`, `C-suite`, `Director`, `VP`, `Vice President`, `Head of`, `CAIO`, `CDO`, `CTO`, `CIO`
- OR: 10+ years experience with leadership indicators

#### Senior Level
- Titles containing: `Senior`, `Manager`, `Principal`, `Lead`, `Architect`, `Staff`
- OR: 7–10 years experience with technical depth

#### Mid-Level
- Titles containing: `Engineer`, `Developer`, `Analyst`, `Specialist`
- OR: 3–7 years experience

#### Junior Level
- Titles containing: `Junior`, `Intern`, `Trainee`, `Associate`, `Entry`
- OR: <3 years experience

### 3.2 Seniority-Based Guidelines

#### Executive Roles (VP, Director, Head of AI, CAIO, CDO)
**Prioritize:**
- Summary
- Leadership Profile
- Work Experience (impact, scale, business outcomes)
- Skills
- Education

**Optional:**
- Awards, Publications, Teaching

**De-emphasize:**
- Technical projects unless strategic.

#### Senior / Lead Roles
**Prioritize:**
- Summary
- Work Experience
- Skills
- Education

**Optional:**
- Projects
- Leadership section (if applicable)

#### Mid-Level Roles
**Prioritize:**
- Summary
- Skills
- Work Experience
- Education

**Optional:**
- Projects
- Languages

#### Junior Roles
**Prioritize:**
- Education
- Skills
- Work Experience
- Summary

**Optional:**
- Projects
- Awards

---

## 4. Document Structure & Hierarchy

### Must follow this exact order:

1. **Header / Personal Information**
2. **Professional Summary**
3. **Core Skills & Technologies**
4. **Work Experience**
5. **Education**
6. **Optional sections** (only if present in JSON):
   - Leadership & Executive Profile  
   - Selected Projects / Research  
   - Teaching Experience  
   - Publications & Patents  
   - Awards  
   - Languages  

No section numbering in final output. Titles only.

---

## 5. ATS Formatting Standards

### 5.1 Text Formatting

- Section titles: uppercase or bold.
- Bullets: `-`.
- Dates: `MMM YYYY – MMM YYYY` or `MMM YYYY – Present`.
- One line break between lines; two breaks between sections.

### 5.2 Forbidden Elements

- Tables, columns, multi-column layouts
- Icons, images, graphics
- Text boxes, sidebars
- Clickable link text (must show full URL)
- Uncommon Unicode symbols
- Page numbers or headers/footers
- Email markdown links or `mailto:` anchors

### 5.3 Encoding

- Standard ASCII text.
- Avoid em dashes (—), curly quotes (" "), non-ASCII punctuation.

---

## 6. JSON → CV Mapping Rules

### 6.1 Header / Personal Information

The header must include:
- Full Name (exact from JSON)
- Professional Title (from JSON or best match from work experience)
- Location (if available, omit if missing)
- Email (plain text, no markdown)
- Phone
- LinkedIn, GitHub, Website (if present, full URLs only: `https://...`)

**Format:**
```
Full Name
Professional Title

City, Country | email@example.com | +XX XXXXXXXX
LinkedIn: https://linkedin.com/in/...
GitHub: https://github.com/...
Website: https://...
```

**Rules:**
- Email: plain text only, no `[email](mailto:...)` or `mailto:` links.
- All links: full URLs starting with `https://` or `http://`.
- Missing location: omit gracefully.

### 6.2 Professional Summary

**Structure:**
- 3–5 lines
- Voice controlled by `generation_params.summary_person`:
  - `"first"` → first person ("I am..." / "I have...")
  - `"third"` → third person ("Professional with..." / "Experienced...")
  - Default: **third person**
- Include 3–5 keywords from job description (if provided and `keyword_mode` allows)
- Adapt content to seniority level

**By Seniority:**
- Executives: leadership, business impact, strategic outcomes  
- Senior: technical depth + mentoring + architecture  
- Mid-level: technical execution + problem-solving  
- Junior: education, core skills, foundational abilities  

### 6.3 Core Skills & Technologies

**Rules:**
- Group into 3–5 categories.
- Include only technologies present in JSON.
- No more than 8–10 skills per category.
- No repeated skills across categories.
- Skills must be used exactly as provided in the JSON. Do NOT: group, expand, infer, or decompose skills into sub-technologies.

**Ordering priority:**
1. Required by job description  
2. Used in Work Experience  
3. Used in Projects  
4. Found in technical knowledge  

**Example:**
```
CORE SKILLS & TECHNOLOGIES

* Machine Learning & AI: Supervised Learning, Deep Learning, NLP, Generative AI, Model Evaluation
* Programming & MLOps: Python, SQL, Docker, Kubernetes, Git, CI/CD
* Cloud & Data Engineering: AWS, Azure, ETL, Data Pipelines
```

### 6.4 Work Experience

**Ordering:**
- Reverse chronological (most recent start date first).
- If multiple roles in same company, list separately.
- **Parallel/simultaneous roles:** List both with overlapping date ranges (e.g., "Jan 2020 – Present" and "Mar 2020 – Present").

**Format:**
```
ROLE TITLE – COMPANY
City, Country | Start Date – End Date

- Bullet 1
- Bullet 2
- ...
```

**Bullet Requirements:**
- Start with an action verb.
- Use the CAR framework:
  - **Context** (short)
  - **Action**
  - **Result** (preferably quantifiable)
- Mention technologies used.
- Include metrics if present or inferable (never fabricate numbers).

**Bullet Count:**
- Current role (<2 years): 4–6 bullets  
- Current role (2+ years): 5–8 bullets  
- Last 5 years: 3–5 bullets  
- Older than 5 years: 2–3 bullets  

**Example:**
```
- Built and deployed an ML pipeline serving 1M+ daily predictions, reducing latency by 40%
```

### 6.5 Education

**Format:**
```
DEGREE in Field – Institution | Start Year–End Year
```

**Rules:**
- Highest degree first.
- Include full institution names.
- Include thesis/courses only if highly relevant and space allows.

### 6.6 Leadership & Executive Profile

**Include if:**
- Seniority is Lead/Manager/Director/VP+ OR
- JSON contains leadership indicators.

**Format:**
- 3–5 bullets
- Emphasize:
  - team size  
  - budgets  
  - cross-functional management  
  - strategy  
  - governance  
  - business results  

### 6.7 Selected Projects / Research

**Include if:**
- Relevant to the target role.
- Show technical depth not covered in Work Experience.

**Format:**
```
Project Title | Technologies | Date

- Description (1–2 bullets)
```

**Max: 3–5 projects** (select top 3–5 based on relevance to job description).

**Edge case:** If excessive project list (>10), select top 3–5 most relevant to job description.

### 6.8 Teaching Experience

**Include if:**
- Relevant to leadership, communication, or technical training roles.

**Format:**
```
Course – Institution | Date

- Responsibilities and impact
```

### 6.9 Publications & Patents

**Include if:**
- Research-oriented role OR
- Executive role requiring thought leadership OR
- Publications are notable.

**Format:**
```
- Author(s). "Title." Journal/Conference, Year. DOI or URL.
```

**Max for non-academic roles:** 3–5 entries.

### 6.10 Awards

**Include if:**
- Relevant
- Recent (last 5 years)
- Prestigious

**Format:**
```
- Award Name, Institution, Year
```

### 6.11 Languages

**Format:**
```
- Language: Proficiency
```

**Use:** Native / Fluent / Advanced / Intermediate / Basic.

---

## 7. Keyword Optimization

### 7.1 How to Identify Keywords

Extract from job description:
- Required technologies
- Required skills/competencies
- Domain knowledge
- Methodologies
- Seniority expectations

**If no job description provided:**
- Never invent new keywords.
- Only use skills and data from the JSON.

### 7.2 Where to Insert Keywords (priority)

1. **Work Experience** ← highest ATS impact  
2. **Core Skills & Technologies**  
3. **Professional Summary**  
4. Education (only if necessary)

### 7.3 Keyword Mode Rules

**`keyword_mode = "conservative"` (default):**
- Natural integration only.
- Keywords appear 1–2 times maximum.
- No keyword stuffing.

**`keyword_mode = "aggressive"`:**
- Keywords can appear up to 3 times (except technology names, which may repeat naturally).
- Still maintain natural language flow.

**Max repetition rule:**
- A keyword cannot appear >3 times (except technology names like "Python", "SQL" which may appear naturally in multiple contexts).

### 7.4 Rules for Keyword Use

- No keyword stuffing.
- Use natural language.
- Include synonyms only if they appear in JSON or job description.
- When no job description: never invent keywords; only use skills from JSON.

---

## 8. Size-Reduction Algorithm

**Procedural algorithm for reducing CV length:**

```
while cv_length > max_chars:
    1. Shorten older roles first (reduce bullet counts starting from oldest roles)
    2. Reduce bullet counts in optional sections (Projects, Teaching, Publications, Awards)
    3. Remove optional sections in this order:
       a. Awards
       b. Publications
       c. Teaching
       d. Projects
    4. Compress Summary section (reduce from 5 lines to 3 lines)
    5. Compress Skills section (reduce categories or items per category)
    
    NEVER remove:
    - Work Experience (required)
    - Skills (required)
    - Education (required)
    - Header (required)
```

**Stop conditions:**
- CV length <= max_chars
- Only mandatory sections remain (Work Experience, Skills, Education, Header, Summary)

---

## 9. Metrics & Impact Statements

### 9.1 Types of Metrics to Include

- Percentages
- Revenue impact
- Latency improvements
- Accuracy/precision metrics
- Team size
- Data volume
- Execution speed

### 9.2 Impact Formula

**Action + Technology/Method + Result + Metric**

**Example:**
```
Implemented a fraud detection model using XGBoost, improving precision to 92% and reducing false positives by 30%
```

**If metrics missing:**
- Use qualitative but meaningful impact:
  "Improved model stability for real-time use."

---

## 10. Edge Cases

### 10.1 Parallel/Simultaneous Roles

- List both roles with overlapping date ranges.
- Format: "Jan 2020 – Present" and "Mar 2020 – Present".
- Both roles appear in reverse chronological order by start date.

### 10.2 Mixed-Language Content in JSON

- Preserve original language for: proper nouns, company names, technologies, institution names.
- Translate narrative content (summaries, descriptions) to target language.

### 10.3 Excessive Project List

- If >10 projects, select top 3–5 based on relevance to job description.
- Prioritize projects with technologies matching job requirements.

### 10.4 Missing Location

- Omit location gracefully from header and work experience entries.
- Do not add placeholder text.

---

## 11. International Application Guidelines

### US/Canada:
- Quantitative results emphasized
- Strict 1–2 pages

### EU/UK:
- Collaboration, multilingual ability, compliance
- 2 pages acceptable for all seniorities

### LATAM:
- Local context important
- CV can be slightly longer

---

## 12. Quality Assurance Assertions

Before finalizing, assert:

- `assert no_invented_content` — all data from JSON only, no fabricated information
- `assert links_are_full_urls` — all links are `https://...` or `http://...` format
- `assert email_has_no_markdown` — email is plain text only, no `[email](mailto:...)` or `mailto:` links
- `assert section_order == [Header, Summary, Skills, Work Experience, Education, Optional...]` — exact order as defined
- `assert cv_length <= max_chars` — respects seniority-based limits or `max_chars_override`
- `assert only_hyphen_bullets` — only `-` used for bullet points
- `assert no_tables_no_emojis_no_icons` — ATS-compliant formatting only
- `assert keywords_not_overused` — no keyword appears >3 times (except technology names)
- `assert work_experience_not_removed` — Work Experience section always present
- `assert skills_not_removed` — Skills section always present
- `assert education_not_removed` — Education section always present

---

## 13. Prohibited Practices

### 13.1 Content

**Do NOT:**
- Invent projects, metrics, roles, or tech stacks.
- Modify dates.
- Add certifications or degrees not in JSON.
- Create keywords when no job description is provided.

### 13.2 Formatting

**Do NOT:**
- Use tables, icons, or columns.
- Use fancy characters or emojis.
- Use hyperlinks as anchor text.
- Use email markdown links or `mailto:` anchors.

### 13.3 Language

**Do NOT use:**
- "Guru," "ninja," "rockstar," "synergy," "game-changer."
- Vague claims like "significant experience."
- Weak verbs: "helped," "worked on," "participated."

---

## 14. Implementation Notes for AI Systems

### 14.1 Workflow

1. Parse JSON and validate required fields.
2. Extract `generation_params` and apply defaults.
3. Detect role seniority (or use `target_seniority`).
4. Extract keywords from job description (if provided).
5. Build CV structure in required order.
6. Populate sections per rules.
7. Optimize keywords and metrics.
8. Apply size-reduction algorithm if needed.
9. Perform assertion checklist.
10. Output ATS-compatible CV.

### 14.2 Error Handling

- If a section is missing, skip it (except required: Work Experience, Education, Skills).
- If dates inconsistent, keep as provided.
- If location missing, omit it.
- If multiple languages appear, maintain all (translate narrative only).

---

# End of Layer B

