# Plan 01 — Local Development Environment

**Status:** Draft for review
**Goal:** Run kickpool locally with enough production fidelity that changes (especially
live-score behaviour) can be verified end-to-end, and so Claude Code can spin it up and
drive it through the browser.

---

## 1. Approach

Three levels of fidelity, used for different things:

| Mode | Command | Use for |
|------|---------|---------|
| **Dev** | `npm run dev` | Day-to-day iteration. Fast HMR. **Note:** dev mode disables the Full Route Cache and weakens `fetch` caching, so it does *not* reproduce the production live-score bug faithfully. |
| **Prod-like** | `npm run build && npm run start` | Reproduces ISR + `fetch` Data Cache behaviour that causes the live-score staleness. Use this to validate Plan 04. |
| **Standalone (optional)** | `output: 'standalone'` + `node .next/standalone/server.js` | Closest to Amplify's Lambda packaging. Only needed if we chase Lambda-specific issues. |

We will **not** use LocalStack/SAM/moto (see `00-overview.md` for rationale).

## 2. Dependencies to add

- **Docker** (for DynamoDB Local) — only required once Plan 02 lands. Plan 01 alone runs
  without Docker using the existing in-memory store.
- `docker-compose.yml` (new, repo root) describing DynamoDB Local — see Plan 02.

## 3. Environment configuration

Current `.env.local` already has `ANTHROPIC_API_KEY`, `THE_ODDS_API_KEY` (now unused — to
be removed), `TAVILY_API_KEY`. Add the following keys (consumed in later plans):

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...            # real key, or unused when MOCK_LLM=1
TAVILY_API_KEY=...                      # real key, or unused when MOCK_LLM=1

# Local-only fidelity controls (added by later plans)
MOCK_LLM=1                              # Plan 03: serve golden predictions, no API cost
USE_FIXTURES=0                          # Plan 03: 1 = serve ESPN from golden JSON
NEXT_PUBLIC_POLL_INTERVAL_MS=15000     # Plan 04: client score poll cadence (faster locally)

# DynamoDB (Plan 02)
DYNAMODB_ENDPOINT=http://localhost:8000 # presence => use local DynamoDB
DYNAMODB_TABLE_PREFIX=kickpool
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=local                 # dummy creds for DynamoDB Local
AWS_SECRET_ACCESS_KEY=local
```

`.env*` is gitignored, so secrets stay local. Document these keys in a new
`.env.example` (no secret values) so the setup is reproducible.

## 4. Steps

1. Remove the now-dead `THE_ODDS_API_KEY` lines from `.env` / `.env.local` (betting odds
   feature was removed).
2. Create `.env.example` listing every key with placeholder values.
3. Confirm `npm run dev` boots and renders `/`, `/fixtures`, `/fixtures/[matchId]`,
   `/groups`, `/leaderboard`, `/predictions`.
4. Confirm `npm run build && npm run start` boots (this is the mode used to reproduce the
   live-score bug for Plan 04).
5. Add an npm script alias for the prod-like loop:
   ```json
   "scripts": { "start:prod": "next build && next start" }
   ```

## 5. How Claude drives it for live testing

Once running on `http://localhost:3000`, Claude uses the **chrome-devtools MCP** to:

- `navigate_page` to a route, `take_snapshot` / `take_screenshot` to inspect rendering.
- `list_network_requests` to verify the score-poll requests actually fire and what ESPN
  returns (critical for diagnosing Plan 04).
- `list_console_messages` for client errors.
- Re-check after a change to confirm the fix without manual clicking.

This is the core reason for running locally: **observe the real network + DOM behaviour**
that Amplify hides.

## 6. The "is it actually live?" problem

The World Cup 2026 window is 11 Jun – 19 Jul 2026 (today is within it), so real ESPN data
*may* include live matches — but we cannot rely on a match being in-progress exactly when
we test. For **deterministic** live-path testing we use golden ESPN fixtures with a forced
in-progress match (see Plan 03), so the live UI can be exercised on demand, offline and
free.

## 7. Acceptance criteria

- [ ] `npm run dev` and `npm run start:prod` both boot cleanly with no console errors.
- [ ] `.env.example` exists and lists all required keys.
- [ ] Dead `THE_ODDS_API_KEY` removed from local env files.
- [ ] Claude can navigate to all routes via chrome-devtools MCP and capture snapshots.
- [ ] Network panel shows the requests each page makes (baseline for Plan 04).
