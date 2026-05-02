"""
Agentic orchestrator for the Tech Support Copilot POC.

Implements the plan → act → observe loop over Bedrock (Haiku 4.5) with:

- Budget enforcement (iterations, tool calls, tokens)
- Risk-tier gating via the ToolRegistry
- Graceful degradation on budget exhaustion or Bedrock errors
- A clearly marked seam for the critic step (Agent 4)

Usage
-----
::

    from agent.orchestrator import Orchestrator
    from tools import build_default_registry
    from llm.bedrock_client import BedrockClient
    from observability.tracer import Tracer

    orch = Orchestrator(
        bedrock=BedrockClient(),
        registry=build_default_registry(),
        tracer=Tracer(),
    )
    response = orch.handle_turn("my internet is slow")
    print(response)
"""
from __future__ import annotations

import logging
import threading
from typing import Callable, Protocol

import config
from agent.critic import Critic
from agent.memory import Memory
from agent.prompts import PLANNER_SYSTEM_PROMPT
from llm.bedrock_client import BedrockClient, BedrockError
from tools.base import RiskTier, Tool, ToolResult
from tools.registry import ToolRegistry

logger = logging.getLogger(__name__)

# Type aliases for callbacks
ApproverFn = Callable[[Tool, dict], bool]
EventHookFn = Callable[[str, dict], None]


# ---------------------------------------------------------------------------
# Tracer protocol — lets us accept both the real Tracer and the null shim
# ---------------------------------------------------------------------------

class _TracerProtocol(Protocol):
    """Structural interface that both Tracer and _NullTracer satisfy."""

    filepath: str

    def log(self, event: str, data: dict) -> None: ...
    def user_message(self, text: str) -> None: ...
    def llm_response(self, response: dict) -> None: ...
    def tool_call(self, tool_use: dict, result: object) -> None: ...
    def critic(self, critique: dict) -> None: ...
    def assistant_message(self, text: str) -> None: ...
    def budget_exhausted(self, reason: str) -> None: ...
    def error(self, message: str, detail: str = "") -> None: ...
    def close(self) -> None: ...


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

class Orchestrator:
    """Drives the agentic plan→act→observe loop for one support session.

    A single ``Orchestrator`` instance is created per conversation.  The
    ``Memory`` object accumulates context across multiple ``handle_turn``
    calls, so the agent remembers what happened earlier in the same session.

    Args:
        bedrock:   ``BedrockClient`` instance (injected for testability).
        registry:  Pre-populated ``ToolRegistry`` (injected for testability).
        tracer:    Tracer instance for structured JSONL logging.  A no-op
                   tracer is used if ``None`` is provided.
        approver:  Default approver callback for high-risk tools.  Can be
                   overridden per-turn via ``handle_turn(approver=...)``.
    """

    def __init__(
        self,
        bedrock: BedrockClient,
        registry: ToolRegistry,
        tracer: object | None = None,
        approver: ApproverFn | None = None,
    ) -> None:
        self.bedrock = bedrock
        self.registry = registry
        self.tracer: _TracerProtocol = tracer or _NullTracer()  # type: ignore[assignment]
        self.memory = Memory()
        self._default_approver = approver
        # Critic is only active when a real BedrockClient is available
        self.critic: Critic | None = Critic(bedrock) if bedrock is not None else None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def handle_turn(
        self,
        user_message: str,
        approver: ApproverFn | None = None,
        event_hook: EventHookFn | None = None,
    ) -> str:
        """Process one customer message through the full agentic loop.

        Args:
            user_message: The raw text of the customer's (or rep's) message.
            approver:     Per-turn override for the high-risk tool approver.
                          Falls back to the instance-level default if omitted.
            event_hook:   Optional ``(event_type: str, data: dict) -> None``
                          callback fired for notable mid-loop events.  The CLI
                          uses this to display tool calls and critic results in
                          real time.  Supported event types:
                          ``"tool_call"``, ``"tool_result"``, ``"critic"``.

        Returns:
            The final assistant response string, ready to be displayed to the rep.
        """
        with self._lock:
            effective_approver = approver or self._default_approver
    
            logger.info("Starting handle_turn. Lock acquired.")
            self.memory.append_user(user_message)
            self.tracer.user_message(user_message)
    
            iteration = 0
            tool_calls_this_turn = 0
            tokens_this_turn = 0
    
            while iteration < config.MAX_AGENT_ITERATIONS:
                iteration += 1
                self.tracer.log(
                    "plan_step",
                    {
                        "iteration": iteration,
                        "tool_calls_so_far": tool_calls_this_turn,
                        "tokens_so_far": tokens_this_turn,
                    },
                )
                if event_hook:
                    event_hook("plan_step", {"iteration": iteration})
    
                # ----------------------------------------------------------------
                # Call Bedrock
                # ----------------------------------------------------------------
                logger.info("Iteration %d: invoking Bedrock. Tool calls so far: %d, tokens so far: %d", iteration, tool_calls_this_turn, tokens_this_turn)
                try:
                    response = self.bedrock.invoke(
                        system=PLANNER_SYSTEM_PROMPT,
                        messages=self.memory.to_messages(),
                        tools=self.registry.all_specs(),
                    )
                except BedrockError as exc:
                    self.tracer.error("Bedrock invocation failed", str(exc))
                    logger.error("Bedrock error on iteration %d: %s", iteration, exc, exc_info=True)
                    fallback = (
                        "I'm unable to process the request right now due to a service error. "
                        "Please try again in a moment."
                    )
                    self.memory.append_assistant_content([{"text": fallback}])
                    self.tracer.assistant_message(fallback)
                    return fallback
                except Exception as exc:
                    self.tracer.error("Unexpected error invoking Bedrock", str(exc))
                    logger.error("Unexpected error calling Bedrock on iteration %d: %s", iteration, exc, exc_info=True)
                    fallback = (
                        "An unexpected error occurred during reasoning. "
                        "Please try again in a moment."
                    )
                    self.memory.append_assistant_content([{"text": fallback}])
                    self.tracer.assistant_message(fallback)
                    return fallback
    
                self.tracer.llm_response(response)
    
                # Accumulate token usage for soft budget tracking
                usage = response.get("usage", {})
                tokens_this_turn += (
                    usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
                )
                if tokens_this_turn > config.MAX_TOKENS_PER_TURN:
                    self.tracer.log(
                        "budget_exhausted",
                        {"reason": "token_soft_budget", "tokens": tokens_this_turn},
                    )
                    logger.warning(
                        "Token soft budget exceeded: %d > %d",
                        tokens_this_turn,
                        config.MAX_TOKENS_PER_TURN,
                    )
    
                stop_reason = response["stop_reason"]
                if response.get("tool_uses"):
                    stop_reason = "tool_use"
    
                # ----------------------------------------------------------------
                # end_turn — LLM produced a final text response
                # ----------------------------------------------------------------
                if stop_reason == "end_turn":
                    draft = response["text"]
    
                    # ----------------------------------------------------------------
                    # Critic step — validate draft for uncited factual claims
                    # ----------------------------------------------------------------
                    if self.critic is not None:
                        critique = self.critic.review(draft, self.memory.evidence_log)
                        self.tracer.critic(critique.model_dump())
                        if event_hook:
                            event_hook("critic", critique.model_dump())
                        if not critique.passed:
                            self.memory.append_system_reminder(
                                f"Your previous response failed the factual audit. "
                                f"Feedback: {critique.feedback} "
                                f"Uncited claims: {critique.uncited_claims}. "
                                "Please revise your response to cite every factual claim "
                                "using [tool:name] or [kb:filename] inline."
                            )
                            continue  # loop back for a corrected response
    
                    self.memory.append_assistant_content(response["content"])
                    self.tracer.assistant_message(draft)
                    logger.info("Finished turn gracefully. Returning draft.")
                    return draft
    
                # ----------------------------------------------------------------
                # tool_use — LLM wants to invoke one or more tools
                # ----------------------------------------------------------------
                if stop_reason == "tool_use":
                    # Preserve the full assistant message (includes toolUse blocks)
                    # BEFORE executing tools, as required by Bedrock Converse.
                    self.memory.append_assistant_content(response["content"])
    
                    tool_result_blocks: list[dict] = []
    
                    for tool_use in response["tool_uses"]:
                        tool_use_id: str = tool_use["tool_use_id"]
                        tool_name: str = tool_use["name"]
                        tool_inputs: dict = tool_use["input"]
    
                        if tool_calls_this_turn >= config.MAX_TOOL_CALLS_PER_TURN:
                            # Budget exhausted — still supply a toolResult so Bedrock
                            # doesn't reject the conversation for a missing entry.
                            self.tracer.budget_exhausted(
                                f"tool_call_budget: skipping {tool_name}"
                            )
                            tool_result_blocks.append(
                                _make_tool_result(
                                    tool_use_id,
                                    success=False,
                                    content=(
                                        "Tool call budget exhausted for this turn. "
                                        "No further tool calls are allowed."
                                    ),
                                )
                            )
                            continue
    
                        # Notify CLI before execution so the rep sees what's happening
                        if event_hook:
                            event_hook("tool_call", {"name": tool_name, "inputs": tool_inputs, "id": tool_use_id})
    
                        # Execute the tool (includes risk-tier gating)
                        try:
                            result: ToolResult = self.registry.execute(
                                tool_name, tool_inputs, approver=effective_approver
                            )
                        except KeyError:
                            logger.exception("Unknown tool requested: %s", tool_name)
                            self.tracer.error(
                                f"Unknown tool requested: {tool_name}",
                                f"inputs={tool_inputs}",
                            )
                            result = ToolResult(
                                success=False,
                                data=None,
                                error=f"Tool '{tool_name}' is not registered.",
                                latency_ms=0,
                                tool_name=tool_name,
                            )
                        except Exception as exc:
                            logger.exception("Unhandled error executing tool '%s'", tool_name)
                            self.tracer.error(
                                f"Exception executing tool: {tool_name}",
                                f"error={exc!r}",
                            )
                            result = ToolResult(
                                success=False,
                                data=None,
                                error=f"An unexpected error occurred while executing '{tool_name}': {exc}",
                                latency_ms=0,
                                tool_name=tool_name,
                            )
    
                        tool_calls_this_turn += 1
                        self.tracer.tool_call(tool_use, result.model_dump())
    
                        # Notify CLI of result
                        if event_hook:
                            event_hook("tool_result", {
                                "name": tool_name,
                                "id": tool_use_id,
                                "latency_ms": result.latency_ms,
                                "success": result.success,
                                "result": result.model_dump(),
                            })
    
                        # Record successful results in the evidence log
                        if result.success and result.data is not None:
                            source = "kb" if tool_name == "search_kb" else "tool"
                            self.memory.record_evidence(
                                source=source,
                                ref=tool_name,
                                content=result.data,
                            )
    
                        tool_result_blocks.append(
                            _make_tool_result(
                                tool_use_id,
                                success=result.success,
                                content=result.data if result.success else result.error,
                            )
                        )
    
                    self.memory.append_tool_results(tool_result_blocks)
                    continue
    
                # ----------------------------------------------------------------
                # Unexpected stop reason (max_tokens, etc.)
                # ----------------------------------------------------------------
                self.tracer.log("abnormal_stop", {"stop_reason": stop_reason})
                logger.warning("Unexpected stop reason from Bedrock: %s", stop_reason)
                break
    
            # --------------------------------------------------------------------
            # Iteration budget exhausted — graceful degradation
            # --------------------------------------------------------------------
            evidence_summary = self.memory.summarize_evidence()
            fallback = (
                "<analysis>\n"
                "I've reached my reasoning limit for this turn. "
                "Here's what I've gathered so far:\n\n"
                f"{evidence_summary}\n"
                "</analysis>\n"
                "<reply>\n"
                "I'm still looking into this for you. Give me just another moment while I review the diagnostics.\n"
                "</reply>"
            )
            self.tracer.budget_exhausted("iteration_budget")
            self.memory.append_assistant_content([{"text": fallback}])
            self.tracer.assistant_message(fallback)
            return fallback


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _make_tool_result(
    tool_use_id: str,
    success: bool,
    content: object,
) -> dict:
    """Build a Bedrock Converse ``toolResult`` content block.

    The Bedrock Converse API requires that every ``toolUse`` block in the
    previous assistant message has a corresponding ``toolResult`` in the
    next user message.  This helper normalises the content value to the
    correct block format (``{"json": ...}`` for dicts/lists,
    ``{"text": ...}`` for everything else).
    """
    status = "success" if success else "error"

    if isinstance(content, dict):
        content_blocks: list[dict] = [{"json": content}]
    elif isinstance(content, list):
        # Wrap lists so the JSON content is always an object at the top level
        content_blocks = [{"json": {"results": content}}]
    elif content is None:
        content_blocks = [{"text": "No data returned."}]
    else:
        content_blocks = [{"text": str(content)}]

    return {
        "toolResult": {
            "toolUseId": tool_use_id,
            "content": content_blocks,
            "status": status,
        }
    }


# ---------------------------------------------------------------------------
# Null tracer (used when no tracer is provided)
# ---------------------------------------------------------------------------

class _NullTracer:
    """No-op tracer used when the caller does not supply a real Tracer."""

    filepath: str = ""

    def log(self, event: str, data: dict) -> None:  # noqa: ARG002
        pass

    def user_message(self, text: str) -> None:
        pass

    def llm_response(self, response: dict) -> None:
        pass

    def tool_call(self, tool_use: dict, result: object) -> None:
        pass

    def critic(self, critique: dict) -> None:
        pass

    def assistant_message(self, text: str) -> None:
        pass

    def budget_exhausted(self, reason: str) -> None:
        pass

    def error(self, message: str, detail: str = "") -> None:
        pass

    def close(self) -> None:
        pass


# ---------------------------------------------------------------------------
# Integration test entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    """Quick integration test: single turn end-to-end.

    Requires: AWS credentials + Bedrock model access (Haiku 4.5).
    Run from the project root::

        python -m agent.orchestrator
    """
    import sys

    from rich.console import Console

    from observability.tracer import Tracer
    from tools import build_default_registry

    console = Console()

    # Disable random failures so tool calls always succeed
    config.SIMULATE_TOOL_FAILURES = False

    registry = build_default_registry()
    bedrock = BedrockClient()
    tracer = Tracer()

    def auto_approve(tool: Tool, inputs: dict) -> bool:
        console.print(
            f"  [yellow]Auto-approving high-risk tool:[/yellow] {tool.name} "
            f"inputs={inputs}"
        )
        return True

    orch = Orchestrator(
        bedrock=bedrock,
        registry=registry,
        tracer=tracer,
        approver=auto_approve,
    )

    test_message = (
        "Hi, my internet has been really slow since this morning "
        "and the WiFi keeps dropping. My customer ID is CUST001."
    )

    console.rule("[bold cyan]Orchestrator Integration Test[/bold cyan]")
    console.print(f"[bold]Customer:[/bold] {test_message}")
    console.print()
    console.print("[dim]Running agentic loop...[/dim]")
    console.print()

    final_response = orch.handle_turn(test_message, approver=auto_approve)

    console.rule("[bold green]Final Response[/bold green]")
    console.print(final_response)
    console.print()
    console.print(f"[dim]Trace written to: {tracer.filepath}[/dim]")
    console.print(
        f"[dim]Evidence entries: {len(orch.memory.evidence_log)}[/dim]"
    )
    tracer.close()

    console.rule("[bold green]Integration test complete[/bold green]")
    sys.exit(0)
