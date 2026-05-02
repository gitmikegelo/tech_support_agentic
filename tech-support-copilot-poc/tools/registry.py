"""
Tool registry for the Tech Support Copilot POC.

Maintains a dictionary of registered tools, produces Bedrock Converse tool
specs for the LLM, and dispatches execution with risk-tier gating.
"""
from __future__ import annotations

from typing import Callable

from tools.base import RiskTier, Tool, ToolResult


class ToolRegistry:
    """Central registry for all tools available to the agent.

    Usage
    -----
    registry = ToolRegistry()
    registry.register(MyTool())
    specs = registry.all_specs()          # pass to BedrockClient.invoke()
    result = registry.execute("my_tool", {"param": "value"})
    """

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def register(self, tool: Tool) -> None:
        """Register a tool instance.  Overwrites any previously registered
        tool with the same name."""
        self._tools[tool.name] = tool

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    def get(self, name: str) -> Tool:
        """Return the tool registered under *name*.

        Raises
        ------
        KeyError if no tool with that name exists.
        """
        try:
            return self._tools[name]
        except KeyError:
            raise KeyError(
                f"Tool '{name}' is not registered. "
                f"Available tools: {list(self._tools)}"
            )

    def list_names(self) -> list[str]:
        """Return a sorted list of all registered tool names."""
        return sorted(self._tools)

    # ------------------------------------------------------------------
    # Bedrock spec
    # ------------------------------------------------------------------

    def all_specs(self) -> list[dict]:
        """Return Bedrock Converse ``toolSpec`` dicts for every registered tool."""
        return [t.to_bedrock_spec() for t in self._tools.values()]

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def execute(
        self,
        name: str,
        inputs: dict,
        approver: Callable[[Tool, dict], bool] | None = None,
    ) -> ToolResult:
        """Execute the named tool with the provided inputs.

        High-risk mutating tools require the *approver* callable to return
        ``True`` before execution proceeds.  If *approver* is ``None`` or
        returns ``False``, a rejection ``ToolResult`` is returned immediately
        without calling the tool.

        Args:
            name:     Registered tool name.
            inputs:   Keyword arguments forwarded to ``tool.execute(**inputs)``.
            approver: Optional ``(tool, inputs) -> bool`` callback for
                      high-risk tools.  Should prompt the operator for consent.

        Returns:
            ToolResult with ``success=False`` and a descriptive ``error`` if
            the tool is rejected or raises an unexpected exception.
        """
        tool = self.get(name)

        if tool.risk_tier == RiskTier.HIGH_RISK_MUTATING:
            if approver is None or not approver(tool, inputs):
                return ToolResult(
                    success=False,
                    data=None,
                    error="Rejected by human approver",
                    latency_ms=0,
                    tool_name=name,
                )

        try:
            return tool.execute(**inputs)
        except Exception as exc:  # noqa: BLE001
            return ToolResult(
                success=False,
                data=None,
                error=f"Unhandled tool exception: {exc}",
                latency_ms=0,
                tool_name=name,
            )
