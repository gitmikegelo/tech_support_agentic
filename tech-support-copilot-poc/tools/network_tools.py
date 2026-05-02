"""
Mock network diagnostic tools.

Simulates ping, modem status, and traceroute for the demo customer
``CUST001`` (signal-degraded scenario) and a healthy fallback for all other
customer IDs.
"""
from __future__ import annotations

import time

from tools.base import RiskTier, Tool, ToolResult, _maybe_fail


class PingCustomerModem(Tool):
    """Ping the customer's modem and return latency and packet-loss statistics."""

    name = "ping_customer_modem"
    description = (
        "Ping the customer's modem and return round-trip latency and packet loss. "
        "Use to quickly assess whether the modem is reachable and the connection quality."
    )
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier.",
            },
        },
        "required": ["customer_id"],
    }

    def execute(self, customer_id: str) -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        if customer_id == "CUST001":
            data = {
                "customer_id": customer_id,
                "latency_ms": 287,
                "packet_loss_pct": 12.5,
                "status": "degraded",
                "hops_to_modem": 3,
                "note": "High latency and packet loss detected — possible signal or line issue.",
            }
        elif customer_id == "CUST005":
            data = {
                "customer_id": customer_id,
                "latency_ms": None,
                "packet_loss_pct": 100.0,
                "status": "unreachable",
                "hops_to_modem": None,
                "note": "Modem is not responding to pings — device appears to be offline or frozen.",
            }
        else:
            data = {
                "customer_id": customer_id,
                "latency_ms": 18,
                "packet_loss_pct": 0.0,
                "status": "healthy",
                "hops_to_modem": 2,
                "note": "Modem is responding normally.",
            }

        latency_ms = int((time.monotonic() - start) * 1000) + 45
        return ToolResult(
            success=True, data=data, latency_ms=latency_ms, tool_name=self.name
        )


class CheckModemStatus(Tool):
    """Check the current online status, uptime, and signal levels of the customer's modem."""

    name = "check_modem_status"
    description = (
        "Check the customer's modem for online/offline status, uptime, downstream/upstream "
        "signal levels, and recent restart count. Use to diagnose signal degradation or "
        "hardware instability."
    )
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier.",
            },
        },
        "required": ["customer_id"],
    }

    def execute(self, customer_id: str) -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        if customer_id == "CUST001":
            # Demo: signal-degraded, many restarts → matches "slow/dropping WiFi" complaint
            data = {
                "customer_id": customer_id,
                "online": True,
                "uptime_hours": 0.5,
                "downstream_signal_dbmv": -12,   # below healthy range of -7 to +7 dBmV
                "upstream_signal_dbmv": 44,
                "signal_quality": "weak",
                "model": "NETGEAR CM500",
                "firmware": "V1.01.10",
                "restarts_last_24h": 7,
                "note": "Signal level outside acceptable range; frequent restarts indicate line issue.",
            }
        elif customer_id == "CUST005":
            # Demo: modem completely offline, cannot lock any downstream channels
            data = {
                "customer_id": customer_id,
                "online": False,
                "uptime_hours": 0,
                "downstream_signal_dbmv": -21,   # severely below acceptable range
                "upstream_signal_dbmv": None,
                "signal_quality": "none",
                "model": "NETGEAR CM600",
                "firmware": "V1.02.04",
                "downstream_snr_db": 22,          # well below 30 dB threshold
                "locked_downstream_channels": 0,
                "restarts_last_24h": 4,
                "note": (
                    "Modem offline — zero downstream channels locked. "
                    "SNR at 22 dB (threshold 30 dB). Downstream power severely low at -21 dBmV. "
                    "Suggest remote reboot as first step; if signal levels remain below spec "
                    "after reboot, physical line inspection by field tech is required."
                ),
            }
        else:
            data = {
                "customer_id": customer_id,
                "online": True,
                "uptime_hours": 312.4,
                "downstream_signal_dbmv": 4,
                "upstream_signal_dbmv": 40,
                "signal_quality": "good",
                "model": "Motorola MB8600",
                "firmware": "8600-19.2.18",
                "restarts_last_24h": 0,
                "note": "Modem operating within normal parameters.",
            }

        latency_ms = int((time.monotonic() - start) * 1000) + 60
        return ToolResult(
            success=True, data=data, latency_ms=latency_ms, tool_name=self.name
        )


class RunTraceroute(Tool):
    """Run a traceroute from the customer's modem to a target host."""

    name = "run_traceroute"
    description = (
        "Run a traceroute from the customer's modem to the specified target (default 8.8.8.8) "
        "to identify high-latency or dropped hops along the path. Useful for distinguishing "
        "last-mile issues from backbone congestion."
    )
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier.",
            },
            "target": {
                "type": "string",
                "description": "Target hostname or IP address (default: 8.8.8.8).",
                "default": "8.8.8.8",
            },
        },
        "required": ["customer_id"],
    }

    def execute(self, customer_id: str, target: str = "8.8.8.8") -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        if customer_id == "CUST001":
            hops = [
                {"hop": 1, "host": "192.168.1.1", "latency_ms": 2, "status": "ok"},
                {"hop": 2, "host": "10.0.0.1", "latency_ms": 45, "status": "ok"},
                {
                    "hop": 3,
                    "host": "isp-edge-node.example.net",
                    "latency_ms": 289,
                    "status": "high_latency",
                },
                {"hop": 4, "host": "*", "latency_ms": None, "status": "timeout"},
                {"hop": 5, "host": target, "latency_ms": 310, "status": "ok"},
            ]
        else:
            hops = [
                {"hop": 1, "host": "192.168.1.1", "latency_ms": 1, "status": "ok"},
                {"hop": 2, "host": "10.0.0.1", "latency_ms": 8, "status": "ok"},
                {
                    "hop": 3,
                    "host": "isp-edge-node.example.net",
                    "latency_ms": 12,
                    "status": "ok",
                },
                {"hop": 4, "host": target, "latency_ms": 18, "status": "ok"},
            ]

        latency_ms = int((time.monotonic() - start) * 1000) + 120
        return ToolResult(
            success=True,
            data={"customer_id": customer_id, "target": target, "hops": hops},
            latency_ms=latency_ms,
            tool_name=self.name,
        )
