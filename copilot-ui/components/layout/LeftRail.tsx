"use client";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/types";
import { PhoneOff, PhoneForwarded, Pause, MicOff, Play } from "lucide-react";

const DEMO_CUSTOMER: Customer = {
  customer_id: "CUST001",
  name: "Sarah Chen",
  account_status: "active",
  service_tier: "Premium",
  location: "San Francisco, CA 94103",
  equipment: { modem_model: "Netgear CM700", router_model: "ASUS RT-AX88U" },
  recent_tickets: [
    { ticket_id: "TKT-9821", issue: "Slow speeds", date: "2d ago", status: "resolved" },
    { ticket_id: "TKT-9734", issue: "WiFi drops", date: "5d ago", status: "resolved" },
    { ticket_id: "TKT-9601", issue: "No internet", date: "14d ago", status: "closed" },
  ],
};

export function LeftRail({ collapsed }: { collapsed: boolean }) {
  const { callStartMs, customer, callEnded, setCallEnded } = useSessionStore();
  const displayCustomer = customer ?? DEMO_CUSTOMER;
  
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  if (collapsed) {
    return (
      <div
        className="w-16 flex flex-col items-center py-4 gap-4 flex-shrink-0"
        style={{ borderRight: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--accent)" }}
        >
          {initials(displayCustomer.name)}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-[280px] flex-shrink-0 flex flex-col overflow-y-auto"
      style={{ borderRight: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }}
    >
      {/* Call header */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {displayCustomer.name}
          </span>
          <TierBadge tier={displayCustomer.service_tier} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          {callEnded ? (
            <span className="text-xs font-medium" style={{ color: "var(--danger)" }}>Call Ended</span>
          ) : isOnHold ? (
            <span className="text-xs font-medium animate-pulse" style={{ color: "var(--warning)" }}>Call on Hold</span>
          ) : (
            <CallDuration startMs={callStartMs} />
          )}
        </div>
      </div>

      {/* Customer card */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #A100FF, #6200BB)", color: "#fff" }}
          >
            {initials(displayCustomer.name)}
          </div>
          <div className="min-w-0">
            <CopyField label="Account ID" value={displayCustomer.customer_id} mono />
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {displayCustomer.location}
            </div>
          </div>
        </div>
        {displayCustomer.equipment && (
          <div className="text-xs space-y-0.5" style={{ color: "var(--text-muted)" }}>
            {displayCustomer.equipment.modem_model && (
              <div>Modem: {displayCustomer.equipment.modem_model}</div>
            )}
            {displayCustomer.equipment.router_model && (
              <div>Router: {displayCustomer.equipment.router_model}</div>
            )}
          </div>
        )}
      </div>

      {/* Recent tickets */}
      {displayCustomer.recent_tickets && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--accent)" }}>
            Recent tickets
          </p>
          <div className="space-y-1.5">
            {displayCustomer.recent_tickets.slice(0, 3).map((t) => (
              <div key={t.ticket_id} className="flex items-center justify-between gap-2">
                <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                  {t.issue}
                </span>
                <span className="mono text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {t.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick KB launcher */}
      <div className="px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--accent)" }}>
          Quick KB
        </p>
        <button
          className="w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors"
          style={{
            backgroundColor: "var(--accent-muted)",
            border: "1px solid var(--accent-subtle)",
            color: "var(--accent)",
          }}
          aria-label="Open command palette (⌘K)"
        >
          ⌘K to search KB…
        </button>
        <div className="mt-2 space-y-1">
          {["Modem reboot steps", "Slow speeds guide", "DNS troubleshooting"].map((doc) => (
            <button
              key={doc}
              className="w-full text-left text-xs px-2 py-1.5 rounded transition-colors"
              style={{ color: "var(--accent)", backgroundColor: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--accent-muted)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              → {doc}
            </button>
          ))}
        </div>
      </div>

      {/* Call Controls */}
      <div className="mt-auto px-4 py-4" style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--accent)" }}>
          Call Actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            disabled={callEnded}
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isMuted ? "rgba(239,68,68,0.1)" : "var(--bg-elevated)",
              color: isMuted ? "rgb(239,68,68)" : "var(--text-primary)",
              border: `1px solid ${isMuted ? "rgba(239,68,68,0.2)" : "var(--border)"}`
            }}
            aria-label="Mute call"
          >
            <MicOff size={13} />
            {isMuted ? "Muted" : "Mute"}
          </button>
          <button
            onClick={() => setIsOnHold(!isOnHold)}
            disabled={callEnded}
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-medium transition-colors hover:bg-opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isOnHold ? "rgba(234,179,8,0.2)" : "rgba(234,179,8,0.1)",
              color: "rgb(234,179,8)",
              border: "1px solid rgba(234,179,8,0.2)"
            }}
            aria-label={isOnHold ? "Resume call" : "Hold call"}
          >
            {isOnHold ? <Play size={13} /> : <Pause size={13} />}
            {isOnHold ? "Resume" : "Hold"}
          </button>
          <button
            disabled={callEnded}
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)"
            }}
            aria-label="Transfer call"
          >
            <PhoneForwarded size={13} />
            Transfer
          </button>
          <button
            onClick={() => setCallEnded(true)}
            disabled={callEnded}
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-medium transition-colors hover:bg-opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: callEnded ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)",
              color: "rgb(239,68,68)",
              border: "1px solid rgba(239,68,68,0.2)"
            }}
            aria-label="Hangup call"
          >
            <PhoneOff size={13} />
            Hangup
          </button>
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const t = tier.toLowerCase();
  const isPremium = t.includes("premium");
  const isBusiness = t.includes("business") || t.includes("enterprise");
  let bg = "var(--bg-elevated)", color = "var(--text-muted)";
  if (isPremium) { bg = "var(--accent-muted)"; color = "var(--accent)"; }
  else if (isBusiness) { bg = "var(--teal-muted)"; color = "var(--teal)"; }
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      {tier}
    </span>
  );
}

function CallDuration({ startMs }: { startMs: number | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startMs) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startMs]);

  if (!startMs) {
    return <span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>—</span>;
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="mono text-[11px] font-medium" style={{ color: "var(--success)" }}>
      {mins}:{secs}
    </span>
  );
}

function CopyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={copy}
      className={cn(
        "text-left text-xs group flex items-center gap-1 hover:opacity-80 transition-opacity",
        mono && "mono"
      )}
      style={{ color: "var(--text-primary)" }}
      title={`Copy ${label}`}
    >
      {value}
      <span
        className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: copied ? "var(--success)" : "var(--text-muted)" }}
      >
        {copied ? "✓" : "⎘"}
      </span>
    </button>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
