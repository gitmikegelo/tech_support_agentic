import { Bot, HelpCircle, Settings, Menu } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function Header() {
  const leftCollapsed = useUIStore((s) => s.leftCollapsed);
  const setLeftCollapsed = useUIStore((s) => s.setLeftCollapsed);

  return (
    <header
      className="h-14 flex items-center justify-between px-4 flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, #A100FF 0%, #6200BB 100%)",
        boxShadow: "0 2px 8px rgba(161,0,255,0.35)",
      }}
      aria-label="Application header"
    >
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setLeftCollapsed(!leftCollapsed)}
          className="p-1 rounded-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.7)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          title="Toggle Left Rail"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center justify-center w-8 h-8 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}>
          <Bot size={18} />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-none" style={{ color: "#ffffff" }}>Verizon</h1>
          <p className="text-[11px] leading-none mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>Tech Support Copilot Workspace</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.75)" }}>
        <button
          className="p-2 rounded-md transition-colors"
          style={{ color: "rgba(255,255,255,0.75)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          title="Help"
        >
          <HelpCircle size={16} />
        </button>
        <button
          className="p-2 rounded-md transition-colors"
          style={{ color: "rgba(255,255,255,0.75)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
