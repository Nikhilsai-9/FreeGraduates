"""Regression tests for the Firebase auth bootstrap path.

Covers the "unhashable type: Settings" bug where ``_bootstrap_firebase``
was decorated with ``@lru_cache`` while receiving a pydantic ``Settings``
instance, which is unhashable — crashing every authenticated request.
"""

from __future__ import annotations

import os
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.security import _bootstrap_firebase


def test_bootstrap_firebase_does_not_crash():
    """The lru_cached bootstrap must never raise (regression for unhashable Settings)."""
    result = _bootstrap_firebase()
    assert result in (True, False)


def test_dev_bypass_route_returns_200_not_500():
    """POST /api/resume/extract must not crash with 500 on auth.

    Regression: auth bootstrap raised TypeError before reaching the bypass,
    so every authenticated route returned 500.
    """
    with patch.dict(os.environ, {"DEV_AUTH_BYPASS": "true"}, clear=False):
        from app.config import get_settings
        get_settings.cache_clear()
        from app.security import _bootstrap_firebase
        _bootstrap_firebase.cache_clear()

        from main import create_app
        client = TestClient(create_app())

        r = client.get("/api/health")
        assert r.status_code == 200, r.text

        pdf = open(
            os.path.join(os.path.dirname(__file__), "..", "scripts", "sample-resume.pdf"),
            "rb",
        ).read()
        r = client.post(
            "/api/resume/extract",
            files={"file": ("resume.pdf", pdf, "application/pdf")},
            headers={"x-user-uid": "test-uid"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "parsed" in data

        _bootstrap_firebase.cache_clear()
        get_settings.cache_clear()
