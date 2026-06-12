# Plan 03 — Model Mocking & Golden Data

**Status:** Draft for review
**Goal:** Make local runs and CI **deterministic and free** by mocking the external
non-deterministic / paid dependencies — primarily Anthropic, optionally ESPN and Tavily —
behind env flags, using a committed "golden" dataset.

---

## 1. What to mock and why

| Dependency | Mock? | Why |
|------------|-------|-----|
| **Anthropic** (`lib/claude/predict.ts`, `lib/claude/agents/match-pulse.ts`) | ✅ Primary | Costs money + non-deterministic. Blocks free local iteration and CI. |
| **ESPN** (`lib/api/espn.ts`) | ✅ For live-path tests | Free but non-deterministic (no match is reliably "live" on demand). Needed to exercise Plan 04 deterministically. |
| **Tavily** | ⛅ Optional | Only used by agents; mock if/when agent flows are tested. |

## 2. Mechanism

Two complementary toggles (already listed in Plan 01 `.env`):

- `MOCK_LLM=1` → Anthropic calls return golden predictions instead of hitting the API.
- `USE_FIXTURES=1` → ESPN fetches return golden JSON instead of the network.

### 2a. Anthropic — module-level shim (recommended)

Wrap the single call site so production code is unchanged when flags are off:

```ts
// lib/claude/predict.ts
export async function generatePrediction(match: Match): Promise<Prediction> {
  if (process.env.MOCK_LLM === '1') return goldenPrediction(match); // fixtures/llm/*.json
  // ...existing Anthropic call...
}
```

`goldenPrediction` loads `fixtures/llm/<matchId>.json`, falling back to a generic
deterministic prediction (probabilities seeded from team abbreviations) so any match works
without hand-authoring every file.

### 2b. ESPN — fixture loader (recommended over MSW for simplicity)

```ts
// lib/api/espn.ts
async function espnFetch(url: string, init: RequestInit) {
  if (process.env.USE_FIXTURES === '1') return loadFixture(url); // fixtures/espn/*.json
  return fetch(url, init);
}
```

`loadFixture` maps the scoreboard/standings URLs to committed JSON. We will capture **one
real ESPN scoreboard payload** and hand-edit a variant where one match is
`STATUS_IN_PROGRESS` with an incrementing score — this is the deterministic live fixture
for Plan 04.

> Alternative considered: **MSW** (Mock Service Worker) intercepts at the HTTP layer and is
> the spec's choice for integration tests (`SPEC §13`). It's heavier to wire into Next
> server runtime than a fetch shim. **Decision:** fetch/module shims for app runtime;
> adopt MSW only inside Vitest integration tests where it shines.

## 3. Golden dataset layout

```
fixtures/
  espn/
    scoreboard.json            # captured real payload (schedule)
    scoreboard-live.json       # hand-edited: one match in progress, score ticking
    standings.json
  llm/
    <matchId>.json             # optional per-match golden predictions
    _default.json              # deterministic fallback shape
```

Provide a `scripts/capture-fixtures.ts` to refresh `espn/*.json` from the live API (run
manually, occasionally) so goldens don't rot.

## 4. Record / replay (optional enhancement)

A `RECORD_FIXTURES=1` mode that writes real responses to the fixtures dir on first miss,
then replays thereafter — useful for expanding coverage without manual capture. Implement
only if the manual capture script proves insufficient.

## 5. CI usage

Per `SPEC §13`, CI runs `typecheck`, `lint`, `test`. Tests run with `MOCK_LLM=1
USE_FIXTURES=1` so they're hermetic — no secrets, no network, no spend. Add the missing
`typecheck` and `test` npm scripts (Vitest is specified but not yet installed).

## 6. Acceptance criteria

- [ ] With `MOCK_LLM=1`, requesting a prediction returns instantly with no Anthropic call
      (verify via network panel) and a valid `Prediction` shape.
- [ ] With `USE_FIXTURES=1`, all pages render from golden ESPN data offline.
- [ ] `scoreboard-live.json` drives a visible in-progress match in the UI.
- [ ] CI job runs green fully offline.
