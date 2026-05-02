"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/uiStore";

const KB_DOCS = [
  { id: "modem_reboot.md", title: "Modem Reboot Steps" },
  { id: "slow_speeds.md", title: "Slow Speeds Troubleshooting" },
  { id: "dns_issues.md", title: "DNS Issues" },
  { id: "wifi_vs_ethernet.md", title: "WiFi vs Ethernet" },
  { id: "account_suspension.md", title: "Account Suspension" },
  { id: "outage_communication.md", title: "Outage Communication Template" },
  { id: "password_reset.md", title: "Password Reset" },
  { id: "device_compatibility.md", title: "Device Compatibility" },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");

  const filtered = query
    ? KB_DOCS.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
    : KB_DOCS;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Palette */}
          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal
            aria-label="Command palette"
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ borderBottom: "1px solid var(--border)" }}>
              <input
                autoFocus
                type="text"
                placeholder="Search KB docs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                className="w-full px-4 py-3 text-sm bg-transparent focus:outline-none"
                style={{ color: "var(--text-primary)" }}
                aria-label="Search knowledge base"
              />
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  No results.
                </p>
              )}
              {filtered.map((doc) => (
                <button
                  key={doc.id}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-primary)" }}
                  onClick={() => setOpen(false)}
                >
                  <span style={{ color: "var(--success)" }}>kb</span>
                  {doc.title}
                </button>
              ))}
            </div>

            <div
              className="px-4 py-2 flex gap-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                <kbd className="mono">↵</kbd> open · <kbd className="mono">esc</kbd> close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
