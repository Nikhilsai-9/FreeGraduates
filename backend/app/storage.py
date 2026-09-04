"""Per-user resume storage.

Resumes are persisted to disk, scoped by the authenticated Firebase UID —
User A's data is never accessible to User B.

Storage layout:
    app/data/users/<uid>/<resume_id>.json

The store is intentionally simple (no DB server, no migrations). It is
designed for the FreeGraduates single-process deployment and can be
swapped for Firestore / Postgres later without changing the API surface.
"""

from __future__ import annotations

import json
import logging
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import Settings, get_settings
from app.models import ResumeRecord, ResumeSummary, SaveResumeRequest

logger = logging.getLogger(__name__)


class ResumeStorage:
    """Thread-safe per-user resume store backed by the filesystem."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.users_dir: Path = settings.users_dir
        self.users_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    # ---------- Helpers ----------

    def _user_dir(self, uid: str) -> Path:
        """Return (and create) the directory for a given user."""
        safe_uid = "".join(c for c in uid if c.isalnum() or c in ("-", "_"))
        if not safe_uid:
            raise ValueError("Invalid user id")
        d = self.users_dir / safe_uid
        d.mkdir(parents=True, exist_ok=True)
        return d

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _new_id() -> str:
        return f"resume-{uuid.uuid4().hex[:12]}"

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

    # ---------- Public API ----------

    def list_resumes(self, uid: str) -> list[ResumeSummary]:
        user_dir = self._user_dir(uid)
        out: list[ResumeSummary] = []
        for path in sorted(user_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            raw = self._read(path)
            if not raw:
                continue
            job = raw.get("job") or {}
            out.append(
                ResumeSummary(
                    id=raw["id"],
                    versionName=raw.get("versionName", "Untitled Resume"),
                    templateStyle=raw.get("templateStyle"),
                    createdAt=raw.get("createdAt"),
                    updatedAt=raw.get("updatedAt"),
                    targetRole=job.get("role") if job else None,
                    targetCompany=job.get("company") if job else None,
                )
            )
        return out

    def get_resume(self, uid: str, resume_id: str) -> Optional[ResumeRecord]:
        raw = self._read(self._user_dir(uid) / f"{resume_id}.json")
        if not raw:
            return None
        raw["userId"] = uid
        return ResumeRecord(**raw)

    def delete_resume(self, uid: str, resume_id: str) -> bool:
        path = self._user_dir(uid) / f"{resume_id}.json"
        if not path.exists():
            return False
        path.unlink()
        return True

    def save_resume(self, uid: str, payload: SaveResumeRequest) -> ResumeRecord:
        user_dir = self._user_dir(uid)
        now = self._now().isoformat()

        with self._lock:
            if payload.id:
                existing = self.get_resume(uid, payload.id)
                if existing is None:
                    raise FileNotFoundError(f"Resume {payload.id} not found for user {uid}")
                record_dict = existing.model_dump(mode="json")
                created_at = record_dict.get("createdAt") or now
            else:
                created_at = now
                record_dict = {
                    "id": self._new_id(),
                    "userId": uid,
                    "versionName": payload.versionName,
                    "templateStyle": payload.templateStyle or "classic",
                    "candidate": payload.candidate,
                    "job": payload.job.model_dump() if payload.job else None,
                    "generated": payload.generated,
                    "createdAt": created_at,
                    "updatedAt": now,
                }

            record_dict["versionName"] = payload.versionName
            record_dict["templateStyle"] = payload.templateStyle or "classic"
            record_dict["candidate"] = payload.candidate
            record_dict["job"] = payload.job.model_dump() if payload.job else None
            record_dict["generated"] = payload.generated
            record_dict["updatedAt"] = now
            record_dict["createdAt"] = created_at

            path = user_dir / f"{record_dict['id']}.json"
            self._write(path, record_dict)

        return ResumeRecord(**record_dict)


# ---------- Singleton ----------


_storage_singleton: Optional[ResumeStorage] = None


def get_storage() -> ResumeStorage:
    """FastAPI dependency that returns the singleton storage instance."""
    global _storage_singleton
    if _storage_singleton is None:
        _storage_singleton = ResumeStorage(get_settings())
    return _storage_singleton