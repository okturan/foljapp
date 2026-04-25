import { expect, test } from '@playwright/test';

test('Download button is present on verb page and not disabled', async ({ page }) => {
  await page.goto('/verb/punoj');
  const button = page.getByRole('button', { name: /Download/ }).first();
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
});

test('Download menu opens with IGT and CoNLL-U options', async ({ page }) => {
  await page.goto('/verb/punoj');
  await page.getByRole('button', { name: /Download/ }).first().click();
  await expect(page.getByRole('menuitem', { name: /IGT/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /CoNLL-U/ })).toBeVisible();
});

test('Clicking IGT downloads punoj.txt with header', async ({ page }) => {
  await page.goto('/verb/punoj');
  await page.getByRole('button', { name: /Download/ }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /IGT/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('punoj.txt');
  const path = await download.path();
  if (path) {
    const fs = await import('node:fs');
    const content = fs.readFileSync(path, 'utf8');
    expect(content).toContain('verb: punoj');
    expect(content).toContain('translation: to work');
    expect(content).toContain('AUX');
    expect(content).toContain('STEM');
  }
});

test('Clicking CoNLL-U downloads punoj.conllu', async ({ page }) => {
  await page.goto('/verb/punoj');
  await page.getByRole('button', { name: /Download/ }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /CoNLL-U/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('punoj.conllu');
  const path = await download.path();
  if (path) {
    const fs = await import('node:fs');
    const content = fs.readFileSync(path, 'utf8');
    expect(content).toContain('# sent_id = punoj');
    expect(content).toContain('VERB');
    expect(content).toContain('Mood=Ind');
  }
});
