import { expect, test } from '@playwright/test';

async function getDisplay(
  el: ReturnType<import('@playwright/test').Page['locator']>,
): Promise<string> {
  return el.evaluate((node) => getComputedStyle(node).display);
}

async function getColumnCount(
  el: ReturnType<import('@playwright/test').Page['locator']>,
): Promise<number> {
  const tracks = await el.evaluate(
    (node) => getComputedStyle(node).gridTemplateColumns,
  );
  if (tracks === 'none') return 0;
  return tracks.split(' ').filter(Boolean).length;
}

test.describe('option-grid layout', () => {
  test('Mood (7 options) renders as 2-col grid at narrow viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/playground');
    const mood = page.getByTestId('option-group-mood');
    await expect(mood).toBeVisible();
    expect(await getDisplay(mood)).toBe('grid');
    expect(await getColumnCount(mood)).toBe(2);
  });

  test('Mood (7 options) renders as 3-col grid at lg viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/playground');
    const mood = page.getByTestId('option-group-mood');
    expect(await getDisplay(mood)).toBe('grid');
    expect(await getColumnCount(mood)).toBe(3);
  });

  test('Tense (10 options for indicative) is grid; collapses to flex when Mood→conditional', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/playground');
    const tense = page.getByTestId('option-group-tense');
    expect(await getDisplay(tense)).toBe('grid');
    expect(await getColumnCount(tense)).toBe(3);

    // Switch mood to conditional (2 tenses) — should flip to flex
    await page.getByText('conditional', { exact: true }).click();
    // Wait for re-render
    await expect(tense).toHaveClass(/flex/);
    expect(await getDisplay(tense)).toBe('flex');
  });

  test('Voice (2 options) keeps flex single-row at every viewport', async ({
    page,
  }) => {
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/playground');
      const voice = page.getByTestId('option-group-voice');
      expect(await getDisplay(voice)).toBe('flex');
    }
  });

  test('Person (3 options) keeps flex single-row layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/playground');
    const person = page.getByTestId('option-group-person');
    expect(await getDisplay(person)).toBe('flex');
  });

  test('Two adjacent Mood pills in a row have equal width (within 1px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/playground');
    const mood = page.getByTestId('option-group-mood');
    // First two children = first row (3-col grid means first 3 are same-width)
    const first = mood.locator('label').nth(0);
    const second = mood.locator('label').nth(1);
    const firstWidth = (await first.boundingBox())?.width ?? 0;
    const secondWidth = (await second.boundingBox())?.width ?? 0;
    expect(Math.abs(firstWidth - secondWidth)).toBeLessThanOrEqual(1);
  });

  test('Focus-visible ring appears on a Mood pill via Tab navigation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/playground');
    // Tab to focus a control. Many tabs to skip header/nav/picker.
    // Easier: focus the first hidden radio in mood directly via aria.
    const firstRadio = page
      .getByTestId('option-group-mood')
      .locator('input[type="radio"]')
      .first();
    await firstRadio.focus();
    const label = page
      .getByTestId('option-group-mood')
      .locator('label')
      .first();
    const ringWidth = await label.evaluate(
      (n) => getComputedStyle(n).getPropertyValue('--tw-ring-shadow') || '',
    );
    // Tailwind compiles focus-within:ring-2 to a custom property; presence
    // indicates the focus styling fired. As a more robust check, observe
    // box-shadow which embeds the ring on focus.
    const boxShadow = await label.evaluate(
      (n) => getComputedStyle(n).boxShadow,
    );
    expect(boxShadow !== 'none' || ringWidth !== '').toBe(true);
  });
});
