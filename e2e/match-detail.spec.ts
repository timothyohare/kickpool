import { test, expect } from '@playwright/test';

test.describe('Match detail', () => {
  test('navigates from the fixtures list to a match detail page', async ({ page }) => {
    await page.goto('/fixtures');

    // Click the Mexico vs South Africa row.
    await page.getByRole('link', { name: /Mexico/ }).click();

    await expect(page).toHaveURL(/\/fixtures\/\d+/);
    await expect(page.getByText('Mexico')).toBeVisible();
    await expect(page.getByText('South Africa')).toBeVisible();
    await expect(page.getByRole('heading', { name: /AI Match Prediction/ })).toBeVisible();
  });

  test('renders kick-off / venue detail rows', async ({ page }) => {
    await page.goto('/fixtures/760415');
    await expect(page.getByText('Venue', { exact: true })).toBeVisible();
    await expect(page.getByText('Stage', { exact: true })).toBeVisible();
    await expect(page.getByText('Full Time')).toBeVisible(); // MEX 2–0 RSA is finished
  });
});
