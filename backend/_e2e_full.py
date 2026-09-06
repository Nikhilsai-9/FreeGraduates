"""E2E test for Optimizer Tailor -> Apply/Reject workflow.

Backend must be at http://127.0.0.1:8000.
Exits 0 only if every check passes.
"""
from __future__ import annotations
import json, os, sys, uuid, requests

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8000")
UID = f"e2e-{uuid.uuid4().hex[:8]}"
EMAIL = f"{UID}@test.local"
print(f"=== Optimizer E2E (uid={UID}) ===\n")

passed = 0
failed = 0


def check(label, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1; print(f"  PASS  {label}")
    else:
        failed += 1; print(f"  FAIL  {label}  {detail}")


def H():
    return {"x-user-uid": UID, "x-user-email": EMAIL, "Content-Type": "application/json"}


# 1. Save source resume (canonical shape: versionName + templateStyle + candidate)
src = {
    "versionName": "QA E2E Resume",
    "templateStyle": "modern-tech",
    "candidate": {
        "personal_info": {"fullName": "Jane Doe", "email": "jane@example.com",
                          "phone": "+1-555-0100", "location": "Remote"},
        "summary": "Backend engineer with 8 years of experience.",
        "work_experience": [{
            "id": "e1", "role": "Senior Backend Engineer", "company": "Acme",
            "startDate": "2020-01", "endDate": "2024-06",
            "description": "Built Python microservices handling 5k req/s. "
                           "Led migration to PostgreSQL with zero downtime.",
        }],
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes"],
        "education": [{"degree": "BS", "field": "Computer Science",
                       "school": "State University", "year": "2016"}],
        "job": None, "generated": None,
    },
}

r = requests.post(f"{BASE}/api/resume/save", headers=H(), json=src, timeout=20)
check("POST /api/resume/save", r.status_code == 200,
      f"status={r.status_code} body={r.text[:200]}")
saved = r.json()
resume_id = saved.get("id") or saved.get("resumeId")
assert resume_id, f"no id in {r.text}"
print(f"  source resumeId={resume_id}")

r0 = requests.get(f"{BASE}/api/resume/list", headers=H(), timeout=10)
check("GET /api/resume/list", r0.status_code == 200)
original = json.dumps(r0.json(), sort_keys=True)

# 2. Create optimization
jd = ("We need a Senior Python Engineer with FastAPI and PostgreSQL experience. "
      "Kubernetes and Docker required. AWS Lambda a plus.")
r = requests.post(f"{BASE}/api/resume-optimizer", headers=H(),
                  json={"resumeId": resume_id, "jobDescription": jd,
                        "targetRole": "Senior Python Engineer"}, timeout=30)
check("POST /api/resume-optimizer (create)", r.status_code == 200,
      f"status={r.status_code} body={r.text[:300]}")
opt = r.json()
opt_id = opt.get("id") or opt.get("optimizationId")
assert opt_id, f"no opt id in {opt}"
print(f"  opt id={opt_id} status={opt.get('status')}")
check("initial status is draft", opt.get("status") == "draft",
      f"got {opt.get('status')}")
check("no pendingApproval initially", opt.get("pendingApproval") is False)
check("no tailoredResume initially", not opt.get("tailoredResume"))
check("sourceResume preserved", opt.get("sourceResume") is not None)

# 3. Analyze
r = requests.post(f"{BASE}/api/resume-optimizer/{opt_id}/analyze",
                  headers=H(), timeout=30)
check("POST /analyze", r.status_code == 200)
an = r.json()
check("status now analyzed", an.get("status") == "analyzed")
check("matchScore present", an.get("matchScore") is not None)

# 4. Tailor -> preview
r = requests.post(f"{BASE}/api/resume-optimizer/{opt_id}/tailor",
                  headers=H(), timeout=60)
check("POST /tailor", r.status_code == 200,
      f"status={r.status_code} body={r.text[:300]}")
tw = r.json()
check("status previewed", tw.get("status") == "previewed")
check("pendingApproval True", tw.get("pendingApproval") is True)
check("tailoredResume exposed (=preview)", bool(tw.get("tailoredResume")))
check("tailoredPreview NOT exposed", "tailoredPreview" not in tw)
check("sourceResume unchanged after tailor",
      tw.get("sourceResume") == opt.get("sourceResume"))

# 5. Reject -> preview cleared, source intact
r = requests.post(f"{BASE}/api/resume-optimizer/{opt_id}/reject",
                  headers=H(), timeout=30)
check("POST /reject", r.status_code == 200)
rj = r.json()
check("rejected flag", rj.get("rejected") is True)
check("pendingApproval False after reject", rj.get("pendingApproval") is False)
check("no tailoredResume after reject", not rj.get("tailoredResume"))
check("sourceResume unchanged after reject",
      rj.get("sourceResume") == opt.get("sourceResume"))
r1 = requests.get(f"{BASE}/api/resume/list", headers=H(), timeout=10)
check("list byte-identical after REJECT",
      json.dumps(r1.json(), sort_keys=True) == original)

# 6. Tailor AGAIN, then APPLY
r = requests.post(f"{BASE}/api/resume-optimizer/{opt_id}/tailor",
                  headers=H(), timeout=60)
check("POST /tailor (again)", r.status_code == 200)
tw2 = r.json()
check("pendingApproval True (re-tailored)", tw2.get("pendingApproval") is True)
preview = tw2.get("tailoredResume")

r = requests.post(f"{BASE}/api/resume-optimizer/{opt_id}/apply",
                  headers=H(), timeout=30)
check("POST /apply", r.status_code == 200)
ap = r.json()
check("applied flag", ap.get("applied") is True)
check("status tailored", ap.get("status") == "tailored")
check("pendingApproval False after apply", ap.get("pendingApproval") is False)
check("tailoredResume promoted (=preview)",
      ap.get("tailoredResume") == preview)
check("tailoredPreview not exposed", "tailoredPreview" not in ap)
check("sourceResume unchanged after apply",
      ap.get("sourceResume") == opt.get("sourceResume"))

# 7. Apply idempotent
r = requests.post(f"{BASE}/api/resume-optimizer/{opt_id}/apply",
                  headers=H(), timeout=30)
check("POST /apply (2nd, idempotent)", r.status_code == 200)
ap2 = r.json()
check("applied flag still set", ap2.get("applied") is True)
check("tailoredResume unchanged", ap2.get("tailoredResume") == preview)

# 8. Reject after apply (no-op, preserves committed)
r = requests.post(f"{BASE}/api/resume-optimizer/{opt_id}/reject",
                  headers=H(), timeout=30)
check("POST /reject (after apply)", r.status_code == 200)
rj2 = r.json()
check("rejected flag", rj2.get("rejected") is True)
check("tailoredResume preserved (committed)",
      rj2.get("tailoredResume") == preview)

# 9. Refresh GET
r = requests.get(f"{BASE}/api/resume-optimizer/{opt_id}", headers=H(), timeout=10)
check("GET after everything", r.status_code == 200)
g = r.json()
check("tailoredResume persisted", g.get("tailoredResume") == preview)
check("status tailored (persisted)", g.get("status") == "tailored")

# 10. List
r = requests.get(f"{BASE}/api/resume-optimizer", headers=H(), timeout=10)
check("GET list", r.status_code == 200)
items = r.json()
if isinstance(items, dict):
    items = items.get("items") or items.get("data") or []
ids = [i.get("id") for i in items]
check("our opt is in list", opt_id in ids)

# 11. 404
r = requests.get(f"{BASE}/api/resume-optimizer/does-not-exist",
                 headers=H(), timeout=10)
check("GET unknown -> 404", r.status_code == 404)

print(f"\n=== RESULT: {passed} passed, {failed} failed ===")
sys.exit(0 if failed == 0 else 1)
