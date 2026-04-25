import { expect, test } from '@playwright/test';

test('/practice landing renders Start button', async ({ page }) => {
  await page.goto('/practice');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Practice');
  const start = page.getByRole('link', { name: 'Start a session' });
  await expect(start).toBeVisible();
});

test('/practice/quiz renders a question prompt', async ({ page }) => {
  await page.goto('/practice/quiz?seed=1');
  await expect(page.getByText(/Question 1 of 10/)).toBeVisible();
  await expect(page.getByText(/^Conjugate /)).toBeVisible();
  await expect(page.getByLabel('Your answer')).toBeVisible();
});

test('submitting an incorrect answer reveals the canonical form', async ({ page }) => {
  await page.goto('/practice/quiz?seed=1');
  await page.getByLabel('Your answer').fill('xyznotthecorrectform');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText(/incorrect/i)).toBeVisible();
});

test('Skip records the cell as missed and advances', async ({ page }) => {
  await page.goto('/practice/quiz?seed=1');
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByText(/skipped/i)).toBeVisible();
  await page.getByRole('button', { name: /Next →/ }).click();
  await expect(page.getByText(/Question 2 of 10/)).toBeVisible();
});

test('focus=punoj makes the first prompt a punoj cell', async ({ page }) => {
  await page.goto('/practice/quiz?seed=1&focus=punoj');
  await expect(page.getByText(/^Conjugate punoj/)).toBeVisible();
});

test('seeded URL is deterministic across reloads', async ({ page }) => {
  await page.goto('/practice/quiz?seed=42');
  const firstPrompt = await page.getByText(/^Conjugate /).first().textContent();
  expect(firstPrompt).toBeTruthy();
  await page.reload();
  const secondPrompt = await page.getByText(/^Conjugate /).first().textContent();
  expect(secondPrompt).toBe(firstPrompt);
});

test('Practice link on verb page routes to /practice/quiz?focus=lemma', async ({ page }) => {
  await page.goto('/verb/punoj');
  // Scope to <main> to skip the NavHeader's Practice link
  const link = page.locator('main').getByRole('link', { name: 'Practice' });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/practice\/quiz\?focus=punoj/);
});

test('NavHeader exposes Practice link on every page', async ({ page }) => {
  for (const path of ['/', '/browse', '/playground', '/articles', '/practice']) {
    await page.goto(path);
    const navLink = page.locator('nav').first().getByRole('link', { name: 'Practice' });
    await expect(navLink).toBeVisible();
  }
});
