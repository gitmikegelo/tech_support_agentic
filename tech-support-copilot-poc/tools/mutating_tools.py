"""
Mock high-risk mutating tools.

These tools are gated by ``RiskTier.HIGH_RISK_MUTATING`` and require explicit
human approval before the registry will execute them.

In production these would call real APIs (modem management platform, SMS
gateway).  Here they return realistic synthetic responses.
"""
from __future__ import annotations

import time

from tools.base import RiskTier, Tool, ToolResult, _maybe_fail


class RebootModemRemotely(Tool):
    """Remotely reboot the customer's modem via the modem management platform."""

    name = "reboot_modem_remotely"
    description = (
        "Remotely reboot the customer's cable modem via the ISP management platform. "
        "The modem will be offline for approximately 2 minutes. "
        "Use after confirming that a reboot is the appropriate next step and obtaining "
        "customer consent. THIS ACTION IS IRREVERSIBLE — always get approval first."
    )
    risk_tier = RiskTier.HIGH_RISK_MUTATING
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier.",
            },
            "reason": {
                "type": "string",
                "description": "Reason for the reboot, logged for audit trail.",
            },
        },
        "required": ["customer_id", "reason"],
    }

    def execute(self, customer_id: str, reason: str) -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        if customer_id == "CUST005":
            # Demo: reboot completes but signal levels remain below spec → escalate to field tech
            data = {
                "customer_id": customer_id,
                "reboot_initiated": True,
                "reboot_initiated_at": "2026-05-02T09:15:00Z",
                "estimated_restore_at": "2026-05-02T09:17:00Z",
                "status": "rebooted",
                "post_reboot_online": True,
                "post_reboot_signal_quality": "poor",
                "post_reboot_downstream_dbmv": -18,   # still well outside -7 to +7 dBmV range
                "post_reboot_upstream_dbmv": 51,       # above normal (38–48 dBmV)
                "post_reboot_snr_db": 24,              # still below 30 dB threshold
                "post_reboot_locked_downstream_channels": 2,  # partial — should be 8+
                "reason": reason,
                "note": (
                    "Reboot completed. Modem came back online but signal levels remain "
                    "significantly below acceptable thresholds. Downstream SNR 24 dB (need ≥30 dB), "
                    "power at -18 dBmV (need -7 to +7 dBmV). Only 2 of 8 downstream channels locked. "
                    "Remote reboot has NOT resolved the underlying issue. "
                    "A field technician must inspect the outdoor coax line and tap. "
                    "Recommend scheduling field dispatch immediately."
                ),
            }
        else:
            data = {
                "customer_id": customer_id,
                "reboot_initiated": True,
                "reboot_initiated_at": "2026-05-01T09:15:00Z",
                "estimated_restore_at": "2026-05-01T09:17:00Z",
                "status": "rebooting",
                "post_reboot_signal_quality": "strong",
                "post_reboot_downstream_dbmv": 3,
                "post_reboot_upstream_dbmv": 40,
                "reason": reason,
                "note": (
                    "Reboot command accepted. Modem will be offline ~2 min. "
                    "Signal levels expected to normalise after restart."
                ),
            }

        latency_ms = int((time.monotonic() - start) * 1000) + 1200
        return ToolResult(
            success=True, data=data, latency_ms=latency_ms, tool_name=self.name
        )


class SendSMSToCustomer(Tool):
    """Send an SMS text message to the customer's phone number on file."""

    name = "send_sms_to_customer"
    description = (
        "Send a text message (SMS) to the customer's mobile phone number registered on "
        "their account. Use to confirm appointments, send reference numbers, or share "
        "self-service links. Message must be 160 characters or fewer."
    )
    risk_tier = RiskTier.HIGH_RISK_MUTATING
    input_schema = {
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier.",
            },
            "message": {
                "type": "string",
                "description": "The SMS body text. Must be 160 characters or fewer.",
            },
        },
        "required": ["customer_id", "message"],
    }

    def execute(self, customer_id: str, message: str) -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        if len(message) > 160:
            return ToolResult(
                success=False,
                data=None,
                error=f"Message too long: {len(message)} chars (max 160).",
                latency_ms=int((time.monotonic() - start) * 1000) + 5,
                tool_name=self.name,
            )

        data = {
            "customer_id": customer_id,
            "message_id": f"MSG-{customer_id}-20260501-091505",
            "status": "queued",
            "to": "on-file",
            "message_preview": message[:50] + ("…" if len(message) > 50 else ""),
            "sent_at": "2026-05-01T09:15:05Z",
        }

        latency_ms = int((time.monotonic() - start) * 1000) + 200
        return ToolResult(
            success=True, data=data, latency_ms=latency_ms, tool_name=self.name
        )
