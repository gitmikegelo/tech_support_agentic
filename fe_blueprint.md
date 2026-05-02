# Tech Support Copilot — Frontend Blueprint

> **Purpose**: Design spec for the web frontend of the agentic tech support copilot. Built for the **rep**, not the customer. Must feel like a precision instrument — fast, confident, uncluttered, and quietly sophisticated.
> **Stack target**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion + Zustand (state) + SSE/WebSocket for agent streaming.

---

## 1. Design Philosophy

### 1.1 The Feel
Think **Linear × Arc × Bloomberg Terminal**. Not a chatbot UI. Not a dashboard. A **live cockpit**.

- **Calm under pressure.** Reps are on live calls. Zero visual noise. No bouncing notifications, no gradients screaming for attention.
- **Information density without clutter.** A senior rep handling 40 calls/day needs to scan, not read.
- **Confidence through typography, not color.** Neutral palette, one accent. Let hierarchy come from type scale and spacing.
- **Motion as feedback, never decoration.** Every animation answers "what just happened?" — nothing is animated to look cool.
- **Dark mode first.** Call centers are often dim. Light mode is a courtesy, not the default.

### 1.2 Visual Language
- **Palette**: Near-black background (`#0A0A0B`), elevated surfaces (`#131316`, `#1A1A1F`), high-contrast text (`#F5F5F7`), muted text (`#8A8A93`). Single accent: a confident electric blue (`#3B82F6`) used sparingly. Semantic colors (success `#10B981`, warning `#F59E0B`, danger `#EF4444`) reserved for status only.
- **Typography**: Inter for UI, JetBrains Mono for tool I/O and IDs. Tight tracking on headers. Generous line-height on body.
- **Radius**: 8px default, 12px on major cards. Never fully rounded except on avatars and dots.
- **Borders**: 1px `#24242A`. Hairlines over shadows. Shadows only on floating elements (modals, tooltips).
- **Iconography**: Lucide. 16px default, 1.5px stroke. Never filled unless status.

### 1.3 What This Is NOT
- Not a ChatGPT clone.
- Not a CRM (that's a separate tool the rep has open).
- Not a dashboard with charts.
- Not "AI-themed" (no glowy orbs, no sparkles, no gradient "AI" badges).

---

## 2. Layout: The Three-Column Cockpit

```
┌────────────────┬──────────────────────────┬────────────────────┐
│                │                          │                    │
│  LEFT RAIL     │    CENTER: CONVERSATION  │   RIGHT: AGENT     │
│  (280px)       │    & COPILOT SUGGESTION  │   WORKBENCH        │
│                │    (flex-1)              │   (420px)          │
│  • Call context│                          │   • Live agent     │
│  • Customer    │    • Transcript / chat   │     reasoning      │
│  • Session     │    • Suggested reply     │   • Tool calls     │
│  • Quick KB    │    • Evidence citations  │   • Evidence log   │
│                │                          │   • Approvals      │
│                │                          │                    │
└────────────────┴──────────────────────────┴────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  STATUS BAR (32px): connection • model • token budget • latency │
└─────────────────────────────────────────────────────────────────┘
```

Columns are **resizable** (drag handles) with sensible min/max. State persisted to localStorage.

---

## 3. Left Rail — Call Context

### 3.1 Sections (top to bottom)

**① Call Header (compact)**
- Customer name + account tier badge
- Call duration (live ticker, monospace)
- Tiny waveform indicator if audio is live (pulsing = listening)

**② Customer Card**
- Avatar (initials, no fake photos)
- Account ID (monospace, click-to-copy)
- Plan / service type
- Location (for outage correlation)
- 3 most recent tickets (collapsible, relative dates: "2d ago")

**③ Session Facts** *(auto-populated by agent)*
- "Agent has detected: slow speeds, WiFi dropping"
- Entities extracted from the call as chips
- Each chip click → filters evidence log

**④ Quick KB Launcher**
- Search input (⌘K hotkey)
- Recent docs
- Pinned runbooks

### 3.2 Behavior
- Collapsible to 64px icon rail (⌘[ toggle).
- Every field has a hover-reveal copy button.
- No scrollbars visible until hover (`scrollbar-gutter: stable`).

---

## 4. Center Column — Conversation & Suggestion

This is where the rep's eyes live 80% of the time. It must be the calmest, clearest surface.

### 4.1 Structure (top to bottom)

**① Conversation Stream**
- Alternating customer / rep messages.
- Customer messages: left-aligned, subtle surface background.
- Rep messages: right-aligned, no background (just text).
- Timestamps on hover only.
- **No avatars in the stream** — too noisy. Role indicated by alignment and a tiny label above.
- Auto-scrolls but pauses if user scrolls up; sticky "↓ New messages" pill appears.

**② Live Input Area** (for POC, rep types customer message)
- In production: live transcription feed with interim results shown in muted italic, finalized in solid.
- For POC: a textarea with placeholder "Type what the customer is saying…"
- Below: small button row (`Send`, `Ask agent to elaborate`, `Mark issue resolved`).

**③ Suggested Reply Card** *(the hero element)*

This is the single most important UI component. When the agent produces a suggestion, it appears here as a distinct card — **not as a chat message**.

```
┌─────────────────────────────────────────────────┐
│ ◆ Suggested Reply                    87% conf.  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Hi Sarah — I can see your modem is showing     │
│  weak signal strength¹ and there's no active    │
│  outage in your area². Let's try a remote      │
│  reboot; it resolves this in ~70% of similar   │
│  cases³.                                        │
│                                                 │
├─────────────────────────────────────────────────┤
│  ¹ modem_status   ² isp_outage   ³ kb:slow...  │
├─────────────────────────────────────────────────┤
│  [Use reply]  [Edit]  [Regenerate]  [Dismiss]  │
└─────────────────────────────────────────────────┘
```

Details:
- Confidence shown as a **subtle percentage**, not a giant progress bar. Color only changes below 60%.
- Citations are **superscript numbers** in the prose, with a legend strip below. Hovering a citation highlights the matching evidence in the right column.
- "Use reply" copies to clipboard AND pushes into the conversation as the rep's next message.
- "Edit" turns the card into an inline editor.
- Card slides in from below with 200ms ease-out. Replacement suggestions cross-fade (no jarring pop).

**④ Proposed Actions Strip** *(appears when agent proposes a high-risk action)*

A separate, visually distinct horizontal strip above the suggested reply:

```
┌─────────────────────────────────────────────────┐
│ ⚠ Proposed action: Remote modem reboot          │
│   Risk: requires approval                       │
│   [Approve]  [Reject]  [Details ▾]             │
└─────────────────────────────────────────────────┘
```

Amber left-border. Never auto-dismiss. Blocks next agent turn until resolved.

---

## 5. Right Column — Agent Workbench

Where the agent "thinks out loud." Transparency builds trust.

### 5.1 Tabs (segmented control at top)

**① Reasoning** *(default)*
**② Evidence**
**③ Trace**

### 5.2 Reasoning Tab

A vertical timeline of the agent's current turn, streaming live.

```
● Planning
│  "Customer reports slow speeds + WiFi drops.
│   Need to check modem, outages, and KB."
│
● Tool: check_modem_status                 234ms
│  ✓ signal: weak, uptime: 18h
│
● Tool: check_isp_outage                   189ms
│  ✓ no active outage
│
● Tool: search_kb "slow speeds wifi"       67ms
│  ✓ 3 relevant docs
│
● Synthesizing reply…
│
○ Critic review: passed
│
● Done                                    1.2s total
```

Details:
- Active step has a **pulsing dot**; completed steps are filled; failed steps are red outlined.
- Tool results are collapsed by default; click to expand full JSON (monospace, syntax-colored).
- Total elapsed time per step (right-aligned, muted).
- Steps from previous turns are faded and separated by a hairline divider. A subtle "Previous turn" label anchors them.

### 5.3 Evidence Tab

A running ledger of every fact the agent has learned this session.

```
┌─────────────────────────────────────────────────┐
│ 🔍 Filter evidence…                             │
├─────────────────────────────────────────────────┤
│ modem_status         2m ago                     │
│   signal=weak, uptime=18h                       │
├─────────────────────────────────────────────────┤
│ isp_outage           2m ago                     │
│   no outage in 94103                            │
├─────────────────────────────────────────────────┤
│ kb:slow_speeds.md    2m ago                     │
│   "Weak signal is the top cause…"               │
└─────────────────────────────────────────────────┘
```

- Each card shows source type (tool name or `kb:`), age, and condensed content.
- Click → full detail drawer slides from right with raw payload.
- When rep hovers a citation in the suggested reply, the matching card **briefly highlights** with a 1-second amber outline.

### 5.4 Trace Tab

For power users / QA. Raw JSONL trace stream, filterable by event type. Monospace, dense, like a Chrome DevTools network panel. Each event expandable.

---

## 6. Status Bar (Bottom, 32px)

Subtle but information-rich. All monospace, muted.

```
● connected   haiku-4.5   tokens 3,421 / 20,000   p50 412ms   trace_abc123
```

- Left dot: green when agent is idle and ready, pulsing blue when thinking, amber if degraded, red if disconnected.
- Hovering any segment reveals a tooltip with detail.
- Clicking `trace_abc123` opens the full trace in a modal.

---

## 7. Key Interactions & Micro-UX

### 7.1 Agent Streaming
- Suggested reply **streams in token-by-token** with a subtle cursor (not a blinking block — a thin vertical line that fades).
- Tool calls appear in the right column **the instant they start**, not after they complete.
- If a tool is taking >2s, show a "still running…" ghost line under the active step.

### 7.2 Keyboard-First
Reps who live on keyboard are the power users. Support:
- `⌘K` — command palette (search KB, jump to customer, run tool manually)
- `⌘↵` — accept suggested reply
- `⌘E` — edit suggested reply
- `⌘R` — regenerate suggestion
- `⌘[` / `⌘]` — toggle left / right panels
- `⌘1/2/3` — switch workbench tabs
- `⌘.` — approve pending action
- `⌘⇧.` — reject pending action
- `?` — show shortcut cheatsheet (modal)

Command palette (`⌘K`) is critical. Fuzzy search over: KB docs, tools, customer actions, recent tickets.

### 7.3 Approval Flow (High-Risk Actions)
When agent proposes a mutating action:
1. Proposed Action Strip appears in center column.
2. Right column reasoning freezes on a "Waiting for approval" step (pulsing amber dot).
3. Background is **not** dimmed — rep can keep talking to customer.
4. On approve: strip collapses with a success tick, tool executes, reasoning resumes.
5. On reject: strip collapses, agent continues with alternative.

### 7.4 Error States
- Tool failure: the reasoning step turns red outline with `⚠ failed — retrying` or `⚠ failed — falling back`. Never a modal error.
- Bedrock failure: status bar dot goes amber, toast at bottom: "Agent degraded — retrying in 3s." Retry silently.
- Full disconnect: red dot, sticky banner at top: "Connection lost. Your conversation is saved." No animation.

### 7.5 Empty States
- No active call: center column shows a quiet hero: "Ready. Waiting for customer." with a `Start session` button.
- No evidence yet: evidence tab shows `The agent hasn't gathered any evidence yet.` — no illustrations, no "tips."

### 7.6 Hallucination Flag
When critic catches an issue (rare but important):
- The regenerated suggestion has a tiny `Reviewed by critic` badge.
- If critic failed twice and fallback is used, the reply card has a faint amber left-border and a disclosure: "⚠ Partial information — agent could not verify all claims."

---

## 8. Motion Design Principles

- **Durations**: 120ms for micro (hover, focus), 200ms for reveals, 320ms for layout shifts. Never longer.
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint) for entrances, `cubic-bezier(0.7, 0, 0.84, 0)` (ease-in-quint) for exits.
- **Streaming text**: characters appear in batches of 3–5 to avoid flicker, with the cursor easing behind them.
- **Tool timeline**: new steps slide down 8px and fade in. Never bounce.
- **No parallax. No floating shapes. No gradients in motion.**

---

## 9. Component Inventory (shadcn/ui + custom)

### 9.1 From shadcn/ui (use as-is)
- `Button`, `Input`, `Textarea`, `Dialog`, `Dropdown`, `Tooltip`, `Tabs`, `Separator`, `ScrollArea`, `Command` (for ⌘K), `Toast`.

### 9.2 Custom Components to Build
- `<SuggestedReplyCard />` — the hero card with citations, confidence, actions.
- `<ReasoningTimeline />` — streaming agent steps.
- `<EvidenceCard />` — single evidence item with hover highlight.
- `<ProposedActionStrip />` — approval UI.
- `<ToolCallBlock />` — collapsible tool call display with JSON.
- `<ConfidenceIndicator />` — subtle percentage badge (no progress bars).
- `<CitationChip />` — superscript citation with hover-link to evidence.
- `<StatusBar />` — bottom status row.
- `<CallHeader />` — live-ticking call duration + customer summary.
- `<EntityChip />` — extracted entity filter chip.
- `<CommandPalette />` — ⌘K wrapper around shadcn Command.

---

## 10. State Management

### 10.1 Zustand Stores
- `sessionStore`: current call, customer, duration, status.
- `conversationStore`: messages, pending suggestion, pending action.
- `agentStore`: current reasoning timeline, evidence log, trace events.
- `uiStore`: panel widths, active workbench tab, modals.

### 10.2 Streaming
- **SSE** from backend to push agent events. Simpler than WebSocket for one-way stream.
- Event shape matches tracer JSONL format:
  ```ts
  type AgentEvent =
    | { type: "plan_step"; iteration: number }
    | { type: "tool_call"; name: string; input: unknown; id: string }
    | { type: "tool_result"; id: string; result: unknown; latency_ms: number }
    | { type: "assistant_delta"; text: string }
    | { type: "critic"; passed: boolean; feedback: string }
    | { type: "approval_required"; tool: string; input: unknown }
    | { type: "done" };
  ```
- Front-end applies events to stores → UI reacts.

### 10.3 API Surface
- `POST /api/session` → start session, returns `session_id`.
- `POST /api/turn` with `{session_id, message}` → opens SSE stream of events.
- `POST /api/approval` with `{session_id, decision}` → resumes agent.
- `GET /api/trace/:session_id` → full trace JSONL.
- `GET /api/kb/search?q=…` → KB search (for ⌘K).

Backend wraps the Python orchestrator; thin FastAPI layer.

---

## 11. Accessibility (Non-Negotiable)

- All interactive elements reachable by keyboard; visible `:focus-visible` ring (2px accent, 2px offset).
- ARIA live regions for streaming reply and agent status ("Agent is thinking", "Suggested reply ready").
- Color contrast AA minimum (AAA for body text).
- No information conveyed by color alone — icons and text back up every status.
- Reduced motion: respect `prefers-reduced-motion`, swap animations for instant reveals.
- Screen-reader label every icon button.

---

## 12. Responsive Behavior

- **Primary target: 1440×900+** (call center workstations).
- Below 1280px: right column collapses to a slide-over drawer triggered by a button in the header.
- Below 1024px: left rail collapses to icon rail by default.
- Below 768px: single-column; not a primary target but must not break. Mobile is explicitly deferred.

---

## 13. Tasteful Details (The "Cool but Respectable" Layer)

Small things that make it feel premium without being flashy:

1. **Hairline gradient at the top** of the suggested reply card when it's actively streaming — a 1px line that shifts opacity, not a full glow.
2. **Monospace tabular numerals** on all latencies and token counts so they don't jitter.
3. **Subtle grain texture** (0.02 opacity SVG noise) on the app background — makes the black feel like paper, not a void.
4. **Cursor changes over citations**: a small `↗` indicator on hover tells you it's linked.
5. **Sound design (opt-in, off by default)**: a single soft "tick" when a suggestion is ready. Nothing else. Toggle in settings.
6. **Ambient status dot** in the favicon changes with agent state so the rep can see status in an adjacent tab.
7. **Smart copy**: when rep clicks "Use reply," a tiny inline toast says "Copied" and fades in 800ms — no giant overlay.
8. **Empty state personality** *(only place for any)*: "Ready." with a single blinking cursor. That's it. No illustration.
9. **Time-of-day subtle shift**: after 8pm local time, the accent blue warms slightly (not a gimmick — reduces eye strain on night shifts). Fully opt-outable.
10. **The logo is a wordmark, not a symbol.** "Copilot" set in tight Inter SemiBold. Never an AI orb.

---

## 14. POC Scope (Matches Backend POC)

For the initial frontend POC, build only:

**Must-have:**
- Three-column layout (static widths OK)
- Conversation stream (text input for customer messages, no real transcription)
- Suggested Reply Card with citations & action buttons
- Reasoning Timeline (streaming)
- Evidence Tab
- Proposed Action Strip + approval flow
- Status bar (basic: connection, model, token count)
- ⌘K command palette (KB search only)
- Dark mode only

**Defer to v2:**
- Trace tab (show a link to raw JSONL instead)
- Light mode
- Resizable panels (fixed widths for POC)
- Sound design
- Time-of-day accent shift
- Grain texture
- Mobile responsive
- Settings panel

---

## 15. Build Order (Suggested)

1. **Design tokens & Tailwind config** — palette, typography, spacing, radius, motion.
2. **App shell** — three columns, status bar, routing.
3. **Mock SSE layer** — fake event stream so FE can be built without backend.
4. **Conversation column** — messages + input + suggested reply card (static).
5. **Reasoning timeline** — consume mock events, render live.
6. **Evidence tab** — cards + hover-citation link.
7. **Approval strip + flow**.
8. **Command palette**.
9. **Wire to real backend SSE**.
10. **Polish pass** — motion timings, empty states, focus rings, keyboard shortcuts.

---

## 16. Reference Inspiration (for Sonnet's mental model)

- **Linear** — for typography, spacing discipline, command palette.
- **Arc Browser** — for panel feel and restrained color.
- **Vercel dashboard** — for dark surfaces and hairline borders.
- **Raycast** — for command palette density.
- **Bloomberg Terminal** — for information density without clutter (the spirit, not the look).
- **Stripe Dashboard** — for status bar and system feedback patterns.

**Explicit anti-references:**
- ChatGPT web UI (too conversational, too casual for an operator tool)
- Any "AI-themed" product with purple gradients and orbs
- Intercom (too chatbot-branded)
- Zendesk (too enterprise-beige)

---

## 17. Acceptance Criteria

- [ ] Rep can type a customer message and see a streamed suggested reply with at least 2 citations.
- [ ] Reasoning timeline shows tool calls live as they happen, with latencies.
- [ ] Hovering a citation highlights the matching evidence card.
- [ ] Approval strip appears for high-risk tools and blocks agent until resolved.
- [ ] ⌘K opens command palette with KB fuzzy search.
- [ ] All primary actions are keyboard-accessible with shortcuts shown on `?`.
- [ ] UI feels calm at rest — no spinners, no pulsing, no movement unless something is happening.
- [ ] Nothing in the UI would embarrass the product in front of a CIO.

---

**End of frontend blueprint.** Hand this to Sonnet 4.6 for implementation. Pair it with the backend blueprint so the SSE event contract matches on both sides.