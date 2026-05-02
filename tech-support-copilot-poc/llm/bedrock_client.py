"""
Bedrock LLM client using the Converse API.

Wraps boto3 to provide a single, normalized invoke() interface that handles
tool-use, retries, and error normalization for the rest of the application.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import boto3
from botocore.exceptions import ClientError

import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class BedrockError(Exception):
    """Raised on unrecoverable Bedrock API failures."""


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class BedrockClient:
    """Thin wrapper around boto3 bedrock-runtime using the Converse API."""

    def __init__(self, model_id: str | None = None, region: str | None = None) -> None:
        self.model_id: str = model_id or config.BEDROCK_MODEL_ID
        self.region: str = region or config.AWS_REGION
        self._client = boto3.client("bedrock-runtime", region_name=self.region)

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def invoke(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.2,
    ) -> dict:
        """Call Bedrock Converse API and return a normalized response dict.

        Args:
            system:      System prompt text.
            messages:    Conversation history in Converse message format.
            tools:       Optional list of Bedrock tool specs (toolSpec dicts).
            max_tokens:  Override for LLM_MAX_TOKENS from config.
            temperature: Sampling temperature (default 0.2 for consistency).

        Returns:
            {
              "stop_reason": "end_turn" | "tool_use" | "max_tokens" | str,
              "content": [...],          # raw content blocks from the response
              "tool_uses": [             # parsed tool-use requests (convenience)
                {"tool_use_id": str, "name": str, "input": dict}
              ],
              "text": str,               # concatenated text blocks
              "usage": {"input_tokens": int, "output_tokens": int}
            }
        """
        resolved_max_tokens = max_tokens if max_tokens is not None else config.LLM_MAX_TOKENS
        effective_temperature = 0.0 if config.DEMO_MODE else temperature

        kwargs: dict[str, Any] = {
            "modelId": self.model_id,
            "system": [{"text": system}],
            "messages": messages,
            "inferenceConfig": {
                "maxTokens": resolved_max_tokens,
                "temperature": effective_temperature,
            },
        }
        if tools:
            kwargs["toolConfig"] = {"tools": tools}

        raw = self._invoke_with_retry(kwargs)
        return self._normalize(raw)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _invoke_with_retry(self, kwargs: dict, max_retries: int = 3) -> dict:
        """Call converse() with exponential back-off on ThrottlingException.

        Raises BedrockError on non-throttling errors or after exhausting retries.
        """
        delay = 1.0
        last_exc: Exception | None = None

        for attempt in range(max_retries + 1):
            try:
                return self._client.converse(**kwargs)
            except ClientError as exc:
                code = exc.response["Error"]["Code"]
                if code == "ThrottlingException" and attempt < max_retries:
                    logger.warning(
                        "Bedrock throttled (attempt %d/%d), retrying in %.1fs",
                        attempt + 1,
                        max_retries,
                        delay,
                    )
                    time.sleep(delay)
                    delay *= 2
                    last_exc = exc
                    continue
                raise BedrockError(f"Bedrock API error [{code}]: {exc}") from exc

        raise BedrockError("Max retries exceeded after throttling") from last_exc

    @staticmethod
    def _normalize(raw: dict) -> dict:
        """Convert the raw Converse API response into a flat convenience dict."""
        output_msg = raw.get("output", {}).get("message", {})
        content: list[dict] = output_msg.get("content", [])
        stop_reason: str = raw.get("stopReason", "unknown")
        usage_raw: dict = raw.get("usage", {})

        text_parts: list[str] = []
        tool_uses: list[dict] = []

        for block in content:
            if "text" in block:
                text_parts.append(block["text"])
            elif "toolUse" in block:
                tu = block["toolUse"]
                tool_uses.append(
                    {
                        "tool_use_id": tu.get("toolUseId", ""),
                        "name": tu.get("name", ""),
                        "input": tu.get("input", {}),
                    }
                )

        return {
            "stop_reason": stop_reason,
            "content": content,
            "tool_uses": tool_uses,
            "text": "\n".join(text_parts),
            "usage": {
                "input_tokens": usage_raw.get("inputTokens", 0),
                "output_tokens": usage_raw.get("outputTokens", 0),
            },
        }
