---
name: how-to-test
description: >
  Vexon OS test methodology — break any objective into isolated variables,
  test each at the lowest depth, record learnings, and compose back up.
  Use when designing any experiment, debugging a feature, or validating a
  new capability before shipping.
---

# How to Test / Learn Anything

A recursive decomposition framework. Works for features, integrations, bugs, and architectural unknowns.

---

## The Loop

```
OBJECTIVE
    ↓
Procedure / Flow  →  identify VARIABLES (unknowns)
    ↓
For each variable:
    → new OBJECTIVE at lower depth
    → test in isolation (sandbox, curl, grep, redis-cli, UI action)
    → RECORD learnings (pass/fail + why)
    ↓
All variables resolved → re-run top-level objective
    ↓
Record top-level outcome → hand off to Bug Fix Agent or ship
```

---

## Step 1 — Objective

Write the objective as a **single line**: what you want to prove or disprove.

Format: `"[Subject] [does/returns/stores/routes] [expected thing] when [condition]"`

Examples:
- `"The API returns 401 when a request arrives without a valid JWT"`
- `"The Command Bar reads the active window context when the user presses Ctrl+Space"`
- `"Celery retries a failed tool call a maximum of 3 times before marking the task as failed"`

---

## Step 2 — Procedure / Flow

2-5 sentences: the happy-path flow from trigger to observable outcome. No implementation detail — just cause and effect.

Example (snapshot restore):
> User opens `vexon://session/x7k2`. The API looks up `instanceId=x7k2`, finds a
> snapshot in storage, restores workspace state, and returns the previous conversation
> history in the first WebSocket message.

---

## Step 3 — Variables (Unknowns)

List every assumption the procedure makes that you have **not verified** in code or running traffic.

Be paranoid. Each item is a potential failure point.

Format: `VAR-N: [what we assume] — [how to test it in isolation]`

Examples:
- `VAR-1: The API route /session/{id}/restore exists and is registered — grep routes`
- `VAR-2: The snapshot key format matches what the restore function reads — check storage service`
- `VAR-3: History is injected into agent context, not just returned to the client — trace WS messages`

---

## Step 4 — Isolate Each Variable

For each VAR, define a **minimal sandbox test**:

| Field | What to write |
|---|---|
| **VAR** | The variable ID and statement |
| **Input** | Exact command, curl, grep pattern, UI action, or seed state |
| **Expected output** | What you should see if the variable resolves correctly |
| **Actual output** | What you actually saw (filled in after running) |
| **Learning** | ✅ Confirmed / ❌ Broken — one sentence why |

Test variables at the **lowest depth first** — don't test VAR-3 until VAR-1 and VAR-2 pass.

---

## Step 5 — Record

For each variable test, write a one-line learning:

```
VAR-N: [✅ PASS | ❌ FAIL | ⚠️ PARTIAL] — [what was found]
```

When all VARs are resolved (all ✅ or fixed), re-run the top-level procedure and record the final outcome.

---

## Sandbox Design Patterns

For variables that need isolation, use the minimal possible environment.

| What you're testing | Preferred sandbox |
|---|---|
| HTTP endpoint existence or shape | `curl` — no frontend needed |
| Code presence or route registration | `grep` on the relevant source directory |
| Redis key or session state | `redis-cli` |
| Database row or schema | `psql` or SQLite direct read |
| Container lifecycle | `docker logs <container>` |
| Distributed event flow | `trace-file` on `logs/experiment-events.jsonl` |
| UI interaction (no other way) | Playwright script |
| Full-system behavior | Full-stack boot — last resort, requires user approval |

Always prefer the **lowest-layer tool** that can exercise the variable. Don't boot the full stack to test whether a route is registered.

---

## Composing Back Up

Once all VARs pass at the bottom depth, the top-level objective's procedure should pass without surprises. If it doesn't, a new hidden variable was exposed — add it to the list and test it in isolation.

---

## Recording Learnings

Learnings are written to two places:
1. `experiments/decompose/<slug>/runs.jsonl` — append-only, one JSON line per experiment.
2. `experiments/decompose/<slug>/learnings.md` — human-readable summary at Phase G.

Format for a completed investigation:

```md
# Investigation: <slug>
Date: YYYY-MM-DD
Depth: N/<max_depth>
Result: ✅ PASS | ❌ FAIL | ⚠️ PARTIAL | 🔴 BLOCKED

## Variables
VAR-1: ✅ PASS — route /session/{id}/restore is registered at api/routers/session.py:42
VAR-2: ❌ FAIL — snapshot key format mismatch (expected `snap:{instanceId}`, actual `snap:{sessionId}`)
VAR-3: ⚠️ PARTIAL — history injected but only the last 5 messages, not full context

## Fix applied
<one sentence describing what the Bug Fix Agent changed>

## Retested
✅ PASS
```

---

## Anti-Patterns

- ❌ Testing VAR-3 before VAR-1 is resolved.
- ❌ Treating "it works in the demo" as evidence — that is not a citation.
- ❌ Using full-stack boot to test a single endpoint behavior.
- ❌ Describing the implementation instead of the observable outcome.
- ❌ Skipping `runs.jsonl` because the experiment "felt obvious."
