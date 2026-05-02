import { create } from "zustand";
import type { Customer } from "@/lib/types";

interface IncomingCall {
  sessionId: string;
  customer: Customer;
}

interface UIState {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  commandPaletteOpen: boolean;
  traceModalOpen: boolean;
  incomingCall: IncomingCall | null;

  setLeftCollapsed: (v: boolean) => void;
  setRightCollapsed: (v: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (v: boolean) => void;
  toggleTraceModal: () => void;
  showIncomingCall: (data: IncomingCall) => void;
  dismissIncomingCall: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftCollapsed: false,
  rightCollapsed: false,
  commandPaletteOpen: false,
  traceModalOpen: false,
  incomingCall: null,

  setLeftCollapsed: (v) => set({ leftCollapsed: v }),
  setRightCollapsed: (v) => set({ rightCollapsed: v }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  toggleTraceModal: () => set((s) => ({ traceModalOpen: !s.traceModalOpen })),
  showIncomingCall: (data) => set({ incomingCall: data }),
  dismissIncomingCall: () => set({ incomingCall: null }),
}));
