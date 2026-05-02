/**
 * Mock SSE event stream for frontend development.
 * Replays a realistic agent turn sequence without a real backend.
 * Replace calls to `startMockStream` with real `EventSource` to `/api/turn`.
 */
import type { AgentEvent } from "@/lib/types";

const DEMO_EVENTS: AgentEvent[] = [
  { type: "plan_step", iteration: 1, text: "Customer reports slow speeds + WiFi drops. Need to check modem, outages, and KB." },
  { type: "tool_call", name: "lookup_customer", input: { customer_id: "CUST001" }, id: "tc-1" },
  { type: "tool_result", id: "tc-1", name: "lookup_customer", result: { name: "Sarah Chen", account_status: "active", service_tier: "premium", location: "94103" }, latency_ms: 210, success: true },
  { type: "tool_call", name: "check_isp_outage", input: { zip_code: "94103" }, id: "tc-2" },
  { type: "tool_result", id: "tc-2", name: "check_isp_outage", result: { outage_active: false, affected_zips: [], eta: null }, latency_ms: 189, success: true },
  { type: "tool_call", name: "check_modem_status", input: { customer_id: "CUST001" }, id: "tc-3" },
  { type: "tool_result", id: "tc-3", name: "check_modem_status", result: { online: true, uptime: "18h", signal: "weak", downstream_power: -8.2 }, latency_ms: 234, success: true },
  { type: "tool_call", name: "search_kb", input: { query: "slow speeds wifi dropping" }, id: "tc-4" },
  { type: "tool_result", id: "tc-4", name: "search_kb", result: { docs: [{ doc_id: "slow_speeds.md", title: "Slow Speeds Troubleshooting", score: 0.91 }, { doc_id: "modem_reboot.md", title: "Modem Reboot Guide", score: 0.84 }] }, latency_ms: 67, success: true },
  { type: "critic", passed: true, feedback: "OK" },
  { type: "assistant_delta", text: "Hi Sarah — I can see your modem is showing " },
  { type: "assistant_delta", text: "weak signal strength¹ and there's no active " },
  { type: "assistant_delta", text: "outage in your area². " },
  { type: "assistant_delta", text: "Let's try a remote reboot; it resolves this " },
  { type: "assistant_delta", text: "in ~70% of similar cases³." },
  { type: "done", total_ms: 1243 },
];

const APPROVAL_EVENTS: AgentEvent[] = [
  { type: "plan_step", iteration: 1, text: "Rep approved reboot. Proceeding with remote modem reboot." },
  { type: "tool_call", name: "reboot_modem_remotely", input: { customer_id: "CUST001" }, id: "tc-5" },
  { type: "approval_required", tool: "reboot_modem_remotely", input: { customer_id: "CUST001" }, tool_call_id: "tc-5" },
];

const POST_APPROVAL_EVENTS: AgentEvent[] = [
  { type: "tool_result", id: "tc-5", name: "reboot_modem_remotely", result: { success: true, new_signal: "strong", reboot_time_s: 45 }, latency_ms: 1800, success: true },
  { type: "assistant_delta", text: "Modem rebooted successfully — signal is now " },
  { type: "assistant_delta", text: "strong [tool:reboot_modem_remotely]. " },
  { type: "assistant_delta", text: "Please ask Sarah to check her connection." },
  { type: "done", total_ms: 2100 },
];

type EventHandler = (event: AgentEvent) => void;

/** Replay events with realistic timing. Returns a cancel function. */
export function startMockStream(
  onEvent: EventHandler,
  scenario: "demo" | "approval" | "post_approval" = "demo"
): () => void {
  let cancelled = false;
  const events =
    scenario === "approval"
      ? APPROVAL_EVENTS
      : scenario === "post_approval"
      ? POST_APPROVAL_EVENTS
      : DEMO_EVENTS;

  let i = 0;
  const delays = events.map((e) =>
    e.type === "tool_result" ? (e as { latency_ms: number }).latency_ms ?? 200
    : e.type === "assistant_delta" ? 60
    : 120
  );

  function next() {
    if (cancelled || i >= events.length) return;
    const delay = delays[i];
    setTimeout(() => {
      if (cancelled) return;
      onEvent(events[i]);
      i++;
      next();
    }, delay);
  }

  next();
  return () => { cancelled = true; };
}
