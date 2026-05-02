import { create } from "zustand";
import type { ReasoningStep, Evidence } from "@/lib/types";

interface AgentState {
  steps: ReasoningStep[];
  evidence: Evidence[];
  activeTab: "reasoning" | "evidence" | "trace";

  // Actions
  addStep: (step: ReasoningStep) => void;
  updateStep: (id: string, patch: Partial<ReasoningStep>) => void;
  addEvidence: (e: Evidence) => void;
  setActiveTab: (tab: AgentState["activeTab"]) => void;
  clearTurn: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  steps: [],
  evidence: [],
  activeTab: "reasoning",

  addStep: (step) =>
    set((s) => ({ steps: [...s.steps, step] })),

  updateStep: (id, patch) =>
    set((s) => ({
      steps: s.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    })),

  addEvidence: (e) =>
    set((s) => ({ evidence: [e, ...s.evidence] })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  clearTurn: () =>
    set((s) => ({
      // Mark all active steps as done, keep history visible but faded
      steps: s.steps.map((step) =>
        step.status === "active" ? { ...step, status: "done" as const } : step
      ),
    })),
}));
