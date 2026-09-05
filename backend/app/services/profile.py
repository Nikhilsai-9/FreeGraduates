"""Per-user profile storage.

Profiles are persisted to disk, scoped by the authenticated Firebase UID.

Storage layout:
    app/data/users/<uid>/profile.json

This is intentionally a tiny, filesystem-backed store — same pattern as
``storage.ResumeStorage``. When FreeGraduates graduates to a managed
DB, the API surface in this module stays the same.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class Profile(BaseModel):
    """User profile document.

    All fields are optional so the user can fill them in incrementally.
    The frontend is the source of truth for what to display; this model
    just stores the latest values the user has saved.
    """

    fullName: Optional[str] = None
    email: Optional[str] = None
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None
    university: Optional[str] = None
    degree: Optional[str] = None
    graduationYear: Optional[str] = None
    yearsExperience: Optional[int] = None
    preferredLocations: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    bio: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    onboardingComplete: bool = False
    notificationPrefs: dict = Field(
        default_factory=lambda: {
            "emailUpdates": True,
            "productNews": True,
            "weeklyDigest": False,
        }
    )
    updatedAt: Optional[str] = None
    createdAt: Optional[str] = None


class ProfileStorage:
    """Thread-safe per-user profile store backed by the filesystem."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.users_dir: Path = settings.users_dir
        self.users_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    # ---------- helpers ----------

    def _user_dir(self, uid: str) -> Path:
        safe_uid = "".join(c for c in uid if c.isalnum() or c in ("-", "_"))
        if not safe_uid:
            raise ValueError("Invalid user id")
        d = self.users_dir / safe_uid
        d.mkdir(parents=True, exist_ok=True)
        return d

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    def _profile_path(self, uid: str) -> Path:
        return self._user_dir(uid) / "profile.json"

    def _read(self, path: Path) -> Optional[dict]:
        if not path.exists():
            return None
        try:
            with path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            logger.warning("Failed to read %s: %s", path, exc)
            return None

    def _write(self, path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        tmp.replace(path)

    # ---------- public API ----------

    def get(self, uid: str) -> Optional[Profile]:
        raw = self._read(self._profile_path(uid))
        if not raw:
            return None
        return Profile(**raw)

    def upsert(self, uid: str, partial: dict) -> Profile:
        """Merge the partial profile dict into the stored record.

        Unknown keys are preserved as-is so we don't lose data the
        frontend might send (forward-compatibility).
        """
        with self._lock:
            path = self._profile_path(uid)
            existing = self._read(path) or {}
            merged = {**existing, **partial}
            now = self._now().isoformat()
            merged["updatedAt"] = now
            if not merged.get("createdAt"):
                merged["createdAt"] = now
            self._write(path, merged)
        return Profile(**merged)

    def mark_onboarded(self, uid: str) -> Profile:
        return self.upsert(uid, {"onboardingComplete": True})


# ---------- Singleton ----------

_profile_singleton: Optional[ProfileStorage] = None


def get_profile_storage() -> ProfileStorage:
    """FastAPI dependency that returns the singleton profile storage instance."""
    global _profile_singleton
    if _profile_singleton is None:
        _profile_singleton = ProfileStorage(get_settings())
    return _profile_singleton
