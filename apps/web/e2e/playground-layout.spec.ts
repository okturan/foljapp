import { expect, test } from '@playwright/test';

test('desktop: result panel and verb picker are both in viewport on initial load', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/playground');
  // Default form text "punoj" appears in the sticky result aside.
  const aside = page.getByRole('complementary', { name: 'Conjugated form' });
  await expect(aside).toContainText('punoj');
  // Verb picker label is in viewport without scrolling.
  await expect(page.getByText('Verb', { exact: true })).toBeInViewport();
  // Result aside is in viewport (y < 800).
  const box = await aside.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThanOrEqual(800);
});

test('desktop: scrolling 400px keeps the result panel pinned in view', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/playground');
  await page.evaluate(() => window.scrollTo(0, 400));
  const aside = page.getByRole('complementary', { name: 'Conjugated form' });
  const box = await aside.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThanOrEqual(800);
});

test('desktop: changing mood keeps the result visible at the same approximate position', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/playground');
  const aside = page.getByRole('complementary', { name: 'Conjugated form' });
  const before = await aside.boundingBox();
  // Switch mood to subjunctive
  await page.getByRole('main').getByText('subjunctive', { exact: true }).click();
  await expect(aside).toContainText('të punoj');
  const after = await aside.boundingBox();
  expect(after).not.toBeNull();
  // Should still be in viewport
  expect(after!.y).toBeGreaterThanOrEqual(0);
  expect(after!.y).toBeLessThanOrEqual(800);
  // Position should be approximately stable (within 50px)
  expect(Math.abs((after!.y ?? 0) - (before!.y ?? 0))).toBeLessThan(50);
});

test('mobile: aside is rendered before h1 in DOM order', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/playground');
  const html = await page.content();
  const asideIdx = html.indexOf('aria-label="Conjugated form"');
  // Match the actual <h1>Playground</h1> in <main>, not the page <title>.
  const h1Idx = html.indexOf('<h1');
  expect(asideIdx).toBeGreaterThan(-1);
  expect(h1Idx).toBeGreaterThan(-1);
  expect(asideIdx).toBeLessThan(h1Idx);
});

test('mobile: scrolling pins the result band to the top of the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/playground');
  await page.evaluate(() => window.scrollTo(0, 600));
  const aside = page.getByRole('complementary', { name: 'Conjugated form' });
  const box = await aside.boundingBox();
  expect(box).not.toBeNull();
  // Pinned at viewport top — y is 0 (or very close to it).
  expect(box!.y).toBeLessThanOrEqual(2);
});
