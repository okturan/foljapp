import { describe, expect, it } from 'vitest';

import {
  ancTagQueryForOptions,
  cellSignature,
  generatedSearchTarget,
  normalizeSearchKey,
} from '../src/corpus-tags.js';

describe('corpus tag bridge', () => {
  it('normalizes Albanian phrase keys without dropping particles', () => {
    expect(normalizeSearchKey(' Të  Punoj! ')).toBe('të punoj');
  });

  it('maps subjunctive present cells to ANC-style tags', () => {
    expect(
      ancTagQueryForOptions({
        mood: 'subjunctive',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }).tags,
    ).toEqual(['V', 'sbjv', 'pres', '1', 'sg', 'act']);
  });

  it('maps admirative present cells to ANC-style tags', () => {
    expect(
      ancTagQueryForOptions({
        mood: 'admirative',
        tense: 'present',
        voice: 'active',
        person: 2,
        number: 'singular',
      }).tags,
    ).toEqual(['V', 'adm', 'pres', '2', 'sg', 'act']);
  });

  it('uses participle tags for compound lexical verbs', () => {
    const query = ancTagQueryForOptions({
      mood: 'admirative',
      tense: 'perfect',
      voice: 'active',
      person: 1,
      number: 'singular',
    });

    expect(query.tags).toEqual(['V', 'ptcp']);
    expect(query.note).toContain('Compound tense');
  });

  it('builds stable target signatures for generated examples', () => {
    const target = generatedSearchTarget('të punoj', {
      mood: 'subjunctive',
      tense: 'present',
      voice: 'active',
      person: 1,
      number: 'singular',
      polarity: 'affirmative',
      modality: 'declarative',
    });

    expect(target).toMatchObject({
      targetKey: 'të punoj',
      signature: 'subjunctive.present.1sg.active.affirmative.declarative',
      ancQuery: 'V sbjv pres 1 sg act',
    });
    expect(
      cellSignature({
        mood: 'non-finite',
        form: 'participle',
      }),
    ).toBe('non-finite.participle');
  });
});
