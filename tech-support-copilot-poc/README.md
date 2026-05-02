# Tech Support Copilot — POC

An agentic AI copilot that assists a customer service representative on a live support call. The agent uses Claude Haiku 4.5 (via AWS Bedrock) to plan, call mock diagnostic tools, validate its own responses, and propose next actions — all in a single CLI session.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Python 3.11+ | Check with `python --version` |
| AWS CLI configured | Run `aws configure` or set `~/.aws/credentials` |
| Bedrock model access | Enable `anthropic.claude-haiku-4-5-20251001-v1:0` in the [Bedrock console](https://console.aws.amazon.com/bedrock) for your region |

---

## Setup

```bash
# 1. Clone / navigate to the project
cd tech-support-copilot-poc

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment (optional — defaults work with AWS CLI credentials)
cp .env.example .env
# Edit .env if you need a non-default region or model ID
```

---

## Run

```bash
python main.py
```

The prompt `Customer>` accepts the text the customer just said. Type the customer's message and press Enter. The agent will:

1. Call diagnostic tools (modem status, outage check, KB search, etc.)
2. Validate its response with a critic step (hallucination guardrail)
3. Print a colour-coded suggestion under **Rep Suggestion**

### Special commands

| Command | Action |
|---|---|
| `/trace` | Print the path of the current JSONL trace file |
| `/evidence` | Dump all evidence gathered this session |
| `/quit` | End the session |

---

## Demo Scenario (Slow Internet)

The following walkthrough covers the primary acceptance scenario end-to-end.

### Step 1 — Start the session

```
python main.py
```

### Step 2 — Enter the customer's opening message

```
Customer> Hi, my internet has been really slow since this morning and the WiFi keeps dropping. My customer ID is CUST001.
```

**What happens:**
- Agent calls `lookup_customer(CUST001)` — retrieves Jane Smith's account (Gigabit 500, active)
- Agent calls `check_isp_outage` — confirms no active outage for zip 10001
- Agent calls `check_modem_status(CUST001)` — checks signal levels and uptime
- Agent calls `ping_customer_modem(CUST001)` — measures latency and packet loss
- Agent calls `search_kb("slow speeds wifi dropping")` — finds `slow_speeds.md` and `wifi_vs_ethernet.md`
- Critic validates citations before surfacing the answer
- **Rep Suggestion** appears with a concrete next step, all claims cited

Example response excerpt:
```
Based on diagnostics, the customer's modem shows degraded downstream signal
[tool:check_modem_status] and elevated packet loss [tool:ping_customer_modem].
No active outage is affecting their area [tool:check_isp_outage].

Recommended: walk the customer through a manual modem reboot (unplug power
for 30 seconds). See [kb:modem_reboot.md] for the exact script.
```

### Step 3 — Trigger the remote reboot (high-risk approval flow)

```
Customer> Let's do the remote reboot — she agrees.
```

The agent proposes `reboot_modem_remotely`. Because this is a **high-risk tool**, an approval prompt fires in the CLI:

```
╭─ ⚠  High-risk tool approval required ──────────────────────╮
│ Tool:        reboot_modem_remotely                          │
│ Inputs:      {"customer_id": "CUST001"}                     │
│ Description: Remotely reboot the customer's modem ...       │
╰─────────────────────────────────────────────────────────────╯
  Approve? [y/N]:
```

- Type `y` → modem reboots, agent confirms success with new signal reading
- Type `n` or Enter → tool is rejected; agent acknowledges gracefully and suggests manual steps

---

## How to Add a New Tool

1. **Create the tool class** in `tools/<module>.py`:

```python
from tools.base import RiskTier, Tool, ToolResult, _maybe_fail
import time

class MyNewTool(Tool):
    name = "my_new_tool"
    description = "What it does, written for the LLM."
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {"type": "string", "description": "Customer ID."},
        },
        "required": ["customer_id"],
    }

    def execute(self, customer_id: str) -> ToolResult:
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail
        # ... your logic here ...
        return ToolResult(
            success=True,
            data={"result": "value"},
            latency_ms=int((time.monotonic() - start) * 1000),
            tool_name=self.name,
        )
```

2. **Register it** in `tools/__init__.py`:

```python
from tools.my_module import MyNewTool

def build_default_registry() -> ToolRegistry:
    registry = ToolRegistry()
    for tool in [
        ...,
        MyNewTool(),   # ← add here
    ]:
        registry.register(tool)
    return registry
```

3. **Done.** No orchestrator changes needed. The registry auto-includes it in the Bedrock tool spec on the next session start.

---

## How to Read a Trace File

Each session writes a JSONL file to `traces/conv_YYYYMMDD_HHMMSS.jsonl`.  Every line is a self-contained JSON event:

```jsonl
{"ts":"2026-05-01T10:00:00Z","event":"session_start","data":{...}}
{"ts":"2026-05-01T10:00:01Z","event":"user_message","data":{"text":"my internet is slow"}}
{"ts":"2026-05-01T10:00:02Z","event":"plan_step","data":{"iteration":1,...}}
{"ts":"2026-05-01T10:00:03Z","event":"llm_response","data":{"stop_reason":"tool_use",...}}
{"ts":"2026-05-01T10:00:04Z","event":"tool_call","data":{"name":"check_modem_status",...}}
{"ts":"2026-05-01T10:00:05Z","event":"critic","data":{"passed":true,"feedback":"OK",...}}
{"ts":"2026-05-01T10:00:06Z","event":"assistant_message","data":{"text":"..."}}
```

**Quick read with Python:**

```python
import json
with open("traces/conv_YYYYMMDD_HHMMSS.jsonl") as f:
    for line in f:
        event = json.loads(line)
        print(event["event"], event["ts"])
```

**Filter for tool calls only:**

```bash
grep '"event":"tool_call"' traces/conv_*.jsonl | python -m json.tool
```

**Event types reference:**

| Event | Meaning |
|---|---|
| `session_start` | Session opened |
| `user_message` | Customer text received |
| `plan_step` | Agentic loop iteration started |
| `llm_response` | Bedrock returned a response (includes token usage) |
| `tool_call` | Tool invoked (name, inputs, result) |
| `approval_prompt` | High-risk tool approval requested |
| `approval_decision` | Operator approved or rejected |
| `critic` | Critic pass/fail result |
| `assistant_message` | Final response surfaced to rep |
| `budget_exhausted` | Iteration or token cap hit |
| `error` | Exception or degradation |
| `session_end` | Session closed |

---

## Acceptance Criteria

| # | Criterion | How to verify |
|---|---|---|
| 1 | Runs locally with `python main.py` | Start the session |
| 2 | Demo scenario completes end-to-end | Follow the demo walkthrough above |
| 3 | Agent makes ≥ 3 tool calls per turn | Check `tool_call` events in trace |
| 4 | High-risk tool triggers approval prompt | Type "let's do the reboot" |
| 5 | Rejection handled gracefully | Type `n` at the approval prompt |
| 6 | Critic catches uncited claims | Set `MAX_AGENT_ITERATIONS=2` and see trace `critic` events |
| 7 | Budget exhaustion produces fallback | Set `MAX_AGENT_ITERATIONS=1` in config.py |
| 8 | Simulated tool failure handled | Set `SIMULATE_TOOL_FAILURES=true` in `.env` |
| 9 | Full trace JSONL written | Check `traces/` after a session |
| 10 | Adding a new tool needs no orchestrator change | Follow the 3-step guide above |

---

## Configuration Reference

Key settings in `config.py` (all overridable via `.env`):

| Setting | Default | Purpose |
|---|---|---|
| `AWS_REGION` | `us-east-1` | Bedrock region |
| `BEDROCK_MODEL_ID` | `anthropic.claude-haiku-4-5-20251001-v1:0` | Model |
| `MAX_AGENT_ITERATIONS` | `6` | Hard cap on plan→act cycles per turn |
| `MAX_TOOL_CALLS_PER_TURN` | `8` | Hard cap on tool calls per turn |
| `MAX_TOKENS_PER_TURN` | `20000` | Soft token budget (warns in trace) |
| `LLM_MAX_TOKENS` | `2048` | Max tokens per Bedrock call |
| `SIMULATE_TOOL_FAILURES` | `true` | ~5% random tool failures for resilience testing |
| `TRACE_DIR` | `traces` | Output directory for JSONL trace files |

---

## Known Limitations

- **No real network integrations** — all diagnostic tools return mock data seeded with deterministic values
- **CLI only** — no web UI
- **Single agent** — no multi-agent decomposition or learned playbooks
- **No speech-to-text** — rep types customer messages manually
- **No fine-tuning** — generic Haiku 4.5 with prompt engineering only
- **No post-call summarization** — conversation ends at `/quit` with no summary exported
- **No proactive pattern detection** — each session is independent

---

## Project Structure

```
tech-support-copilot-poc/
├── main.py                    # CLI entry point
├── config.py                  # All configuration + env overrides
├── requirements.txt
├── .env.example
│
├── agent/
│   ├── orchestrator.py        # plan→act→observe agentic loop
│   ├── critic.py              # Hallucination guardrail (Bedrock-backed)
│   ├── memory.py              # Conversation history + evidence log
│   └── prompts.py             # PLANNER_SYSTEM_PROMPT + CRITIC_SYSTEM_PROMPT
│
├── llm/
│   └── bedrock_client.py      # Bedrock Converse API wrapper + retry logic
│
├── tools/
│   ├── base.py                # Tool ABC, RiskTier, ToolResult
│   ├── registry.py            # Tool registration + risk-gated dispatch
│   ├── network_tools.py       # ping, traceroute, modem status (mock)
│   ├── outage_tools.py        # ISP outage, Downdetector (mock)
│   ├── kb_tools.py            # Knowledge base search (keyword matching)
│   ├── crm_tools.py           # Customer lookup, ticket history (mock)
│   └── mutating_tools.py      # Remote reboot, SMS (mock, high-risk)
│
├── observability/
│   └── tracer.py              # JSONL structured trace writer
│
├── data/
│   ├── kb/                    # 8 seeded KB markdown documents
│   └── mock_customers.json    # 4 demo customers (CUST001–CUST004)
│
└── traces/                    # Runtime trace output (one file per session)
```
