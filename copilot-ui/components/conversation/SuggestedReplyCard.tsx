"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConversationStore } from "@/store/conversationStore";
import { useSessionStore } from "@/store/sessionStore";
import { useAgentStream } from "@/hooks/useAgentStream";
import { cn } from "@/lib/utils";

/** Renders citation superscripts inline in suggestion text */
function CitedText({ text }: { text: string }) {
  // Parse [tool:name] or [kb:name] citations and render as superscripts
  const parts = text.split(/(\[\w+:[^\]]+\])/g);
  let citIndex = 0;
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\w+):([^\]]+)\]$/);
        if (match) {
          citIndex++;
          return (
            <sup
              key={i}
              className="text-[10px] font-mono cursor-pointer"
              style={{ color: "var(--accent)" }}
              title={`${match[1]}:${match[2]}`}
            >
              {citIndex}
            </sup>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function SuggestedReplyCard() {
  const suggestion = useConversationStore((s) => s.suggestion);
  const streamingText = useConversationStore((s) => s.streamingText);
  const { useReply, dismissSuggestion, setSuggestion } = useConversationStore();
  const sessionId = useSessionStore((s) => s.sessionId);
  const { send } = useAgentStream();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // Show either the committed suggestion or the live stream
  const isStreaming = !suggestion && !!streamingText;
  const displayText = suggestion?.text ?? streamingText;

  if (!displayText) return null;

  const confidence = suggestion?.confidence ?? null;
  const confPercent = confidence !== null ? Math.round(confidence * 100) : null;
  const confLow = confidence !== null && confidence < 0.6;

  const handleEdit = () => {
    setEditText(suggestion?.text ?? "");
    setEditing(true);
  };

  const handleEditSave = () => {
    if (suggestion) {
      setSuggestion({ ...suggestion, text: editText });
    }
    setEditing(false);
  };

  const handleCopyAndUse = () => {
    const repText = editing ? editText : (suggestion?.text ?? "");
    useReply();
    // After the rep sends the suggestion, generate the customer's next reply
    if (sessionId && !sessionId.startsWith("mock-") && repText) {
      fetch("/api/customer/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, rep_message: repText }),
      })
        .then((r) => r.json())
        .then((data: { message: string }) => send(data.message))
        .catch(() => {/* backend down — no auto-reply */});
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="suggestion-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mx-6 mb-4 rounded-xl overflow-hidden"
        style={{
          border: `1px solid ${suggestion?.partialInfo ? "var(--warning)" : "var(--accent-subtle)"}`,
          backgroundColor: "var(--bg-surface)",
          boxShadow: suggestion?.partialInfo
            ? "inset 3px 0 0 var(--warning)"
            : "inset 3px 0 0 var(--accent)",
        }}
        role="region"
        aria-label="Suggested reply"
        aria-live="polite"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--accent-subtle)", backgroundColor: "var(--accent-muted)" }}
        >
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            <span style={{ color: "var(--accent)" }}>◆</span>
            <span>Suggested Reply</span>
            {suggestion?.criticReviewed && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--success) 15%, transparent)",
                  color: "var(--success)",
                }}
              >
                Reviewed by critic
              </span>
            )}
          </div>
          {confPercent !== null && (
            <span
              className="mono text-xs px-1.5 py-0.5 rounded font-medium"
              style={{
                color: confLow ? "var(--warning)" : "var(--success)",
                backgroundColor: confLow ? "var(--warning-muted)" : "var(--success-muted)",
              }}
            >
              {confPercent}% conf.
            </span>
          )}
          {isStreaming && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Generating…
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {editing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              autoFocus
              className="w-full resize-none bg-transparent focus:outline-none text-sm"
              style={{ color: "var(--text-primary)" }}
              aria-label="Edit suggested reply"
            />
          ) : (
            <>
              <CitedText text={displayText} />
              {isStreaming && (
                <span
                  className="inline-block w-[1px] h-[13px] ml-0.5 align-middle"
                  style={{
                    backgroundColor: "var(--text-primary)",
                    animation: "pulse 1s ease-in-out infinite",
                    opacity: 0.7,
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Partial info warning */}
        {suggestion?.partialInfo && (
          <div
            className="px-4 py-2 text-xs"
            style={{
              color: "var(--warning)",
              borderTop: "1px solid var(--border)",
            }}
          >
            ⚠ Partial information — agent could not verify all claims.
          </div>
        )}

        {/* Actions */}
        {suggestion && !isStreaming && (
          <div
            className="flex gap-2 px-4 py-2.5"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {editing ? (
              <>
                <button
                  onClick={handleEditSave}
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-md text-xs"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopyAndUse}
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                  aria-keyshortcuts="Meta+Enter"
                >
                  Use reply
                </button>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 rounded-md text-xs"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                  aria-keyshortcuts="Meta+E"
                >
                  Edit
                </button>
                <button
                  className="px-3 py-1.5 rounded-md text-xs"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                  aria-keyshortcuts="Meta+R"
                >
                  Regenerate
                </button>
                <button
                  onClick={dismissSuggestion}
                  className="px-3 py-1.5 rounded-md text-xs ml-auto"
                  style={{ color: "var(--text-muted)" }}
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
