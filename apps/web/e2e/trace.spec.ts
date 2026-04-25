import { expect, test } from '@playwright/test';

test('Derivation panel renders on /playground default load', async ({ page }) => {
  await page.goto('/playground');
  // The panel uses a <details><summary> — find by visible text
  await expect(page.getByText(/How is this built\?/i)).toBeVisible();
});

test('Expanding the panel reveals an ordered list with at least 2 steps', async ({ page }) => {
  await page.goto('/playground');
  // Click the summary to expand the <details>
  await page.getByText(/How is this built\?/i).click();
  // The list should now be visible
  const list = page.getByRole('list').filter({ hasText: 'corpus-lookup' });
  await expect(list.first()).toBeVisible();
  // At least 2 list items
  const items = list.first().getByRole('listitem');
  expect(await items.count()).toBeGreaterThanOrEqual(2);
});

test('Compound perfect trace shows the auxiliary recursion step', async ({ page }) => {
  await page.goto('/playground?verb=punoj&mood=indicative&tense=perfect&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative');
  await page.getByText(/How is this built\?/i).click();
  // Trace summary mentions the kam auxiliary
  await expect(page.getByText(/kam/).first()).toBeVisible();
  // The final step's form is "kam punuar"
  await expect(page.getByText(/Final: kam punuar/i)).toBeVisible();
});

test('Subjunctive trace shows the të particle prepend step', async ({ page }) => {
  await page.goto('/playground?verb=punoj&mood=subjunctive&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative');
  await page.getByText(/How is this built\?/i).click();
  await expect(
    page.getByText(/Prepend "të"/i).first(),
  ).toBeVisible();
});

test('Unsupported config hides the derivation panel', async ({ page }) => {
  await page.goto('/playground?verb=punoj&mood=imperative&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative');
  // The unsupported message is shown; the panel is not
  await expect(page.locator('main')).toContainText('unsupported');
  await expect(page.getByText(/How is this built\?/i)).toHaveCount(0);
});
