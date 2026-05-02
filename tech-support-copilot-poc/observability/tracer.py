"""
Structured JSONL tracer for the Tech Support Copilot POC.

One JSONL file is written per conversation session.  Each line is a JSON
object with a timestamp, an event type, and a data payload.

Event types
-----------
session_start      conversation begins
user_message       customer message received
plan_step          start of an agentic iteration
llm_response       raw (normalized) response from Bedrock
tool_call          tool invocation attempted
tool_result        result returned from a tool
approval_prompt    human approval requested for high-risk tool
approval_decision  outcome of the approval prompt (approved / rejected)
critic             result of the critic validation step
assistant_message  final response surfaced to the CLI
budget_exhausted   iteration or token budget hit
error              unhandled exception or degradation event
session_end        conversation ends / tracer closed
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import config


class Tracer:
    """Writes structured JSONL trace events for a single conversation session."""

    def __init__(self, trace_dir: str | None = None) -> None:
        resolved_dir = trace_dir or config.TRACE_DIR
        Path(resolved_dir).mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        self.filepath: str = os.path.join(resolved_dir, f"conv_{timestamp}.jsonl")
        self._file = open(self.filepath, "a", encoding="utf-8")  # noqa: SIM115
        self.log("session_start", {"trace_file": self.filepath})

    # ------------------------------------------------------------------
    # Core logging
    # ------------------------------------------------------------------

    def log(self, event: str, data: dict[str, Any]) -> None:
        """Write a single trace event as a JSONL line and flush immediately."""
        record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "event": event,
            "data": data,
        }
        self._file.write(json.dumps(record, default=str) + "\n")
        self._file.flush()

    # ------------------------------------------------------------------
    # Convenience methods (thin wrappers around log())
    # ------------------------------------------------------------------

    def user_message(self, text: str) -> None:
        self.log("user_message", {"text": text})

    def llm_response(self, response: dict) -> None:
        """Log an LLM response, including token usage."""
        self.log(
            "llm_response",
            {
                "stop_reason": response.get("stop_reason"),
                "text": response.get("text"),
                "tool_uses": response.get("tool_uses", []),
                "usage": response.get("usage", {}),
            },
        )

    def tool_call(self, tool_use: dict, result: Any) -> None:
        self.log(
            "tool_call",
            {
                "tool_use_id": tool_use.get("tool_use_id"),
                "name": tool_use.get("name"),
                "input": tool_use.get("input"),
                "result": result if isinstance(result, dict) else str(result),
            },
        )

    def approval_prompt(self, tool_name: str, inputs: dict) -> None:
        self.log("approval_prompt", {"tool_name": tool_name, "inputs": inputs})

    def approval_decision(self, tool_name: str, approved: bool) -> None:
        self.log("approval_decision", {"tool_name": tool_name, "approved": approved})

    def critic(self, critique: dict) -> None:
        self.log("critic", critique)

    def assistant_message(self, text: str) -> None:
        self.log("assistant_message", {"text": text})

    def budget_exhausted(self, reason: str) -> None:
        self.log("budget_exhausted", {"reason": reason})

    def error(self, message: str, detail: str = "") -> None:
        self.log("error", {"message": message, "detail": detail})

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Flush and close the trace file."""
        self.log("session_end", {})
        self._file.close()

    def __enter__(self) -> "Tracer":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()
