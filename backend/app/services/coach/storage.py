"""Per-user JSON storage for Interview Coach sessions.

Files live under ``<settings.data_dir>/coach/<uid>/<session_id>.json``
and are addressed by ``(uid, session_id)``. Storage is intentionally
simple and append-friendly: each session is one file.
"""
from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

_LOCK = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _root_dir() -> Path:
    return Path(get_settings().data_dir) / "coach"


class CoachStorage:
    """Filesystem-backed storage for coach sessions."""

    def __init__(self, root: Optional[Path] = None) -> None:
        self.root = root or _root_dir()
        self.root.mkdir(parents=True, exist_ok=True)

    # ---- file IO ----

    def _user_dir(self, uid: str) -> Path:
        d = self.root / uid
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _path_for(self, uid: str, session_id: str) -> Path:
        return self._user_dir(uid) / (session_id + ".json")

    @staticmethod
    def _read(path: Path) -> Optional[dict]:
        try:
            with path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return None
        except Exception as exc:
            logger.warning("Failed to read %s: %s", path, exc)
            return None

    @staticmethod
    def _write(path: Path, data: dict) -> None:
        tmp = path.with_suffix(".json.tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)

    # ---- CRUD ----

    def list(self, uid: str) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        d = self._user_dir(uid)
        for p in sorted(d.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
            rec = self._read(p)
            if rec:
                out.append(rec)
        return out

    def get(self, uid: str, session_id: str) -> Optional[dict]:
        return self._read(self._path_for(uid, session_id))

    def create(self, uid: str, session_id: str, payload: dict) -> dict:
        path = self._path_for(uid, session_id)
        now = _now()
        record = {
            "id": session_id,
            "uid": uid,
            **payload,
        }
        record["createdAt"] = now
        record["updatedAt"] = now
        with _LOCK:
            self._write(path, record)
        return record

    def update(self, uid: str, session_id: str, patch: dict) -> Optional[dict]:
        path = self._path_for(uid, session_id)
        with _LOCK:
            existing = self._read(path)
            if not existing:
                return None
            existing.update(patch)
            existing["updatedAt"] = _now()
            self._write(path, existing)
        return existing

    def delete(self, uid: str, session_id: str) -> bool:
        path = self._path_for(uid, session_id)
        try:
            with _LOCK:
                if path.exists():
                    path.unlink()
                    return True
            return False
        except Exception as exc:
            logger.warning("Failed to delete %s: %s", path, exc)
            return False


_storage: Optional[CoachStorage] = None


def get_coach_storage() -> CoachStorage:
    global _storage
    if _storage is None:
        _storage = CoachStorage()
    return _storage
