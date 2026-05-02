"""
Smoke tests for the Tech Support Copilot POC.

Two independent sections:

Section 1 — Tool Layer (Agent 2)
    Registers all 10 mock tools, verifies their Bedrock specs, executes every
    tool with deterministic demo inputs, and asserts success.
    No AWS credentials required.

Section 2 — Bedrock Client (Agent 1)
    Verifies that boto3 can reach Bedrock and that BedrockClient.invoke()
    returns a correctly shaped response from Haiku 4.5.
    Requires valid AWS credentials and Bedrock model access.

Run from the project root:
    python smoke_test.py            # Section 1 (tools) only
    python smoke_test.py --bedrock  # Section 1 + Section 2
"""
from __future__ import annotations

import json
import sys

import config


# ---------------------------------------------------------------------------
# Section 1 — Tool Layer
# ---------------------------------------------------------------------------

def smoke_test_tools() -> None:
    """Register all tools, validate Bedrock specs, and execute every tool."""
    print("=" * 60)
    print("Section 1: Tool Layer Smoke Test")
    print("=" * 60)

    # Disable simulated failures so every call succeeds deterministically
    config.SIMULATE_TOOL_FAILURES = False

    from tools import build_default_registry
    from tools.base import RiskTier

    registry = build_default_registry()
    names = registry.list_names()

    # --- Verify registration ------------------------------------------------
    expected_tools = {
        "ping_customer_modem",
        "check_modem_status",
        "run_traceroute",
        "check_isp_outage",
        "check_downdetector",
        "search_kb",
        "lookup_customer",
        "get_ticket_history",
        "reboot_modem_remotely",
        "send_sms_to_customer",
    }
    assert set(names) == expected_tools, (
        f"Registered tools mismatch.\n  Expected: {sorted(expected_tools)}\n  Got: {sorted(names)}"
    )
    print(f"\n  {len(names)} tools registered: OK")

    # --- Validate Bedrock tool specs ----------------------------------------
    print("\n  Bedrock tool specs:")
    specs = registry.all_specs()
    for spec in specs:
        ts = spec["toolSpec"]
        # Each spec must have name, description, inputSchema
        assert "name" in ts and "description" in ts and "inputSchema" in ts, (
            f"Malformed spec for {ts.get('name')}"
        )
        assert "json" in ts["inputSchema"], f"inputSchema missing 'json' key for {ts['name']}"
        print(f"    ✓ {ts['name']}")

    # --- Execute every tool -------------------------------------------------
    def auto_approve(tool, inputs: dict) -> bool:  # noqa: ARG001
        """Automatically approve any high-risk tool during smoke test."""
        return True

    test_cases: list[tuple[str, dict]] = [
        ("ping_customer_modem",     {"customer_id": "CUST001"}),
        ("check_modem_status",      {"customer_id": "CUST001"}),
        ("run_traceroute",          {"customer_id": "CUST001"}),
        ("check_isp_outage",        {"customer_id": "CUST001"}),
        ("check_downdetector",      {"service": "xfinity", "region": "northeast"}),
        ("search_kb",               {"query": "slow speeds wifi dropping"}),
        ("lookup_customer",         {"customer_id": "CUST001"}),
        ("get_ticket_history",      {"customer_id": "CUST001"}),
        ("reboot_modem_remotely",   {"customer_id": "CUST001", "reason": "smoke test"}),
        ("send_sms_to_customer",    {"customer_id": "CUST001", "message": "Smoke test message."}),
    ]

    print("\n  Tool executions:")
    all_passed = True
    for tool_name, inputs in test_cases:
        result = registry.execute(tool_name, inputs, approver=auto_approve)
        status = "PASS" if result.success else "FAIL"
        if not result.success:
            all_passed = False
            print(f"    [{status}] {tool_name}: {result.error}")
        else:
            # Print a compact one-liner summary of the result data
            data_preview = json.dumps(result.data, default=str)[:80]
            print(f"    [{status}] {tool_name} ({result.latency_ms} ms): {data_preview}…")

    assert all_passed, "One or more tool executions failed — see output above."

    # --- Spot-check KB search relevance -------------------------------------
    kb_result = registry.execute("search_kb", {"query": "slow speeds wifi dropping", "max_results": 5})
    assert kb_result.success
    returned_ids = {r["doc_id"] for r in kb_result.data["results"]}
    expected_relevant = {"slow_speeds", "wifi_vs_ethernet"}
    found = returned_ids & expected_relevant
    assert found, (
        f"KB search for 'slow speeds wifi dropping' should return at least one of "
        f"{expected_relevant}; got {returned_ids}"
    )
    print(f"\n  KB search for 'slow speeds wifi dropping' returned relevant docs: {found} ✓")

    # --- Spot-check suspension scenario -------------------------------------
    cust3 = registry.execute("lookup_customer", {"customer_id": "CUST003"})
    assert cust3.success
    assert cust3.data["account_status"] == "suspended", "CUST003 should be suspended"
    print(f"  CUST003 account_status = 'suspended' ✓")

    # --- Rejected approval scenario -----------------------------------------
    def reject_all(tool, inputs: dict) -> bool:  # noqa: ARG001
        return False

    rejected = registry.execute(
        "reboot_modem_remotely",
        {"customer_id": "CUST001", "reason": "test rejection"},
        approver=reject_all,
    )
    assert not rejected.success
    assert "Rejected" in (rejected.error or "")
    print(f"  Rejection of high-risk tool handled gracefully ✓")

    print("\n[PASS] Tool Layer smoke test passed.\n")


# ---------------------------------------------------------------------------
# Section 2 — Bedrock Client
# ---------------------------------------------------------------------------

def smoke_test_bedrock() -> None:
    """Invoke Haiku 4.5 via Bedrock Converse API and assert response shape."""
    print("=" * 60)
    print("Section 2: Bedrock Client Smoke Test")
    print("=" * 60)

    from llm.bedrock_client import BedrockClient, BedrockError
    from observability.tracer import Tracer

    client = BedrockClient()
    print(f"\n  model  : {client.model_id}")
    print(f"  region : {client.region}")

    messages = [
        {
            "role": "user",
            "content": [{"text": "Say hello in exactly 5 words."}],
        }
    ]

    try:
        response = client.invoke(
            system="You are a helpful assistant. Follow user instructions precisely.",
            messages=messages,
        )
    except BedrockError as exc:
        print(f"\n[FAIL] BedrockError: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"\n  stop_reason : {response['stop_reason']}")
    print(f"  text        : {response['text']}")
    print(f"  usage       : {response['usage']}")

    with Tracer() as tracer:
        tracer.llm_response(response)
        print(f"\n  trace written: {tracer.filepath}")

    assert response["stop_reason"] == "end_turn", "Unexpected stop_reason"
    assert response["text"], "Empty text response"
    assert response["usage"]["input_tokens"] > 0, "No input tokens recorded"

    print("\n[PASS] Bedrock Client smoke test passed.\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    run_bedrock = "--bedrock" in sys.argv

    smoke_test_tools()

    if run_bedrock:
        smoke_test_bedrock()
    else:
        print("(Skipping Bedrock test — pass --bedrock to include it)")

    print("[PASS] All requested smoke tests passed.")


if __name__ == "__main__":
    main()
