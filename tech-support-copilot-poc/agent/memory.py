"""
Working memory for the Tech Support Copilot agentic loop.

Holds the conversation message history in Bedrock Converse format and an
evidence log of every fact gathered by tool calls.  Consumed by the
orchestrator on every loop iteration.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class Memory:
    """Manages conversation history and evidence gathered during a support session.

    The ``messages`` list stays in Bedrock Converse format::

        [{"role": "user"|"assistant", "content": [<content blocks>]}, ...]

    Content blocks follow the Bedrock Converse spec:

    * text block:       ``{"text": "..."}``
    * toolUse block:    ``{"toolUse": {"toolUseId": "...", "name": "...", "input": {...}}}``
    * toolResult block: ``{"toolResult": {"toolUseId": "...", "content": [...], "status": "..."}}``
    """

    def __init__(self) -> None:
        self.messages: list[dict] = []
        self.evidence_log: list[dict] = []

    # ------------------------------------------------------------------
    # Message history mutators
    # ------------------------------------------------------------------

    def append_user(self, text: str) -> None:
        """Append a plain-text user/customer message."""
        self.messages.append({"role": "user", "content": [{"text": text}]})

    def append_assistant_content(self, content: list[dict]) -> None:
        """Append a raw Bedrock content-block list as an assistant message.

        Use this for both ``end_turn`` and ``tool_use`` responses so the full
        content structure (including ``toolUse`` blocks) is preserved for
        multi-turn fidelity with the Bedrock Converse API.
        """
        self.messages.append({"role": "assistant", "content": content})

    def append_tool_results(self, tool_result_blocks: list[dict]) -> None:
        """Append tool execution results as a user message.

        Each block must be a ``{"toolResult": {...}}`` dict following the
        Bedrock Converse spec.  All results for one iteration are batched into
        a single user message, as required by the API.
        """
        self.messages.append({"role": "user", "content": tool_result_blocks})

    def append_system_reminder(self, text: str) -> None:
        """Inject a system-level reminder as a user-role message.

        Used by the critic feedback loop (Agent 4) and budget-exhaustion
        notifications.  Prefixed with ``[SYSTEM REMINDER]`` to distinguish it
        from genuine customer text.
        """
        self.messages.append(
            {"role": "user", "content": [{"text": f"[SYSTEM REMINDER] {text}"}]}
        )

    # ------------------------------------------------------------------
    # Evidence log
    # ------------------------------------------------------------------

    def record_evidence(self, source: str, ref: str, content: Any) -> None:
        """Record a fact into the evidence log.

        Args:
            source:  ``"tool"`` or ``"kb"``.
            ref:     Tool name or KB document ID (e.g. ``"check_modem_status"``,
                     ``"kb:slow_speeds.md"``).
            content: The raw data returned (tool result data or KB snippet).
        """
        self.evidence_log.append(
            {
                "source": source,
                "ref": ref,
                "content": content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    def summarize_evidence(self) -> str:
        """Return a concise bullet-point summary of the evidence log.

        Used in graceful-degradation fallback responses when the iteration
        budget is exhausted before a clean ``end_turn`` is reached.
        """
        if not self.evidence_log:
            return "No evidence gathered yet."

        lines: list[str] = []
        for entry in self.evidence_log:
            source = entry.get("source", "?")
            ref = entry.get("ref", "?")
            content = entry.get("content")
            if isinstance(content, dict):
                # Show up to 4 key=value pairs for readability
                snippet = ", ".join(f"{k}={v}" for k, v in list(content.items())[:4])
            else:
                snippet = str(content)[:120]
            lines.append(f"- [{source}:{ref}] {snippet}")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Read-only accessors
    # ------------------------------------------------------------------

    def to_messages(self) -> list[dict]:
        """Return a copy of the message list for passing to BedrockClient.invoke()."""
        return list(self.messages)
