import { create } from "zustand";
import type { Customer } from "@/lib/types";

interface SessionState {
  sessionId: string | null;
  customer: Customer | null;
  callStartMs: number | null;
  isConnected: boolean;
  isThinking: boolean;
  model: string;
  totalTokens: number;
  tokenBudget: number;
  lastLatencyMs: number | null;
  traceFile: string | null;
  callEnded: boolean;

  // Actions
  startSession: (sessionId: string) => void;
  setCustomer: (customer: Customer) => void;
  setConnected: (v: boolean) => void;
  setThinking: (v: boolean) => void;
  addTokens: (n: number) => void;
  setLatency: (ms: number) => void;
  setTraceFile: (path: string) => void;
  setCallEnded: (v: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  customer: null,
  callStartMs: null,
  isConnected: false,
  isThinking: false,
  model: "haiku-4.5",
  totalTokens: 0,
  tokenBudget: 20000,
  lastLatencyMs: null,
  traceFile: null,
  callEnded: false,

  startSession: (sessionId) =>
    set({ sessionId, callStartMs: Date.now(), isConnected: true, callEnded: false }),
  setCustomer: (customer) => set({ customer }),
  setConnected: (v) => set({ isConnected: v }),
  setThinking: (v) => set({ isThinking: v }),
  addTokens: (n) => set((s) => ({ totalTokens: s.totalTokens + n })),
  setLatency: (ms) => set({ lastLatencyMs: ms }),
  setTraceFile: (path) => set({ traceFile: path }),
  setCallEnded: (v) => set({ callEnded: v }),
  reset: () =>
    set({
      sessionId: null,
      customer: null,
      callStartMs: null,
      isConnected: false,
      isThinking: false,
      totalTokens: 0,
      lastLatencyMs: null,
      traceFile: null,
      callEnded: false,
    }),
}));
