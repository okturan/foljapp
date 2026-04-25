import { expect, test } from '@playwright/test';

test('punoj page shows /puˈnɔj/ as the lemma IPA (Class 1 -j → final stress)', async ({ page }) => {
  await page.goto('/verb/punoj');
  await expect(page.getByText('/puˈnɔj/').first()).toBeVisible();
});

test('pjek page shows /ˈpjɛk/ for the lemma and /ˈpɔc/ for the aorist stem', async ({ page }) => {
  await page.goto('/verb/pjek');
  await expect(page.getByText('/ˈpjɛk/').first()).toBeVisible();
  // The aorist stem `poq` → /ˈpɔc/
  await expect(page.locator('main')).toContainText('/ˈpɔc/');
});

test('jam page shows /ˈjam/', async ({ page }) => {
  await page.goto('/verb/jam');
  await expect(page.getByText('/ˈjam/').first()).toBeVisible();
});

test('shoh page shows /ˈʃɔh/', async ({ page }) => {
  await page.goto('/verb/shoh');
  await expect(page.getByText('/ˈʃɔh/').first()).toBeVisible();
});

test('djeg page shows /ˈdjɛɡ/ for lemma and /ˈdɔɟ/ for aorist stem (gj digraph)', async ({ page }) => {
  await page.goto('/verb/djeg');
  await expect(page.getByText('/ˈdjɛɡ/').first()).toBeVisible();
  await expect(page.locator('main')).toContainText('/ˈdɔɟ/');
});

test('API JSON includes stress-marked ipa field', async ({ request }) => {
  const res = await request.get('/api/verbs/punoj');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ipa).toBeDefined();
  expect(body.ipa.lemma).toBe('puˈnɔj');
  expect(body.ipa.principalParts.present).toBe('ˈpunɔ');
  expect(body.ipa.principalParts.aorist).toBe('puˈnua');
  expect(body.ipa.principalParts.participle).toBe('puˈnuaɾ');
});
