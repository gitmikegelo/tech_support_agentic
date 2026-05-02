"use client";
import { useCallback, useEffect, useRef } from "react";
import { useUIStore } from "@/store/uiStore";
import { useSessionStore } from "@/store/sessionStore";
import { useConversationStore } from "@/store/conversationStore";
import { useAgentStream } from "@/hooks/useAgentStream";
import { LeftRail } from "@/components/layout/LeftRail";
import { StatusBar } from "@/components/layout/StatusBar";
import { Header } from "@/components/layout/Header";
import { ConversationStream } from "@/components/conversation/ConversationStream";
import { ProposedActionStrip } from "@/components/conversation/ProposedActionStrip";
import { AgentWorkbench } from "@/components/workbench/AgentWorkbench";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { IncomingCallModal } from "@/components/IncomingCallModal";

export default function CopilotPage() {
  const leftCollapsed = useUIStore((s) => s.leftCollapsed);
  const rightCollapsed = useUIStore((s) => s.rightCollapsed);
  const { showIncomingCall, dismissIncomingCall, incomingCall } = useUIStore();
  const { startSession } = useSessionStore();
  const { addMessage } = useConversationStore();
  const { send } = useAgentStream();
  // Keep pending session data around until the agent answers
  const pendingSession = useRef<{ session_id: string; customer: any } | null>(null);

  useEffect(() => {
    const { sessionId } = useSessionStore.getState();
    if (!sessionId) {
      fetch("/api/session", { method: "POST" })
        .then((r) => r.json())
        .then((data: { session_id: string; customer: any }) => {
          pendingSession.current = data;
          if (data.customer) {
            showIncomingCall({ sessionId: data.session_id, customer: data.customer });
          } else {
            // No customer data — start immediately (fallback)
            startSession(data.session_id);
          }
        })
        .catch(() => {
          // Backend not running — fall back to a local mock session id
          startSession("mock-" + Math.random().toString(36).slice(2));
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = useCallback(() => {
    const data = pendingSession.current;
    dismissIncomingCall();
    if (!data) return;

    const { setCustomer } = useSessionStore.getState();
    startSession(data.session_id);
    if (data.customer) setCustomer(data.customer);

    // Agent greets the customer first before the customer speaks
    addMessage({
      role: "rep",
      text: "Thank you for calling Prudential support. This is your AI-assisted representative. How can I help you today?",
    });

    // Then generate the customer's opening message
    fetch(`/api/customer/start?session_id=${encodeURIComponent(data.session_id)}`, {
      method: "POST",
    })
      .then((r) => r.json())
      .then((msg: { message: string }) => {
        send(msg.message);
      })
      .catch(() => {});
  }, [dismissIncomingCall, startSession, addMessage, send]);

  const handleDrop = useCallback(() => {
    dismissIncomingCall();
    pendingSession.current = null;
  }, [dismissIncomingCall]);

  const handleDemoSession = useCallback((scenario: "patricia" | "marcus") => {
    fetch("/api/demo-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    })
      .then((r) => r.json())
      .then((data: { session_id: string; customer: any }) => {
        pendingSession.current = data;
        if (data.customer) {
          showIncomingCall({ sessionId: data.session_id, customer: data.customer });
        }
      })
      .catch(() => {});
  }, [showIncomingCall]);

  return (
    <>
      <KeyboardShortcuts />
      <CommandPalette />
      <IncomingCallModal onAnswer={handleAnswer} onDrop={handleDrop} onDemoSession={handleDemoSession} />
      <div className="flex flex-col h-full" style={{ backgroundColor: "var(--bg-base)" }}>
        <Header />
        <div className="flex flex-1 min-h-0">
          <LeftRail collapsed={leftCollapsed} />
          <main
            className="flex-1 flex flex-col min-w-0 min-h-0"
            style={{ borderRight: "1px solid var(--border)" }}
            aria-label="Conversation"
          >
            <ConversationStream />
            <ProposedActionStrip />
          </main>
          {!rightCollapsed && (
            <aside className="w-[420px] flex-shrink-0 flex flex-col min-h-0" aria-label="Agent workbench">
              <AgentWorkbench />
            </aside>
          )}
        </div>
        <StatusBar />
      </div>
    </>
  );
}