"""
Configuration for the Tech Support Copilot POC.

All settings can be overridden via environment variables or a .env file.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# AWS / Bedrock
# ---------------------------------------------------------------------------
AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID: str = os.getenv(
    "BEDROCK_MODEL_ID",
    "us.anthropic.claude-haiku-4-5-20251001-v1:0",
)
CUSTOMER_MODEL_ID: str = os.getenv(
    "CUSTOMER_MODEL_ID",
    "us.anthropic.claude-haiku-4-5-20251001-v1:0",
)

# ---------------------------------------------------------------------------
# Agentic loop budgets (per user turn)
# ---------------------------------------------------------------------------
MAX_AGENT_ITERATIONS: int = 6       # hard cap on plan→act→observe cycles
MAX_TOOL_CALLS_PER_TURN: int = 8
MAX_TOKENS_PER_TURN: int = 20_000   # soft budget; tracer warns if exceeded
LLM_MAX_TOKENS: int = 2048          # per Bedrock call

# ---------------------------------------------------------------------------
# Approval policy
# ---------------------------------------------------------------------------
REQUIRE_APPROVAL_FOR_MUTATING: bool = True

# ---------------------------------------------------------------------------
# Tool behaviour
# ---------------------------------------------------------------------------
SIMULATE_TOOL_FAILURES: bool = (
    os.getenv("SIMULATE_TOOL_FAILURES", "true").lower() == "true"
)
"""When True, each mock tool has a ~5 % chance of returning a simulated
transient failure.  Set to False (or SIMULATE_TOOL_FAILURES=false env var)
for deterministic smoke tests and demos."""

# ---------------------------------------------------------------------------
# Tracing
# ---------------------------------------------------------------------------
TRACE_DIR: str = "traces"

# ---------------------------------------------------------------------------
# Demo mode
# ---------------------------------------------------------------------------
DEMO_MODE: bool = True
"""Set to True before a live demo to eliminate all randomness:
  - Tool failures are disabled (overrides SIMULATE_TOOL_FAILURES)
  - LLM temperature is pinned to 0 for stable, repeatable outputs
  - Use POST /api/demo-session to start a specific golden scenario
    instead of the random customer picker.
Flip back to False for normal / exploratory use."""
