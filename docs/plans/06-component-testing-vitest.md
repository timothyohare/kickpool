# Plan 06 — Component Testing with Vitest + React Testing Library

**Status:** Draft for review (not yet executed)
**Date:** 2026-06-13
**Goal:** Add **component-level** tests that render our React components in
isolation (jsdom) and assert on their output and interactions — the middle layer
of the pyramid between the existing `lib/` unit tests (`tests/`) and the
browser-level E2E suite (Plan 05).

> Grounded in this version's bundled guide:
> `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`.
> Per that guide: *"Vitest currently does not support async Server Components…
> we recommend using E2E tests for async components."*

---

## 1. Scope — and a helpful finding

A quick audit of `components/` shows **all 10 components are synchronous** (no
`export default async`). The Vitest async-RSC limitation therefore does **not**
bite us here — every component is unit-testable. (The async code is only in the
`app/*/page.tsx` pages, which Plan 05/Playwright owns.)

| Component | Kind | Test focus |
|-----------|------|-----------|
| `matches/MatchCard` | server (sync) | renders teams/score/status; AEST label; friend colour |
| `matches/MatchRow` | server (sync) | compact row fields; live vs final styling |
| `groups/GroupTable` | server (sync) | rows ordered by position; W/D/L/GD/Pts cells |
| `groups/CompactGroupTable` | server (sync) | condensed variant renders all teams |
| `leaderboard/Leaderboard` | server (sync) | 8 friends; ordering; per-friend points/countries |
| `ui/FriendBadge` | client | name + colour swatch; handles unknown friend |
| `ui/Navbar` | client | links present; active-route styling |
| `ui/FriendPicker` | client | select friend → writes cookie + `router.refresh()` |
| `ui/LiveRefresh` | client | polls on interval → calls `router.refresh()`; cleans up timer |
| `predictions/PredictionTrigger` | client | click → fetch `/api/predict` → renders mocked prediction; loading/error states |

> Note: synchronous *server* components render fine under RTL because they're
> just functions returning JSX — RTL/jsdom doesn't care about the server/client
> boundary as long as the component doesn't `await` or import server-only APIs.

## 2. Install (manual setup per the bundled guide)

```bash
npm install -D @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/dom \
  @testing-library/user-event @testing-library/jest-dom
```

(`vitest` itself is already installed from the existing unit-test work.)

## 3. Configuration — dual environment

The current `vitest.config.ts` uses `environment: 'node'` (correct for the `lib/`
tests; jsdom would only slow them down). Component tests need `jsdom` + the React
plugin. Keep both fast by splitting into **Vitest projects**:

```ts
// vitest.config.ts (sketch)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const alias = { '@': fileURLToPath(new URL('./', import.meta.url)) };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        // existing pure-logic tests — fast node env
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['tests/**/*.test.ts'] },
      },
      {
        // new component tests — jsdom + RTL
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['tests/components/**/*.test.tsx'],
          setupFiles: ['tests/components/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
      exclude: ['lib/cache/dynamo.ts', 'lib/claude/agents/**'],
      reporter: ['text', 'html'],
    },
  },
});
```

Setup file (jest-dom matchers + auto-cleanup):

```ts
// tests/components/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
```

> **Alternative (simpler, less optimal):** a single global `environment: 'jsdom'`.
> All current node tests still pass under jsdom; the only cost is slightly slower
> `lib/` runs. Use this if the projects split feels heavy. **Recommendation:**
> projects — it keeps the 76 existing tests on the fast node path.

## 4. Mocking surface (client components)

| Dependency | Where | How to mock |
|------------|-------|-------------|
| `next/navigation` (`useRouter().refresh`) | FriendPicker, LiveRefresh | `vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))` and assert the spy |
| `document.cookie` | FriendPicker | assert/seed via jsdom's `document.cookie` |
| `setInterval`/`setTimeout` | LiveRefresh | `vi.useFakeTimers()` + `vi.advanceTimersByTime()`; assert refresh called per tick and timer cleared on unmount |
| `fetch('/api/predict')` | PredictionTrigger | `vi.spyOn(global, 'fetch')` returning a golden `Prediction`; cover loading + error |
| `next/link` | Navbar, PredictionTrigger | renders as `<a>` in jsdom; usually no mock needed — assert `href` |

Reuse `tests/helpers/match.ts` (and add a `friendScore` factory) so component
props are built the same way as the logic tests.

## 5. File layout

```
tests/
  components/
    setup.ts
    MatchCard.test.tsx
    GroupTable.test.tsx
    Leaderboard.test.tsx
    FriendPicker.test.tsx        # cookie + router.refresh
    LiveRefresh.test.tsx         # fake timers + cleanup
    PredictionTrigger.test.tsx   # mocked fetch, loading/error
  helpers/
    match.ts                     # existing
    friend.ts                    # new: FriendScore / leaderboard-row factory
```

Colocating under `tests/` keeps all Vitest tests in one tree (and out of
Playwright's `e2e/` dir).

## 6. Harness integration (already wired)

No gate changes needed. `gate-ci` runs `npm test` (→ `vitest run`), which now
executes **both** projects, so component tests run automatically on every Stop
hook alongside the lib tests. Coverage gains `components/**` (see §3). Nothing
new to add to `harness.json`.

## 7. What this layer deliberately does NOT cover

- **Async page rendering / data fetching** (`app/*/page.tsx`) → Plan 05 (Playwright).
- **Real navigation, cookies across reloads, live polling in a real browser** →
  Plan 05. Here we assert the component *calls* `router.refresh()`; E2E asserts the
  page *actually* updates.

## 8. Acceptance criteria

- [ ] `npm test` runs both `unit` and `components` projects green; the 76 existing tests stay on the node env.
- [ ] At least the 6 components in §5 have tests covering render + key interaction.
- [ ] `FriendPicker` test proves a selection writes the cookie and triggers `router.refresh()`.
- [ ] `LiveRefresh` test proves it refreshes on its interval and clears the timer on unmount (no leaked timers).
- [ ] `PredictionTrigger` test covers loading, success (mocked fetch), and error states with no real network call.
- [ ] Coverage report includes `components/**`; `gate-ci --force` stays green.
```
