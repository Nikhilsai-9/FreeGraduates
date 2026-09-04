"""Application configuration loaded from environment variables.

Centralised so the rest of the codebase never reads `os.environ` directly.
This makes the app testable and keeps secrets on the server only.
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent.parent  # .../backend


def _parse_csv(value) -> List[str]:
    """Parse a comma-separated string from .env into a list."""
    if value is None:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    if isinstance(value, list):
        return value
    return [item.strip() for item in str(value).split(",") if item.strip()]


class Settings(BaseSettings):
    """All runtime configuration for the FreeGraduates resume backend."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------- Server ----------
    port: int = Field(default=8000)
    # Stored as raw string so pydantic-settings never tries to coerce it.
    # `client_origins_list` below exposes the parsed list for app code.
    client_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173"
    )
    dev_auth_bypass: bool = Field(default=False)

    # ---------- AI Provider (Google Gemini) ----------
    gemini_api_key: str = Field(default="")
    gemini_model: str = Field(default="gemini-1.5-flash")

    # ---------- Firebase Admin ----------
    firebase_service_account_path: str = Field(default="./firebase-service-account.json")
    firebase_project_id: str = Field(default="freegraduates")

    # ---------- Storage ----------
    data_dir: str = Field(default="./app/data")
    max_upload_bytes: int = Field(default=16 * 1024 * 1024)  # 16 MB

    # ---------- Poppler ----------
    poppler_path: str = Field(default="")

    # ---------- Validators ----------
    @field_validator("client_origins", mode="before")
    @classmethod
    def _split_csv(cls, value):
        if isinstance(value, str):
            return value
        return str(value) if value is not None else ""

    # ---------- Derived ----------
    @property
    def client_origins_list(self) -> List[str]:
        return _parse_csv(self.client_origins)

    @property
    def data_dir_resolved(self) -> Path:
        """Absolute path to the data directory."""
        path = Path(self.data_dir)
        if not path.is_absolute():
            path = BACKEND_DIR / path
        return path.resolve()

    @property
    def cvs_dir(self) -> Path:
        return self.data_dir_resolved / "cvs"

    @property
    def outputs_dir(self) -> Path:
        return self.data_dir_resolved / "outputs"

    @property
    def users_dir(self) -> Path:
        return self.data_dir_resolved / "users"

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir_resolved / "uploads"

    @property
    def rules_dir(self) -> Path:
        return self.data_dir_resolved / "rules"

    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.gemini_api_key and self.gemini_api_key.strip())

    @property
    def is_firebase_configured(self) -> bool:
        path = Path(self.firebase_service_account_path)
        if not path.is_absolute():
            path = BACKEND_DIR / path
        return path.exists()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton accessor for the application settings."""
    return Settings()
