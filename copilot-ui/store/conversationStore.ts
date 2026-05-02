import { create } from "zustand";
import type { Message, Suggestion, PendingAction } from "@/lib/types";

interface ConversationState {
  messages: Message[];
  suggestion: Suggestion | null;
  pendingAction: PendingAction | null;
  streamingText: string;

  // Actions
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  setSuggestion: (s: Suggestion | null) => void;
  setPendingAction: (a: PendingAction | null) => void;
  appendStreamDelta: (text: string) => void;
  commitStreamedSuggestion: (confidence: number, citations: Suggestion["citations"], criticReviewed: boolean, partialInfo: boolean) => void;
  clearStream: () => void;
  useReply: () => void;
  dismissSuggestion: () => void;
  reset: () => void;
}

let msgCounter = 0;

export const useConversationStore = create<ConversationState>((set, get) => ({
  messages: [],
  suggestion: null,
  pendingAction: null,
  streamingText: "",

  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: `msg-${++msgCounter}`, timestamp: Date.now() },
      ],
    })),

  setSuggestion: (s) => set({ suggestion: s }),

  setPendingAction: (a) => set({ pendingAction: a }),

  appendStreamDelta: (text) =>
    set((s) => ({ streamingText: s.streamingText + text })),

  commitStreamedSuggestion: (confidence, citations, criticReviewed, partialInfo) =>
    set((s) => {
      const raw = s.streamingText;
      const analysisMatch = raw.match(/<analysis>([\s\S]*?)<\/analysis>/i);
      const replyMatch = raw.match(/<reply>([\s\S]*?)<\/reply>/i);
      const analysis = analysisMatch ? analysisMatch[1].trim() : "";
      // If no <reply> tag found, fall back to full text so nothing is lost
      const text = replyMatch ? replyMatch[1].trim() : raw;
      return {
        suggestion: {
          id: `sug-${Date.now()}`,
          text,
          analysis,
          confidence,
          citations,
          criticReviewed,
          partialInfo,
        },
        streamingText: "",
      };
    }),

  clearStream: () => set({ streamingText: "" }),

  useReply: () => {
    const { suggestion, addMessage } = get();
    if (!suggestion) return;
    navigator.clipboard.writeText(suggestion.text).catch(() => {});
    addMessage({ role: "rep", text: suggestion.text });
    set({ suggestion: null });
  },

  dismissSuggestion: () => set({ suggestion: null }),

  reset: () => set({ messages: [], suggestion: null, pendingAction: null, streamingText: "" }),
}));
