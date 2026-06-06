import { expect, test } from '@playwright/test';

test.describe('engine-wide paradigm attribution in verb-page footer', () => {
  test('attribution line is visible on a verb without per-verb Husić data', async ({
    page,
  }) => {
    await page.goto('/verb/kooperoj');
    const footer = page.locator('footer');
    await expect(footer).toContainText('Paradigm engine');
    await expect(footer).toContainText('uniparser-grammar-albanian');
    await expect(footer).toContainText('Husić');
    await expect(footer).toContainText('Kadriu');
    await expect(footer).toContainText('Wikipedia');
    const refLink = footer.getByRole('link', { name: 'References' });
    await expect(refLink).toBeVisible();
    await expect(refLink).toHaveAttribute('href', '/references');
  });

  test('References link navigates to the global bibliography', async ({
    page,
  }) => {
    await page.goto('/verb/kooperoj');
    await page.locator('footer').getByRole('link', { name: 'References' }).click();
    await expect(page).toHaveURL(/\/references$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'References' }),
    ).toBeVisible();
  });

  test('per-verb Husić citation still renders alongside the engine attribution', async ({
    page,
  }) => {
    await page.goto('/verb/bashkoj');
    const footer = page.locator('footer');
    // Per-verb husic source still present
    await expect(
      footer.getByText('Husić, Albanian Verb Dictionary and Manual'),
    ).toBeVisible();
    // Engine attribution also present
    await expect(footer).toContainText('Paradigm engine');
    await expect(footer).toContainText('uniparser-grammar-albanian');
  });
});
