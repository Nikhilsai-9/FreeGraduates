"""Thread-safe JSON storage for Cover Letter records.

Per-user pattern mirrored from ``OptimizerStorage`` and ``CoachStorage``:
each letter is one file under ``<data_dir>/cover_letter/<uid>/<letter_id>.json``.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

_SAFE_ID = re.compile(r"[^A-Za-z0-9_-]")


def _safe_id(value: str) -> str:
    return _SAFE_ID.sub("", value or "")[:120] or "anon"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class CoverLetterStorage:
    """Per-user JSON-file storage for CoverLetter records."""

    def __init__(self, settings: Settings):
        self._root = Path(settings.data_dir) / "cover_letter"
        self._root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    # ---------- Paths ----------

    def _user_dir(self, uid: str) -> Path:
        d = self._root / _safe_id(uid)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _file(self, uid: str, letter_id: str) -> Path:
        return self._user_dir(uid) / f"{_safe_id(letter_id)}.json"

    # ---------- IO helpers ----------

    @staticmethod
    def _read(path: Path) -> Optional[dict]:
        if not path.exists():
            return None
        try:
            with path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            logger.warning("Could not read %s: %s", path, exc)
            return None

    def _write(self, path: Path, payload: dict) -> None:
        tmp = path.with_suffix(".tmp")
        try:
            with tmp.open("w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            os.replace(tmp, path)
        except Exception as exc:
            logger.exception("Could not write %s: %s", path, exc)
            if tmp.exists():
                try:
                    tmp.unlink()
                except OSError:
                    pass

    # ---------- Public API ----------

    def create(
        self,
        uid: str,
        source_filename: Optional[str],
        candidate: dict,
        job_description: str,
        target_role: Optional[str],
        target_company: Optional[str],
        tone: str,
        length: str,
        letter: dict,
        **overrides: Any,
    ) -> dict:
        letter_id = "cl-" + uuid.uuid4().hex[:12]
        now = _now_iso()
        record = {
            "id": letter_id,
            "userId": _safe_id(uid),
            "sourceFilename": source_filename,
            "sourceResume": candidate or {},
            "jobDescription": job_description,
            "targetRole": target_role,
            "targetCompany": target_company,
            "tone": tone or "professional",
            "length": length or "medium",
            "subject": (letter.get("subject") or "").strip(),
            "body": (letter.get("body") or "").strip(),
            "recipientHint": (letter.get("recipientHint") or "Hiring Team").strip(),
            "generatedBy": letter.get("generatedBy") or "rules",
            "status": "draft",
            "createdAt": now,
            "updatedAt": now,
        }
        record.update({k: v for k, v in overrides.items() if v is not None})
        self._write(self._file(uid, letter_id), record)
        return record

    def get(self, uid: str, letter_id: str) -> Optional[dict]:
        return self._read(self._file(uid, letter_id))

    def update(self, uid: str, letter_id: str, **changes: Any) -> Optional[dict]:
        with self._lock:
            path = self._file(uid, letter_id)
            existing = self._read(path)
            if not existing:
                return None
            for k, v in changes.items():
                if v is not None:
                    existing[k] = v
            existing["updatedAt"] = _now_iso()
            self._write(path, existing)
            return existing

    def list(self, uid: str) -> list[dict]:
        d = self._user_dir(uid)
        records: list[dict] = []
        for p in d.glob("*.json"):
            rec = self._read(p)
            if not rec:
                continue
            body = (rec.get("body") or "").strip()
            records.append({
                "id": rec.get("id"),
                "targetRole": rec.get("targetRole"),
                "targetCompany": rec.get("targetCompany"),
                "subject": rec.get("subject") or "",
                "tone": rec.get("tone") or "professional",
                "length": rec.get("length") or "medium",
                "generatedBy": rec.get("generatedBy") or "rules",
                "status": rec.get("status") or "draft",
                "wordCount": len(body.split()) if body else 0,
                "createdAt": rec.get("createdAt"),
                "updatedAt": rec.get("updatedAt"),
            })
        records.sort(key=lambda r: r.get("updatedAt") or "", reverse=True)
        return records

    def delete(self, uid: str, letter_id: str) -> bool:
        path = self._file(uid, letter_id)
        if not path.exists():
            return False
        try:
            path.unlink()
            return True
        except OSError as exc:
            logger.warning("Could not delete %s: %s", path, exc)
            return False


_singleton: Optional[CoverLetterStorage] = None
_singleton_lock = threading.Lock()


def get_cover_letter_storage() -> CoverLetterStorage:
    global _singleton
    with _singleton_lock:
        if _singleton is None:
            _singleton = CoverLetterStorage(get_settings())
        return _singleton
