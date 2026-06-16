import { expect, test } from '@playwright/test';

test('articles index lists both seeded articles', async ({ page }) => {
  await page.goto('/articles');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Articles');
  await expect(page.getByRole('link', { name: 'Albanian Verb Classes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'The Admirative Mood' })).toBeVisible();
});

test('verb-classes article renders with engine examples', async ({ page }) => {
  await page.goto('/articles/verb-classes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Albanian Verb Classes',
  );
  // Body has section headings for all three classes
  await expect(
    page.getByRole('heading', { name: /Class 1.*-j/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Class 2.*consonant/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Class 3.*vowel/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Original foljapp explanatory prose/),
  ).toBeVisible();
  // The <Example> components produce role-tagged forms
  await expect(page.locator('main')).toContainText('punoj');
  await expect(page.locator('main')).toContainText('hap');
  await expect(page.locator('main')).toContainText('pimë');
});

test('admirative-mood article renders with multiple examples', async ({ page }) => {
  await page.goto('/articles/admirative-mood');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /The Admirative Mood/,
  );
  await expect(
    page.getByText(/Original foljapp explanatory prose/),
  ).toBeVisible();
  // Examples appear inline
  await expect(page.locator('main')).toContainText('punuakam');
  await expect(page.locator('main')).toContainText('hapkam');
  await expect(page.locator('main')).toContainText('marrkam');
});

test('NavHeader exposes Articles on every page', async ({ page }) => {
  for (const path of ['/', '/browse', '/articles', '/verb/punoj']) {
    await page.goto(path);
    const articlesLink = page.getByRole('link', { name: 'Articles' }).first();
    await expect(articlesLink).toBeVisible();
  }
});

test('article VerbLink components link to verb pages', async ({ page }) => {
  await page.goto('/articles/verb-classes');
  // VerbLink renders `lemma (translation)` text inside the link
  const link = page.getByRole('link', { name: /^punoj/ }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/verb\/punoj$/);
});
