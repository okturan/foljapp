import { expect, test } from '@playwright/test';

test('playground default shows the gloss "I work"', async ({ page }) => {
  await page.goto('/playground');
  const gloss = page.getByTestId('english-gloss');
  await expect(gloss).toBeVisible();
  await expect(gloss).toHaveText('“I work”');
});

test('toggling mood/tense updates the gloss reactively', async ({ page }) => {
  // Go straight to perfect 1sg via URL — the playground reads the URL state.
  await page.goto(
    '/playground?verb=punoj&mood=indicative&tense=perfect&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative',
  );
  await expect(page.getByTestId('english-gloss')).toHaveText('“I have worked”');

  await page.goto(
    '/playground?verb=punoj&mood=conditional&tense=perfect&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative',
  );
  await expect(page.getByTestId('english-gloss')).toHaveText(
    '“I would have worked”',
  );
});

test('suppletive verb jam: present 1sg gloss is "I am"', async ({ page }) => {
  await page.goto(
    '/playground?verb=jam&mood=indicative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative',
  );
  await expect(page.getByTestId('english-gloss')).toHaveText('“I am”');
});

test('negation + interrogative compose: "have I not worked?"', async ({
  page,
}) => {
  await page.goto(
    '/playground?verb=punoj&mood=indicative&tense=perfect&voice=active&person=1&number=singular&polarity=negative&modality=interrogative',
  );
  await expect(page.getByTestId('english-gloss')).toHaveText(
    '“have I not worked?”',
  );
});

test('verb page tooltip exposes the gloss for indicative.perfect.1sg', async ({
  page,
}) => {
  await page.goto('/verb/punoj');
  // sr-only span carries the gloss text predictably (title attribute hover
  // tooltips aren't reliably testable across browsers).
  const sr = page.getByTestId('gloss-indicative-perfect-1sg');
  await expect(sr).toContainText('I have worked');
});

test('verb page renders glosses for the suppletive jam', async ({ page }) => {
  await page.goto('/verb/jam');
  await expect(
    page.getByTestId('gloss-indicative-present-1sg'),
  ).toContainText('I am');
  await expect(
    page.getByTestId('gloss-indicative-aorist-1sg'),
  ).toContainText('I was');
});

test('API JSON includes englishGlosses with cells and nonFinite maps', async ({
  request,
}) => {
  const res = await request.get('/api/verbs/punoj');
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as {
    englishGlosses: { cells: Record<string, string>; nonFinite: Record<string, string> };
  };
  expect(body.englishGlosses).toBeTruthy();
  expect(body.englishGlosses.cells['indicative.perfect.1sg.active']).toBe(
    'I have worked',
  );
  expect(body.englishGlosses.cells['indicative.present.1sg.active']).toBe(
    'I work',
  );
  expect(body.englishGlosses.nonFinite.infinitive).toBe('to work');
});
