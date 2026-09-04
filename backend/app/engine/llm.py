"""Provider-agnostic LLM client wrapper.

This module hides the underlying LLM provider (currently OpenAI) so we can
swap to Anthropic / Gemini / a local model later without rewriting the
agents. The contract is intentionally minimal:

    client.chat_json(messages=..., response_schema=...) -> dict

`response_schema` is an optional JSON Schema dict that the provider can
use to constrain the output (currently via OpenAI's
`response_format={"type": "json_schema", ...}`).
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class LLMUnavailable(RuntimeError):
    """Raised when the LLM provider is not configured (no API key)."""


class LLMClient:
    """Thin wrapper around the OpenAI Python SDK."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = None
        if settings.is_openai_configured:
            try:
                # Lazy import — OpenAI is heavy and only needed when generation runs.
                from openai import OpenAI  # type: ignore

                self._client = OpenAI(api_key=settings.openai_api_key.strip())
                logger.info("OpenAI client initialised with model %s", settings.openai_model)
            except Exception as exc:  # pragma: no cover
                logger.exception("Failed to initialise OpenAI client: %s", exc)
                self._client = None

    @property
    def model(self) -> str:
        return self.settings.openai_model

    @property
    def is_available(self) -> bool:
        return self._client is not None

    # ---------- Public API ----------

    def chat_json(
        self,
        messages: list[dict],
        response_schema: Optional[dict] = None,
        schema_name: str = "response",
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> dict:
        """Call the chat completions endpoint and return parsed JSON.

        If `response_schema` is provided, OpenAI's structured-output mode is
        used. Otherwise we ask for JSON in the prompt and clean the response.
        """
        if not self.is_available:
            raise LLMUnavailable(
                "OPENAI_API_KEY is not set. Add it to backend/.env to enable AI generation."
            )

        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if response_schema:
            kwargs["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "schema": response_schema,
                    "strict": True,
                },
            }

        resp = self._client.chat.completions.create(**kwargs)
        text = resp.choices[0].message.content or ""

        # Strip code fences if the model ignored the schema.
        text = _strip_code_fences(text)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Last-resort: try to locate a JSON object inside the text.
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                return json.loads(match.group(0))
            raise


# ---------- Module-level helpers ----------


def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` fences if present."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[len("```json"):].strip()
    elif text.startswith("```"):
        text = text[len("```"):].strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    return text


# ---------- Singleton ----------


_llm_singleton: Optional[LLMClient] = None


def get_llm() -> LLMClient:
    """FastAPI dependency that returns the singleton LLM client."""
    global _llm_singleton
    if _llm_singleton is None:
        _llm_singleton = LLMClient(get_settings())
    return _llm_singleton