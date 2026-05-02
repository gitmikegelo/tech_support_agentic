"""
Mock outage-detection tools.

Returns "no active outage" for the demo scenario — the customer's issue is
per-customer signal degradation, not a regional outage.  Swap the data dict
to simulate an active outage for alternative test scenarios.
"""
from __future__ import annotations

import time

from tools.base import RiskTier, Tool, ToolResult, _maybe_fail


class CheckISPOutage(Tool):
    """Check whether there is an active ISP outage in the customer's area."""

    name = "check_isp_outage"
    description = (
        "Check whether there is a known active outage at the ISP level affecting the "
        "customer's geographic area. Returns outage status, affected ZIP codes, and "
        "estimated resolution time."
    )
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier (used to resolve their region).",
            },
            "zip_code": {
                "type": "string",
                "description": "ZIP code to check. Overrides the customer's address on file if provided.",
            },
        },
        "required": ["customer_id"],
    }

    def execute(  # type: ignore[override]
        self,
        customer_id: str,
        zip_code: str | None = None,
    ) -> ToolResult:
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        # Demo scenario: no regional outage; issue is per-customer
        data = {
            "customer_id": customer_id,
            "outage_active": False,
            "affected_zips": [],
            "eta_resolution": None,
            "outage_id": None,
            "checked_zip": zip_code or "10001",
            "last_updated": "2026-05-01T08:00:00Z",
            "note": "No active outages in this area.",
        }

        latency_ms = int((time.monotonic() - start) * 1000) + 80
        return ToolResult(
            success=True, data=data, latency_ms=latency_ms, tool_name=self.name
        )


class CheckDowndetector(Tool):
    """Check Downdetector for recent user-reported service disruption spikes."""

    name = "check_downdetector"
    description = (
        "Check Downdetector for a spike in user-submitted outage reports for a given service "
        "and region. A spike (report count significantly above baseline) suggests a widespread "
        "issue not yet acknowledged by the ISP."
    )
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "service": {
                "type": "string",
                "description": "Service name to check (e.g., 'xfinity', 'spectrum', 'att').",
            },
            "region": {
                "type": "string",
                "description": "Geographic region (e.g., 'northeast', 'chicago', 'west-coast').",
            },
        },
        "required": ["service", "region"],
    }

    def execute(self, service: str, region: str) -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        data = {
            "service": service,
            "region": region,
            "report_spike": False,
            "reports_last_hour": 12,
            "baseline_reports_per_hour": 15,
            "spike_threshold": 50,
            "status": "normal",
            "last_major_outage": "2026-04-15",
            "note": "Report volume is within normal range. No widespread disruption detected.",
        }

        latency_ms = int((time.monotonic() - start) * 1000) + 95
        return ToolResult(
            success=True, data=data, latency_ms=latency_ms, tool_name=self.name
        )
