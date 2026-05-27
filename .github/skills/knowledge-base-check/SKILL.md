---
name: knowledge-base-check
description: >
  Protocol for deciding what is "already known" before treating it as an
  unknown. Reads the agent graph, project graph, past experiments, status
  files, and source code. Used by the Vexon Decompose Agent in Phase B of
  every investigation. Outputs a KNOWN/UNKNOWN classification with citations.
---

# Knowledge Base Check

A claim is **KNOWN** only if it has a citation. Default for everything else: **UNKNOWN**.

---

## 1. Sources to Check (in priority order)

Check in this order — stop as soon as a citation is found for a given assumption.

| # | Source | What it answers |
|---|---|---|
| 1 | **Agent graph** (`experiments/decompose/.graph/graph.json`) | Has this been investigated before? Which variables failed? Who fixed it? |
| 2 | **Project graph** (`graphify-out/graph.json`) | What does the code look like? God nodes? Communities? Blast radius? |
| 3 | **Cross-graph join** (both, joined on FileRef IDs) | Which prior investigations touched a specific project god node? |
| 4 | `track/STATUS.md` | Shipped vs. WIP features |
| 5 | `track/BUGS.md` | Known bugs, fixes, files touched |
| 6 | `track/GUIDELINES.md` | Conventions and do/don't rules |
| 7 | `finalPlan/PRODUCT_*.md` | Product intent and scope decisions |
| 8 | `experiments/decompose/*/learnings.md` | Raw form — use only if agent graph is stale |
| 9 | `logs/experiment-events.jsonl` | Runtime evidence from live traffic |
| 10 | Source code (direct read) | Last resort — only when all above are silent |

**Always start with the two graphs.** Falling back to raw `learnings.md` is only required when `experiments/decompose/.graph/` is older than the newest investigation folder.

---

## 2. Citation Format

Every KNOWN claim must record exactly one citation.

| Type | Format | Example |
|---|---|---|
| File line | `` `path:line` `` | `` `api/routers/session.py:42` `` |
| Bug | `BUG-NNN` | `BUG-019` |
| Past experiment | `experiments/decompose/<slug>/runs.jsonl:N` | `experiments/decompose/2026-05-25-ws-loop/runs.jsonl:3` |
| Trace event | `trace:<traceId>:<event>` | `trace:abc123:agent.tool_call` |
| Doc section | `<doc>:<heading>` | `finalPlan/PRODUCT_MVP.md:#auth` |

If you cannot produce a citation in one of these exact forms, the claim is **NOT KNOWN**.

---

## 3. Classification Output

For each assumption in the objective's procedure, produce one row:

```
| Assumption | Status | Citation / Why unknown |
|---|---|---|
| The API route /session/{id}/restore is registered | KNOWN | `api/routers/session.py:42` |
| Snapshot is written to R2/storage on session idle | UNKNOWN | Function exists but no end-to-end trace observed |
| Celery retries failed agent tool calls 3 times | UNKNOWN | Retry config not found in grep of celery_app.py |
```

Every UNKNOWN row becomes a `VAR-N` in the variable tree.

---

## 4. Quick Recipes

**"Does endpoint X exist?"**
1. `grep` for the route pattern in `api/routers/`.
2. Found → KNOWN with `path:line`.
3. Not found → UNKNOWN.

**"Does field X get populated correctly?"**
1. `grep` for the field assignment.
2. Trace whether it comes from the request body, env, or hardcoded.
3. KNOWN only if you can cite the exact line that sets it.

**"Has this bug been fixed?"**
1. Read `track/BUGS.md` for matching keywords.
2. If a `fixed` entry exists → KNOWN (the fix). Whether the bug doesn't recur is still UNKNOWN.

**"Does this work end-to-end?"**
1. Search `experiments/decompose/*/learnings.md` for prior runs.
2. Check `logs/experiment-events.jsonl` for related events.
3. End-to-end behavior is **never** KNOWN from code reading alone — only from a recorded passing experiment.

**"Is this a high blast-radius change?"**
1. Run `graphify path "<file-A>" "<file-B>"` or check the project graph.
2. Count incoming edges / community membership.
3. KNOWN if graph gives a clear answer. UNKNOWN if graph is silent.

---

## 5. Anti-Patterns

- ❌ Marking something KNOWN because "the system works in demos." Demo evidence ≠ citation.
- ❌ Citing a planning doc as evidence of implementation. `PRODUCT_MVP.md` says what *should* exist; only code or a passing experiment proves what *does* exist.
- ❌ Treating a graph node's existence as a behavior guarantee. The graph proves a function is referenced, not that it works correctly.
- ❌ Skipping `track/BUGS.md` — a fix may already exist for the unknown you're about to investigate.
- ❌ Reading the entire codebase. Read only what the specific assumption requires.
- ❌ Guessing without stating it is an assumption.
