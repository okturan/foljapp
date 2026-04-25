import { expect, test } from '@playwright/test';

test('punoj page shows /punɔj/ as the lemma IPA', async ({ page }) => {
  await page.goto('/verb/punoj');
  await expect(page.getByText('/punɔj/').first()).toBeVisible();
});

test('pjek page shows /pjɛk/ for the lemma and /pɔc/ for the aorist stem', async ({ page }) => {
  await page.goto('/verb/pjek');
  await expect(page.getByText('/pjɛk/').first()).toBeVisible();
  // The aorist stem `poq` → /pɔc/
  await expect(page.locator('main')).toContainText('/pɔc/');
});

test('jam page shows /jam/', async ({ page }) => {
  await page.goto('/verb/jam');
  await expect(page.getByText('/jam/').first()).toBeVisible();
});

test('shoh page shows /ʃɔh/', async ({ page }) => {
  await page.goto('/verb/shoh');
  await expect(page.getByText('/ʃɔh/').first()).toBeVisible();
});

test('djeg page shows /djɛɡ/ for lemma and /dɔɟ/ for aorist stem (gj digraph)', async ({ page }) => {
  await page.goto('/verb/djeg');
  await expect(page.getByText('/djɛɡ/').first()).toBeVisible();
  await expect(page.locator('main')).toContainText('/dɔɟ/');
});

test('API JSON includes ipa field', async ({ request }) => {
  const res = await request.get('/api/verbs/punoj');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ipa).toBeDefined();
  expect(body.ipa.lemma).toBe('punɔj');
  expect(body.ipa.principalParts.present).toBe('punɔ');
  expect(body.ipa.principalParts.aorist).toBe('punua');
  expect(body.ipa.principalParts.participle).toBe('punuaɾ');
});
