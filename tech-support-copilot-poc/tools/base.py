"""
Tool abstraction layer for the Tech Support Copilot POC.

Defines the base Tool ABC, RiskTier enum, and ToolResult model that every
concrete tool must conform to.  The Bedrock Converse tool-spec format is also
produced here via ``to_bedrock_spec()``.
"""
from __future__ import annotations

import random
import time
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from pydantic import BaseModel

import config


# ---------------------------------------------------------------------------
# Risk tiers
# ---------------------------------------------------------------------------

class RiskTier(str, Enum):
    """Governs whether a tool requires human approval before execution."""

    READ_ONLY = "read_only"
    """Safe to auto-run; no side effects."""

    LOW_RISK_MUTATING = "low_risk"
    """Auto-run, but all invocations are logged for audit."""

    HIGH_RISK_MUTATING = "high_risk"
    """Requires explicit human approval via CLI prompt."""


# ---------------------------------------------------------------------------
# Tool result
# ---------------------------------------------------------------------------

class ToolResult(BaseModel):
    """Normalized result returned by every tool execution."""

    success: bool
    data: Any
    error: str | None = None
    latency_ms: int
    tool_name: str


# ---------------------------------------------------------------------------
# Shared failure simulation helper
# ---------------------------------------------------------------------------

def _maybe_fail(tool_name: str) -> ToolResult | None:
    """Return a simulated failure ToolResult ~5 % of the time.

    Only active when ``config.SIMULATE_TOOL_FAILURES`` is ``True``.
    Set it to ``False`` in smoke tests or any deterministic context.
    """
    if config.DEMO_MODE:
        return None
    if config.SIMULATE_TOOL_FAILURES and random.random() < 0.05:
        return ToolResult(
            success=False,
            data=None,
            error="Simulated transient failure",
            latency_ms=50,
            tool_name=tool_name,
        )
    return None


# ---------------------------------------------------------------------------
# Tool ABC
# ---------------------------------------------------------------------------

class Tool(ABC):
    """Abstract base class for all tools in the registry.

    Concrete subclasses must set the four class-level attributes and
    implement ``execute()``.

    Class attributes
    ----------------
    name:         Unique snake_case identifier used by the LLM and registry.
    description:  Human-readable description sent to the LLM in the tool spec.
    input_schema: JSON Schema dict for the tool's input parameters.
    risk_tier:    Controls auto-run vs approval gating.
    """

    name: str
    description: str
    input_schema: dict
    risk_tier: RiskTier

    @abstractmethod
    def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with the given keyword arguments.

        Implementations should:
        - Call ``_maybe_fail(self.name)`` near the top and return early on failure.
        - Measure wall-clock latency and include it in ``ToolResult.latency_ms``.
        - Never raise exceptions — capture errors in ``ToolResult.error``.
        """

    def to_bedrock_spec(self) -> dict:
        """Return a Bedrock Converse API ``toolSpec`` dict for this tool."""
        return {
            "toolSpec": {
                "name": self.name,
                "description": self.description,
                "inputSchema": {"json": self.input_schema},
            }
        }
