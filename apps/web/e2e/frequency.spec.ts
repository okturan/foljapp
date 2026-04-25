import { expect, test } from '@playwright/test';

test('jam shows Frequency: core in reserved-actions', async ({ page }) => {
  await page.goto('/verb/jam');
  await expect(page.getByText('Frequency: core').first()).toBeVisible();
});

test('djeg shows Frequency: rare or uncommon', async ({ page }) => {
  await page.goto('/verb/djeg');
  await expect(
    page.getByText(/Frequency: (rare|uncommon)/).first(),
  ).toBeVisible();
});

test('punoj shows Frequency: common', async ({ page }) => {
  await page.goto('/verb/punoj');
  await expect(page.getByText('Frequency: common').first()).toBeVisible();
});

test('Browse table includes a Frequency column', async ({ page }) => {
  await page.goto('/browse');
  await expect(page.getByRole('columnheader', { name: 'frequency' })).toBeVisible();
  // Row for jam should show "core"
  const jamRow = page.getByRole('row', { name: /^jam/ });
  await expect(jamRow.first()).toContainText('core');
});

test('API JSON includes frequency tier', async ({ request }) => {
  const res = await request.get('/api/verbs/jam');
  const body = await res.json();
  expect(body.frequency).toBeDefined();
  expect(body.frequency.tier).toBe('core');
});

test('API JSON for djeg includes a tier', async ({ request }) => {
  const res = await request.get('/api/verbs/djeg');
  const body = await res.json();
  expect(['core', 'common', 'uncommon', 'rare']).toContain(body.frequency.tier);
});
