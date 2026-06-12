# Plan 02 — DynamoDB Persistence (predictions, cache, agent state)

**Status:** Draft for review
**Goal:** Replace the in-memory `Map`s with durable DynamoDB storage so predictions and
agent state survive Lambda cold starts, per `SPEC.md §4.2`. Local dev uses **DynamoDB
Local**; production uses real DynamoDB.

---

## 1. Tables (from SPEC §4.2)

Single-table-per-concern, prefixed by `DYNAMODB_TABLE_PREFIX` (`kickpool`):

| Table | Key | TTL | Purpose | Priority |
|-------|-----|-----|---------|----------|
| `kickpool-predictions` | `PK=MATCH#{id}`, `SK=PREDICTION` | none | Persist GenAI predictions | **P0** (the ask) |
| `kickpool-scores-cache` | `PK=MATCH#{id}`, `SK=SCORE` | 120s live / 86400s final | Cache ESPN scores | P1 (supports Plan 04) |
| `kickpool-agent-state` | `PK=AGENT#{id}`, `SK=STATE` | none | match-pulse `eventHistory` | P1 |
| `kickpool-leaderboard-cache` | `PK=LEADERBOARD`, `SK=CURRENT` | 300s | Cache computed standings | P2 (optional) |

Start with **predictions only** (the actual request), then scores-cache (pairs with Plan
04), then agent-state.

## 2. New code

```
lib/cache/
  dynamo.ts     # DynamoDBDocumentClient factory; endpoint override when DYNAMODB_ENDPOINT set
  keys.ts       # key builders: predictionKey(matchId), scoreKey(matchId), agentKey(id)
scripts/
  bootstrap-dynamo.ts   # create tables in DynamoDB Local (idempotent)
docker-compose.yml      # amazon/dynamodb-local on :8000
```

`lib/cache/dynamo.ts` sketch:

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT; // set locally, unset in prod
export const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION ?? 'ap-southeast-2',
    ...(endpoint ? { endpoint } : {}),
  })
);
export const TABLE = (name: string) =>
  `${process.env.DYNAMODB_TABLE_PREFIX ?? 'kickpool'}-${name}`;
```

New deps: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`. (Dev: `aws-sdk-client-mock`.)

## 3. Refactors (ripple — important)

`predictionStore.ts` becomes **async** (DynamoDB calls). Callers must `await`:

| File | Change |
|------|--------|
| `lib/data/predictionStore.ts` | `getPrediction`/`setPrediction`/`getAllPredictions` → async, backed by `kickpool-predictions`. Keep the 24h TTL semantics via a stored `at` timestamp. |
| `app/api/predict/route.ts` | `await getPrediction(...)`, `await setPrediction(...)`. |
| `app/predictions/page.tsx` | `await getAllPredictions()` (drop the `Promise.resolve` wrapper). |
| `app/fixtures/[matchId]/page.tsx` | `await getPrediction(matchId)`. |
| `app/api/agents/match-pulse/route.ts` | Replace `eventHistory` Map with `kickpool-agent-state` read/append. |

`getAllPredictions()` currently iterates a Map. On DynamoDB this becomes a `Scan` (small
table — fine) or, better, a query for known match IDs. Document the trade-off; Scan is
acceptable at this scale.

## 4. Local workflow

```bash
docker compose up -d dynamodb-local   # :8000
npx tsx scripts/bootstrap-dynamo.ts   # create tables (idempotent)
npm run dev                           # DYNAMODB_ENDPOINT=http://localhost:8000
```

## 5. Production (Amplify) — has a human step

- Create the DynamoDB tables in `ap-southeast-2` (via console, or add CDK later — see
  "Future" below).
- **The Amplify SSR compute role needs `dynamodb:GetItem/PutItem/Query/Scan` on the
  `kickpool-*` tables.** This is an IAM change in the AWS console / Amplify service role —
  **a human must do this** (Claude cannot modify AWS IAM). Flag clearly before deploy.
- Set `DYNAMODB_TABLE_PREFIX`, `AWS_REGION` in Amplify env vars. Do **not** set
  `DYNAMODB_ENDPOINT` in prod (its absence selects real DynamoDB).

## 6. Testing

- **Unit:** `aws-sdk-client-mock` to stub `DynamoDBDocumentClient` — assert correct keys
  and TTL written, no network. (This is the `moto` equivalent for JS; moto itself is
  Python and unusable here.)
- **Integration:** DynamoDB Local — round-trip a prediction, assert it survives a
  simulated "cold start" (new client instance).

## 7. Future (optional, not now)

If infra-as-code is wanted later, add a small **CDK** app under `infra/` to provision the
four tables + the Amplify role policy. This is where `aws-cdk-lib` would enter the repo.
Out of scope for this plan unless requested.

## 7b. What was actually implemented (deviations)

Scope was trimmed based on the pragmatism review (hobby-scale, resist enterprise patterns):

- **Predictions table only.** `kickpool-predictions` is created and wired. `scores-cache`
  was **not** built — Plan 04 fixed live scores at the fetch layer (no-store overlay), so a
  cache table is unnecessary. `agent-state` was **dropped**: the Match Pulse agent is dead
  code (no caller), so persisting its `eventHistory` would be effort for nothing.
- **Graceful memory fallback.** `lib/data/predictionStore.ts` uses DynamoDB when
  `DYNAMODB_ENDPOINT` is set (local) or running on Lambda; otherwise an in-memory Map. All
  DynamoDB ops are wrapped so a down/missing table degrades (predictions regenerate) instead
  of crashing — so the app still runs locally with zero setup.
- **Formal test harness deferred.** The project has no test runner today; adding vitest +
  `aws-sdk-client-mock` for one module is disproportionate here. Instead persistence is
  proven by a real **DynamoDB Local** round-trip + a verified **cold-start** test (a stored
  prediction survived a full server restart). Repeatable via `npm run verify:persistence`.
  `aws-sdk-client-mock` was uninstalled to avoid an unused dependency.

### Local setup (one-time)
```bash
npm run dynamo:up        # docker compose up -d  (DynamoDB Local on :8000)
npm run dynamo:init      # create the kickpool-predictions table
npm run verify:persistence
npm run dev              # .env.local already points at the local endpoint
```

### Files added/changed
- Added: `lib/cache/dynamo.ts`, `lib/cache/keys.ts`, `docker-compose.yml`,
  `scripts/bootstrap-dynamo.mjs`, `scripts/verify-persistence.mjs`.
- Changed: `lib/data/predictionStore.ts` (async + DynamoDB), and awaited in
  `app/api/predict/route.ts`, `app/predictions/page.tsx`, `app/fixtures/[matchId]/page.tsx`.
- Deps: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`.

## 8. Acceptance criteria

- [ ] A generated prediction persists across a server restart (cold-start simulation).
- [ ] `/predictions` and match detail show cached predictions without regenerating.
- [ ] match-pulse `eventHistory` survives restart.
- [ ] Unit tests pass with `aws-sdk-client-mock`; integration tests pass against DynamoDB
      Local.
- [ ] Prod deploy checklist documents the required IAM change (human step).
