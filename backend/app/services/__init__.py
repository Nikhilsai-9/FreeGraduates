"""Service layer — PDF parsing, DOCX/PDF/Markdown export, profile store.

All services take/return plain dicts or bytes so they can be unit-tested
without spinning up FastAPI.
"""

from __future__ import annotations

from app.services.profile import (
    Profile,
    ProfileStorage,
    get_profile_storage,
)

__all__ = [
    "Profile",
    "ProfileStorage",
    "get_profile_storage",
]

