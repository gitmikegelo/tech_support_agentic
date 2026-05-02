"use client";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { isConnected, isThinking, model, totalTokens, tokenBudget, lastLatencyMs, traceFile } =
    useSessionStore();

  const [_, forceUpdate] = useState(0);
  // Refresh every second for live display
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const dotColor = !isConnected
    ? "var(--danger)"
    : isThinking
    ? "var(--accent)"
    : "var(--success)";

  const dotLabel = !isConnected ? "disconnected" : isThinking ? "thinking" : "ready";

  return (
    <div
      className="h-8 flex items-center gap-4 px-4 flex-shrink-0 mono text-[11px]"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        backgroundColor: "var(--bg-dark)",
        color: "var(--text-on-dark-muted)",
      }}
      role="status"
      aria-label="Agent status"
    >
      {/* Connection dot */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn("inline-block w-1.5 h-1.5 rounded-full", isThinking && "animate-pulse")}
          style={{ backgroundColor: dotColor }}
          aria-label={dotLabel}
        />
        <span style={{ color: "var(--text-on-dark-muted)" }}>{dotLabel}</span>
      </div>

      <Divider />

      {/* Model */}
      <span style={{ color: "var(--text-on-dark-muted)" }}>{model}</span>

      <Divider />

      {/* Token budget */}
      <span
        style={{
          color:
            totalTokens > tokenBudget * 0.8
              ? "var(--warning)"
              : "var(--text-on-dark-muted)",
        }}
      >
        tokens {totalTokens.toLocaleString()} / {tokenBudget.toLocaleString()}
      </span>

      {/* Latency */}
      {lastLatencyMs !== null && (
        <>
          <Divider />
          <span style={{ color: "var(--text-on-dark-muted)" }}>p50 {lastLatencyMs}ms</span>
        </>
      )}

      {/* Trace file */}
      {traceFile && (
        <>
          <Divider />
          <span
            className="cursor-pointer transition-colors truncate max-w-[200px]"
            style={{ color: "var(--accent-light)" }}
            title={traceFile}
          >
            {traceFile.split(/[/\\]/).pop()}
          </span>
        </>
      )}
    </div>
  );
}

function Divider() {
  return (
    <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
  );
}
