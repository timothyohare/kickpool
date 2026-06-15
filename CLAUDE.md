@AGENTS.md

# Quality gates

This repo is wired into the SDLC harness (see `~/.claude/CLAUDE.md`). Its binding
is `.claude/harness.json`. Before reporting work done:

- `node ~/.claude/bin/gate-ci.mjs --force --full` — lint + typecheck + `next build`.
- `node ~/.claude/bin/gate-verify.mjs` — boots `next dev` against DynamoDB Local
  (`docker compose` + `npm run dynamo:init`), waits on `/api/health`, then runs
  `npm run verify:persistence` as the acceptance check.

Do not claim a feature works until `gate-verify` is green.

## Performance check (on-demand)

- `node ~/.claude/bin/gate-perf.mjs` (alias: `npm run perf`) — the harness perf gate. Driven
  by the `perf*` keys in `.claude/harness.json`: it builds, boots `next start` against the
  golden fixtures (`USE_FIXTURES=1`, in-memory prediction store, **no network**, port 3100),
  measures p50/p95 for the key routes, and soft-gates the **median** against
  `perf-baseline.json` (fails only if a route's p50 exceeds `baseline×1.5 + 10ms`; p95 is
  shown but not gated, since the tail is noisy on a dev machine). Because it uses fixtures, it
  isolates *our* code cost (parse, live-overlay merge, group sort, RSC render) — it
  deliberately does **not** measure real ESPN network time (non-deterministic; that's left to
  production observability). Refresh the baseline after an intended change with
  `node ~/.claude/bin/gate-perf.mjs --update`.
- Not wired into the Stop hook or `gate-verify` (perf on a dev machine is noisy and it needs
  its own fixtured boot) — run it when you suspect a latency regression. If the whole table
  rises uniformly, that's machine load, not a regression.
- See `~/.claude/HARNESS.md` for the generic gate and how to add it to other projects.
