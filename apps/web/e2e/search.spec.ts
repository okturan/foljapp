import { expect, test } from '@playwright/test';

test('home page renders search input and finds punoj', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('foljapp');
  const input = page.getByLabel('Search verbs by lemma or English translation');
  await input.fill('pun');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(
    page.getByRole('option').filter({ hasText: 'punoj' }),
  ).toBeVisible();
  await page.getByRole('option').filter({ hasText: 'punoj' }).click();
  await expect(page).toHaveURL(/\/verb\/punoj$/);
});

test('English-translation search finds laj for "wash"', async ({ page }) => {
  await page.goto('/');
  await page
    .getByLabel('Search verbs by lemma or English translation')
    .fill('wash');
  await expect(
    page.getByRole('option').filter({ hasText: 'laj' }),
  ).toBeVisible();
});

test('browse page lists all 20 verbs', async ({ page }) => {
  await page.goto('/browse');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Browse');
  for (const lemma of ['punoj', 'jam', 'pjek', 'laj', 'iki']) {
    await expect(page.getByRole('cell', { name: lemma, exact: true })).toBeVisible();
  }
});

test('browse class-1 filter narrows the table', async ({ page }) => {
  await page.goto('/browse');
  await page.getByLabel('Class').selectOption('1');
  // Class 1 verbs in seed: bëj, laj, punoj, vij
  await expect(page.getByRole('cell', { name: 'punoj', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'laj', exact: true })).toBeVisible();
  // hap (Class 2) should not be visible
  await expect(page.getByRole('cell', { name: 'hap', exact: true })).toHaveCount(0);
});

test('/random redirects to a corpus verb', async ({ page }) => {
  const response = await page.goto('/random');
  expect(response?.status()).toBe(200); // After redirect, the verb page loads
  await expect(page).toHaveURL(/\/verb\/[^/]+$/);
});

test('cell anchor IDs deep-link into verb page', async ({ page }) => {
  await page.goto('/verb/punoj#admirative-present-1sg');
  const cell = page.locator('#admirative-present-1sg');
  await expect(cell).toBeVisible();
  await expect(cell).toContainText('punuakam');
});

test('non-finite anchor deep-links to gerund', async ({ page }) => {
  await page.goto('/verb/punoj#non-finite-gerund');
  const block = page.locator('#non-finite-gerund');
  await expect(block).toBeVisible();
  await expect(block).toContainText('Gerund');
  await expect(block).toContainText('duke');
  await expect(block).toContainText('punuar');
});

test('nav header is present on every page', async ({ page }) => {
  for (const path of ['/', '/browse', '/verb/punoj', '/smoke']) {
    await page.goto(path);
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Browse' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Random' })).toBeVisible();
  }
});
