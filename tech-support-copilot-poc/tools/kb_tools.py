"""
Mock knowledge-base search tool.

Loads KB markdown files from ``data/kb/`` at call time and scores them with
simple keyword overlap against the query.  Returning the top-N results with
a short snippet for the LLM to cite.
"""
from __future__ import annotations

import time
from pathlib import Path

from tools.base import RiskTier, Tool, ToolResult, _maybe_fail

# Resolve KB directory relative to this file so it works regardless of cwd
_KB_DIR = Path(__file__).parent.parent / "data" / "kb"


def _load_kb_docs() -> list[dict]:
    """Read all ``*.md`` files from the KB directory into memory.

    Returns a list of dicts with keys: doc_id, title, content.
    """
    docs: list[dict] = []
    for path in sorted(_KB_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        lines = [ln for ln in text.splitlines() if ln.strip()]
        title = lines[0].lstrip("# ").strip() if lines else path.stem
        docs.append({"doc_id": path.stem, "title": title, "content": text})
    return docs


def _score(query: str, doc: dict) -> float:
    """Return a simple keyword overlap score in [0, 1].

    Each query token that appears as a substring in the combined title+content
    adds 1 / len(tokens) to the score.
    """
    tokens = set(query.lower().split())
    if not tokens:
        return 0.0
    haystack = (doc["title"] + " " + doc["content"]).lower()
    hits = sum(1 for t in tokens if t in haystack)
    return hits / len(tokens)


class SearchKB(Tool):
    """Search the internal knowledge base for articles relevant to the issue."""

    name = "search_kb"
    description = (
        "Search the internal knowledge base (KB) for articles relevant to the customer's "
        "issue. Accepts a free-text query and returns ranked results with doc IDs, titles, "
        "and short snippets. Always call this before proposing a procedure to the rep."
    )
    risk_tier = RiskTier.READ_ONLY
    input_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Keywords or a short description of the issue to search for.",
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of results to return (default 3, max 8).",
                "default": 3,
            },
        },
        "required": ["query"],
    }

    def execute(self, query: str, max_results: int = 3) -> ToolResult:  # type: ignore[override]
        start = time.monotonic()
        fail = _maybe_fail(self.name)
        if fail:
            return fail

        max_results = max(1, min(max_results, 8))

        docs = _load_kb_docs()
        scored = sorted(
            ({"doc": d, "score": _score(query, d)} for d in docs),
            key=lambda x: x["score"],
            reverse=True,
        )

        results: list[dict] = []
        for item in scored[:max_results]:
            doc = item["doc"]
            # Build snippet: first 3 non-empty, non-heading content lines
            content_lines = [
                ln
                for ln in doc["content"].splitlines()
                if ln.strip() and not ln.startswith("#")
            ][:3]
            snippet = " ".join(content_lines)[:300]
            results.append(
                {
                    "doc_id": doc["doc_id"],
                    "title": doc["title"],
                    "snippet": snippet,
                    "score": round(item["score"], 3),
                }
            )

        latency_ms = int((time.monotonic() - start) * 1000) + 30
        return ToolResult(
            success=True,
            data={"query": query, "results": results, "total_docs_searched": len(docs)},
            latency_ms=latency_ms,
            tool_name=self.name,
        )
