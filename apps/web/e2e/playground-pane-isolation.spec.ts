import { expect, test, type Page } from '@playwright/test';

/**
 * The controls pane must not resize when the result pane's content changes
 * width. Switching voice, mood or verb changes the rendered form ("punohet"
 * vs "paç punuar"), the example sentences and the source names — none of
 * which are allowed to reach across the two-pane grid and re-wrap the pills.
 */

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

async function examplesLoaded(page: Page): Promise<void> {
  await expect(page.getByTestId('examples')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 15_000 },
  );
}

async function settled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
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

/** x, width and height of every control group — the full geometry, not just y. */
async function geometry(
  page: Page,
): Promise<Record<string, { x: number; width: number; height: number }>> {
  const out: Record<string, { x: number; width: number; height: number }> = {};
  for (const id of GROUPS) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, `${id} is missing from the DOM`).not.toBeNull();
    out[id] = { x: box!.x, width: box!.width, height: box!.height };
  }
  return out;
}

function expectSameGeometry(
  after: Record<string, { x: number; width: number; height: number }>,
  baseline: Record<string, { x: number; width: number; height: number }>,
  what: string,
): void {
  for (const id of GROUPS) {
    for (const axis of ['x', 'width', 'height'] as const) {
      expect(
        Math.abs(after[id]![axis] - baseline[id]![axis]),
        `${id} ${axis} changed when ${what}`,
      ).toBeLessThanOrEqual(1);
    }
  }
}

test.describe('two-pane isolation', () => {
  test('toggling voice does not resize the controls pane', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto('/playground?verb=punoj&mood=optative&tense=perfect');
    await settled(page);
    const baseline = await geometry(page);

    for (const voice of ['middle-passive', 'active', 'middle-passive']) {
      await page
        .getByRole('main')
        .getByText(voice, { exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`voice=${voice}`));
      await examplesLoaded(page);
      expectSameGeometry(await geometry(page), baseline, `voice=${voice}`);
    }
  });

  test('a long rendered form does not steal width from the controls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto('/playground?verb=punoj&mood=indicative&tense=present');
    await settled(page);
    const baseline = await geometry(page);

    // future-perfect-in-past is the longest form the engine produces
    // ("do të kisha pasur punuar"), and its examples carry the longest
    // source names. If anything couples the panes, this is where it shows.
    await page.goto(
      '/playground?verb=punoj&mood=indicative&tense=future-perfect-in-past',
    );
    await settled(page);
    expectSameGeometry(
      await geometry(page),
      baseline,
      'the form became future-perfect-in-past',
    );
  });

  test('the controls pane holds its width across every mood', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto('/playground');
    await settled(page);
    const baseline = await geometry(page);

    for (const mood of [
      'subjunctive',
      'conditional',
      'admirative',
      'optative',
      'imperative',
      'non-finite',
    ]) {
      await page.getByRole('main').getByText(mood, { exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`mood=${mood}`));
      const after = await geometry(page);
      for (const id of GROUPS) {
        expect(
          Math.abs(after[id]!.x - baseline[id]!.x),
          `${id} x moved when mood became ${mood}`,
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(after[id]!.width - baseline[id]!.width),
          `${id} width changed when mood became ${mood}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});
