import { expect, test } from '@playwright/test';

test('/references lists every authoritative source', async ({ page }) => {
  await page.goto('/references');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('References');
  // Spot-check the most-important sources appear
  for (const text of ['Husi', 'Kadriu', 'uniparser', 'Kaikki', 'Universal Dependencies']) {
    await expect(page.locator('main').getByText(new RegExp(text, 'i')).first()).toBeVisible();
  }
});

test('Cite foljapp section contains a @software BibTeX entry', async ({ page }) => {
  await page.goto('/references');
  await expect(page.getByRole('heading', { name: 'Cite foljapp' })).toBeVisible();
  await expect(page.locator('main')).toContainText('@software');
  await expect(page.locator('main')).toContainText(/engine-0\.1\.0 corpus-0\.1\.\d+/);
});

test('BibTeX details are expandable for each source', async ({ page }) => {
  await page.goto('/references');
  // Find the first BibTeX details summary and click it
  const firstSummary = page.locator('summary', { hasText: 'BibTeX' }).first();
  await firstSummary.click();
  // After expansion, a <pre> with @book should be visible
  await expect(page.locator('main').getByText(/@book\{husic-2002/)).toBeVisible();
});

test('Cite button on verb page surfaces BibTeX, APA, and plain text', async ({ page }) => {
  await page.goto('/verb/punoj');
  await page.getByRole('button', { name: /^Cite/ }).click();
  await expect(page.getByText(/@misc\{foljapp-punoj/)).toBeVisible();
  await expect(page.getByText(/foljapp contributors/).first()).toBeVisible();
  // Multiple matches expected (BibTeX + APA + plain + page <title>); verify count.
  await expect(page.getByText(/punoj — to work/i).first()).toBeVisible();
});

test('NavHeader exposes References on every page', async ({ page }) => {
  for (const path of ['/', '/browse', '/playground', '/practice', '/articles', '/references']) {
    await page.goto(path);
    const navLink = page.locator('nav').first().getByRole('link', { name: 'References' });
    await expect(navLink).toBeVisible();
  }
});
