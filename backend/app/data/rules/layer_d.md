# === **Layer D — Quality Assurance Layer** ===

## **1. Purpose**

This layer is the **final validation and correction stage** applied after the résumé is generated according to Layers A, B, and C.
Its function is to **ensure strict compliance**, remove inconsistencies, enforce formatting rules, and guarantee that the output is valid, ATS-friendly, accurate, and aligned with the input data.

No résumé may be returned to the user unless it fully passes the Quality Assurance (QA) pipeline.

---

## **2. Input**

This layer evaluates the **final résumé draft** produced by the system after:

1. Applying content rules (Layer A)
2. Applying structural and reference rules (Layer B)
3. Applying formatting and view rules (Layer C)

---

## **3. QA Validation Pipeline**

The pipeline is executed **sequentially**.
If a step fails, the model must automatically correct the issue, then restart the pipeline from Step 1.

---

## **3.1. Structural Validation**

### **3.1.1 Required Sections**

```
assert "Summary" exists
assert "Skills" exists
assert "Experience" exists
assert "Education" exists
```

### **3.1.2 Section Order**

```
assert sections == [
    Header,
    Summary,
    Skills,
    Experience,
    Education,
    Optional Sections (Projects, Awards, Publications, Teaching)
]
```

### **3.1.3 Section Integrity**

```
assert no empty sections
assert no duplicated sections
assert section titles use correct formatting (## Title)
```

---

## **3.2. Formatting Validation**

### **3.2.1 ATS Compliance**

```
assert no tables
assert no emojis
assert no icons
assert no images
```

### **3.2.2 Markdown Restrictions**

```
assert no markdown hyperlinks (no [text](url))
assert no anchor text
assert section titles use "##"
assert bold is used only where allowed
```

### **3.2.3 Bullet Formatting**

```
assert bullet character == "-"
assert no nested bullets
assert bullet indentation is consistent
```

### **3.2.4 Links and Email**

```
assert all URLs are plain full URLs (https://...)
assert email is plain text (no markdown)
```

---

## **3.3. Content Validation**

### **3.3.1 No Fabricated Content**

```
assert no invented skills
assert no invented experiences
assert no invented dates
assert no invented achievements
assert no invented education items
```

### **3.3.2 Consistency With JSON**

```
assert names match JSON exactly
assert job titles match JSON
assert companies match JSON
assert dates match JSON
assert technologies match JSON
```

### **3.3.3 Summary Voice**

```
assert summary_person == generation_params.summary_person OR default
```

### **3.3.4 Language Validation**

```
assert text language == generation_params.language OR detected JD language OR English fallback
```

---

## **3.4. Keyword Validation**

### **3.4.1 Application Rules**

```
assert keywords appear only in Summary, Skills, and Experience
```

### **3.4.2 Keyword Mode**

If `keyword_mode == conservative`:

```
assert no more than 5–8 key terms included
```

If `keyword_mode == aggressive`:

```
assert majority of core job-description keywords appear at least once
```

### **3.4.3 No Keyword Stuffing**

```
assert no keyword appears more than 3 times (unless it is a technology/tool)
```

---

## **3.5. Seniority Rules & Length Validation**

### **3.5.1 Seniority-Based Max Size**

```
assert total_length <= max_chars_for_seniority OR max_chars_override
```

### **3.5.2 Section Preservation**

```
assert Experience and Skills are never reduced or removed
```

---

## **4. Auto-Correction Rules**

If any assertion fails, the system must:

1. **Identify the cause**
2. **Fix the issue automatically**
3. **Re-run the QA pipeline from Step 1**

Corrections include:

* Removing malformed markdown
* Correcting section titles
* Enforcing bullet character rules
* Fixing order inconsistencies
* Rewriting oversize summaries
* Trimming overly long bullet lists
* Removing repeated or irrelevant keywords
* Restoring accuracy when a detail diverges from the JSON

---

## **5. Completion Criteria**

The résumé is approved only if:

```
all asserts pass successfully
no corrections required in two consecutive QA passes
```

Once the output is fully validated, the document is released as the final résumé.

---

## **6. Optional Developer Debug Output**

(Not included in the résumé returned to the user.)

If requested through `generation_params.debug = true`, generate a QA report:

* List of passed assertions
* List of corrected issues
* Final character count
* Keyword usage summary
* Any ambiguous or missing data from the JSON

