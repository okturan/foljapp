import { expect, test } from '@playwright/test';

test.describe('playground feasibility-driven greying', () => {
  test('punoj + imperative greys out middle-passive voice', async ({
    page,
  }) => {
    await page.goto(
      '/playground?verb=punoj&mood=imperative&voice=active&person=2&number=singular&polarity=affirmative&modality=declarative',
    );
    const mp = page
      .getByTestId('option-group-voice')
      .locator('input[type="radio"][value="middle-passive"]');
    await expect(mp).toBeDisabled();
  });

  test('laj + imperative keeps middle-passive enabled', async ({ page }) => {
    await page.goto(
      '/playground?verb=laj&mood=imperative&voice=active&person=2&number=singular&polarity=affirmative&modality=declarative',
    );
    const mp = page
      .getByTestId('option-group-voice')
      .locator('input[type="radio"][value="middle-passive"]');
    await expect(mp).toBeEnabled();
  });

  test('imperative greys persons 1 and 3 (only 2 supported)', async ({
    page,
  }) => {
    await page.goto(
      '/playground?verb=punoj&mood=imperative&voice=active&person=2&number=singular&polarity=affirmative&modality=declarative',
    );
    const personGroup = page.getByTestId('option-group-person');
    await expect(
      personGroup.locator('input[type="radio"][value="1"]'),
    ).toBeDisabled();
    await expect(
      personGroup.locator('input[type="radio"][value="2"]'),
    ).toBeEnabled();
    await expect(
      personGroup.locator('input[type="radio"][value="3"]'),
    ).toBeDisabled();
  });

  test('Polarity and Modality are never disabled', async ({ page }) => {
    await page.goto(
      '/playground?verb=punoj&mood=imperative&voice=active&person=2&number=singular&polarity=affirmative&modality=declarative',
    );
    for (const value of ['affirmative', 'negative']) {
      await expect(
        page
          .getByTestId('option-group-polarity')
          .locator(`input[type="radio"][value="${value}"]`),
      ).toBeEnabled();
    }
    for (const value of ['declarative', 'interrogative']) {
      await expect(
        page
          .getByTestId('option-group-modality')
          .locator(`input[type="radio"][value="${value}"]`),
      ).toBeEnabled();
    }
  });
});
