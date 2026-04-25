import { expect, test } from '@playwright/test';

test('punoj verb page renders header, table, and citations', async ({ page }) => {
  await page.goto('/verb/punoj');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('punoj');
  await expect(page.getByText('to work').first()).toBeVisible();
  await expect(page.getByText('Zgjedhimi 1')).toBeVisible();
  // Compound forms render as role-tagged spans; assert presence via cell anchor IDs
  await expect(page.locator('#indicative-perfect-1sg')).toContainText('kam');
  await expect(page.locator('#indicative-perfect-1sg')).toContainText('punuar');
  await expect(page.locator('#conditional-present-1sg')).toContainText('do');
  await expect(page.getByText('punuakam')).toBeVisible();
  await expect(page.getByText('Sources')).toBeVisible();
  await expect(page.getByText(/engine: 0\.1\.0 · corpus: 0\.1\.0/)).toBeVisible();
});

test('jam verb page renders suppletive forms', async ({ page }) => {
  await page.goto('/verb/jam');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('jam');
  await expect(page.getByText('to be').first()).toBeVisible();
  await expect(page.locator('#indicative-present-3sg')).toContainText('është');
  await expect(page.locator('#indicative-aorist-1sg')).toContainText('qeshë');
});

test('pjek verb page renders mutated aorist', async ({ page }) => {
  await page.goto('/verb/pjek');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('pjek');
  await expect(page.getByText('poqa')).toBeVisible();
});

test('unknown verb returns 404 with the requested lemma in body', async ({ page }) => {
  const response = await page.goto('/verb/notarealverb');
  expect(response?.status()).toBe(404);
  await expect(page.getByText('Verb not found')).toBeVisible();
  await expect(page.getByText('notarealverb')).toBeVisible();
});

test('reserved action buttons render disabled', async ({ page }) => {
  await page.goto('/verb/punoj');
  for (const label of ['Practice', 'Playground', 'Export IGT']) {
    const btn = page.getByRole('button', { name: new RegExp(label) });
    await expect(btn).toBeDisabled();
  }
});

test('verb pages render without javascript', async ({ browser }) => {
  // Disable JS via context
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/verb/punoj');
  // With JS disabled, content from RSC must still render. Each segment of
  // a compound form lives in its own <span>, so check segments individually.
  const body = await page.content();
  expect(body).toContain('punoj');
  expect(body).toContain('Indicative');
  expect(body).toContain('kam');
  expect(body).toContain('punuar');
  expect(body).toContain('Sources');
  await ctx.close();
});
