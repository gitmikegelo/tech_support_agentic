"""Tool layer for the Tech Support Copilot POC.

Import ``build_default_registry()`` to get a pre-populated ToolRegistry
containing all 10 mock tools ready for use with the orchestrator.
"""
from tools.registry import ToolRegistry
from tools.network_tools import CheckModemStatus, PingCustomerModem, RunTraceroute
from tools.outage_tools import CheckDowndetector, CheckISPOutage
from tools.kb_tools import SearchKB
from tools.crm_tools import GetTicketHistory, LookupCustomer
from tools.mutating_tools import RebootModemRemotely, SendSMSToCustomer


def build_default_registry() -> ToolRegistry:
    """Create and return a ToolRegistry pre-loaded with all mock tools."""
    registry = ToolRegistry()
    for tool in [
        PingCustomerModem(),
        CheckModemStatus(),
        RunTraceroute(),
        CheckISPOutage(),
        CheckDowndetector(),
        SearchKB(),
        LookupCustomer(),
        GetTicketHistory(),
        RebootModemRemotely(),
        SendSMSToCustomer(),
    ]:
        registry.register(tool)
    return registry


__all__ = [
    "build_default_registry",
    "ToolRegistry",
    "PingCustomerModem",
    "CheckModemStatus",
    "RunTraceroute",
    "CheckISPOutage",
    "CheckDowndetector",
    "SearchKB",
    "LookupCustomer",
    "GetTicketHistory",
    "RebootModemRemotely",
    "SendSMSToCustomer",
]
