# Plan 05 — E2E Testing with Playwright

**Status:** Draft for review (not yet executed)
**Date:** 2026-06-13
**Goal:** Add browser-level **End-to-End** tests that exercise the real rendered
app — the async React Server Component pages and the interactive client flows that
the existing Vitest unit suite (`tests/`) and the proposed component suite
(Plan 06) cannot reach — run **deterministically and offline** via the existing
golden fixtures.

> Grounded in this version's bundled guide: `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`.
> Per `testing/index.md`: *"Since `async` Server Components are new… we recommend
> using End-to-End Testing over Unit Testing for `async` components."* Our pages
> (`app/fixtures`, `app/leaderboard`, `app/my-teams`, `app/fixtures/[matchId]`)
> are exactly that — so Playwright is the right and only tool for them.

---

## 1. Why E2E (what the other layers can't cover)

| Layer | Tool | Covers | Status |
|-------|------|--------|--------|
| Unit / integration | Vitest (`tests/`) | `lib/` pure logic (scoring, drama, ESPN parse, predict) | ✅ done (76 tests) |
| Component | Vitest + RTL | sync/client components in isolation | 📋 Plan 06 |
| **E2E** | **Playwright** | **whole pages (async RSC), routing, cookies, live refresh, real DOM** | **this plan** |

E2E is the only layer that renders an actual `app/*/page.tsx` (async server
component fetching ESPN → rendering), follows navigation, and asserts on the
browser DOM a user would see.

## 2. Determinism & cost (reuse what we built)

Run the app under test with the Plan 03 toggles so E2E is hermetic — no network,
no spend, reproducible:

- `USE_FIXTURES=1` → ESPN served from `fixtures/espn/*.json`.
- `MOCK_LLM=1` → predictions from the deterministic golden generator (no Anthropic).
- `FIXTURE_SCENARIO=live` → drives the in-progress-match path for live-score specs.

## 3. Install (manual setup per the bundled guide)

```bash
npm init playwright@latest        # adds @playwright/test + playwright.config.ts
npx playwright install            # browser binaries
# CI only, once: npx playwright install-deps
```

Recommendation: **Chromium only** to start (fast CI, covers our needs); add
`webkit`/`firefox` projects later if cross-browser rendering becomes a concern.

## 4. Configuration

`playwright.config.ts` at repo root. The docs recommend testing against the
**production build** for fidelity; use Playwright's `webServer` to boot it and the
fixture env so it's deterministic:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Production fidelity per the Next guide; swap to `npm run dev` for faster local iteration.
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { USE_FIXTURES: '1', MOCK_LLM: '1' },
  },
});
```

**Directory separation (important):** E2E specs live in `e2e/**/*.spec.ts`; the
Vitest suite is `tests/**/*.test.ts`. The globs don't overlap, but we also:
- add `e2e/**` to Vitest's `exclude` so `vitest run` never tries to execute a
  Playwright spec (which would error on the `@playwright/test` runner), and
- Playwright's `testDir: './e2e'` keeps it from picking up Vitest files.

## 5. Scripts

```jsonc
// package.json
"test:e2e":        "playwright test",
"test:e2e:ui":     "playwright test --ui",
"test:e2e:live":   "FIXTURE_SCENARIO=live playwright test e2e/live.spec.ts"
```

## 6. First specs (the flows worth pinning)

| Spec | Flow | Key assertions |
|------|------|----------------|
| `e2e/fixtures.spec.ts` | Load `/fixtures` | 8 matches render; MEX 2–0 RSA shows FINAL; AEST kickoff label present |
| `e2e/match-detail.spec.ts` | Click a match → `/fixtures/[matchId]` | URL changes; teams, score, venue render |
| `e2e/leaderboard.spec.ts` | Load `/leaderboard` | 8 friends listed; ordering matches scoring rules; points visible |
| `e2e/my-teams.spec.ts` | Pick a friend → reload | selection persists via cookie (regression test for commit 7bd8c54) |
| `e2e/live.spec.ts` | `FIXTURE_SCENARIO=live` on `/fixtures` | a match shows in-progress 1–0 + live indicator (`LiveRefresh`) |
| `e2e/predictions.spec.ts` | Trigger a prediction (`PredictionTrigger`) | mocked prediction renders; probabilities sum visually consistent |

Each is small and asserts user-visible outcomes, not implementation details.

## 7. Harness integration (two options)

E2E needs a running server, which is `gate-verify`'s model — not `gate-ci`'s. Two
ways to wire it:

- **Option A — self-contained (recommended to start).** Playwright owns its
  `webServer`. Run via `npm run test:e2e` locally and as its own CI job. Keep it
  **out** of the harness gates. Simplest; zero coupling.
- **Option B — integrated into `gate-verify`.** Drop `webServer`, set
  `reuseExistingServer: true`, and let `gate-verify` boot the app. Requires adding
  `"USE_FIXTURES": "1", "MOCK_LLM": "1"` to `harness.json`'s `env`, and setting
  `observability` (or chaining `acceptance`) to `npx playwright test`. Elegant —
  E2E becomes part of "prove it actually works" — but couples Playwright to the
  DynamoDB boot path.

Recommendation: ship **A** first; graduate to **B** once specs are stable.

## 8. Risks / notes

- **Browser binaries** are large (~few hundred MB) and need `install-deps` in CI.
- **RSC/fetch caching:** pages use `revalidate`; with `USE_FIXTURES=1` responses
  are static so caching is harmless, but assert on content, not timing.
- **Prod build cost:** `next build` per run is slow; use `reuseExistingServer`
  locally and `npm run dev` webServer for fast iteration.
- Do **not** confuse `@playwright/test` (this committed suite) with the Playwright
  **MCP** tools in this environment (interactive automation, not CI tests).

## 9. Acceptance criteria

- [ ] `npm run test:e2e` boots the app with `USE_FIXTURES=1 MOCK_LLM=1` and runs green offline (no network, no Anthropic spend).
- [ ] The six specs in §6 pass against the production build.
- [ ] `e2e/live.spec.ts` shows an in-progress match via `FIXTURE_SCENARIO=live`.
- [ ] `vitest run` still passes and never picks up an `e2e/` spec.
- [ ] (If Option B) `gate-verify` runs the E2E suite as part of acceptance and is green.
- [ ] CI installs browsers (`playwright install --with-deps chromium`) and runs the suite headless.
```
