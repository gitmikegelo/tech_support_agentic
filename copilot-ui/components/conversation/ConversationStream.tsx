"use client";
import { useEffect, useRef } from "react";
import { useConversationStore } from "@/store/conversationStore";
import { useSessionStore } from "@/store/sessionStore";
import { useAgentStream } from "@/hooks/useAgentStream";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

export function ConversationStream() {
  const messages = useConversationStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Auto-scroll unless user has scrolled up
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("flex-1 overflow-y-auto px-6 py-4 space-y-4")}
      aria-live="polite"
      aria-label="Conversation"
    >
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ready.{" "}
            <span
              className="inline-block w-[1px] h-[14px] ml-1 align-middle animate-pulse"
              style={{ backgroundColor: "var(--text-muted)" }}
            />
          </p>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {useSessionStore().callEnded && (
        <div className="flex justify-center mt-4">
          <span
            className="text-xs px-3 py-1 rounded-full"
            style={{
              color: "rgb(239,68,68)",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)"
            }}
          >
            Call ended
          </span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.role === "customer";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span
          className="text-xs px-3 py-1 rounded-full"
          style={{
            color: "var(--warning)",
            backgroundColor: "color-mix(in srgb, var(--warning) 12%, transparent)",
          }}
        >
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", isCustomer ? "items-start" : "items-end")}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {isCustomer ? "Customer" : "Rep"}
      </span>
      <div
        className={cn("max-w-[80%] px-4 py-2.5 rounded-lg text-sm leading-relaxed")}
        style={
          isCustomer
            ? {
                backgroundColor: "#EFF6FF",
                color: "var(--text-primary)",
                border: "1px solid #BFDBFE",
              }
            : {
                color: "var(--text-primary)",
                backgroundColor: "var(--accent-muted)",
                border: "1px solid var(--accent-subtle)",
              }
        }
      >
        {message.text}
      </div>
    </div>
  );
}

export function InputArea() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { send } = useAgentStream();
  const { callEnded } = useSessionStore();

  const handleSend = () => {
    if (callEnded) return;
    const val = textareaRef.current?.value.trim();
    if (!val) return;
    send(val);
    if (textareaRef.current) textareaRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="px-6 pb-4 pt-2"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <textarea
        ref={textareaRef}
        rows={2}
        onKeyDown={handleKeyDown}
        placeholder={callEnded ? "Call has ended..." : "Type what the customer is saying…"}
        disabled={callEnded}
        className={cn(
          "w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none",
          callEnded ? "opacity-50 cursor-not-allowed" : ""
        )}
        style={{
          backgroundColor: callEnded ? "var(--bg-surface)" : "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
        aria-label="Customer message input"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSend}
          disabled={callEnded}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Send
        </button>
        <button
          disabled={callEnded}
          className="px-3 py-1.5 rounded-md text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          Ask agent to elaborate
        </button>
        <button
          className="px-3 py-1.5 rounded-md text-xs transition-colors ml-auto"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--success)",
          }}
        >
          Mark resolved
        </button>
      </div>
    </div>
  );
}
