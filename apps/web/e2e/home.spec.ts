import { expect, test } from '@playwright/test';

test('home page renders foljapp', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('foljapp');
  await expect(page.getByText('Albanian verbal system reference')).toBeVisible();
});

test('mdx smoke page renders heading', async ({ page }) => {
  await page.goto('/smoke');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('hello mdx');
});
