/**
 * Shared TypeScript types for all agent SSE events and domain models.
 * Mirrors the backend tracer event shape.
 */

// ---------------------------------------------------------------------------
// Agent event stream
// ---------------------------------------------------------------------------

export type AgentEvent =
  | { type: "plan_step"; iteration: number; text?: string }
  | { type: "tool_call"; name: string; input: unknown; id: string }
  | { type: "tool_result"; id: string; name: string; result: unknown; latency_ms: number; success: boolean }
  | { type: "assistant_delta"; text: string }
  | { type: "critic"; passed: boolean; feedback: string }
  | { type: "approval_required"; tool: string; input: unknown; tool_call_id: string }
  | { type: "approval_resolved"; tool_call_id: string; approved: boolean }
  | { type: "done"; total_ms: number }
  | { type: "error"; message: string }
  | { type: "budget_exhausted" };

// ---------------------------------------------------------------------------
// Reasoning timeline step
// ---------------------------------------------------------------------------

export type StepStatus = "active" | "done" | "failed" | "waiting";

export interface ReasoningStep {
  id: string;
  kind: "plan" | "tool_call" | "tool_result" | "critic" | "synthesizing" | "done" | "waiting_approval";
  label: string;
  detail?: unknown;
  status: StepStatus;
  latency_ms?: number;
  toolCallId?: string;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export interface Evidence {
  id: string;
  source: string;        // e.g. "check_modem_status" or "kb:slow_speeds.md"
  sourceType: "tool" | "kb";
  summary: string;
  raw: unknown;
  timestamp: number;     // ms since epoch
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export type MessageRole = "customer" | "rep" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Suggestion
// ---------------------------------------------------------------------------

export interface Citation {
  index: number;      // 1-based superscript number
  ref: string;        // evidence source ref
}

export interface Suggestion {
  id: string;
  text: string;        // parsed content of <reply> tag
  analysis: string;    // parsed content of <analysis> tag
  confidence: number; // 0–1
  citations: Citation[];
  criticReviewed: boolean;
  partialInfo: boolean;
}

// ---------------------------------------------------------------------------
// Pending action (approval required)
// ---------------------------------------------------------------------------

export interface PendingAction {
  toolCallId: string;
  tool: string;
  input: unknown;
}

// ---------------------------------------------------------------------------
// Session / customer
// ---------------------------------------------------------------------------

export interface Customer {
  customer_id: string;
  name: string;
  account_status: string;
  service_tier: string;
  location?: string;
  equipment?: { modem_model?: string; router_model?: string };
  recent_tickets?: { ticket_id: string; issue: string; date: string; status: string }[];
}
