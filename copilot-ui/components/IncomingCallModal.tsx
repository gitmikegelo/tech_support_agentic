"use client";

import { useEffect, useRef } from "react";
import { Phone, PhoneOff, User, Clapperboard } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

interface Props {
  onAnswer: () => void;
  onDrop: () => void;
  onDemoSession?: (scenario: "patricia" | "marcus") => void;
}

export function IncomingCallModal({ onAnswer, onDrop, onDemoSession }: Props) {
  const incomingCall = useUIStore((s) => s.incomingCall);
  const answerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (incomingCall) {
      answerRef.current?.focus();
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  const { customer } = incomingCall;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      aria-modal="true"
      role="dialog"
      aria-label="Incoming customer call"
    >
      <div
        className="relative flex flex-col items-center gap-6 rounded-2xl px-10 py-10 shadow-2xl"
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          minWidth: 340,
          maxWidth: 400,
        }}
      >
        {/* Pulsing ring */}
        <div className="relative flex items-center justify-center">
          <span
            className="absolute rounded-full animate-ping"
            style={{
              width: 88,
              height: 88,
              backgroundColor: "rgba(34,197,94,0.25)",
            }}
          />
          <span
            className="absolute rounded-full"
            style={{
              width: 72,
              height: 72,
              backgroundColor: "rgba(34,197,94,0.15)",
            }}
          />
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{ width: 56, height: 56, background: "var(--accent)", flexShrink: 0 }}
          >
            <User size={26} color="#fff" />
          </div>
        </div>

        {/* Call info */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Incoming Call
          </p>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {customer.name}
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              {customer.service_tier}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background:
                  customer.account_status === "active"
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.15)",
                color:
                  customer.account_status === "active"
                    ? "rgb(34,197,94)"
                    : "rgb(239,68,68)",
              }}
            >
              {customer.account_status}
            </span>
          </div>
          {customer.location && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {customer.location}
            </p>
          )}
          {customer.recent_tickets && customer.recent_tickets.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Last ticket:{" "}
              <span style={{ color: "var(--text-secondary)" }}>
                {customer.recent_tickets[0].issue}
              </span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6 mt-2">
          {/* Drop */}
          <button
            onClick={onDrop}
            className="flex flex-col items-center gap-2 group focus:outline-none"
            aria-label="Drop call"
          >
            <span
              className="flex items-center justify-center rounded-full transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-red-400"
              style={{ width: 56, height: 56, background: "rgb(239,68,68)" }}
            >
              <PhoneOff size={22} color="#fff" />
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Drop
            </span>
          </button>

          {/* Answer */}
          <button
            ref={answerRef}
            onClick={onAnswer}
            className="flex flex-col items-center gap-2 group focus:outline-none"
            aria-label="Answer call"
          >
            <span
              className="flex items-center justify-center rounded-full transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-green-400"
              style={{ width: 56, height: 56, background: "rgb(34,197,94)" }}
            >
              <Phone size={22} color="#fff" />
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Answer
            </span>
          </button>
        </div>

        {/* Demo scenario shortcuts */}
        {onDemoSession && (
          <div className="flex flex-col items-center gap-2 w-full mt-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Demo Scenarios
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => onDemoSession("patricia")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:opacity-80 focus:outline-none"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                aria-label="Load simple demo scenario"
              >
                <Clapperboard size={13} />
                Simple — Billing Triage
              </button>
              <button
                onClick={() => onDemoSession("marcus")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:opacity-80 focus:outline-none"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                aria-label="Load complex demo scenario"
              >
                <Clapperboard size={13} />
                Complex — Field Dispatch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
