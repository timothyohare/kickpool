# Plan 04 — Fix Live / After-Match Score Updates

**Status:** Draft for review
**Goal:** Fix the reported bug: matches played today did not update — neither while
in-progress nor after full-time.

---

## 1. Diagnosis (hypotheses to confirm locally)

All pages render scores from `fetchFixtures()`:

```ts
// lib/api/espn.ts
const url = `${ESPN_BASE}/scoreboard?dates=20260611-20260719&limit=200`;
const res = await fetch(url, { next: { revalidate: 120 } });
```

And refresh via `components/ui/LiveRefresh.tsx`, which calls `router.refresh()` every 30s.

| # | Hypothesis | Mechanism | How to confirm |
|---|------------|-----------|----------------|
| **H1** | `router.refresh()` cannot bust the `fetch` Data Cache | `revalidate: 120` freezes ESPN data for ≥120s; the 30s client refresh re-renders the RSC tree against *cached* data, so scores never move faster than 2 min — and on a static/ISR page, often not at all. | Network panel in prod-like mode: ESPN response is reused; DOM score unchanged after refresh. |
| **H2** | Polling never starts | `isLive` is derived from the **dated-range** scoreboard. If that endpoint reports matches as `STATUS_SCHEDULED`/`STATUS_FINAL` rather than `STATUS_IN_PROGRESS`, `live.length === 0` → `<LiveRefresh isLive={false}>` → **no timer at all**. | Compare dated-range payload vs no-arg `scoreboard` for a known in-progress match. |
| **H3** | Amplify SSR has no shared ISR cache | Time-based revalidation isn't reliably persisted across Lambda instances, so `revalidate=60` pages can serve stale renders indefinitely. | Observe in prod (Amplify) vs local prod-like. |

H1 + H2 together fully explain "didn't update live **and** didn't update after." Confirm
with Plan 01 (prod-like run) + Plan 03 (`scoreboard-live.json`).

## 2. Fix design (aligns with SPEC §5.1 `/api/scores`)

Move live scores off the RSC-cache path onto an explicit client-polled JSON endpoint.

### 2a. Add `GET /api/scores`
- Reads ESPN (or, with Plan 02, the `kickpool-scores-cache` table with 120s live TTL).
- Uses `fetch(url, { cache: 'no-store' })` for the live path so it is never frozen.
- Returns `{ matches, lastUpdated, isStale }` per SPEC.
- Merges the no-arg `scoreboard` (authoritative for *today's* live status) with the dated
  schedule, fixing **H2**.

### 2b. Replace `LiveRefresh` with a data-polling client component
- Instead of `router.refresh()`, `fetch('/api/scores')` every
  `NEXT_PUBLIC_POLL_INTERVAL_MS` (default 60s; e.g. 15s locally).
- Update only the score/minute via React state — no full route re-render, fixing **H1**.
- Poll faster while any match is live; slow/stop when none are.
- Do **one** final poll on transition to `STATUS_FINAL` so the finished score is captured.

### 2c. `isLive` detection
- Base "is anything live" on the merged/no-store data, not the cached dated range.

### 2d. Graceful degradation (SPEC §12)
- On `/api/scores` failure, keep last good scores and show "Updated X min ago" using
  `lastUpdated`; set `isStale` when older than ~2 poll intervals.

## 3. Scope of change

| File | Change |
|------|--------|
| `app/api/scores/route.ts` | **New** — the polled endpoint (currently missing despite SPEC). |
| `lib/api/espn.ts` | Add a live-scores fetch (no-store) merging no-arg + dated scoreboards. |
| `components/ui/LiveRefresh.tsx` | Re-implement as a fetch-poller that lifts scores into state (or add a sibling `LiveScores` provider). |
| `app/page.tsx`, `app/fixtures/page.tsx`, `app/fixtures/[matchId]/page.tsx` | Consume polled scores for the live/score bits; keep static parts server-rendered. |

## 4. Verification (local, deterministic)

With Plan 01 prod-like run + Plan 03 `USE_FIXTURES=1`:

1. Load `scoreboard-live.json` (one match in progress, 0–0).
2. Confirm via chrome-devtools network panel that `/api/scores` is polled at the configured
   interval.
3. Mutate the fixture (or have the loader auto-increment) and confirm the score updates in
   the DOM **without a manual reload**.
4. Flip the fixture match to `STATUS_FINAL` and confirm the final score lands and polling
   backs off.

## 4b. What was actually implemented (deviation from §2)

The bundled Next 16 docs (`node_modules/next/dist/docs/.../fetch.md`) confirmed **H1**:
a `fetch` with `next.revalidate` is served from the Data Cache for the whole window, and
`router.refresh()` (client-router refresh) re-renders but cannot bust it. The fix therefore
only needed the **data layer** to return fresh data — not a new endpoint + client poller.

Implemented the **simpler** form (keeps `LiveRefresh`'s `router.refresh()`, no `/api/scores`,
no client state lift — which the pragmatism review explicitly favoured):

- `lib/api/espn.ts` `fetchFixtures()` now fetches **two** boards in parallel:
  - the dated **schedule** (`revalidate: 300`, rarely changes), and
  - the no-arg **"today" board** with **`cache: 'no-store'`** (authoritative for live
    status/score — fixes **H2**), then overlays the live entries onto the schedule by id.
- `cache: 'no-store'` forces the routes **dynamic**, so `router.refresh()` re-renders fresh
  every interval — no reliance on Amplify ISR (**H3**).
- Removed the now-dead `export const revalidate` consts from the pages that call
  `fetchFixtures` (they were overridden by the dynamic route and were misleading).

`/api/scores` + a dedicated client poller (the original §2/§3 design) was **not** built; it
was unnecessary once the data layer was fixed and would have added client state for no
benefit at this scale. Revisit only if full-page `router.refresh()` proves too heavy.

## 5. Acceptance criteria

- [ ] Root cause confirmed (which of H1/H2/H3 actually fired) and recorded.
- [ ] A simulated in-progress match updates on screen within one poll interval, no reload.
- [ ] Final score is captured after full-time.
- [ ] `/api/scores` returns `lastUpdated`/`isStale`; stale banner shows on fetch failure.
- [ ] No regression to static rendering / SEO of the non-live page content.
