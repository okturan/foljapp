import { expect, test } from '@playwright/test';

test('default playground load renders punoj 1sg present indicative', async ({ page }) => {
  await page.goto('/playground');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Playground');
  // The form area shows "punoj"
  await expect(page.locator('main')).toContainText('punoj');
});

test('changing mood to subjunctive updates the form to "të punoj"', async ({ page }) => {
  await page.goto('/playground');
  // Click the subjunctive radio (the visible label text)
  await page.getByText('subjunctive', { exact: true }).click();
  // The form area should now contain the të particle
  await expect(page.locator('main')).toContainText('të punoj');
});

test('selecting jam + aorist shows qeshë', async ({ page }) => {
  await page.goto('/playground?verb=jam&mood=indicative&tense=aorist&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative');
  await expect(page.locator('main')).toContainText('qeshë');
});

test('MP admirative imperfect: flas voice=middle-passive shows "u folkësha"', async ({ page }) => {
  await page.goto('/playground?verb=flas&mood=admirative&tense=imperfect&voice=middle-passive&person=1&number=singular&polarity=affirmative&modality=declarative');
  await expect(page.locator('main')).toContainText('u folkësha');
});

test('MP admirative pluperfect: flas voice=middle-passive shows "qenkësha folur"', async ({ page }) => {
  await page.goto('/playground?verb=flas&mood=admirative&tense=pluperfect&voice=middle-passive&person=1&number=singular&polarity=affirmative&modality=declarative');
  await expect(page.locator('main')).toContainText('qenkësha');
  await expect(page.locator('main')).toContainText('folur');
});

test('imperative + 1sg shows unsupported message', async ({ page }) => {
  await page.goto('/playground?verb=punoj&mood=imperative&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative');
  await expect(page.locator('main')).toContainText('unsupported');
});

test('URL search params reflect the configuration', async ({ page }) => {
  await page.goto('/playground');
  // Wait for default URL to be set
  await expect(page).toHaveURL(/verb=punoj/);
  await expect(page).toHaveURL(/mood=indicative/);
});

test('Copy link button is present and labeled', async ({ page }) => {
  await page.goto('/playground');
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
});

test('shareable URL renders the same form', async ({ page }) => {
  const url = '/playground?verb=punoj&mood=admirative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative';
  await page.goto(url);
  await expect(page.locator('main')).toContainText('punuakam');
});
