import { expect, test } from '@playwright/test';

test('playground shows indexed OPUS examples for a generated form', async ({
  page,
}) => {
  await page.goto(
    '/playground?verb=punoj&mood=indicative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative',
  );

  const examples = page.getByTestId('opus-examples');
  await expect(examples).toContainText('OPUS examples');
  await expect(examples).toContainText('Indexed token: punoj');
  await expect(
    examples.getByRole('columnheader', { name: 'Corpus' }),
  ).toBeVisible();
  await expect(examples).toContainText('punoj');
});

test('rare generated forms show no indexed OPUS example yet', async ({
  page,
}) => {
  await page.goto(
    '/playground?verb=punoj&mood=admirative&tense=present&voice=active&person=2&number=singular&polarity=affirmative&modality=declarative',
  );

  const examples = page.getByTestId('opus-examples');
  await expect(examples).toContainText('Indexed token: punuake');
  await expect(page.getByTestId('opus-empty-state')).toContainText(
    'No OPUS sentence examples indexed for punuake yet.',
  );
});
