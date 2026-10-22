import { expect, test } from '@playwright/test';

test('app loads and theme can be switched', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('GrafcetMaker').first()).toBeVisible();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
