Dividing the Build Between Sonnet Agents
Since this is a POC, you don't want to over-parallelize — too many agents = integration hell. Here's a practical breakdown based on clean module boundaries and dependency order.

Recommended Split: 4 Sequential Agents + 1 Integrator
This works best because later modules depend on earlier ones, and you want each agent to have a working, testable deliverable.

Agent 1 — Foundation & Bedrock Client
Deliverables:

Project scaffold (folders, requirements.txt, .env.example, config.py)
llm/bedrock_client.py with Converse API + tool-use support
observability/tracer.py
Smoke test: script that calls Haiku 4.5 and prints a response
Why first: Everything depends on Bedrock working. If this fails, nothing else matters. Also smallest blast radius to debug AWS/Bedrock issues in isolation.

Hand-off artifact: A working bedrock_client.invoke() + a 10-line smoke test that proves it calls Haiku 4.5 successfully.

Context to give: Sections 1, 2, 3, 4, 5, 6, 10 of the blueprint.

Agent 2 — Tool Layer (Abstraction + All Mock Tools)
Deliverables:

tools/base.py (ABC, RiskTier, ToolResult)
tools/registry.py
All mock tools: network_tools.py, outage_tools.py, kb_tools.py, crm_tools.py, mutating_tools.py
data/kb/*.md seed files (6–8 docs)
data/mock_customers.json
Smoke test: register all tools, execute each one, print results
Why second: Completely independent of Bedrock. Can be built & tested in parallel with Agent 1 if you want — but I'd keep it sequential to avoid schema mismatches.

Hand-off artifact: A registry that returns valid Bedrock tool specs + all tools executable standalone.

Context to give: Section 7 + tool list in §7.3 + Section 11 (demo scenario — so the agent knows what realistic mock data to seed).

Agent 3 — Agent Core (Memory + Orchestrator + Prompts, NO Critic Yet)
Deliverables:

agent/memory.py
agent/prompts.py (planner prompt only for now)
agent/orchestrator.py — loop with plan→act→observe, NO critic step
Budget enforcement + graceful degradation
Integration test: hardcoded user message → orchestrator runs → tool calls happen → final response
Why third: Needs both Bedrock client and tool registry. This is the core loop.

Hand-off artifact: orchestrator.handle_turn("my internet is slow") runs end-to-end with real Bedrock + real (mock) tools.

Context to give: Sections 5, 6, 7 (interfaces only, not full impl), 8 (except 8.3 Critic), 10. Tell it: "Critic will be added in next pass — leave a clean seam for it."

Agent 4 — Critic + CLI + Approval Flow + Demo Polish
Deliverables:

agent/critic.py + CRITIC_SYSTEM_PROMPT
Wire critic into orchestrator loop
main.py CLI with rich formatting
cli_approver callback for high-risk tools
Special commands (/trace, /evidence, /quit)
README.md with demo walkthrough
Verify all acceptance criteria in §12
Why last: Critic needs working orchestrator. CLI needs everything else. This agent's job is to make the POC feel complete and demo-able.

Context to give: Sections 8.3, 9, 11, 12, 14.

(Optional) Agent 5 — Integrator / QA Pass
Only if you want it. Single agent that:

Runs the full demo scenario
Verifies each acceptance criterion
Fixes glue issues between modules
Cleans up inconsistencies
Usually I'd just do this myself rather than spawn another agent — but if the first 4 produce rough edges, this is useful.

Alternative: 2-Agent Split (If You Want Speed)
If you're impatient and want fewer hand-offs:

Agent A: Foundation + Bedrock + Tools (Agents 1 + 2 combined)
Agent B: Agent core + Critic + CLI (Agents 3 + 4 combined)
Works fine because the seam between them (tool registry + bedrock client interfaces) is very clean. Risk: each agent has more context to juggle, more chance of cutting corners.

What NOT to Do
❌ Don't split by file (one agent per .py file). You'll spend all your time reconciling imports and type mismatches.

❌ Don't split by feature (one agent does "slow internet scenario", another does "outage scenario"). The agent loop is generic — feature-splitting fragments it.

❌ Don't parallelize everything. Agents 1→2→3→4 have real dependencies. Parallel = merge hell.

❌ Don't give each agent the whole blueprint. Scope their context to their deliverable + interface contracts for what they consume/produce. Otherwise they'll rewrite neighboring modules "to be helpful."

Hand-off Protocol (Important)
Before each agent starts, give it:

Its slice of the blueprint (specific sections above)
The interface contracts of modules it depends on (just the class signatures, not the impl)
A one-line acceptance test it must pass before declaring done
An explicit "do not touch" list of other modules
Example for Agent 3:

You may modify: agent/*, main.py (stub only). You may read but NOT modify: llm/bedrock_client.py, tools/*, observability/tracer.py. You must pass: python -c "from agent.orchestrator import Orchestrator; o=Orchestrator(); print(o.handle_turn('my internet is slow'))" and it must make ≥2 tool calls visible in the trace.

My Recommendation
Go with the 4-agent sequential split. It matches the implementation order already in §13 of the blueprint, gives you testable checkpoints, and keeps each agent's context manageable (Haiku/Sonnet both do better with focused scope). Total time end-to-end should be ~2–4 hours of agent work depending on iteration.

Want me to draft the specific prompt/brief you'd hand to each of the 4 agents?