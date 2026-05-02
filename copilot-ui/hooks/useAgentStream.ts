"use client";
/**
 * useAgentStream — consumes agent SSE events and applies them to Zustand stores.
 * Accepts either a real EventSource URL or calls the mock stream.
 */
import { useCallback, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { useConversationStore } from "@/store/conversationStore";
import { useAgentStore } from "@/store/agentStore";
import type { AgentEvent, ReasoningStep, Evidence } from "@/lib/types";
import { startMockStream } from "@/lib/mockStream";

let stepCounter = 0;

export function useAgentStream() {
  const cancelRef = useRef<(() => void) | null>(null);
  const pendingToolStepIds = useRef<Record<string, string>>({});

  const { setThinking, addTokens, setLatency } = useSessionStore();
  const { appendStreamDelta, commitStreamedSuggestion, setPendingAction, addMessage } =
    useConversationStore();
  const { addStep, updateStep, addEvidence, clearTurn } = useAgentStore();

  const handleEvent = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case "plan_step": {
          setThinking(true);
          const step: ReasoningStep = {
            id: `step-${++stepCounter}`,
            kind: "plan",
            label: event.text ?? `Iteration ${event.iteration}`,
            status: "active",
          };
          addStep(step);
          break;
        }

        case "tool_call": {
          const step: ReasoningStep = {
            id: `step-${++stepCounter}`,
            kind: "tool_call",
            label: event.name,
            detail: event.input,
            status: "active",
            toolCallId: event.id,
          };
          pendingToolStepIds.current[event.id] = step.id;
          addStep(step);
          break;
        }

        case "tool_result": {
          const stepId = pendingToolStepIds.current[event.id];
          if (stepId) {
            updateStep(stepId, {
              status: event.success ? "done" : "failed",
              latency_ms: event.latency_ms,
              detail: event.result,
            });
            delete pendingToolStepIds.current[event.id];
          }

          // Add to evidence log
          const isKb = event.name === "search_kb";
          const e: Evidence = {
            id: `ev-${Date.now()}-${event.id}`,
            source: isKb ? `kb:${event.name}` : event.name,
            sourceType: isKb ? "kb" : "tool",
            summary: summarize(event.name, event.result),
            raw: event.result,
            timestamp: Date.now(),
          };
          addEvidence(e);
          break;
        }

        case "approval_required": {
          const step: ReasoningStep = {
            id: `step-${++stepCounter}`,
            kind: "waiting_approval",
            label: `Waiting for approval: ${event.tool}`,
            status: "waiting",
            toolCallId: event.tool_call_id,
          };
          addStep(step);
          setPendingAction({
            toolCallId: event.tool_call_id,
            tool: event.tool,
            input: event.input,
          });
          setThinking(false);
          break;
        }

        case "approval_resolved": {
          const stepId = pendingToolStepIds.current[event.tool_call_id];
          if (stepId) {
            updateStep(stepId, { status: event.approved ? "done" : "failed" });
          }
          setPendingAction(null);
          setThinking(true);
          break;
        }

        case "assistant_delta": {
          const synStep = findOrCreateSynthStep(addStep, stepCounter);
          stepCounter = synStep.counter;
          appendStreamDelta(event.text);
          break;
        }

        case "critic": {
          const step: ReasoningStep = {
            id: `step-${++stepCounter}`,
            kind: "critic",
            label: event.passed ? "Critic: passed" : `Critic: ${event.feedback}`,
            status: event.passed ? "done" : "failed",
          };
          addStep(step);
          break;
        }

        case "done": {
          setThinking(false);
          setLatency(event.total_ms);
          const { streamingText } = useConversationStore.getState();
          if (streamingText) {
            commitStreamedSuggestion(0.87, [], false, false);
          }
          const doneStep: ReasoningStep = {
            id: `step-${++stepCounter}`,
            kind: "done",
            label: `Done`,
            detail: { total_ms: event.total_ms },
            status: "done",
            latency_ms: event.total_ms,
          };
          addStep(doneStep);
          clearTurn();
          break;
        }

        case "budget_exhausted": {
          setThinking(false);
          const step: ReasoningStep = {
            id: `step-${++stepCounter}`,
            kind: "done",
            label: "Budget exhausted — partial response",
            status: "failed",
          };
          addStep(step);
          break;
        }

        case "error": {
          setThinking(false);
          addMessage({ role: "system", text: `Agent error: ${event.message}` });
          break;
        }
      }
    },
    [setThinking, addTokens, setLatency, appendStreamDelta, commitStreamedSuggestion, setPendingAction, addMessage, addStep, updateStep, addEvidence, clearTurn]
  );

  const send = useCallback(
    (customerMessage: string) => {
      // Cancel any running stream
      if (cancelRef.current) {
        cancelRef.current();
        cancelRef.current = null;
      }

      addMessage({ role: "customer", text: customerMessage });
      setThinking(true);

      const sessionId = useSessionStore.getState().sessionId;

      // Use real SSE when a real (non-mock) session id is available
      if (sessionId && !sessionId.startsWith("mock-")) {
        const url = `/api/turn?session_id=${encodeURIComponent(sessionId)}&message=${encodeURIComponent(customerMessage)}`;
        const es = new EventSource(url);

        es.onmessage = (e: MessageEvent) => {
          try {
            const event = JSON.parse(e.data as string) as AgentEvent;
            handleEvent(event);
            // Close cleanly once the backend signals it's done — this prevents
            // EventSource from treating the server-side close as an error.
            if (event.type === "done" || event.type === "budget_exhausted" || event.type === "error") {
              es.close();
              cancelRef.current = null;
            }
          } catch {
            // ignore malformed frames
          }
        };

        es.onerror = () => {
          // Only report an error if we haven't already closed cleanly via a done/error event
          if (cancelRef.current) {
            handleEvent({ type: "error", message: "Connection to backend lost" });
            es.close();
            cancelRef.current = null;
          }
        };

        cancelRef.current = () => es.close();
      } else {
        // Fallback: mock stream (backend not running)
        cancelRef.current = startMockStream(handleEvent, "demo");
      }
    },
    [addMessage, setThinking, handleEvent]
  );

  const cancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    setThinking(false);
  }, [setThinking]);

  return { send, cancel };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summarize(toolName: string, result: unknown): string {
  if (!result || typeof result !== "object") return String(result);
  const r = result as Record<string, unknown>;

  const parts: string[] = [];
  const interestingKeys = ["signal", "online", "uptime", "outage_active", "status", "new_signal"];
  for (const key of interestingKeys) {
    if (key in r) parts.push(`${key}=${JSON.stringify(r[key])}`);
  }
  if (r.docs && Array.isArray(r.docs)) {
    parts.push(`${r.docs.length} docs`);
  }
  return parts.length ? parts.join(", ") : JSON.stringify(r).slice(0, 80);
}

let synthStepId: string | null = null;

function findOrCreateSynthStep(
  addStep: (s: ReasoningStep) => void,
  counter: number
): { id: string; counter: number } {
  if (synthStepId) return { id: synthStepId, counter };
  const id = `step-${counter + 1}`;
  synthStepId = id;
  addStep({
    id,
    kind: "synthesizing",
    label: "Synthesizing reply…",
    status: "active",
  });
  return { id, counter: counter + 1 };
}
