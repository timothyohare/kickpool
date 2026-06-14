# Local-Run + Persistence Plans — Overview

**Status:** Draft for review (not yet executed)
**Date:** 2026-06-12

## Why these plans exist

Two goals, one motivating bug:

1. **Persist GenAI predictions** so they aren't regenerated on every request / Lambda
   cold start. `SPEC.md §4.2` already specifies DynamoDB tables for this.
2. **Run the app locally with production fidelity** so changes can be spun up and
   verified against live behaviour before deploying.
3. **Motivating bug:** matches played today did not update — neither live (in-progress)
   nor after full-time. See `04-live-score-fix.md`.

## What this app actually is (grounding)

- Pure **Next.js 16 (App Router) + TypeScript**. No `boto3`, no `@aws-sdk`, no Python,
  no CDK/IaC in the repo. Deployed via the **Amplify console** (only `amplify.yml`, a
  build spec, is checked in).
- Runtime external dependencies are plain HTTPS APIs:
  - **ESPN** unofficial API (`lib/api/espn.ts`) — fixtures, scores, standings
  - **Anthropic** (`lib/claude/*`) — predictions + match-pulse narration
  - **Tavily** (`TAVILY_API_KEY`) — agent search
- State today is **in-memory `Map`s** that die on cold start:
  - `lib/data/predictionStore.ts` (predictions)
  - `app/api/agents/match-pulse/route.ts` (`eventHistory`, already TODO'd for DynamoDB)

## Tooling decision (re-evaluated)

| Tool | Verdict | Reason |
|------|---------|--------|
| **DynamoDB Local** | ✅ Use | Only one AWS service is needed. Official, tiny Docker image, real DynamoDB API locally. |
| **aws-sdk-client-mock** | ✅ Use (unit tests) | In-process mock of `@aws-sdk` clients for fast unit tests. |
| **LocalStack** | ❌ Skip | Emulates dozens of services; overkill + heavy for a single-table need. Reconsider only if S3/SQS/EventBridge get added. |
| **moto** | ❌ Skip | Python library that mocks `boto3`. This is a TS app — not usable. `aws-sdk-client-mock` is the JS equivalent. |
| **AWS SAM CLI** | ❌ Skip | Runs hand-written Lambda functions. Amplify packages the Next SSR Lambda for us; no SAM template exists. For prod-runtime fidelity use `next build && next start` (or `output: 'standalone'`) instead. |

## The plans

| # | File | Purpose | Depends on |
|---|------|---------|-----------|
| 1 | `01-local-dev-environment.md` | Run locally with fidelity; how Claude drives it for live testing | — |
| 2 | `02-dynamodb-persistence.md` | Durable predictions + cache + agent state (SPEC §4.2) | 1 |
| 3 | `03-model-mocking-golden-data.md` | Deterministic, free local/CI runs via golden fixtures | 1 |
| 4 | `04-live-score-fix.md` | Fix the live/after-match score update bug | 1, (3 for deterministic repro) |

## Suggested execution order

1. **Plan 1** (local env) — unblocks everything; lets us reproduce the bug.
2. **Plan 3** (mocking) — gives a deterministic, free harness to develop against.
3. **Plan 4** (live-score fix) — the user-visible bug; verified locally via 1 + 3.
4. **Plan 2** (DynamoDB) — durability; larger blast radius (async refactor + IAM), so last.

Each plan has its own **Acceptance Criteria** section. Nothing is executed until these
plans are reviewed.

## Testing plans (added 2026-06-13)

Follow-on plans for the testing pyramid, after the Vitest `lib/` unit suite landed:

| # | File | Purpose | Depends on |
|---|------|---------|-----------|
| 5 | `05-e2e-playwright.md` | Browser E2E for async RSC pages + interactive flows, deterministic via fixtures | 3 (fixtures) |
| 6 | `06-component-testing-vitest.md` | Component-level render/interaction tests (Vitest + RTL) | — |

These two are **independent of each other** and can be done in either order; both
are **Draft for review**.
