"""
Critic (hallucination guardrail) for the Tech Support Copilot POC.

Validates a draft response against the evidence log accumulated during the
agentic loop.  Any factual claim not traceable to a tool result or KB document
is flagged as an uncited claim and the response fails the check.

The critic calls Bedrock with ``CRITIC_SYSTEM_PROMPT`` and parses the JSON
output.  On parse failure or Bedrock error it degrades gracefully — the draft
is passed rather than blocking the response indefinitely.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic import BaseModel

from agent.prompts import CRITIC_SYSTEM_PROMPT
from llm.bedrock_client import BedrockClient, BedrockError

logger = logging.getLogger(__name__)

# Trim evidence sent to the critic to stay within token budget
_MAX_EVIDENCE_CHARS = 4_000


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

class CritiqueResult(BaseModel):
    """Result of a single critic evaluation."""

    passed: bool
    feedback: str
    uncited_claims: list[str]


# ---------------------------------------------------------------------------
# Critic
# ---------------------------------------------------------------------------

class Critic:
    """Evaluates draft responses for unsupported factual claims.

    Uses a dedicated Bedrock call with a strict auditor persona.  Shares the
    same ``BedrockClient`` instance as the orchestrator to avoid creating a
    second boto3 client.

    Args:
        bedrock: ``BedrockClient`` instance.
    """

    def __init__(self, bedrock: BedrockClient) -> None:
        self.bedrock = bedrock

    def review(
        self,
        draft_answer: str,
        evidence_log: list[dict],
    ) -> CritiqueResult:
        """Check whether every factual claim in *draft_answer* is evidenced.

        Args:
            draft_answer: The candidate response text from the planner.
            evidence_log: Accumulated evidence entries from the current turn
                          (``{source, ref, content, timestamp}`` dicts).

        Returns:
            ``CritiqueResult`` with ``passed=True`` if all claims are supported,
            ``passed=False`` if any are not.  On Bedrock / parse errors the
            result always passes (fail-open) with an explanatory ``feedback``
            field so the orchestrator is never blocked.
        """
        evidence_text = _render_evidence(evidence_log)
        user_content = (
            f"DRAFT RESPONSE:\n{draft_answer}\n\n"
            f"EVIDENCE LOG:\n{evidence_text}"
        )

        try:
            response = self.bedrock.invoke(
                system=CRITIC_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": [{"text": user_content}]}],
                tools=None,
                temperature=0.0,  # deterministic for auditing
            )
        except BedrockError as exc:
            logger.warning("Critic Bedrock call failed: %s — passing by default", exc)
            return CritiqueResult(
                passed=True,
                feedback="Critic unavailable (Bedrock error); passed by default.",
                uncited_claims=[],
            )

        return _parse_critique(response.get("text", ""))


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _render_evidence(evidence_log: list[dict]) -> str:
    """Convert the evidence log to a compact text block for the critic prompt.

    Truncates to ``_MAX_EVIDENCE_CHARS`` to stay inside the model's context
    window on long sessions.
    """
    if not evidence_log:
        return "(no evidence gathered this turn)"

    lines: list[str] = []
    for entry in evidence_log:
        source = entry.get("source", "?")
        ref = entry.get("ref", "?")
        content = entry.get("content")
        if isinstance(content, dict):
            snippet = json.dumps(content, default=str)[:300]
        else:
            snippet = str(content)[:300]
        lines.append(f"[{source}:{ref}] {snippet}")

    full = "\n".join(lines)
    if len(full) > _MAX_EVIDENCE_CHARS:
        full = full[:_MAX_EVIDENCE_CHARS] + "\n... (truncated)"
    return full


def _parse_critique(raw_text: str) -> CritiqueResult:
    """Parse the critic's JSON output into a ``CritiqueResult``.

    Strips optional markdown code fences (Haiku sometimes adds them despite
    the prompt instruction) and falls back gracefully on parse errors.
    """
    # Extract just the JSON object from the response
    start_idx = raw_text.find("{")
    end_idx = raw_text.rfind("}")
    
    if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
        cleaned = raw_text[start_idx:end_idx + 1]
    else:
        cleaned = raw_text

    try:
        data: dict[str, Any] = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning(
            "Critic returned non-JSON output: %r — passing by default", raw_text[:200]
        )
        return CritiqueResult(
            passed=True,
            feedback="Critic output could not be parsed; passed by default.",
            uncited_claims=[],
        )

    return CritiqueResult(
        passed=bool(data.get("passed", True)),
        feedback=str(data.get("feedback", "OK")),
        uncited_claims=[str(c) for c in data.get("uncited_claims", [])],
    )
