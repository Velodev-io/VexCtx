---
name: experiment-runner
description: >
  Protocol for executing a single leaf experiment in an isolated sandbox.
  Used by the Vexon Decompose Agent in Phase E. Covers sandbox selection,
  idempotency, pre-committed pass/fail criteria, evidence capture, and the
  runs.jsonl record format.
---

# Experiment Runner

One leaf = one variable = one experiment = one outcome.

---

## 1. The Experiment Record (immutable, written BEFORE running)

Every leaf must have these fields filled in `tree.md` before the experiment runs:

```yaml
VAR-N: <claim to verify>
  sandbox:    <tool id from decompose.config.yaml sandbox_tools>
  cmd:        <exact command, curl, grep pattern, or UI action>
  inputs:     <env vars, seed state, headers, body — whatever the command needs>
  expected:   <what counts as PASS — concrete and observable>
  fail_if:    <what counts as FAIL — concrete and observable>
  timeout:    <minutes — must be ≤ limits.max_minutes_per_leaf from config>
```

If any field is vague, the experiment is not ready. Refine the spec before running.

---

## 2. Sandbox Selection — Lowest Cost First

Pick the cheapest tool that can answer the question.

| Tool | When to pick it |
|---|---|
| `grep` | Code presence, route registration, hardcoded values |
| `curl` | Endpoint behavior, response shape, headers, status codes |
| `redis-cli` | Key existence, TTL, value, list or hash contents |
| `psql` | Row existence, schema column, FK validity |
| `docker-logs` | Last-resort runtime error inspection in container output |
| `trace-file` | Distributed event flow across services via `logs/experiment-events.jsonl` |
| `playwright` | UI interaction that cannot be triggered any other way |
| `full-stack-boot` | Last resort. Requires explicit user approval. |

**Rule:** if two tools could answer the question, pick the cheaper one.  
If you're reaching for `playwright` for something `curl` can answer, you've misframed the variable.

---

## 3. Pre-Run Checklist

Before executing any leaf:

- [ ] Pass/fail criteria written in `tree.md` and locked.
- [ ] Tool is listed in `sandbox_tools` in `.github/decompose.config.yaml`.
- [ ] Tool is read-only **OR** user has explicitly approved a destructive run.
- [ ] Inputs are reproducible — same command tomorrow gives the same answer.
- [ ] All `depends_on` variables have status `pass`.

If any box is unchecked, do not run.

---

## 4. Execution

1. Run the command with the appropriate sandbox tool (timeout from spec).
2. Capture: command, exit code, stdout (head + tail if large), stderr.
3. Compare actual output against `expected` and `fail_if`.
4. Result is one of exactly four values:
   - `pass` — matches `expected`
   - `fail` — matches `fail_if`
   - `partial` — matches some but not all of `expected`
   - `blocked` — could not run (missing prerequisite, timeout, infra error)

Never invent a fifth outcome. If the result is unclear, it's `partial` and the variable needs splitting.

---

## 5. Recording — `runs.jsonl`

Append exactly one JSONL line per execution. No exceptions.

```json
{
  "ts": "2026-05-25T03:30:00Z",
  "slug": "2026-05-25-ws-reconnect-loop",
  "var": "VAR-1",
  "depth": 1,
  "tool": "grep",
  "cmd": "grep -rn 'reconnect' api/ws/",
  "exit_code": 0,
  "result": "pass",
  "evidence": "Found reconnect logic at api/ws/handler.py:87 with 3-retry cap",
  "learning": "WebSocket reconnect is capped at 3 retries in the handler"
}
```

**Field rules:**
- `evidence` is **observable** — what you saw, not what you concluded.
- `learning` is one sentence. If you need more, the variable was too coarse.
- `result` must be one of the four enumerated values.

---

## 6. Idempotency

An experiment must be re-runnable without contaminating state.

| Concern | Rule |
|---|---|
| Test data | Tag with the investigation slug; clean up after the run. |
| Redis keys | Use a `test:decompose:` prefix; delete by pattern after run. |
| Database rows | Insert in a transaction that rolls back, OR tag and delete by slug. |
| File artifacts | Write under `experiments/decompose/<slug>/scratch/`; never write to production paths. |
| External APIs | Mock if possible. If not, document cost in the experiment record. |

If an experiment cannot be made idempotent, classify the variable as `blocked` and ask the user before running.

---

## 7. Failure Handling

When a leaf fails:

1. Record the FAIL in `runs.jsonl`.
2. Update `tree.md` status to `fail`.
3. **Do not attempt a fix.**
4. Decide next step:
   - **Need more information?** → surface a sub-variable that explains *why* it failed. Recurse as a child slug.
   - **Root cause is clear?** → mark the parent variable as handoff-ready. Stop investigating.

A failed leaf is a success — it converted an unknown into a known.

---

## 8. Anti-Patterns

- ❌ Editing `tree.md` pass/fail criteria after seeing the result — this poisons the evidence.
- ❌ Running the same experiment twice without changing the spec.
- ❌ Using `full-stack-boot` to test a single endpoint.
- ❌ Recording `result: pass` because no error occurred — pass requires matching the `expected` field exactly.
- ❌ Skipping `runs.jsonl` because the experiment felt obvious.
- ❌ Bundling multiple behaviors into one leaf experiment.
