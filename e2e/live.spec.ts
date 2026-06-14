import { test, expect } from '@playwright/test';

// Requires the server booted with FIXTURE_SCENARIO=live, which forces the first
// fixture to an in-progress 1–0. Run via `npm run test:e2e:live`; skipped in the
// default suite (which boots a non-live server).
test.describe('Live scores', () => {
  test.skip(process.env.FIXTURE_SCENARIO !== 'live', 'run via npm run test:e2e:live');

  test('shows an in-progress match with the live auto-refresh banner', async ({ page }) => {
    await page.goto('/fixtures');

    // LiveRefresh banner is rendered only when a match is live.
    await expect(page.getByText(/auto-updates every/i)).toBeVisible();

    // The forced live fixture shows a 1–0 scoreline.
    await expect(page.getByText(/1[–-]0/).first()).toBeVisible();
  });
});
