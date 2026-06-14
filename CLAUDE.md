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

- `npm run perf` — deterministic latency check. Builds, boots `next start` against the
  golden fixtures (`USE_FIXTURES=1`, in-memory prediction store, **no network**), and
  measures p50/p95 for the key routes, soft-gating against `perf-baseline.json` (fails only
  if a route's p95 exceeds `baseline×1.5 + 10ms`). Because it uses fixtures, it isolates
  *our* code cost (parse, live-overlay merge, group sort, RSC render) — it deliberately does
  **not** measure real ESPN network time, which is non-deterministic. Refresh the baseline
  after an intended change with `npm run perf -- --update`.
- Not wired into the Stop hook or `gate-verify` (perf on a dev machine is noisy and it needs
  its own fixtured boot) — run it when you suspect a latency regression.
