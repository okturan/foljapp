import { describe, expect, it } from 'vitest';

import { lookupOpusExamples, normalizeOpusToken } from './opus-examples';

describe('opus examples lookup', () => {
  it('normalizes Albanian tokens', () => {
    expect(normalizeOpusToken(' PUNON ')).toBe('punon');
  });

  it('finds indexed examples for a generated form', () => {
    const lookup = lookupOpusExamples('punoj');

    expect(lookup.lookupForm).toBe('punoj');
    expect(lookup.examples.length).toBeGreaterThan(0);
    expect(lookup.examples[0]?.sq.toLocaleLowerCase('sq-AL')).toContain(
      'punoj',
    );
  });

  it('finds indexed examples for a generated phrase', () => {
    const lookup = lookupOpusExamples('të punoj');

    expect(lookup.lookupForm).toBe('të punoj');
    expect(lookup.examples[0]).toMatchObject({
      corpus: 'Tatoeba',
      sq: 'Unë nuk dua të punoj në këto kushte.',
      en: "I don't want to work under these conditions.",
    });
  });

  it('does not collapse unindexed phrases to a single token', () => {
    const lookup = lookupOpusExamples('mos punoj');

    expect(lookup.lookupForm).toBe('mos punoj');
    expect(lookup.examples).toEqual([]);
  });

  it('finds the OpenSubtitles corpus example for a rare generated form', () => {
    const lookup = lookupOpusExamples('punuake');

    expect(lookup.lookupForm).toBe('punuake');
    expect(lookup.examples[0]).toMatchObject({
      corpus: 'OpenSubtitles',
      sq: 'Më nuk punuake në dhomën e ngrënies.',
      en: "You don't work in the dining room anymore.",
    });
  });

  it('returns an honest empty state for unindexed forms', () => {
    const lookup = lookupOpusExamples('notindexed');

    expect(lookup.lookupForm).toBe('notindexed');
    expect(lookup.examples).toEqual([]);
  });
});
