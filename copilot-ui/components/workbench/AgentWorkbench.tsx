"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agentStore";
import { useSessionStore } from "@/store/sessionStore";
import { useConversationStore } from "@/store/conversationStore";
import { useAgentStream } from "@/hooks/useAgentStream";
import { cn } from "@/lib/utils";
import type { ReasoningStep, Evidence } from "@/lib/types";

// ---------------------------------------------------------------------------
// Workbench wrapper (tabs)
// ---------------------------------------------------------------------------

export function AgentWorkbench() {
  const activeTab = useAgentStore((s) => s.activeTab);
  const setActiveTab = useAgentStore((s) => s.setActiveTab);
  const traceFile = useSessionStore((s) => s.traceFile);

  const tabs: { id: typeof activeTab; label: string; shortcut: string }[] = [
    { id: "reasoning", label: "Reasoning", shortcut: "⌘1" },
    { id: "evidence", label: "Evidence", shortcut: "⌘2" },
    { id: "trace", label: "Trace", shortcut: "⌘3" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div
        className="flex gap-1 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "2px solid var(--accent-subtle)" }}
        role="tablist"
        aria-label="Agent workbench"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs transition-colors relative",
              activeTab === tab.id
                ? "font-semibold"
                : "opacity-60 hover:opacity-80"
            )}
            style={
              activeTab === tab.id
                ? { backgroundColor: "var(--accent)", color: "#fff" }
                : { color: "var(--text-muted)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — top half, scrollable */}
      <div className="flex-1 min-h-0 overflow-hidden" role="tabpanel">
        {activeTab === "reasoning" && <ReasoningTab />}
        {activeTab === "evidence" && <EvidenceTab />}
        {activeTab === "trace" && <TraceTab traceFile={traceFile} />}
      </div>

      {/* Reply composer — always visible bottom section */}
      <ReplyComposer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reasoning timeline
// ---------------------------------------------------------------------------

function ReasoningTab() {
  const steps = useAgentStore((s) => s.steps);
  const isThinking = useSessionStore((s) => s.isThinking);

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-0" aria-label="Reasoning timeline">
      {steps.length === 0 && (
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          The agent hasn&apos;t started reasoning yet.
        </p>
      )}
      {steps.map((step, i) => (
        <ReasoningStepRow key={step.id} step={step} isLast={i === steps.length - 1} />
      ))}
      {isThinking && steps.length === 0 && (
        <div className="flex items-center gap-2 mt-2">
          <PulsingDot color="var(--accent)" />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Agent is thinking…
          </span>
        </div>
      )}
    </div>
  );
}

function ReasoningStepRow({ step, isLast }: { step: ReasoningStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = step.detail !== undefined;

  const dotColor =
    step.status === "active"
      ? "var(--accent)"
      : step.status === "done"
      ? "var(--success)"
      : step.status === "failed"
      ? "var(--danger)"
      : "var(--warning)";

  const statusIcon =
    step.status === "active" ? <PulsingDot color={dotColor} /> :
    step.status === "done" ? <FilledDot color={dotColor} /> :
    step.status === "failed" ? <OutlineDot color={dotColor} /> :
    <PulsingDot color={dotColor} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3"
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="mt-2.5">{statusIcon}</div>
        {!isLast && (
          <div
            className="w-px flex-1 mt-1 min-h-[16px]"
            style={{ backgroundColor: "var(--border)" }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-3">
        <button
          onClick={() => hasDetail && setExpanded((v) => !v)}
          className={cn(
            "flex items-center justify-between w-full text-left gap-2",
            hasDetail && "cursor-pointer"
          )}
          disabled={!hasDetail}
        >
          <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {step.label}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {step.latency_ms !== undefined && (
              <span className="mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                {step.latency_ms}ms
              </span>
            )}
            {hasDetail && (
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {expanded ? "▴" : "▾"}
              </span>
            )}
          </div>
        </button>

        {expanded && hasDetail && (
          <motion.pre
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mono text-[11px] overflow-x-auto rounded mt-1.5 p-2 leading-relaxed"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-muted)",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {JSON.stringify(step.detail, null, 2)}
          </motion.pre>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Evidence tab
// ---------------------------------------------------------------------------

function EvidenceTab() {
  const evidence = useAgentStore((s) => s.evidence);
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? evidence.filter(
        (e) =>
          e.source.toLowerCase().includes(filter.toLowerCase()) ||
          e.summary.toLowerCase().includes(filter.toLowerCase())
      )
    : evidence;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <input
          type="search"
          placeholder="Filter evidence…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-1.5 rounded-md text-xs focus:outline-none"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          aria-label="Filter evidence"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {filtered.length === 0 && (
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            {evidence.length === 0
              ? "The agent hasn't gathered any evidence yet."
              : "No evidence matches the filter."}
          </p>
        )}
        {filtered.map((e) => (
          <EvidenceCard key={e.id} evidence={e} />
        ))}
      </div>
    </div>
  );
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const [expanded, setExpanded] = useState(false);
  const age = formatAge(evidence.timestamp);

  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer group transition-all"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
      aria-expanded={expanded}
    >
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] mono font-medium flex-shrink-0 px-1.5 py-0.5 rounded"
            style={{
              color: evidence.sourceType === "kb" ? "var(--success)" : "var(--accent)",
              backgroundColor: evidence.sourceType === "kb" ? "var(--success-muted)" : "var(--accent-muted)",
            }}
          >
            {evidence.source}
          </span>
          <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {evidence.summary}
          </span>
        </div>
        <span className="mono text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          {age}
        </span>
      </div>
      {expanded && (
        <motion.pre
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          className="mono text-[11px] px-3 pb-2 overflow-x-auto leading-relaxed"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
        >
          {JSON.stringify(evidence.raw, null, 2)}
        </motion.pre>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trace tab
// ---------------------------------------------------------------------------

function TraceTab({ traceFile }: { traceFile: string | null }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 gap-2">
      {traceFile ? (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Trace file:
          </p>
          <code
            className="mono text-[11px] text-center break-all"
            style={{ color: "var(--accent)" }}
          >
            {traceFile}
          </code>
          <p className="text-[10px] mt-2 text-center" style={{ color: "var(--text-muted)" }}>
            Open the file locally to inspect raw JSONL events.
          </p>
        </>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          No active trace session.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small dot components
// ---------------------------------------------------------------------------

function PulsingDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block rounded-full w-2 h-2 animate-pulse"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

function FilledDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block rounded-full w-2 h-2"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

function OutlineDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block rounded-full w-2 h-2"
      style={{ border: `1.5px solid ${color}` }}
      aria-hidden
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAge(timestamp: number): string {
  const secs = Math.floor((Date.now() - timestamp) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

// ---------------------------------------------------------------------------
// Reply Composer — bottom panel (always visible)
// ---------------------------------------------------------------------------

function ReplyComposer() {
  const streamingText = useConversationStore((s) => s.streamingText);
  const suggestion = useConversationStore((s) => s.suggestion);
  const { setSuggestion, addMessage } = useConversationStore();
  const sessionId = useSessionStore((s) => s.sessionId);
  const callEnded = useSessionStore((s) => s.callEnded);
  const { send } = useAgentStream();
  const [replyText, setReplyText] = useState("");
  const [copied, setCopied] = useState(false);
  const [height, setHeight] = useState(350);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = !suggestion && !!streamingText;
  const displayText = suggestion?.text ?? (isStreaming ? streamingText : "");
  const analysisText = suggestion?.analysis ?? (isStreaming ? streamingText : "");

  // Reset reply field when a new suggestion arrives
  useEffect(() => {
    if (suggestion) setReplyText("");
  }, [suggestion?.id]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const handlePointerMove = (evt: PointerEvent) => {
      const deltaY = startY - evt.clientY;
      const newHeight = startHeight + deltaY;
      setHeight(Math.max(150, Math.min(window.innerHeight - 100, newHeight)));
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
    };

    document.body.style.cursor = "row-resize";
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handleCopyToField = () => {
    if (!suggestion?.text) return;
    setReplyText(suggestion.text);
    textareaRef.current?.focus();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSend = () => {
    const text = replyText.trim();
    if (!text) return;
    addMessage({ role: "rep", text });
    setSuggestion(null);
    setReplyText("");
    if (sessionId && !sessionId.startsWith("mock-")) {
      fetch("/api/customer/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, rep_message: text }),
      })
        .then((r) => r.json())
        .then((data: { message: string }) => send(data.message))
        .catch(() => {});
    }
  };

  const handleDismiss = () => setSuggestion(null);

  return (
    <div
      className="flex-shrink-0 flex flex-col relative"
      style={{
        borderTop: "2px solid var(--border)",
        height: `${height}px`,
        minHeight: 150,
      }}
    >
      {/* Resizer Handle */}
      <div
        onPointerDown={handlePointerDown}
        className="absolute top-0 -mt-1 left-0 right-0 h-2 cursor-row-resize z-10 transition-colors hover:bg-black/10"
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--accent)" }}>◆</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            Copilot Reply
          </span>
        </div>
        {isStreaming && (
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Generating…
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 px-4 py-3">

        {/* ── Agent analysis ──────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
            Agent analysis
          </p>
          <div
            className="text-xs leading-relaxed whitespace-pre-wrap rounded-lg p-3"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: analysisText ? "var(--text-primary)" : "var(--text-muted)",
              minHeight: 48,
            }}
          >
            {analysisText ? (
              <>
                {analysisText}
                {isStreaming && (
                  <span
                    className="inline-block w-[1px] h-[12px] ml-0.5 align-middle animate-pulse"
                    style={{ backgroundColor: "var(--text-primary)", opacity: 0.7 }}
                  />
                )}
              </>
            ) : (
              <span className="italic">Waiting for agent…</span>
            )}
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px dashed var(--border)" }} />

        {/* ── Suggested wording quote ──────────────────────────────────── */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
            Suggested wording
          </p>
          <div
            className="relative rounded-lg p-3 text-xs leading-relaxed"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--accent)",
              color: displayText ? "var(--text-primary)" : "var(--text-muted)",
              minHeight: 48,
            }}
          >
            {displayText ? (
              displayText
            ) : (
              <span className="italic">Suggested reply will appear here…</span>
            )}
            {suggestion && !isStreaming && (
              <button
                onClick={handleCopyToField}
                title="Copy to reply field"
                className="absolute top-2 right-2 rounded p-1 transition-colors"
                style={{
                  backgroundColor: copied ? "color-mix(in srgb, var(--success) 15%, transparent)" : "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: copied ? "var(--success)" : "var(--text-muted)",
                }}
                aria-label="Copy suggestion to reply field"
              >
                {copied ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
                    <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
                  </svg>
                )}
              </button>
            )}
          </div>
          {suggestion && !isStreaming && (
            <button
              onClick={handleDismiss}
              className="mt-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Dismiss suggestion
            </button>
          )}
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px dashed var(--border)" }} />

        {/* ── Your reply field ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Your reply
          </p>
          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={callEnded}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={callEnded ? "Call has ended..." : "Edit the suggestion or write your own reply…"}
            className={cn(
              "w-full flex-1 min-h-[64px] resize-none rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-1",
              callEnded ? "opacity-50 cursor-not-allowed" : ""
            )}
            style={{
              backgroundColor: callEnded ? "var(--bg-surface)" : "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              accentColor: "var(--accent)"
            }}
            aria-label="Your reply"
          />
          <div className="flex items-center justify-between mt-auto">
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {isStreaming ? "Waiting for suggestion..." : "⌘ + Enter to send"}
            </span>
            <button
              onClick={handleSend}
              disabled={!replyText.trim() || isStreaming || callEnded}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: replyText.trim() && !isStreaming && !callEnded ? "var(--accent)" : "var(--bg-elevated)",
                color: replyText.trim() && !isStreaming && !callEnded ? "#fff" : "var(--text-muted)",
                border: replyText.trim() && !isStreaming && !callEnded ? "none" : "1px solid var(--border)",
              }}
            >
              Send to Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
