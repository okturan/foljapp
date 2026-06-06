import { expect, test } from '@playwright/test';

async function getColumnCount(
  el: ReturnType<import('@playwright/test').Page['locator']>,
): Promise<number> {
  const tracks = await el.evaluate(
    (n) => getComputedStyle(n).gridTemplateColumns,
  );
  if (tracks === 'none') return 0;
  return tracks.split(' ').filter(Boolean).length;
}

test.describe('compact-group parent grid', () => {
  test('1 col on narrow viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/playground');
    const wrapper = page.getByTestId('compact-group-grid');
    await expect(wrapper).toBeVisible();
    expect(await wrapper.evaluate((n) => getComputedStyle(n).display)).toBe(
      'grid',
    );
    expect(await getColumnCount(wrapper)).toBe(1);
  });

  test('2 cols at sm (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/playground');
    const wrapper = page.getByTestId('compact-group-grid');
    expect(await getColumnCount(wrapper)).toBe(2);
  });

  test('3 cols at lg (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/playground');
    const wrapper = page.getByTestId('compact-group-grid');
    expect(await getColumnCount(wrapper)).toBe(3);
  });

  test('Mood and Tense sit OUTSIDE the compact-group grid (full-width)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/playground');
    const wrapper = page.getByTestId('compact-group-grid');
    const mood = page.getByTestId('option-group-mood');
    const tense = page.getByTestId('option-group-tense');
    // Neither Mood nor Tense should be a descendant of the wrapper.
    expect(await mood.evaluate((n, w) => w.contains(n), await wrapper.elementHandle())).toBe(false);
    expect(await tense.evaluate((n, w) => w.contains(n), await wrapper.elementHandle())).toBe(false);
  });

  test('all five compact groups share rows correctly at lg', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/playground');
    const voice = page.getByTestId('option-group-voice');
    const polarity = page.getByTestId('option-group-polarity');
    const modality = page.getByTestId('option-group-modality');
    const person = page.getByTestId('option-group-person');
    const number = page.getByTestId('option-group-number');

    // Voice/Polarity/Modality should share row 1 — same y coordinate.
    const voiceY = (await voice.boundingBox())?.y ?? 0;
    const polarityY = (await polarity.boundingBox())?.y ?? 0;
    const modalityY = (await modality.boundingBox())?.y ?? 0;
    expect(Math.abs(voiceY - polarityY)).toBeLessThanOrEqual(1);
    expect(Math.abs(voiceY - modalityY)).toBeLessThanOrEqual(1);

    // Person/Number should share row 2 — same y, different from row 1.
    const personY = (await person.boundingBox())?.y ?? 0;
    const numberY = (await number.boundingBox())?.y ?? 0;
    expect(Math.abs(personY - numberY)).toBeLessThanOrEqual(1);
    expect(personY).toBeGreaterThan(voiceY);
  });
});
