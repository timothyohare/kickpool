import { test, expect } from '@playwright/test';

const FRIENDS = ['Dan', 'Boris', 'Tim', 'Boomer', 'Rob', 'Ben', 'Hamish', 'Jake'];

test.describe('Leaderboard page', () => {
  test('shows the pool leaderboard with all 8 friends', async ({ page }) => {
    await page.goto('/leaderboard');

    await expect(page.getByRole('heading', { name: 'Pool Leaderboard' })).toBeVisible();
    await expect(page.getByText('Countries Alive')).toBeVisible();

    for (const name of FRIENDS) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });
});
