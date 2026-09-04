"""Provider-agnostic LLM client wrapper.

This module hides the underlying LLM provider (currently Google Gemini via the
official `google-genai` SDK) so we can swap to OpenAI / Anthropic / a local
model later without rewriting the agents. The contract is intentionally
minimal:

    client.chat_json(messages=..., response_schema=...) -> dict

`response_schema` is an optional JSON Schema dict that Gemini can use to
constrain the output via `GenerateContentConfig.response_schema`.
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
    """Thin wrapper around the Google Gemini SDK (`google-genai`)."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = None
        if settings.is_gemini_configured:
            try:
                # Lazy import - Gemini SDK is heavy; only needed at generation time.
                from google import genai  # type: ignore

                self._client = genai.Client(api_key=settings.gemini_api_key.strip())
                logger.info(
                    "Gemini client initialised with model %s", settings.gemini_model
                )
            except Exception as exc:  # pragma: no cover
                logger.exception("Failed to initialise Gemini client: %s", exc)
                self._client = None

    @property
    def model(self) -> str:
        return self.settings.gemini_model

    @property
    def is_available(self) -> bool:
        return self._client is not None

    # ---------- Public API ----------

    def chat_json(
        self,
        messages: list[dict],
        response_schema=None,
        schema_name: str = "response",
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> dict:
        """Call Gemini and return parsed JSON.

        Messages are expected in OpenAI-style chat format:
            [{"role": "system"|"user"|"assistant", "content": "..."}, ...]

        System messages are merged into `config.system_instruction`; the rest
        become the `contents` list. If `response_schema` is provided, Gemini's
        structured-output mode is used; otherwise we ask for JSON in the prompt
        and clean the response.
        """
        if not self.is_available:
            raise LLMUnavailable(
                "GEMINI_API_KEY is not set. Add it to backend/.env to enable AI generation."
            )

        from google.genai import types  # type: ignore

        system_text, contents = _build_contents(messages)

        config_kwargs = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
            "response_mime_type": "application/json",
        }
        if system_text:
            config_kwargs["system_instruction"] = system_text
        if response_schema:
            config_kwargs["response_schema"] = response_schema

        config = types.GenerateContentConfig(**config_kwargs)

        response = self._client.models.generate_content(
            model=self.model,
            contents=contents,
            config=config,
        )

        text = (response.text or "").strip()
        text = _strip_code_fences(text)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                return json.loads(match.group(0))
            raise


# ---------- Module-level helpers ----------


def _build_contents(messages):
    """Convert OpenAI-style messages into (system_text, contents) for google-genai."""
    from google.genai import types  # type: ignore

    system_parts = []
    contents = []
    for msg in messages:
        role = msg.get("role", "user")
        text = _extract_text(msg.get("content", ""))
        if not text:
            continue
        if role == "system":
            system_parts.append(text)
            continue
        gemini_role = "model" if role == "assistant" else "user"
        if contents and contents[-1].role == gemini_role:
            contents[-1] = types.Content(
                role=gemini_role,
                parts=list(contents[-1].parts) + [types.Part(text=text)],
            )
        else:
            contents.append(types.Content(role=gemini_role, parts=[types.Part(text=text)]))

    system_text = "\n\n".join(system_parts)
    if contents and contents[0].role != "user":
        # Gemini requires the first turn to be a user turn.
        contents.pop(0) if len(contents) > 1 else contents.clear()
    return system_text, contents


def _extract_text(content):
    """Best-effort coercion of an OpenAI-style content field into a string."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    chunks.append(block.get("text", ""))
                else:
                    chunks.append(str(block))
            else:
                chunks.append(str(block))
        return "\n".join(chunks)
    return str(content)


def _strip_code_fences(text):
    """Remove ```json ... ``` fences if present."""
    if text.startswith("```json"):
        text = text[len("```json"):].strip()
    elif text.startswith("```"):
        text = text[len("```"):].strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    return text


# ---------- Singleton ----------


_llm_singleton = None


def get_llm():
    """FastAPI dependency that returns the singleton LLM client."""
    global _llm_singleton
    if _llm_singleton is None:
        _llm_singleton = LLMClient(get_settings())
    return _llm_singleton
