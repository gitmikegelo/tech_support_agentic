"use client";
import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";
import { useConversationStore } from "@/store/conversationStore";
import { useAgentStore } from "@/store/agentStore";

/**
 * Global keyboard shortcut handler.
 * ⌘K     — command palette
 * ⌘↵     — use suggested reply
 * ⌘E     — edit suggestion
 * ⌘R     — regenerate
 * ⌘[     — toggle left panel
 * ⌘]     — toggle right panel
 * ⌘1/2/3 — switch workbench tabs
 * ⌘.     — approve pending action
 * ⌘⇧.   — reject pending action
 */
export function KeyboardShortcuts() {
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const setLeftCollapsed = useUIStore((s) => s.setLeftCollapsed);
  const setRightCollapsed = useUIStore((s) => s.setRightCollapsed);
  const leftCollapsed = useUIStore((s) => s.leftCollapsed);
  const rightCollapsed = useUIStore((s) => s.rightCollapsed);
  const setActiveTab = useAgentStore((s) => s.setActiveTab);
  const { useReply, dismissSuggestion, setPendingAction } = useConversationStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      switch (e.key) {
        case "k":
          e.preventDefault();
          toggleCommandPalette();
          break;
        case "Enter":
          e.preventDefault();
          useReply();
          break;
        case "e":
          e.preventDefault();
          // Edit mode handled within SuggestedReplyCard
          break;
        case "r":
          e.preventDefault();
          // Regenerate — TODO: re-send
          break;
        case "[":
          e.preventDefault();
          setLeftCollapsed(!leftCollapsed);
          break;
        case "]":
          e.preventDefault();
          setRightCollapsed(!rightCollapsed);
          break;
        case "1":
          e.preventDefault();
          setActiveTab("reasoning");
          break;
        case "2":
          e.preventDefault();
          setActiveTab("evidence");
          break;
        case "3":
          e.preventDefault();
          setActiveTab("trace");
          break;
        case ".":
          e.preventDefault();
          if (e.shiftKey) {
            // Reject
            setPendingAction(null);
          } else {
            // Approve
            setPendingAction(null);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    toggleCommandPalette,
    useReply,
    setLeftCollapsed,
    setRightCollapsed,
    leftCollapsed,
    rightCollapsed,
    setActiveTab,
    setPendingAction,
  ]);

  return null;
}
