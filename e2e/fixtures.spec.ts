import { test, expect } from '@playwright/test';

test.describe('Fixtures page', () => {
  test('lists all 8 fixtures from the golden data', async ({ page }) => {
    await page.goto('/fixtures');

    await expect(page.getByRole('heading', { name: 'Fixtures' })).toBeVisible();

    // One detail link per match row.
    await expect(page.locator('a[href^="/fixtures/"]')).toHaveCount(8);

    // A couple of known teams render.
    await expect(page.getByText('Mexico')).toBeVisible();
    await expect(page.getByText('South Africa')).toBeVisible();

    await expect(page.getByText(/All times in Australian Eastern Time/)).toBeVisible();
  });
});
