@AGENTS.md

# Quality gates

This repo is wired into the SDLC harness (see `~/.claude/CLAUDE.md`). Its binding
is `.claude/harness.json`. Before reporting work done:

- `node ~/.claude/bin/gate-ci.mjs --force --full` — lint + typecheck + `next build`.
- `node ~/.claude/bin/gate-verify.mjs` — boots `next dev` against DynamoDB Local
  (`docker compose` + `npm run dynamo:init`), waits on `/api/health`, then runs
  `npm run verify:persistence` as the acceptance check.

Do not claim a feature works until `gate-verify` is green.
