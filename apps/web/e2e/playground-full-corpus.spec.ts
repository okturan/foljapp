import { expect, test } from '@playwright/test';

const NON_SEED_LEMMAS = ['dhemb', 'kërkoj', 'tregoj', 'qëndroj', 'lejoj', 'kontrolloj'];

test.describe('playground exposes the full corpus', () => {
  for (const lemma of NON_SEED_LEMMAS) {
    test(`/playground?verb=${lemma} renders without "Unknown verb" error`, async ({
      page,
    }) => {
      const url = `/playground?verb=${encodeURIComponent(lemma)}&mood=indicative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative`;
      await page.goto(url);
      const main = page.locator('main');
      await expect(main).not.toContainText('Unknown verb');
      await expect(main).not.toContainText('No corpus entry found');
      // The result panel should contain a non-empty form. The decomposed
      // form pills sit inside the result panel — we assert the IPA element
      // (which only renders when the engine returned a form) is present.
      await expect(page.locator('main p.font-mono')).not.toHaveCount(0);
    });
  }
});
