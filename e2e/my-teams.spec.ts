import { test, expect } from '@playwright/test';

test.describe('My Teams', () => {
  test('remembers the selected friend via cookie across visits', async ({ page }) => {
    // Fresh context → no cookie → defaults to Tim.
    await page.goto('/my-teams');
    await expect(page.getByRole('heading', { name: 'How am I doing?' })).toBeVisible();
    await expect(page.getByText(/^Tim ·/)).toBeVisible();

    // Pick Dan via the FriendPicker (writes the cookie + navigates).
    await page.getByRole('link', { name: 'Dan' }).click();
    await expect(page).toHaveURL(/friend=dan/);
    await expect(page.getByText(/^Dan ·/)).toBeVisible();

    // Revisit with no query param → the cookie should restore Dan.
    await page.goto('/my-teams');
    await expect(page.getByText(/^Dan ·/)).toBeVisible();
  });
});
