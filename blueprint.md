# Agentic Tech Support Copilot — POC Blueprint

> **Purpose**: This document is the authoritative spec for building a Proof-of-Concept (POC) of an agentic tech support copilot. It is intended to be handed to an LLM (Claude Sonnet 4.6) as the implementation brief.
> **Target runtime**: Local Python app calling **Claude Haiku 4.5 via AWS Bedrock** using AWS CLI credentials.

---

## 1. POC Scope & Goals

### 1.1 In Scope
- A **local Python application** simulating a tech support call, with a **FastAPI backend**.
- **Next.js Web UI** for the rep's cockpit, communicating with the backend via SSE/WebSockets.
- **Agentic loop** (plan → act → observe → reflect) — not single-shot inference.
- **Pluggable tool abstraction layer** so tools can be swapped/added easily.
- **Mocked tools** for network checks, outage checks, KB search, CRM lookup, ticket history.
- **Live conversation handling**: user types customer messages; agent responds as the rep's copilot (suggesting actions + answers, running tools).
- **Multi-step reasoning**: the agent may call several tools across several turns before answering.
- **Citations**: every factual claim must cite the tool result or KB doc it came from.
- **Tracing/logging**: every step (plan, tool call, observation, reflection) logged to a file for inspection.
- **Risk-tiered tool execution**: read-only tools auto-run; mutating tools require explicit human approval via CLI prompt.
- **Hallucination guardrail**: a critic step validates claims before surfacing.
- **Cost/latency budget per turn** to prevent runaway loops.

### 1.2 Out of Scope (Parked for Later)
- Real speech-to-text / live transcription
- Real network tool integrations (SolarWinds, Datadog, etc.)
- Multi-agent decomposition (single orchestrator agent for POC)
- Learned playbooks / fine-tuning
- Proactive cross-call pattern detection
- Customer-facing self-service variant
- Post-call summarization & KB update suggestions (stretch goal only)

### 1.3 Things From the "Missed" List Included in POC
1. **Hallucination guardrail** (critic step with citation enforcement)
2. **Human-in-the-loop gating by risk tier** (mutating tools require approval)
3. **Cost & latency budget per turn** (hard caps on iterations & tokens)
4. **Observability** (structured trace log per conversation)
5. **Graceful degradation** (simulated tool failures handled cleanly)

All other "missed" items parked.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Web UI (copilot-ui)                   │
│  - Next.js + Tailwind + Zustand + SSE Client            │
│  - Displays agent suggestions, tool calls, approvals    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / SSE
┌───────────────────────▼─────────────────────────────────┐
│                   FastAPI (server.py)                   │
│  - Accepts HTTP/SSE connection                          │
│  - Bridges UI to the Agentic Orchestrator               │
│  - Fallback CLI Interface (main.py) still available     │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│             Orchestrator (agent/orchestrator.py)        │
│  - Agentic loop: plan → act → observe → reflect         │
│  - Manages working memory & budgets                     │
│  - Calls Bedrock (Haiku 4.5)                            │
└───────┬────────────────────────────┬────────────────────┘
        │                            │
┌───────▼────────────┐   ┌───────────▼─────────────────┐
│  Critic            │   │  Tool Registry              │
│  (agent/critic.py) │   │  (tools/registry.py)        │
│  - Validates       │   │  - Pluggable adapters       │
│    citations       │   │  - Risk tiers               │
│  - Flags           │   │  - JSON schemas             │
│    hallucinations  │   └───────────┬─────────────────┘
└────────────────────┘               │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐   ┌──────▼──────┐  ┌──────▼──────┐
              │ Network   │   │ KB Search   │  │ CRM/Ticket  │
              │ Tools     │   │ (mock)      │  │ (mock)      │
              │ (mock)    │   │             │  │             │
              └───────────┘   └─────────────┘  └─────────────┘

┌─────────────────────────────────────────────────────────┐
│  Bedrock Client (llm/bedrock_client.py)                 │
│  - Uses boto3 with AWS CLI credentials                  │
│  - Model: anthropic.claude-haiku-4-5-20251001-v1:0      │
│  - Handles tool-use / function calling format           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Tracer (observability/tracer.py)                       │
│  - Writes structured JSONL trace per conversation       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
copilot-ui/                         # Next.js frontend
├── app/
├── components/
├── hooks/
├── lib/
├── store/
├── tailwind.config.ts
└── package.json

tech-support-copilot-poc/
├── README.md
├── requirements.txt
├── .env.example
├── config.py
├── server.py                       # FastAPI SSE server
├── main.py                         # CLI entry point
│
├── llm/
│   ├── __init__.py
│   └── bedrock_client.py           # Bedrock API wrapper
│
├── agent/
│   ├── __init__.py
│   ├── orchestrator.py             # Main agentic loop
│   ├── planner.py                  # Plan generation / update
│   ├── critic.py                   # Hallucination + citation check
│   ├── memory.py                   # Working memory & evidence log
│   └── prompts.py                  # All system prompts
│
├── tools/
│   ├── __init__.py
│   ├── base.py                     # Tool ABC, risk tiers, schemas
│   ├── registry.py                 # Tool registration + dispatch
│   ├── network_tools.py            # ping, traceroute, modem status (mock)
│   ├── outage_tools.py             # ISP outage, downdetector (mock)
│   ├── kb_tools.py                 # KB search (mock with seeded docs)
│   ├── crm_tools.py                # Customer lookup, ticket history (mock)
│   └── mutating_tools.py           # Remote reboot, send SMS (mock, needs approval)
│
├── observability/
│   ├── __init__.py
│   └── tracer.py                   # JSONL trace writer
│
├── data/
│   ├── kb/                         # Seeded KB markdown files
│   │   ├── modem_reboot.md
│   │   ├── dns_issues.md
│   │   ├── slow_speeds.md
│   │   └── ...
│   └── mock_customers.json         # Fake customer data
│
└── traces/                         # Runtime trace output
    └── .gitkeep
```

---

## 4. Dependencies (`requirements.txt`)

```
boto3>=1.34.0
pydantic>=2.5.0
python-dotenv>=1.0.0
rich>=13.7.0          # Pretty CLI output
```

No LangChain / LangGraph for POC — keep it minimal and transparent.

---

## 5. Configuration (`config.py`)

```python
import os
from dotenv import load_dotenv
load_dotenv()

# AWS / Bedrock
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv(
    "BEDROCK_MODEL_ID",
    "anthropic.claude-haiku-4-5-20251001-v1:0"  # confirm exact ID at runtime
)

# Agentic loop budgets (per user turn)
MAX_AGENT_ITERATIONS = 6          # hard cap on plan→act→observe cycles
MAX_TOOL_CALLS_PER_TURN = 8
MAX_TOKENS_PER_TURN = 20000       # soft budget; tracer warns if exceeded
LLM_MAX_TOKENS = 2048             # per Bedrock call

# Approval policy
REQUIRE_APPROVAL_FOR_MUTATING = True

# Tracing
TRACE_DIR = "traces"
```

`.env.example`:
```
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5-20251001-v1:0
```

AWS credentials resolved automatically from `~/.aws/credentials` (AWS CLI).

---

## 6. Bedrock Client (`llm/bedrock_client.py`)

### Responsibilities
- Wrap `boto3.client("bedrock-runtime")`.
- Use **Converse API** (preferred) for unified tool-use across Anthropic models.
- Expose a single `invoke(messages, system, tools=None)` method returning a normalized response dict.

### Interface
```python
class BedrockClient:
    def __init__(self, model_id: str, region: str): ...
    
    def invoke(
        self,
        system: str,
        messages: list[dict],       # [{"role": "user"|"assistant", "content": [...]}]
        tools: list[dict] | None = None,   # Bedrock Converse tool schema
        max_tokens: int = 2048,
        temperature: float = 0.2,
    ) -> dict:
        """
        Returns:
        {
          "stop_reason": "end_turn" | "tool_use" | "max_tokens",
          "content": [...],          # raw content blocks
          "tool_uses": [              # parsed convenience
            {"tool_use_id": str, "name": str, "input": dict}
          ],
          "text": str,                # concatenated text blocks
          "usage": {"input_tokens": int, "output_tokens": int}
        }
        """
```

### Notes for Implementation
- Use `bedrock.converse(...)` with `toolConfig={"tools": [...]}`.
- Follow Bedrock Converse tool-use spec: `toolUse` / `toolResult` content blocks.
- Retry with exponential backoff on `ThrottlingException` (3 retries max).
- On any other exception: raise a typed `BedrockError` so orchestrator can degrade gracefully.

---

## 7. Tool Abstraction Layer

### 7.1 `tools/base.py`

```python
from abc import ABC, abstractmethod
from enum import Enum
from pydantic import BaseModel
from typing import Any

class RiskTier(str, Enum):
    READ_ONLY = "read_only"          # auto-run
    LOW_RISK_MUTATING = "low_risk"   # auto-run, logged
    HIGH_RISK_MUTATING = "high_risk" # requires human approval

class ToolResult(BaseModel):
    success: bool
    data: Any
    error: str | None = None
    latency_ms: int
    tool_name: str

class Tool(ABC):
    name: str
    description: str
    input_schema: dict                # JSON Schema
    risk_tier: RiskTier

    @abstractmethod
    def execute(self, **kwargs) -> ToolResult: ...

    def to_bedrock_spec(self) -> dict:
        """Return Bedrock Converse tool spec."""
        return {
            "toolSpec": {
                "name": self.name,
                "description": self.description,
                "inputSchema": {"json": self.input_schema},
            }
        }
```

### 7.2 `tools/registry.py`

```python
class ToolRegistry:
    def __init__(self): self._tools: dict[str, Tool] = {}
    def register(self, tool: Tool): self._tools[tool.name] = tool
    def get(self, name: str) -> Tool: return self._tools[name]
    def all_specs(self) -> list[dict]:
        return [t.to_bedrock_spec() for t in self._tools.values()]
    def execute(self, name: str, inputs: dict, approver=None) -> ToolResult:
        tool = self.get(name)
        if tool.risk_tier == RiskTier.HIGH_RISK_MUTATING:
            if approver is None or not approver(tool, inputs):
                return ToolResult(success=False, data=None,
                                  error="Rejected by human approver",
                                  latency_ms=0, tool_name=name)
        return tool.execute(**inputs)
```

### 7.3 Mock Tools to Implement

Each tool returns realistic synthetic data. Add `random.random() < 0.05` simulated failures to test graceful degradation.

| Tool Name | Module | Risk Tier | Returns |
|---|---|---|---|
| `ping_customer_modem` | network_tools | READ_ONLY | latency_ms, packet_loss, status |
| `check_modem_status` | network_tools | READ_ONLY | online/offline, uptime, signal |
| `run_traceroute` | network_tools | READ_ONLY | hops list |
| `check_isp_outage` | outage_tools | READ_ONLY | outage_active, affected_zips, eta |
| `check_downdetector` | outage_tools | READ_ONLY | report_spike, service, region |
| `search_kb` | kb_tools | READ_ONLY | list of {doc_id, title, snippet, score} |
| `lookup_customer` | crm_tools | READ_ONLY | customer profile |
| `get_ticket_history` | crm_tools | READ_ONLY | recent tickets |
| `reboot_modem_remotely` | mutating_tools | HIGH_RISK_MUTATING | success, new status |
| `send_sms_to_customer` | mutating_tools | HIGH_RISK_MUTATING | message_id |

### 7.4 KB Seed Data (`data/kb/`)

Create 6–8 markdown files covering common issues: modem reboot steps, DNS issues, slow speeds, WiFi vs ethernet, account suspension, outage communication template, password reset, device compatibility. `search_kb` does simple keyword/substring matching over these files — good enough for POC.

---

## 8. Agent Orchestrator

### 8.1 Agentic Loop (`agent/orchestrator.py`)

Pseudocode:
```
function handle_turn(user_message):
    memory.append_user(user_message)
    iteration = 0
    tool_calls_this_turn = 0

    while iteration < MAX_AGENT_ITERATIONS:
        iteration += 1
        trace.log("plan_step", {iteration})

        response = bedrock.invoke(
            system=PLANNER_SYSTEM_PROMPT,
            messages=memory.to_messages(),
            tools=registry.all_specs()
        )
        trace.log("llm_response", response)

        if response.stop_reason == "end_turn":
            draft_answer = response.text
            # Critic step
            critique = critic.review(draft_answer, memory.evidence_log)
            trace.log("critic", critique)
            if critique.passed:
                memory.append_assistant(draft_answer)
                return draft_answer
            else:
                # Feed critique back as a user-role reminder, loop again
                memory.append_system_reminder(critique.feedback)
                continue

        if response.stop_reason == "tool_use":
            for tool_use in response.tool_uses:
                if tool_calls_this_turn >= MAX_TOOL_CALLS_PER_TURN:
                    memory.append_tool_budget_exhausted()
                    break
                result = registry.execute(
                    tool_use.name,
                    tool_use.input,
                    approver=cli_approver   # prompts user for high-risk
                )
                tool_calls_this_turn += 1
                memory.append_tool_result(tool_use, result)
                trace.log("tool_call", {tool_use, result})
            continue

        # stop_reason == "max_tokens" or unknown
        trace.log("abnormal_stop", response.stop_reason)
        break

    # Budget exhausted
    fallback = "I've gathered partial information but need more steps. Here's what I have so far: " + memory.summarize_evidence()
    memory.append_assistant(fallback)
    return fallback
```

### 8.2 Memory (`agent/memory.py`)
- `messages`: full conversation (user, assistant, tool_use, tool_result blocks).
- `evidence_log`: list of `{source: "tool"|"kb", ref: <id>, content: <data>, timestamp}` — every fact the agent has learned.
- `summarize_evidence()`: compresses to bullet points for fallback responses.

### 8.3 Critic (`agent/critic.py`)

```python
class CritiqueResult(BaseModel):
    passed: bool
    feedback: str
    uncited_claims: list[str]

def review(draft_answer: str, evidence_log: list[dict]) -> CritiqueResult:
    # Use Bedrock with a dedicated CRITIC_SYSTEM_PROMPT.
    # The critic receives the draft + evidence_log and must output JSON:
    #   {"passed": bool, "uncited_claims": [...], "feedback": "..."}
    # If any factual-sounding claim lacks support in evidence_log, passed=false.
```

Critic prompt principles:
- "A factual claim is anything about the customer's network status, account, outages, or specific remediation steps."
- "Generic empathy / clarifying questions do not require citations."
- "If uncertain, err toward failing the check."

### 8.4 Prompts (`agent/prompts.py`)

**PLANNER_SYSTEM_PROMPT** (sketch — Sonnet should expand):
```
You are a tech support copilot assisting a human customer service representative.
The rep is on a live call with a customer. Your job:

1. Understand the customer's issue from the conversation.
2. Proactively use tools to gather diagnostic evidence BEFORE answering.
3. Search the knowledge base for relevant procedures.
4. Propose a clear next action or answer for the rep to deliver.

Rules:
- PREFER tools over guessing. If you haven't checked it, you don't know it.
- Every factual claim in your final answer must be traceable to a tool result or KB doc.
- Cite sources inline like [modem_status] or [kb:modem_reboot.md].
- For high-risk actions (remote reboot, sending SMS), propose them and wait for approval — do not assume success.
- If a tool fails, acknowledge it and try an alternative or say what you couldn't verify.
- Keep responses focused on what the REP should say or do next.
- Budget: you have up to {MAX_AGENT_ITERATIONS} reasoning cycles and {MAX_TOOL_CALLS_PER_TURN} tool calls per turn.

Available tools are provided via the tool interface.
```

**CRITIC_SYSTEM_PROMPT** (sketch):
```
You are a strict factual auditor. Given a draft response and an evidence log,
determine if every factual claim in the draft is supported by the evidence.

Output ONLY valid JSON:
{
  "passed": boolean,
  "uncited_claims": [list of strings — claims without support],
  "feedback": "Brief instruction to the author on how to fix it, or 'OK'."
}

Rules:
- Clarifying questions, empathy, and generic advice do NOT need citations.
- Specific claims about this customer's account, network, outages, or exact procedures DO need citations.
- If the draft says "try rebooting" generically, that's fine.
- If it says "your modem is offline" without a modem_status tool result, that's a hallucination.
```

---

## 9. CLI (`main.py`)

### Behavior
- On start: print banner, load tools, initialize tracer with timestamped filename.
- Read customer messages from `stdin` in a loop (prompt: `Customer> `).
- For each message:
  1. Print `[Agent thinking...]`.
  2. Run orchestrator.
  3. Stream intermediate events (tool calls, approvals) using `rich` for color:
     - `🔧 Tool call: ping_customer_modem({"customer_id": ...})`
     - `✅ Result: latency=23ms, loss=0%`
     - `⚠️  Approval required for: reboot_modem_remotely — approve? [y/N]`
     - `🧐 Critic: PASSED / FAILED + reason`
  4. Print final suggestion: `Rep Suggestion> ...`
- Special commands:
  - `/trace` — print current trace file path
  - `/evidence` — dump evidence log
  - `/quit` — exit

### Approval Prompt
```python
def cli_approver(tool, inputs) -> bool:
    console.print(f"[yellow]⚠ High-risk tool: {tool.name}[/yellow]")
    console.print(f"Inputs: {inputs}")
    return console.input("Approve? [y/N]: ").lower() == "y"
```

---

## 10. Tracing (`observability/tracer.py`)

- One JSONL file per conversation: `traces/conv_YYYYMMDD_HHMMSS.jsonl`.
- Each line: `{"ts": ISO8601, "event": <type>, "data": {...}}`.
- Event types: `session_start`, `user_message`, `plan_step`, `llm_response`, `tool_call`, `tool_result`, `approval_prompt`, `approval_decision`, `critic`, `assistant_message`, `budget_exhausted`, `error`, `session_end`.
- Include token usage on every `llm_response`.

---

## 11. Demo Scenario (Include in README)

Walk-through the POC should handle end-to-end:

> **Customer**: "Hi, my internet has been really slow since this morning and the WiFi keeps dropping."

Expected agent behavior:
1. Calls `lookup_customer` (need customer_id — agent should ask rep for it first OR use a default demo customer).
2. Calls `check_isp_outage` for customer's region.
3. Calls `check_modem_status` and `ping_customer_modem` in parallel.
4. Calls `search_kb` with "slow speeds wifi dropping".
5. Synthesizes: "Based on modem status [modem_status: signal=weak] and KB [kb:slow_speeds.md], the likely cause is signal degradation. Recommended: walk customer through modem reboot. No active outage in their area [isp_outage: none]."
6. If rep then says "let's do the reboot", agent proposes `reboot_modem_remotely` — **approval prompt fires**.
7. On approval, tool runs, agent confirms: "Modem rebooted, now reporting signal=strong [modem_status]."

---

## 12. Acceptance Criteria for POC

- [ ] Runs locally with `uvicorn server:app --port 8000 --reload` (backend) AND `npm run dev` (frontend) using AWS CLI credentials.
- [ ] Successfully completes the demo scenario via the `copilot-ui` interface.
- [ ] Agent makes **at least 3 tool calls** across the scenario (proves agentic, not single-shot).
- [ ] High-risk tool triggers approval prompt; rejection is handled gracefully.
- [ ] Critic catches at least one hallucination in a contrived test (e.g., manually delete evidence and see if it's flagged).
- [ ] Iteration budget exhaustion produces graceful fallback (test by setting `MAX_AGENT_ITERATIONS=2`).
- [ ] Simulated tool failure (forced) produces acknowledgment, not crash.
- [ ] Full trace JSONL is written and re-readable.
- [ ] Adding a new mock tool requires only: create class in `tools/`, register in `registry`. No orchestrator changes.

---

## 13. Implementation Order (Suggested for Sonnet)

1. Scaffold project structure + `requirements.txt` + `config.py`.
2. `bedrock_client.py` with a simple smoke test (`if __name__ == "__main__": invoke hello`).
3. `tools/base.py` + `tools/registry.py`.
4. 2–3 mock read-only tools + seeded KB files.
5. `memory.py` + minimal `orchestrator.py` (no critic yet) — end-to-end single loop with tools.
6. Add CLI (`main.py`) and tracing.
7. Add critic step.
8. Add high-risk mutating tools + approval flow.
9. Add budget enforcement + graceful degradation.
10. Polish demo scenario, write README with run instructions.

---

## 14. README Must Include

- Prereqs: Python 3.11+, Node.js (for Next.js UI), AWS CLI configured, Bedrock model access enabled for Haiku 4.5 in target region.
- Backend Setup: `pip install -r requirements.txt`, copy `.env.example` to `.env`.
- Frontend Setup: cd into `copilot-ui` and run `npm install`.
- Run Backend: `uvicorn server:app --port 8000 --reload` (or `python main.py` for CLI fallback).
- Run Frontend: `npm run dev` in the `copilot-ui` directory.
- How to add a new tool (3-step guide).
- How to read a trace file.
- Known limitations (everything in §1.2).

---

## 15. Style & Code Quality Guidance for Sonnet

- Python 3.11+, type hints everywhere, `pydantic` for data models.
- Keep files small & focused; prefer composition over inheritance beyond the `Tool` ABC.
- No silent except blocks — all errors log to tracer.
- Docstrings on every public class/function.
- Deterministic where possible: mock tool data seeded with fixed random seed in demo mode.
- No over-engineering: this is a POC. Skip tests beyond a smoke test; no Docker; no CI.

---

**End of blueprint.** Hand this file to Sonnet 4.6 as the implementation specification.