"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useConversationStore } from "@/store/conversationStore";
import { useSessionStore } from "@/store/sessionStore";

export function ProposedActionStrip() {
  const pendingAction = useConversationStore((s) => s.pendingAction);
  const { setPendingAction } = useConversationStore();
  const sessionId = useSessionStore((s) => s.sessionId);

  const resolveApproval = async (approved: boolean) => {
    if (pendingAction && sessionId && !sessionId.startsWith("mock-")) {
      await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          tool_call_id: pendingAction.toolCallId,
          approved,
        }),
      }).catch(() => {});
    }
    setPendingAction(null);
  };

  const approve = () => resolveApproval(true);
  const reject = () => resolveApproval(false);

  return (
    <AnimatePresence>
      {pendingAction && (
        <motion.div
          key="approval-strip"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mx-6 mb-3 overflow-hidden"
        >
          <div
            className="rounded-lg px-4 py-3"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--warning)",
              borderLeft: "3px solid var(--warning)",
              boxShadow: "0 0 0 3px color-mix(in srgb, var(--warning) 12%, transparent)",
            }}
            role="alertdialog"
            aria-label="Approval required"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium mb-0.5" style={{ color: "var(--warning)" }}>
                  ⚠ Action requires your approval: <strong style={{ color: "var(--text-primary)" }}>{pendingAction.tool.replace(/_/g, " ")}</strong>
                </div>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                  Click <strong>Approve</strong> to execute this action, or <strong>Reject</strong> to cancel.
                </div>
                <details className="mt-1">
                  <summary
                    className="text-xs cursor-pointer select-none"
                    style={{ color: "var(--accent)" }}
                  >
                    Details ▾
                  </summary>
                  <pre
                    className="mt-1 text-[11px] mono overflow-x-auto rounded p-2"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {JSON.stringify(pendingAction.input, null, 2)}
                  </pre>
                </details>
              </div>
              <div className="flex gap-2 flex-shrink-0 mt-0.5">
                <button
                  onClick={approve}
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: "var(--success)", color: "#fff" }}
                  aria-keyshortcuts="Meta+."
                >
                  Approve
                </button>
                <button
                  onClick={reject}
                  className="px-3 py-1.5 rounded-md text-xs"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  aria-keyshortcuts="Meta+Shift+."
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
