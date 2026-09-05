"""Thread-safe JSON storage for Optimizer records.

Mirror of the per-user pattern in `app/services/profile.py`. Each
optimization is one file under `data/optimizer/<uid>/<optimization_id>.json`.

Kept intentionally minimal -- the Optimizer has its own data shape
(OptimizationRecord) so it doesn't share storage with the resume builder.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
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


class OptimizerStorage:
    """Per-user JSON-file storage for OptimizationRecord."""

    def __init__(self, settings: Settings):
        self._root = Path(settings.data_dir) / "optimizer"
        self._root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    # ---------- Paths ----------

    def _user_dir(self, uid: str) -> Path:
        d = self._root / _safe_id(uid)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _file(self, uid: str, optimization_id: str) -> Path:
        return self._user_dir(uid) / f"{_safe_id(optimization_id)}.json"

    # ---------- Helpers ----------

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

    def create(self, uid: str, source_filename: Optional[str], parsed: dict, **overrides: Any) -> dict:
        optimization_id = "opt-" + uuid.uuid4().hex[:12]
        now = _now_iso()
        record = {
            "id": optimization_id,
            "userId": _safe_id(uid),
            "sourceFilename": source_filename,
            "sourceResume": parsed or {},
            "jobDescription": None,
            "targetRole": None,
            "targetCompany": None,
            "jdAnalysis": None,
            "matchScore": None,
            "tailoredResume": None,
            "labels": {},
            "status": "draft",
            "error": None,
            "createdAt": now,
            "updatedAt": now,
        }
        record.update({k: v for k, v in overrides.items() if v is not None})
        self._write(self._file(uid, optimization_id), record)
        return record

    def get(self, uid: str, optimization_id: str) -> Optional[dict]:
        return self._read(self._file(uid, optimization_id))

    def update(self, uid: str, optimization_id: str, **changes: Any) -> Optional[dict]:
        with self._lock:
            path = self._file(uid, optimization_id)
            existing = self._read(path)
            if not existing:
                return None
            existing.update({k: v for k, v in changes.items() if v is not None})
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
            records.append({
                "id": rec.get("id"),
                "sourceFilename": rec.get("sourceFilename"),
                "targetRole": rec.get("targetRole"),
                "targetCompany": rec.get("targetCompany"),
                "overallScore": (rec.get("matchScore") or {}).get("overall", {}).get("overall")
                if isinstance(rec.get("matchScore"), dict)
                else None,
                "status": rec.get("status", "draft"),
                "createdAt": rec.get("createdAt"),
                "updatedAt": rec.get("updatedAt"),
            })
        records.sort(key=lambda r: r.get("updatedAt") or "", reverse=True)
        return records

    def delete(self, uid: str, optimization_id: str) -> bool:
        path = self._file(uid, optimization_id)
        if not path.exists():
            return False
        try:
            path.unlink()
            return True
        except OSError as exc:
            logger.warning("Could not delete %s: %s", path, exc)
            return False


_singleton: Optional[OptimizerStorage] = None
_singleton_lock = threading.Lock()


def get_optimizer_storage() -> OptimizerStorage:
    global _singleton
    with _singleton_lock:
        if _singleton is None:
            _singleton = OptimizerStorage(get_settings())
        return _singleton
