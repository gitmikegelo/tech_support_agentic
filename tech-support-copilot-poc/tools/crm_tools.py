"""
Mock CRM tools.

Reads customer data from ``data/mock_customers.json``.  Two operations are
exposed: customer profile lookup and ticket history retrieval.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from tools.base import RiskTier, Tool, ToolResult, _maybe_fail

_CUSTOMERS_FILE = Path(__file__).parent.parent / "data" / "mock_customers.json"


def _load_customers() -> dict[str, dict]:
    """Return a mapping of customer_id → customer record."""
    raw = json.loads(_CUSTOMERS_FILE.read_text(encoding="utf-8"))
    return {c["customer_id"]: c for c in raw["customers"]}


class LookupCustomer(Tool):
    """Look up a customer's profile by ID."""

    name = "lookup_customer"
    description = (
        "Look up a customer's account profile including their name, account status, "
        "service tier, equipment, and contact information. Call this at the start of "
        "every support session to establish customer context."
    )
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier (e.g., 'CUST001').",
            },
        },
        "required": ["customer_id"],
    }

    def execute(self, customer_id: str) -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        customers = _load_customers()
        if customer_id not in customers:
            latency_ms = int((time.monotonic() - start) * 1000) + 40
            return ToolResult(
                success=False,
                data=None,
                error=f"Customer '{customer_id}' not found.",
                latency_ms=latency_ms,
                tool_name=self.name,
            )

        # Return the profile without the ticket history (separate tool for that)
        record = customers[customer_id]
        profile = {k: v for k, v in record.items() if k != "ticket_history"}

        latency_ms = int((time.monotonic() - start) * 1000) + 40
        return ToolResult(
            success=True, data=profile, latency_ms=latency_ms, tool_name=self.name
        )


class GetTicketHistory(Tool):
    """Retrieve a customer's recent support ticket history."""

    name = "get_ticket_history"
    description = (
        "Retrieve the customer's recent support ticket history to understand recurring issues "
        "and prior resolutions. Useful for identifying patterns (e.g., repeated modem resets) "
        "before diagnosing the current issue."
    )
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier.",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of tickets to return, most recent first (default 5).",
                "default": 5,
            },
        },
        "required": ["customer_id"],
    }

    def execute(self, customer_id: str, limit: int = 5) -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        customers = _load_customers()
        if customer_id not in customers:
            latency_ms = int((time.monotonic() - start) * 1000) + 40
            return ToolResult(
                success=False,
                data=None,
                error=f"Customer '{customer_id}' not found.",
                latency_ms=latency_ms,
                tool_name=self.name,
            )

        limit = max(1, min(limit, 20))
        tickets = customers[customer_id].get("ticket_history", [])[:limit]

        latency_ms = int((time.monotonic() - start) * 1000) + 40
        return ToolResult(
            success=True,
            data={"customer_id": customer_id, "tickets": tickets, "count": len(tickets)},
            latency_ms=latency_ms,
            tool_name=self.name,
        )
