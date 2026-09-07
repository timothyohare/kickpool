@AGENTS.md

# LLM inference (disabled by default)

As of 2026-09-07 (the "Three Projects, One LLM Bill" cost review), **real
Anthropic calls are OFF by default**. The 2026 World Cup is over and all three
LLM features have deterministic, free stand-ins:

| Feature | Module | Stand-in |
|---|---|---|
| Match predictions | `lib/claude/predict.ts` | `goldenPrediction()` (seeded from team abbrs; `fixtures/llm/<id>.json` overrides) |
| Post-game sledges | `lib/claude/agents/sledge.ts` | `mockSledge()` (seeded from match id) |
| Live match-pulse | `lib/claude/agents/match-pulse.ts` | `mockPulse()` (seeded from the event) |

`lib/claude/enabled.ts::llmEnabled()` is the single gate: it returns `false`
unless `KICKPOOL_LLM=1` is set in the environment, and `MOCK_LLM=1` (CI /
Playwright / fixtures) forces `false` regardless. `KICKPOOL_LLM` is unset in
the Amplify console, so production makes no live calls and incurs no spend.

To re-enable (e.g. a future tournament): set `KICKPOOL_LLM=1` and a real
`ANTHROPIC_API_KEY`. If you do, revisit the model — all three call sites are
pinned to `claude-sonnet-4-6`; `claude-haiku-4-5` is almost certainly enough
for banter and match narration.

# Quality gates

This repo is wired into the SDLC harness (see `~/.claude/CLAUDE.md`). Its binding
is `.claude/harness.json`. Gate scripts live in
`~/dev/newdev/code-build-harness/harness/gates/` (`$GATES` below) — the old
`~/.claude/bin/` shim path was removed after the 2026-07-06 migration. Before
reporting work done:

- `node $GATES/ci.mjs --force --full` — lint + typecheck + `next build`.
- `node $GATES/verify.mjs` — boots `next dev` against DynamoDB Local
  (`docker compose` + `npm run dynamo:init`), waits on `/api/health`, then runs
  `npm run verify:persistence` as the acceptance check.

Do not claim a feature works until `gate-verify` is green.

## Performance check (on-demand)

- `node $GATES/perf.mjs` (alias: `npm run perf`) — the harness perf gate. Driven
  by the `perf*` keys in `.claude/harness.json`: it builds, boots `next start` against the
  golden fixtures (`USE_FIXTURES=1`, in-memory prediction store, **no network**, port 3100),
  measures p50/p95 for the key routes, and soft-gates the **median** against
  `perf-baseline.json` (fails only if a route's p50 exceeds `baseline×1.5 + 10ms`; p95 is
  shown but not gated, since the tail is noisy on a dev machine). Because it uses fixtures, it
  isolates *our* code cost (parse, live-overlay merge, group sort, RSC render) — it
  deliberately does **not** measure real ESPN network time (non-deterministic; that's left to
  production observability). Refresh the baseline after an intended change with
  `node $GATES/perf.mjs --update`.
- Not wired into the Stop hook or `gate-verify` (perf on a dev machine is noisy and it needs
  its own fixtured boot) — run it when you suspect a latency regression. If the whole table
  rises uniformly, that's machine load, not a regression.
- See `~/.claude/HARNESS.md` for the generic gate and how to add it to other projects.

## Fuzz testing (on-demand)

- `node $GATES/fuzz.mjs` — schema-driven API fuzzing (Schemathesis) against
  `docs/openapi.yaml`. Reuses the perf boot (fixtures + `MOCK_LLM=1`, no live
  network, port 3100) via `fuzzSchema`/`fuzzEnv` in `.claude/harness.json`, then
  fails on 5xx responses or schema violations. Covers `/api/health`,
  `/api/standings`, `/api/fixtures`, `/api/predict`.
- `/api/agents/match-pulse` is **out of scope** for now, but no longer for the
  old reason: as of 2026-09-07 `lib/claude/agents/match-pulse.ts` has a
  `mockPulse()` short-circuit via `llmEnabled()` (see "LLM inference" above),
  so a fixtured/`MOCK_LLM=1` boot no longer hits the network. It can be added
  to `docs/openapi.yaml` and the fuzz set when someone specs its request shape.
- Not wired into the Stop hook or `gate-verify` — run it when you touch API
  route handlers.

## Mutation testing (on-demand)

- `node $GATES/mutation.mjs` (alias: `npm run mutate`) — StrykerJS
  (`stryker.config.mjs`) mutates `lib/**/*.ts` and re-runs the Vitest `unit`
  suite (perTest coverage analysis) to check the tests actually fail when the
  logic breaks, not just that they pass. Break threshold 55, target 80.
  Survivors print as `file:line mutator → replacement` — strengthen the test,
  never lower the threshold.
- Scoped to `lib/`, excluding `lib/cache/dynamo.ts` (needs real/mocked AWS,
  no direct unit test). `lib/claude/agents/match-pulse.ts` now has a
  `mockPulse()` short-circuit (2026-09-07) and its Stryker exclusion in
  `stryker.config.mjs` can be revisited once it has unit tests.
- Report: `reports/mutation/mutation.json` (gitignored, regenerated per run).
- Not wired into the Stop hook or `gate-verify` — mutation runs are slow;
  run on demand after writing/changing `lib/` tests.

## Security scanning (per-PR, CI-only)

- `.github/workflows/security.yml` is a thin caller of the harness's reusable
  `security-reusable.yml` (Semgrep SAST, Gitleaks secret scan over full
  history, Trivy dependency/secret/misconfig scan at HIGH/CRITICAL). Runs on
  every pull request as three independent checks; findings fail the check and
  print in the job log.
- Scanner config lives in `timothyohare/code-build-harness` and is pulled via
  `@main`, so updates propagate without touching this repo.
- Suppress false positives inline and reviewably — `// nosemgrep`,
  `.gitleaksignore`, `.trivyignore.yaml` — never by lowering a threshold or
  disabling a scanner.
- This is CI-only (GitHub Actions), not a local `$GATES` script — there's no
  local equivalent to run before pushing; open a PR to get scan results.
