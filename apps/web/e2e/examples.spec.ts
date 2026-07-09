import { expect, test } from '@playwright/test';

test('playground shows indexed examples for a generated form', async ({
  page,
}) => {
  await page.goto(
    '/playground?verb=punoj&mood=indicative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative',
  );

  const examples = page.getByTestId('examples');
  await expect(examples.getByTestId('examples-summary')).toContainText(
    'Examples',
  );
  await expect(examples.locator('table')).toBeVisible();
  await expect(examples).toContainText('Indexed form: punoj');
  await expect(
    examples.getByRole('columnheader', { name: 'Source' }),
  ).toBeVisible();
  await expect(examples).toContainText('punoj');

  await examples.getByTestId('examples-summary').click();
  await expect(examples.locator('table')).toBeHidden();
});

test('playground shows phrase-level examples for multiword forms', async ({
  page,
}) => {
  await page.goto(
    '/playground?verb=punoj&mood=subjunctive&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative',
  );

  const examples = page.getByTestId('examples');
  await expect(examples).toContainText('Indexed form: të punoj');
  await expect(examples).toContainText('Tatoeba');
  await expect(examples).toContainText('Unë nuk dua të punoj në këto kushte.');
  await expect(examples).toContainText(
    "I don't want to work under these conditions.",
  );
});

test('rare generated forms can show a corpus-backed example', async ({
  page,
}) => {
  await page.goto(
    '/playground?verb=punoj&mood=admirative&tense=present&voice=active&person=2&number=singular&polarity=affirmative&modality=declarative',
  );

  const examples = page.getByTestId('examples');
  await expect(examples).toContainText('Indexed form: punuake');
  await expect(examples).toContainText('OpenSubtitles');
  await expect(examples).toContainText('Më nuk punuake në dhomën e ngrënies.');
  await expect(examples).toContainText(
    "You don't work in the dining room anymore.",
  );
});
