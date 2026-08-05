import { expect, test, type Page } from '@playwright/test';

const GROUPS = [
  'option-group-mood',
  'option-group-tense',
  'option-group-form',
  'option-group-voice',
  'option-group-polarity',
  'option-group-modality',
  'option-group-person',
  'option-group-number',
];

const MOODS = [
  'subjunctive',
  'conditional',
  'admirative',
  'optative',
  'imperative',
  'non-finite',
];

// Web fonts swap in after first paint and can re-wrap a pill label. That is a
// load-time shift, not a selection-driven one, and `document.fonts.ready` can
// resolve before the request has even started — so wait for the controls
// panel's own height to stop moving before taking a baseline.
async function settled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  // Examples are fetched client-side, so their arrival proves hydration has
  // replaced the Suspense fallback and the two-pane layout is final.
  await examplesLoaded(page);
  const panel = page.getByTestId('option-group-tense');
  let last = -1;
  await expect
    .poll(
      async () => {
        const height = (await panel.boundingBox())?.height ?? -1;
        const stable = height === last;
        last = height;
        return stable;
      },
      { timeout: 10_000, intervals: [150] },
    )
    .toBe(true);
}

/** Wait for the examples request to land, not merely for the shell. */
async function examplesLoaded(page: Page): Promise<void> {
  await expect
    .poll(() => page.getByTestId('examples-body').locator('tbody tr').count(), {
      timeout: 15_000,
    })
    .toBeGreaterThan(1);
  await expect(page.getByTestId('examples')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

async function groupPositions(page: Page): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const id of GROUPS) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, `${id} is missing from the DOM`).not.toBeNull();
    out[id] = box!.y;
  }
  return out;
}

test.describe('playground layout stability', () => {
  test('every control group survives every mood at the same position', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto('/playground');
    await settled(page);
    const baseline = await groupPositions(page);

    for (const mood of MOODS) {
      await page.getByRole('main').getByText(mood, { exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`mood=${mood}`));
      const after = await groupPositions(page);
      for (const id of GROUPS) {
        expect(
          Math.abs(after[id]! - baseline[id]!),
          `${id} moved when mood became ${mood}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  test('non-finite greys the finite groups instead of removing them', async ({
    page,
  }) => {
    await page.goto('/playground?verb=punoj&mood=non-finite&form=participle');
    for (const value of ['present', 'aorist', 'future']) {
      await expect(
        page
          .getByTestId('option-group-tense')
          .locator(`input[type="radio"][value="${value}"]`),
      ).toBeDisabled();
    }
    for (const id of [
      'option-group-voice',
      'option-group-polarity',
      'option-group-modality',
      'option-group-person',
      'option-group-number',
    ]) {
      const inputs = page.getByTestId(id).locator('input[type="radio"]');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(inputs.nth(i)).toBeDisabled();
      }
    }
    // Form is the group that IS live under non-finite.
    await expect(
      page
        .getByTestId('option-group-form')
        .locator('input[type="radio"][value="participle"]'),
    ).toBeEnabled();
  });

  test('finite moods grey the Form group instead of removing it', async ({
    page,
  }) => {
    await page.goto('/playground');
    const inputs = page
      .getByTestId('option-group-form')
      .locator('input[type="radio"]');
    await expect(inputs).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(inputs.nth(i)).toBeDisabled();
    }
  });

  test('an unrecognised verb does not shift the controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto('/playground');
    await settled(page);
    const before = (await page.getByTestId('option-group-mood').boundingBox())!
      .y;
    await page.getByLabel('Pick a verb').fill('zzzznotaverb');
    const after = (await page.getByTestId('option-group-mood').boundingBox())!
      .y;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
  });

  test('source filters do not resize the examples region', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto('/playground');
    const body = page.getByTestId('examples-body');
    await expect(body).toBeVisible();
    // Wait for the first payload so the reserved height is established.
    await examplesLoaded(page);
    const baseline = (await body.boundingBox())!.height;

    for (const label of ['Local', 'Translated', 'All']) {
      await page
        .getByTestId('examples')
        .getByRole('button', { name: new RegExp(`^${label}`) })
        .click();
      const height = (await body.boundingBox())!.height;
      expect(
        Math.abs(height - baseline),
        `examples region resized on ${label}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  test('every examples row has the same height', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto('/playground');
    await examplesLoaded(page);
    const rows = page.getByTestId('examples-body').locator('tbody tr');
    const count = await rows.count();
    const first = (await rows.nth(0).boundingBox())!.height;
    for (let i = 1; i < count; i++) {
      const h = (await rows.nth(i).boundingBox())!.height;
      expect(Math.abs(h - first)).toBeLessThanOrEqual(1);
    }
  });

  test('changing a parameter does not blank the examples table', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto('/playground');
    await examplesLoaded(page);
    const rows = page.getByTestId('examples-body').locator('tbody tr');

    await page
      .getByRole('main')
      .getByText('imperfect', { exact: true })
      .click();
    // The previous rows stay put while the new request is in flight — no
    // collapse to a one-line loading state.
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(page.getByText('Loading examples…')).toHaveCount(0);
    await examplesLoaded(page);
  });

  test('the derivation panel is present for every selection', async ({
    page,
  }) => {
    await page.goto('/playground');
    await expect(page.getByTestId('derivation-panel')).toBeVisible();
    await page
      .getByRole('main')
      .getByText('non-finite', { exact: true })
      .click();
    await expect(page.getByTestId('derivation-panel')).toBeVisible();
  });
});
