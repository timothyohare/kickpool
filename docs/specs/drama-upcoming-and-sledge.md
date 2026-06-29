# Spec — Upcoming-game drama notices + post-game sledges

**Status:** Draft for approval · **Date:** 2026-06-29 · **Owner:** kickpool

## 1. Context / problem

The front page (`app/page.tsx`) shows a "drama strip" from `detectDrama()`
(`lib/data/drama.ts`). Today it emits two kinds of event:

- **`grudge`** — an *upcoming* friend-vs-friend rematch after a prior defeat. Already tied to a
  scheduled fixture, so it correctly falls off once the game is played. 👍
- **`eliminated`** — a friend whose teams have all played and have nothing upcoming. This is **not
  tied to a game and never falls off** — once you're out, the roast shows for the rest of the
  tournament. 👎

We want the strip to feel *live*: notices should be **specific to upcoming games and disappear once
the game is played**, and — new — once a game finishes there should be a **friendly sledge for one
day**, then it falls off too. So the strip always reads as "what's about to happen" + "what just
happened", never a stale wall of eliminations.

## 2. Goals

1. Every notice is anchored to a **specific match** and has a clear **lifespan**.
2. **Pre-game** notices come from upcoming fixtures and vanish at kickoff/once played.
3. **Post-game** sledges appear when a game finishes and **auto-expire after ~24h**.
4. Keep it **friendly banter**, deterministic, and unit-testable.

## 3. Proposed model

### 3.1 Time-windowing (the key change)
`detectDrama` becomes time-aware so events can expire:
`detectDrama(matches, leaderboard, now = new Date()): DramaEvent[]` — `now` injected for tests.

Each `DramaEvent` gains:
- `window: 'pre' | 'post'`
- `matchId: string` (the anchor fixture)
- `at: string` (UTC ISO of the match kickoff) — for ordering + expiry.

### 3.2 Pre-game notices (window: 'pre')
Derived from `STATUS_SCHEDULED` fixtures, **kicking off within the next 48h** (so it's about
*upcoming* games, not the whole future schedule), sorted by soonest. They fall off automatically:
once a match is live/finished it's no longer `STATUS_SCHEDULED`.
- `grudge` — revenge rematch (existing logic, now carries `matchId`/`at`).
- `clash` — two different friends' teams meet with no prior history ("Tim's France vs Hamish's
  Spain — bragging rights on the line").
- `featured` — a friend's team in a marquee knockout tie (optional; nice once the bracket is live).

### 3.3 Post-game sledges (window: 'post')  ← new, **Claude-generated**
Derived from `STATUS_FINAL` fixtures whose kickoff was within the **last 24h** (`now - at < 24h`);
they expire automatically as that window passes. Only **friend-vs-friend, decisive** results (both
owners known, different, not a draw) produce a sledge:
- `sledge` — a friendly, AI-written jab at the **losing** friend off the back of the result.
  - e.g. *"Boomer's Canada bundled Boris's South Africa out 1–0. Boris, there's always the cricket."*
- `elimination` context — if the result knocked out a friend's **last** team, that fact is passed
  to the generator so the sledge can land the knockout blow. It's still just the 24h post-game
  sledge (no separate, persistent elimination notice — see §6).

### 3.4 Generation & caching (mirrors predictions)
Sledges are **Claude-generated**, so they are produced server-side and **cached per match**, never
generated on a page render — the exact pattern kickpool already uses for predictions
(`lib/claude/predict.ts` → `lib/data/predictionStore.ts` in DynamoDB; `MOCK_LLM=1` for offline
determinism; see also the `match-pulse` agent in `lib/claude/agents/`).
- New `lib/claude/agents/sledge.ts`: given the finished match (teams, friends, score, and an
  `eliminated` flag) returns one short sledge line, behind a `MOCK_LLM` deterministic stub.
- New `lib/data/sledgeStore.ts`: cache by `matchId` (generate once when a match first appears
  `STATUS_FINAL`; reuse thereafter) — same DynamoDB-cache shape as `predictionStore`.
- `detectDrama` stays **pure and synchronous**: it decides *which* finished matches are in-window
  and friend-vs-friend, and reads the **cached** sledge text (passed in), so it never calls Claude
  itself and remains fully unit-testable. A small server step (page loader or a tiny
  `/api/sledge`-style path) ensures the cache is warm, exactly like predictions.

### 3.5 Selection + cap
Keep the existing cap (≤5), but **balance**: interleave most-recent post-game sledges with
soonest pre-game notices (e.g. up to 3 post + 3 pre, newest/soonest first). Dedupe one event per
friend-pairing per window (existing grudge dedupe generalised).

### 3.6 Copy & guardrails (Claude)
The sledge generator prompts Claude for **one short, friendly line** (≤ ~20 words) ribbing the
losing friend — banter between mates, never mean-spirited. Reuse the playful tone of the current
roasts (`lib/data/drama.ts` `ROASTS`) as few-shot examples. Apply a guardrail like the
`match-pulse` agent's: reject/regenerate (or fall back to a safe canned line) if the output is
empty, too long, or trips a basic blocklist — so a bad generation never reaches the page. Pre-game
notices (grudge/clash) stay **static/templated**; only post-game sledges are AI-written.

## 4. Display (front page)
`app/page.tsx` already renders `drama` events with type-based colours. Changes:
- Group the strip into **"Coming up"** (pre) and **"Today's results"** (post) sub-headers when both
  exist; render in one strip otherwise.
- Add emoji/colour for the new types: `clash` ⚔️ (orange, as grudge), `sledge` 🗣️ / 😬 (blue/slate),
  `elimination` 💀 (red, as today). Existing `eliminated` styling is reused/renamed.
- No layout overhaul — same card style as the current drama strip.

## 5. Testability
`detectDrama` stays pure: `now` is injected and the (Claude-generated) sledge text is **passed in
pre-cached**, so the *selection/lifespan* logic is fully deterministic even though the copy isn't.
Tests assert the pipeline, not the wording:
- a finished friend-vs-friend game **shows** a sledge at `now = kickoff + 2h` and is **gone** at
  `now = kickoff + 26h`;
- an upcoming grudge shows when `STATUS_SCHEDULED` and within 48h, and is absent once `STATUS_FINAL`;
- the elimination flag is set only when the result knocks out a friend's last team (drives the
  generator), and the sledge still expires after 24h (no permanent notice — unlike today's
  behaviour in `tests/drama.test.ts`, which this changes);
- draws and same-owner games never sledge (existing guards kept).
The generator itself is tested under `MOCK_LLM=1` (deterministic stub) + a guardrail unit test,
mirroring the predictions tests. Extend `tests/drama.test.ts` with `now`-parameterised cases and
add `tests/sledge.test.ts` for the agent/guardrail.

## 6. Scope
**In:** time-windowed `detectDrama` (pre/post, `matchId`/`at`), **Claude-generated** post-game
sledges (`lib/claude/agents/sledge.ts` + `lib/data/sledgeStore.ts`, cached per `matchId`, `MOCK_LLM`
for tests) with a 24h expiry, elimination folded into a transient sledge (**sledge-only, nothing
permanent**), static pre-game grudge/clash notices, front-page grouping, tests.
**Out (later):** cross-match "story arcs", a sledge for non-friend-vs-friend results, and surfacing
eliminations anywhere persistent.

## 7. Decisions (resolved)
1. Pre-game horizon = **48h**. ✅
2. Post-game lifespan = **24h**. ✅
3. Eliminations are **sledge-only** — no permanent home. ✅
4. Sledges are **Claude-generated** (cached per match; `MOCK_LLM` in tests). ✅
