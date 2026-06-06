import { expect, test } from '@playwright/test';

test.describe('verb-page conjugation tables fit at desktop widths', () => {
  test('all 6 cell columns fit in viewport at xl (1280px) — kooperoj', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/verb/kooperoj');
    const cell = page.locator('#indicative-present-3pl');
    await expect(cell).toBeVisible();
    const box = await cell.boundingBox();
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(innerWidth);
  });

  test('all 6 cell columns fit in viewport at lg (1024px) — kooperoj', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/verb/kooperoj');
    const cell = page.locator('#indicative-present-3pl');
    await expect(cell).toBeVisible();
    const box = await cell.boundingBox();
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(innerWidth);
  });

  test('TENSE column header is sticky on narrow viewport (375px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/verb/kooperoj');
    // First TENSE col header (the <thead> th)
    const tenseHeader = page
      .locator('table')
      .first()
      .locator('thead th')
      .first();
    const position = await tenseHeader.evaluate(
      (n) => getComputedStyle(n).position,
    );
    expect(position).toBe('sticky');
    const left = await tenseHeader.evaluate(
      (n) => getComputedStyle(n).left,
    );
    expect(left).toBe('0px');
  });

  test('TENSE row label sticks during horizontal scroll on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/verb/kooperoj');
    // The first row's label cell (PRESENT)
    const presentRowLabel = page
      .locator('table')
      .first()
      .locator('tbody th[scope="row"]')
      .first();
    const position = await presentRowLabel.evaluate(
      (n) => getComputedStyle(n).position,
    );
    expect(position).toBe('sticky');
  });
});
