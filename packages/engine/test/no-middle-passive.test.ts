/**
 * Regression: verbs flagged noMiddlePassive raise UnsupportedCellError for
 * any MP request and produce undefined MP cells in table().
 * See openspec/changes/suppress-mp-for-intransitives.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate, table } from '../src/conjugate.js';
import { UnsupportedCellError } from '../src/errors.js';
import type { ConjugateOptions, VerbEntry } from '../src/types.js';

import { fixtures, jam } from './fixtures.js';

const iki: VerbEntry = {
  id: 'iki',
  lemma: 'iki',
  translationEn: 'to leave',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'ik', aorist: 'ik', participle: 'ikur' },
  sources: [{ source: 'husic', reference: '2D' }],
  flags: { noMiddlePassive: true },
  dialect: 'tosk',
  cellOverrides: {
    'indicative.present': { '1sg': 'iki', '2sg': 'ikën', '3sg': 'ikën' },
    'indicative.aorist': { '3sg': 'iku' },
  },
};

const vij: VerbEntry = {
  id: 'vij',
  lemma: 'vij',
  translationEn: 'to come',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'vi', aorist: 'erdh', participle: 'ardhur' },
  sources: [{ source: 'husic', reference: 'irregular' }],
  flags: { isSuppletive: true, irregularAorist: true, noMiddlePassive: true },
  dialect: 'tosk',
};

// jam fixture is suppletive but we override flags here to add noMiddlePassive
// for the test (in production corpus the flag is set on jam.json directly).
const jamFlagged: VerbEntry = {
  ...jam,
  flags: { ...(jam.flags ?? {}), noMiddlePassive: true },
};

const overrideAndFlag: VerbEntry = {
  id: 'override-and-flag',
  lemma: 'override-and-flag',
  translationEn: 'override-and-flag sentinel',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'oaf', aorist: 'oafua', participle: 'oafuar' },
  sources: [{ source: 'manual', reference: 'test fixture' }],
  flags: { noMiddlePassive: true },
  dialect: 'tosk',
  cellOverrides: {
    'indicative.present.middle-passive': { '1sg': 'oafhem' },
  },
};

beforeAll(() => {
  // Replace jam from fixtures with the flagged version so jam's MP cells
  // throw under this test corpus.
  const baseFixtures = fixtures.filter((f) => f.id !== 'jam');
  configure([...baseFixtures, jamFlagged, iki, vij, overrideAndFlag], '0.1.5');
});

const mp = (lemma: string, mood: ConjugateOptions['mood'], tense: ConjugateOptions['tense'], person: 1 | 2 | 3 = 1, number: 'singular' | 'plural' = 'singular') =>
  conjugate(lemma, { mood, tense, voice: 'middle-passive', person, number, polarity: 'affirmative', modality: 'declarative' });

describe('noMiddlePassive: every MP cell throws UnsupportedCellError', () => {
  for (const lemma of ['jam', 'iki', 'vij', 'override-and-flag']) {
    for (const [mood, tense] of [
      ['indicative', 'present'],
      ['indicative', 'imperfect'],
      ['indicative', 'aorist'],
      ['indicative', 'perfect'],
      ['indicative', 'pluperfect'],
      ['indicative', 'future'],
      ['subjunctive', 'present'],
      ['subjunctive', 'imperfect'],
      ['subjunctive', 'perfect'],
      ['conditional', 'present'],
      ['conditional', 'perfect'],
      ['optative', 'present'],
      ['admirative', 'present'],
      ['admirative', 'imperfect'],
    ] as const) {
      it(`${lemma}: ${mood}.${tense} MP throws`, () => {
        expect(() => mp(lemma, mood, tense, 1, 'singular')).toThrow(UnsupportedCellError);
      });
    }
  }
});

describe('noMiddlePassive: imperative MP throws', () => {
  for (const lemma of ['jam', 'iki', 'vij']) {
    it(`${lemma} imperative present MP 2sg throws`, () => {
      expect(() => mp(lemma, 'imperative', 'present', 2, 'singular')).toThrow(UnsupportedCellError);
    });
  }
});

describe('noMiddlePassive: flag wins over MP cellOverrides', () => {
  it('override-and-flag MP 1sg throws despite the override', () => {
    expect(() => mp('override-and-flag', 'indicative', 'present')).toThrow(UnsupportedCellError);
  });
});

describe('noMiddlePassive: active voice unaffected', () => {
  it('jam active indicative present 1sg → "jam"', () => {
    expect(conjugate('jam', { mood: 'indicative', tense: 'present', voice: 'active', person: 1, number: 'singular', polarity: 'affirmative', modality: 'declarative' }).form).toBe('jam');
  });
  it('iki active indicative present 1sg → "iki"', () => {
    expect(conjugate('iki', { mood: 'indicative', tense: 'present', voice: 'active', person: 1, number: 'singular', polarity: 'affirmative', modality: 'declarative' }).form).toBe('iki');
  });
});

describe('noMiddlePassive: table() produces undefined MP cells for flagged verbs', () => {
  it('jam.indicative.present has no MP cells', () => {
    const t = table('jam');
    const present = t.indicative.present as Record<string, unknown>;
    for (const cell of ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']) {
      expect(present[`${cell}.middle-passive`]).toBeUndefined();
    }
  });
  it('vij.indicative.imperfect has no MP cells', () => {
    const t = table('vij');
    const impf = t.indicative.imperfect as Record<string, unknown>;
    for (const cell of ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']) {
      expect(impf[`${cell}.middle-passive`]).toBeUndefined();
    }
  });
});
