/**
 * Golden-form tests for middle-passive imperative — restricted by design.
 * Only verbs with attested MP imperatives in Kaikki carry per-verb overrides.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate } from '../src/conjugate.js';
import { UnsupportedCellError } from '../src/errors.js';

import { fixtures, punoj, flas, laj, shoh } from './fixtures.js';

// Add MP imperative cellOverrides to the laj/shoh fixtures (mirrors the
// production data/verbs/*.json entries).
const lajWithMpImperative = {
  ...laj,
  cellOverrides: {
    'imperative.present.middle-passive': { '2sg': 'lahu', '2pl': 'lahuni' },
  },
};
const shohWithMpImperative = {
  ...shoh,
  cellOverrides: {
    'imperative.present.middle-passive': { '2sg': 'shihu', '2pl': 'shihuni' },
  },
};
const enrichedFixtures = fixtures.map((f) => {
  if (f.id === 'laj') return lajWithMpImperative;
  if (f.id === 'shoh') return shohWithMpImperative;
  return f;
});

beforeAll(() => {
  configure(enrichedFixtures, '0.1.0');
});

describe('MP imperative is voice-aware via cellOverrides', () => {
  it('laj 2sg returns "lahu"', () => {
    const r = conjugate('laj', {
      mood: 'imperative', voice: 'middle-passive',
      person: 2, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('lahu');
  });

  it('laj 2pl returns "lahuni"', () => {
    const r = conjugate('laj', {
      mood: 'imperative', voice: 'middle-passive',
      person: 2, number: 'plural',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('lahuni');
  });

  it('shoh 2sg returns "shihu"', () => {
    const r = conjugate('shoh', {
      mood: 'imperative', voice: 'middle-passive',
      person: 2, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('shihu');
  });

  it('shoh 2pl returns "shihuni"', () => {
    const r = conjugate('shoh', {
      mood: 'imperative', voice: 'middle-passive',
      person: 2, number: 'plural',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('shihuni');
  });
});

describe('MP imperative throws for verbs without overrides', () => {
  it('punoj 2sg MP throws UnsupportedCellError', () => {
    expect(() =>
      conjugate(punoj.id, {
        mood: 'imperative', voice: 'middle-passive',
        person: 2, number: 'singular',
        polarity: 'affirmative', modality: 'declarative',
      }),
    ).toThrow(UnsupportedCellError);
  });

  it('flas 2sg MP throws UnsupportedCellError', () => {
    expect(() =>
      conjugate(flas.id, {
        mood: 'imperative', voice: 'middle-passive',
        person: 2, number: 'singular',
        polarity: 'affirmative', modality: 'declarative',
      }),
    ).toThrow(UnsupportedCellError);
  });

  it('punoj active 2sg still works (regression check)', () => {
    const r = conjugate(punoj.id, {
      mood: 'imperative', voice: 'active',
      person: 2, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('puno');
  });
});
