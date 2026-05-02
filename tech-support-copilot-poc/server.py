"""
FastAPI SSE server — bridges the Next.js frontend to the agentic orchestrator.

Run (from tech-support-copilot-poc/):
    uvicorn server:app --port 8000 --reload

The Next.js frontend proxies /api → http://localhost:8000 via next.config.ts rewrites.

Endpoints
---------
POST /api/session          Create a new agent session; returns { session_id }
POST /api/customer/start   Generate the customer's opening message (AI-driven)
POST /api/customer/reply   Generate the customer's reply to an agent suggestion
GET  /api/turn             SSE stream for one customer message turn
POST /api/approve          Resolve a pending high-risk tool approval
"""
from __future__ import annotations

import asyncio
import json
import queue
import threading
import time
import uuid
import logging
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import random

import config
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)

from agent.orchestrator import Orchestrator
from llm.bedrock_client import BedrockClient
from llm.customer_llm import CustomerLLM
from observability.tracer import Tracer
from tools import build_default_registry
from tools.base import Tool

logger = logging.getLogger(__name__)

app = FastAPI(title="Tech Support Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

class _Session:
    """Holds per-session orchestrator state and approval synchronisation."""

    def __init__(self, session_id: str, customer_data: dict) -> None:
        self.session_id = session_id
        self.customer_data = customer_data
        registry = build_default_registry()
        bedrock = BedrockClient()
        tracer = Tracer()
        self.orchestrator = Orchestrator(
            bedrock=bedrock,
            registry=registry,
            tracer=tracer,
        )
        
        # Build prompt from customer data
        name = customer_data.get("name", "Jane Doe")
        cid = customer_data.get("customer_id", "C-10042")
        zip_code = customer_data.get("zip_code", "Unknown")
        tickets = customer_data.get("ticket_history", [])
        issue = tickets[0]["issue"] if tickets else "your internet has been slow for the past two days"
        
        system_prompt = f"""You are a residential internet customer calling tech support because {issue}. You live in zip code {zip_code} and your account is under the name {name} (customer ID {cid}).

BEHAVIOUR RULES
---------------
- Respond as a real, slightly frustrated but cooperative customer would on a phone call.
- Keep each reply short — 1 to 3 sentences, natural spoken English.
- Provide information only when asked; do not volunteer everything upfront.
- If the rep gives you an instruction to follow (e.g. reboot your modem), acknowledge it and report a plausible outcome on your next message.
- If the rep's suggestion resolves the problem, thank them and say the connection feels faster.
- Do NOT break character or reference the fact that you are an AI.
- Do NOT use markdown, bullet points, or formal structure.
"""
        self.customer_llm = CustomerLLM(system_prompt=system_prompt)
        # Used by web_approver to tag approval_required with the correct tool_call_id
        self.pending_tool_call_id: str = ""
        # Approval gate
        self._approval_event = threading.Event()
        self._approval_result: bool = False

    def wait_for_approval(self) -> bool:
        """Block the orchestrator thread until the rep approves or rejects.
        Returns True if approved, False if rejected or timed out (2 min)."""
        got_answer = self._approval_event.wait(timeout=120)
        self._approval_event.clear()
        return self._approval_result if got_answer else False

    def resolve_approval(self, approved: bool) -> None:
        """Called by POST /api/approve to unblock the orchestrator thread."""
        self._approval_result = approved
        self._approval_event.set()


_sessions: dict[str, _Session] = {}


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------

class CreateSessionResponse(BaseModel):
    session_id: str
    customer: dict


class ApproveRequest(BaseModel):
    session_id: str
    tool_call_id: str
    approved: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/session", response_model=CreateSessionResponse)
def create_session() -> CreateSessionResponse:
    """Create a new agent session. Returns a session_id the frontend stores."""
    session_id = str(uuid.uuid4())
    
    with open("data/mock_customers.json", "r") as f:
        data = json.load(f)
    customer_data = random.choice(data["customers"])
    
    _sessions[session_id] = _Session(session_id, customer_data)
    
    frontend_customer = {
        "customer_id": customer_data.get("customer_id", "Unknown"),
        "name": customer_data.get("name", "Unknown"),
        "account_status": customer_data.get("account_status", "active"),
        "service_tier": customer_data.get("service_tier", "Standard"),
        "location": f"Zip Code: {customer_data.get('zip_code', 'Unknown')}",
        "equipment": {
            "modem_model": customer_data.get("equipment", {}).get("modem"),
            "router_model": customer_data.get("equipment", {}).get("router")
        },
        "recent_tickets": [
            {
                "ticket_id": t.get("ticket_id"),
                "issue": t.get("issue"),
                "date": t.get("opened"),
                "status": t.get("status")
            } for t in customer_data.get("ticket_history", [])
        ]
    }
    
    return CreateSessionResponse(session_id=session_id, customer=frontend_customer)


class CustomerMessageResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Demo scenarios
# ---------------------------------------------------------------------------

_DEMO_SCENARIOS: dict[str, str] = {
    "patricia": "CUST003",  # Simple: suspended account triage
    "marcus": "CUST005",    # Mid-complexity: agentic diagnostic + field dispatch
}


class DemoSessionRequest(BaseModel):
    scenario: str  # "patricia" | "marcus"


@app.post("/api/demo-session", response_model=CreateSessionResponse)
def create_demo_session(body: DemoSessionRequest) -> CreateSessionResponse:
    """Create a deterministic demo session for a specific scenario.

    Accepts { "scenario": "patricia" | "marcus" } and pins the session to
    that customer, bypassing the random picker used by /api/session.
    Only meaningful when config.DEMO_MODE is True, but safe to call anytime.
    """
    customer_id = _DEMO_SCENARIOS.get(body.scenario.lower())
    if not customer_id:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{body.scenario}'. Valid options: {list(_DEMO_SCENARIOS.keys())}",
        )

    with open("data/mock_customers.json", "r") as f:
        data = json.load(f)
    customers = {c["customer_id"]: c for c in data["customers"]}
    customer_data = customers.get(customer_id)
    if not customer_data:
        raise HTTPException(status_code=500, detail=f"Customer {customer_id} not found in mock data")

    session_id = str(uuid.uuid4())
    _sessions[session_id] = _Session(session_id, customer_data)

    frontend_customer = {
        "customer_id": customer_data.get("customer_id", "Unknown"),
        "name": customer_data.get("name", "Unknown"),
        "account_status": customer_data.get("account_status", "active"),
        "service_tier": customer_data.get("service_tier", "Standard"),
        "location": f"Zip Code: {customer_data.get('zip_code', 'Unknown')}",
        "equipment": {
            "modem_model": customer_data.get("equipment", {}).get("modem"),
            "router_model": customer_data.get("equipment", {}).get("router"),
        },
        "recent_tickets": [
            {
                "ticket_id": t.get("ticket_id"),
                "issue": t.get("issue"),
                "date": t.get("opened"),
                "status": t.get("status"),
            }
            for t in customer_data.get("ticket_history", [])
        ],
    }

    return CreateSessionResponse(session_id=session_id, customer=frontend_customer)




@app.post("/api/customer/start", response_model=CustomerMessageResponse)
def customer_start(session_id: str) -> CustomerMessageResponse:
    """Generate the customer's opening message using the CustomerLLM."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        msg = session.customer_llm.opening_message()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return CustomerMessageResponse(message=msg)


class CustomerReplyRequest(BaseModel):
    session_id: str
    rep_message: str


@app.post("/api/customer/reply", response_model=CustomerMessageResponse)
def customer_reply(body: CustomerReplyRequest) -> CustomerMessageResponse:
    """Generate the customer's reply to the latest agent suggestion."""
    session = _sessions.get(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        msg = session.customer_llm.reply(body.rep_message)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return CustomerMessageResponse(message=msg)


@app.get("/api/turn")
async def run_turn(session_id: str, message: str) -> StreamingResponse:
    """Stream agent reasoning events as SSE for one customer message turn.

    The client opens an EventSource to this URL.  Events are JSON objects
    matching the AgentEvent union defined in copilot-ui/lib/types.ts.
    """
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Call POST /api/session first.")

    event_q: queue.Queue[dict | None] = queue.Queue()

    # ------------------------------------------------------------------
    # event_hook: called synchronously by the orchestrator thread
    # ------------------------------------------------------------------
    def event_hook(event_type: str, data: dict) -> None:
        if event_type == "plan_step":
            event_q.put({
                "type": "plan_step",
                "iteration": data.get("iteration", 1),
            })

        elif event_type == "tool_call":
            # Store id so web_approver can reference it
            session.pending_tool_call_id = data.get("id", "")
            event_q.put({
                "type": "tool_call",
                "name": data["name"],
                "input": data.get("inputs", {}),
                "id": data.get("id", ""),
            })

        elif event_type == "tool_result":
            result = data.get("result", {})
            event_q.put({
                "type": "tool_result",
                "id": data.get("id", ""),
                "name": data["name"],
                "result": result.get("data"),
                "latency_ms": result.get("latency_ms", 0),
                "success": result.get("success", False),
            })

        elif event_type == "critic":
            event_q.put({
                "type": "critic",
                "passed": data.get("passed", True),
                "feedback": data.get("feedback", ""),
            })

    # ------------------------------------------------------------------
    # web_approver: blocks the orchestrator thread until rep responds
    # ------------------------------------------------------------------
    def web_approver(tool: Tool, inputs: dict) -> bool:
        event_q.put({
            "type": "approval_required",
            "tool": tool.name,
            "input": inputs,
            "tool_call_id": session.pending_tool_call_id,
        })
        approved = session.wait_for_approval()
        event_q.put({
            "type": "approval_resolved",
            "tool_call_id": session.pending_tool_call_id,
            "approved": approved,
        })
        return approved

    # ------------------------------------------------------------------
    # Orchestrator runs in a background thread to avoid blocking the loop
    # ------------------------------------------------------------------
    def run_orchestrator() -> None:
        start_ms = int(time.time() * 1000)
        try:
            response_text = session.orchestrator.handle_turn(
                message,
                approver=web_approver,
                event_hook=event_hook,
            )
            # Emit the reply as word-by-word deltas for the streaming UI effect
            words = response_text.split(" ")
            for i, word in enumerate(words):
                chunk = word if i == len(words) - 1 else word + " "
                event_q.put({"type": "assistant_delta", "text": chunk})

            total_ms = int(time.time() * 1000) - start_ms
            event_q.put({"type": "done", "total_ms": total_ms})

        except Exception as exc:  # noqa: BLE001
            logger.error("Error in run_orchestrator: %s", exc, exc_info=True)
            event_q.put({"type": "error", "message": str(exc)})
        finally:
            event_q.put(None)  # sentinel — tells the async generator to stop

    thread = threading.Thread(target=run_orchestrator, daemon=True)
    thread.start()

    # ------------------------------------------------------------------
    # Async generator reads from queue and yields SSE frames
    # ------------------------------------------------------------------
    async def sse_stream() -> AsyncGenerator[str, None]:
        loop = asyncio.get_event_loop()
        while True:
            event = await loop.run_in_executor(None, event_q.get)
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/api/approve")
def approve_tool(req: ApproveRequest) -> dict:
    """Resolve a pending tool approval.

    Called by the frontend when the rep clicks Approve or Reject
    in the ProposedActionStrip component.
    """
    session = _sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.resolve_approval(req.approved)
    return {"ok": True}
