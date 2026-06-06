import { expect, test } from '@playwright/test';

test('punoj verb page renders header, table, and citations', async ({ page }) => {
  await page.goto('/verb/punoj');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('punoj');
  await expect(page.getByText('to work').first()).toBeVisible();
  await expect(page.getByText('Zgjedhimi 1')).toBeVisible();
  // Compound forms render as role-tagged spans; assert presence via cell anchor IDs
  await expect(page.locator('#indicative-perfect-1sg')).toContainText('kam');
  await expect(page.locator('#indicative-perfect-1sg')).toContainText('punuar');
  await expect(page.locator('#conditional-present-1sg')).toContainText('do');
  await expect(page.getByText('punuakam', { exact: true })).toBeVisible();
  await expect(page.getByText('Sources')).toBeVisible();
  await expect(page.getByText(/engine: 0\.1\.0 · corpus: 0\.1\.\d+/)).toBeVisible();
});

test('jam verb page renders suppletive forms', async ({ page }) => {
  await page.goto('/verb/jam');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('jam');
  await expect(page.getByText('to be').first()).toBeVisible();
  await expect(page.locator('#indicative-present-3sg')).toContainText('është');
  await expect(page.locator('#indicative-aorist-1sg')).toContainText('qeshë');
});

test('pjek verb page renders mutated aorist', async ({ page }) => {
  await page.goto('/verb/pjek');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('pjek');
  await expect(page.getByText('poqa', { exact: true })).toBeVisible();
});

test('flas verb page renders admirative imperfect and pluperfect', async ({ page }) => {
  await page.goto('/verb/flas');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('flas');
  // Admirative imperfect 1sg
  await expect(page.locator('#admirative-imperfect-1sg')).toContainText('folkësha');
  // Admirative pluperfect 1sg — composes paskësha + folur
  await expect(page.locator('#admirative-pluperfect-1sg')).toContainText('paskësha');
  await expect(page.locator('#admirative-pluperfect-1sg')).toContainText('folur');
});

test('flas verb page renders middle-passive admirative rows beneath active', async ({ page }) => {
  await page.goto('/verb/flas');
  // MP admirative imperfect 3sg via -mp suffix anchor
  await expect(page.locator('#admirative-imperfect-3sg-mp')).toContainText('u folkësh');
  // MP admirative perfect 1sg uses qenkam-aux + participle
  await expect(page.locator('#admirative-perfect-1sg-mp')).toContainText('qenkam');
  await expect(page.locator('#admirative-perfect-1sg-mp')).toContainText('folur');
});

test('punoj verb page renders MP indicative imperfect', async ({ page }) => {
  await page.goto('/verb/punoj');
  // Active stays unchanged
  await expect(page.locator('#indicative-imperfect-1sg')).toContainText('punoja');
  // MP row uses h-glide endings for class-1 verbs
  await expect(page.locator('#indicative-imperfect-1sg-mp')).toContainText('punohesha');
});

test('imperative MP row appears for laj (lahu / lahuni)', async ({ page }) => {
  await page.goto('/verb/laj');
  await expect(page.locator('#imperative-present-2sg-mp')).toContainText('lahu');
  await expect(page.locator('#imperative-present-2pl-mp')).toContainText('lahuni');
});

test('imperative MP row appears for shoh (shihu / shihuni)', async ({ page }) => {
  await page.goto('/verb/shoh');
  await expect(page.locator('#imperative-present-2sg-mp')).toContainText('shihu');
  await expect(page.locator('#imperative-present-2pl-mp')).toContainText('shihuni');
});

test('punoj imperative has no MP row (no override → engine throws)', async ({ page }) => {
  await page.goto('/verb/punoj');
  await expect(page.locator('#imperative-present-2sg-mp')).toHaveCount(0);
  await expect(page.locator('#imperative-present-2pl-mp')).toHaveCount(0);
});


test('unknown verb returns 404 with the requested lemma in body', async ({ page }) => {
  const response = await page.goto('/verb/notarealverb');
  expect(response?.status()).toBe(404);
  await expect(page.getByText('Verb not found')).toBeVisible();
  await expect(page.getByText('notarealverb')).toBeVisible();
});

test('reserved actions row exposes Download / Practice / Cite / Frequency, all enabled', async ({ page }) => {
  await page.goto('/verb/punoj');
  // Download is enabled (add-igt-export)
  const downloadBtn = page.getByRole('button', { name: /Download/ }).first();
  await expect(downloadBtn).toBeEnabled();
  // Practice is enabled (add-practice-mode), rendered as a Link
  const practiceLink = page.locator('main').getByRole('link', { name: 'Practice' });
  await expect(practiceLink).toBeVisible();
  // Cite is enabled (add-bibliographic-citations)
  await expect(page.getByRole('button', { name: /^Cite/ }).first()).toBeEnabled();
  // Frequency is enabled with a tier (add-corpus-frequency-overlay)
  await expect(page.getByText(/Frequency: (core|common|uncommon|rare)/).first()).toBeVisible();
});

test('verb pages render without javascript', async ({ browser }) => {
  // Disable JS via context
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/verb/punoj');
  // The no-JS shell still exposes the reference metadata, actions, and
  // citations. The large conjugation table is loaded as a client chunk to keep
  // prerendered Pages artifacts small.
  const body = await page.content();
  expect(body).toContain('punoj');
  expect(body).toContain('to work');
  expect(body).toContain('Zgjedhimi 1');
  expect(body).toContain('Loading conjugation tables');
  expect(body).toContain('Sources');
  await ctx.close();
});
