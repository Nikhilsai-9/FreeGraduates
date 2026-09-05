"""End-to-end backend smoke test.

Hits every primary read/write endpoint with a synthesized user and
resume. Requires the backend to be running on $SMOKE_URL
(default http://127.0.0.1:8000) and DEV_AUTH_BYPASS=true so the
synthetic uid "smoke@test" is accepted.

Exit code 0 = all green; non-zero = first failure.

Usage:
    python scripts/smoke_backend.py
    SMOKE_URL=http://localhost:8000 python scripts/smoke_backend.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:8000").rstrip("/")
UID = "smoke@test"

HEADERS = {
    "Content-Type": "application/json",
    # The backend dev-auth bypass honors x-user-uid; production requires
    # a Firebase bearer token, so this script is dev-only.
    "x-user-uid": UID,
}


def call(method: str, path: str, body=None, *, expect: int = 200):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read()
            try:
                parsed = json.loads(payload) if payload else None
            except json.JSONDecodeError:
                parsed = payload.decode(errors="replace")
            status = resp.status
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            parsed = json.loads(e.read() or b"{}")
        except Exception:
            parsed = e.read().decode(errors="replace")
    if status != expect:
        raise SystemExit(
            f"FAIL {method} {path} -> {status} (expected {expect})\n"
            f"  body: {parsed}"
        )
    print(f"OK   {method} {path} -> {status}")
    return parsed


def main() -> int:
    print(f"Smoke test against {BASE} as uid={UID}")
    call("GET", "/api/health", expect=200)

    # Profile (Commit 1).
    profile = {
        "personalInfo": {
            "fullName": "Smoke Tester",
            "email": "smoke@test.com",
            "phone": "+1-555-0100",
        },
        "experienceLevel": "senior",
        "targetRoles": ["Software Engineer"],
    }
    call("PUT", "/api/profile", profile, expect=200)
    call("GET", "/api/profile", expect=200)

    # Resume save + list (Commit 2/3).
    resume = {
        "versionName": "Smoke Resume",
        "templateStyle": "modern-tech",
        "candidate": {
            "personal_info": profile["personalInfo"],
            "summary": "Smoke-test summary.",
            "work_experience": [
                {
                    "id": "e1",
                    "role": "Senior Engineer",
                    "company": "Acme",
                    "description": "Built things.",
                }
            ],
            "skills": ["python", "react"],
            "education": [
                {
                    "degree": "BS",
                    "field": "Computer Science",
                    "school": "Test University",
                }
            ],
            "job": None,
            "generated": None,
        },
    }
    saved = call("POST", "/api/resume/save", resume, expect=200)
    rid = saved["id"]
    call("GET", "/api/resume/list", expect=200)
    call("GET", f"/api/resume/{rid}", expect=200)

    # Optimizer (Commit 5).
    jd = "We need a Senior Engineer who knows Python, React, AWS, Docker."
    opt = call(
        "POST",
        "/api/resume-optimizer",
        {"resumeId": rid, "jobDescription": jd, "targetRole": "Senior Engineer"},
        expect=200,
    )
    oid = opt["id"]
    call("GET", "/api/resume-optimizer", expect=200)
    call("GET", f"/api/resume-optimizer/{oid}", expect=200)

    # Coach (Commit 6). POST returns 201 Created.
    coach = call(
        "POST",
        "/api/coach",
        {
            "resumeId": rid,
            "jobDescription": jd,
            "type": "interview",
            "numQuestions": 3,
        },
        expect=201,
    )
    cid = coach["id"]
    call("GET", "/api/coach", expect=200)
    call("GET", f"/api/coach/{cid}", expect=200)

    # Cover letter (Commit 7). Returns 200.
    cl = call(
        "POST",
        "/api/cover-letter",
        {
            "resumeId": rid,
            "jobDescription": jd,
            "targetRole": "Senior Engineer",
            "tone": "professional",
            "length": "medium",
        },
        expect=200,
    )
    lid = cl["id"]
    call("GET", "/api/cover-letter", expect=200)
    call("GET", f"/api/cover-letter/{lid}", expect=200)

    # Cleanup.
    call("DELETE", f"/api/cover-letter/{lid}", expect=200)
    call("DELETE", f"/api/coach/{cid}", expect=200)
    call("DELETE", f"/api/resume-optimizer/{oid}", expect=200)
    call("DELETE", f"/api/resume/{rid}", expect=200)

    print("\nALL GREEN")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f"FATAL: {exc}")
        sys.exit(2)
