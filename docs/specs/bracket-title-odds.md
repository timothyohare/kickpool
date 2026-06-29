# Spec + Plan — Monte-Carlo title odds on the bracket

**Status:** Draft for approval · **Date:** 2026-06-29 · **Owner:** kickpool

## 1. Context / problem

The knockout bracket (`app/bracket/page.tsx`) shows who plays whom and which friend owns each
team, but not *how likely each team is to go all the way*. The sibling project
**FifaWorldCupMonteCarloSim** already computes exactly that — 100k-simulation championship odds —
and commits a fresh snapshot daily. We want to surface those odds against each team on the
bracket (e.g. **Argentina 26%**), so friends can see who the favourites are next to who owns them.

This was explicitly deferred from the original bracket build; this spec covers wiring it in.

## 2. Data source (decided)

The sim's GitHub Action commits `history/latest.json` daily to
`https://github.com/timothyohare/FifaWorldCupMonteCarloSim`. Verified shape:

```jsonc
{ "generatedAt": "2026-06-27T09:24:02Z", "sims": 100000, "seed": 1, "bracket": "fifa-2026",
  "teams": [ { "team": "ARG", "group": "J",
              "champion": 0.257, "runnerUp": 0.112, "reachFinal": 0.332,
              "reachSemi": 0.486, "escapeGroup": 0.998,
              "championMoE": 0.0026, "runnerUpMoE": 0.0020 }, … 48 teams ] }
```

- `team` is the **ESPN abbreviation** — the sim was built to match kickpool's `TeamRef.abbr`, so
  the join is `normAbbr(abbr)` (`lib/data/friends.ts`) with no mapping table.
- Snapshot is reproducible and dated; **all 48 teams** are present.

**Access pattern (recommended — option A from the sim's `docs/11-kickpool-integration.md`):**
kickpool fetches the committed raw file and caches it. No sim code runs in kickpool, no build-time
coupling, and it auto-updates when the sim's cron commits. Raw URL (public repo):
`https://raw.githubusercontent.com/timothyohare/FifaWorldCupMonteCarloSim/main/history/latest.json`,
overridable via `ODDS_SOURCE_URL`. (Rejected: build-time vendoring → stale; shared S3/KV →
overkill until auto-refresh is wanted.)

## 3. Behaviour / UX

- On each **resolved** team slot in a bracket card, show a small muted **reach-final** odds chip
  after the friend badge, e.g. `33%` (`reachFinal` from the payload — chance the team makes the
  final). Placeholders (`1E`, `RD32 W2`, `3RD …`) show nothing.
- A header/footnote line: "Chance to reach the final · Monte-Carlo, 100k sims · updated 2 days ago"
  sourced from `generatedAt` + `sims`, so the numbers are auditable. Link to a future `/odds`
  board (TBD).
- Optional toggle (v1.1): switch the chip metric between **Reach final %**, **Champion %** and
  **Reach semi %** (all already in the payload). **v1 ships reach-final % only.**
- **Highlight synergy:** when a friend is selected in the existing highlight lens, their teams'
  odds stand out naturally — no extra work.

### Graceful degradation (required)
- If the file is unreachable or malformed → render the bracket exactly as today, no chips, no
  error. Odds are additive, never load-bearing.
- **Staleness guard:** the sim conditions on group standings and re-simulates the bracket from the
  actual qualifiers, but per its README it does **not yet condition on knockout results already
  played**. So once the knockouts are underway the odds lag reality. Mitigations:
  - Always show the "updated <relative time>" stamp.
  - If `generatedAt` is older than `ODDS_MAX_AGE` (**default 2 days**), hide the chips and show
    only the stamp ("odds paused — awaiting fresh run") rather than misleading stale numbers.

## 4. Implementation plan

| # | Change | File |
|---|--------|------|
| 1 | `fetchOdds(): Promise<OddsSnapshot \| null>` — fetch `ODDS_SOURCE_URL` with `next: { revalidate: 3600 }`; `USE_FIXTURES=1` reads a committed `fixtures/odds/latest.json`; parse + normalize into `{ generatedAt, sims, byAbbr: Map<abbr, TeamOdds> }` keyed by `normAbbr`; return `null` on any failure. Mirrors `lib/api/espn.ts`'s fixture-aware `espnFetch`. | `lib/api/odds.ts` (new) |
| 2 | Add `TeamOdds` (`champion`, `runnerUp`, `reachFinal`, `reachSemi`, `escapeGroup`) and `OddsSnapshot` types. | `types/index.ts` |
| 3 | Fetch odds alongside fixtures/standings; pass `oddsByAbbr` + `oddsMeta` to `<BracketView>`. Keep `buildBracket` **pure** — odds are joined at render, not baked into the bracket. | `app/bracket/page.tsx` |
| 4 | Thread `oddsByAbbr`/`oddsMeta` to cards; render the champion-% chip on team slots; add the "updated …" footnote + staleness handling. | `components/bracket/Bracket.tsx`, `components/bracket/BracketMatch.tsx` |
| 5 | Commit a deterministic `fixtures/odds/latest.json` (a real snapshot copy) for `USE_FIXTURES`/perf. | `fixtures/odds/latest.json` (new) |

Reuse: `normAbbr` (`lib/data/friends.ts`), the fixture-aware fetch pattern + `USE_FIXTURES` from
`lib/api/espn.ts`, the existing card layout/`FriendBadge` spacing.

### Test plan
- `tests/odds.test.ts` — parser/normalizer: maps `team`→`normAbbr`, exposes champion %, returns
  `null` on malformed/missing input, flags staleness past `ODDS_MAX_AGE`.
- Component test: a team slot renders its champion chip; a placeholder renders none; stale snapshot
  hides chips.
- **Gates:** `gate-ci --force --full`; `gate-verify`; browser screenshot of `/bracket` showing
  odds chips (via `USE_FIXTURES` snapshot) at desktop + mobile.
- Optional: add `/bracket` is already in `perfRoutes`; no perf change needed (one extra cached
  fetch, fixtured in perf).

## 5. Scope

**In:** reach-final-% chip on bracket team slots + provenance footnote + graceful/stale handling,
fed by the sim's committed `latest.json`.
**Out (later):** a standalone `/odds` board (title-odds bar chart + odds-over-time from
`history/champion-odds.csv`, per the sim's `docs/11`), the metric toggle, and writing odds into
scoring. Knockout-conditioned odds depend on a sim-side change.

## 6. Decisions (resolved)
1. Sim repo is **public** — fetch the raw `latest.json` URL directly. ✅
2. v1 chip metric = **reach-final %** (`reachFinal`). ✅
3. `ODDS_MAX_AGE` = **2 days**. ✅
