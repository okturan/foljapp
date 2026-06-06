/**
 * Regression: Class 2B mutation MP cells + irregular dua MP cells +
 * voice-axis cellOverride support + `-shit` optative 2pl cleanup.
 * See openspec/changes/align-mp-cells-with-husic.
 *
 * Truth source: Husić-direct cache cells parsed from his manual.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate } from '../src/conjugate.js';
import type { ConjugateOptions, VerbEntry } from '../src/types.js';

import { fixtures } from './fixtures.js';

const djeg: VerbEntry = {
  id: 'djeg',
  lemma: 'djeg',
  translationEn: 'to burn',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'djeg', aorist: 'dogj', participle: 'djegur' },
  sources: [{ source: 'husic', reference: '2B' }],
  flags: { hasMutation: true, irregularAorist: true },
  dialect: 'tosk',
  cellOverrides: {
    'indicative.present': { '2pl': 'digjni' },
    'indicative.present.middle-passive': {
      '1sg': 'digjem', '2sg': 'digjesh', '3sg': 'digjet',
      '1pl': 'digjemi', '2pl': 'digjeni', '3pl': 'digjen',
    },
    'indicative.imperfect': {
      '1sg': 'digjja', '2sg': 'digjje', '3sg': 'digjte',
      '1pl': 'digjnim', '2pl': 'digjnit', '3pl': 'digjnin',
    },
    'indicative.imperfect.middle-passive': {
      '1sg': 'digjesha', '2sg': 'digjeshe', '3sg': 'digjej',
      '1pl': 'digjeshim', '2pl': 'digjeshit', '3pl': 'digjeshin',
    },
    'subjunctive.present': { '2pl': 'të digjni' },
    'imperative.present': { '2sg': 'digj', '2pl': 'digjni' },
  },
};

const pjek: VerbEntry = {
  id: 'pjek',
  lemma: 'pjek',
  translationEn: 'to bake',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'pjek', aorist: 'poq', participle: 'pjekur' },
  sources: [{ source: 'husic', reference: '2B' }],
  flags: { hasMutation: true, irregularAorist: true },
  dialect: 'tosk',
  cellOverrides: {
    'indicative.present': { '2pl': 'piqni' },
    'indicative.present.middle-passive': {
      '1sg': 'piqem', '2sg': 'piqesh', '3sg': 'piqet',
      '1pl': 'piqemi', '2pl': 'piqeni', '3pl': 'piqen',
    },
    'indicative.imperfect.middle-passive': {
      '1sg': 'piqesha', '2sg': 'piqeshe', '3sg': 'piqej',
      '1pl': 'piqeshim', '2pl': 'piqeshit', '3pl': 'piqeshin',
    },
  },
};

const marr: VerbEntry = {
  id: 'marr',
  lemma: 'marr',
  translationEn: 'to take',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'marr', aorist: 'mor', participle: 'marrë' },
  sources: [{ source: 'husic', reference: '2C' }],
  flags: { irregularAorist: true },
  dialect: 'tosk',
  cellOverrides: {
    'indicative.present.middle-passive': {
      '1sg': 'merrem', '2sg': 'merresh', '3sg': 'merret',
      '1pl': 'merremi', '2pl': 'merreni', '3pl': 'merren',
    },
    'indicative.imperfect.middle-passive': {
      '1sg': 'merresha', '2sg': 'merreshe', '3sg': 'merrej',
      '1pl': 'merreshim', '2pl': 'merreshit', '3pl': 'merreshin',
    },
  },
};

const dua: VerbEntry = {
  id: 'dua',
  lemma: 'dua',
  translationEn: 'to want / to love',
  class: 3,
  auxiliary: 'kam',
  principalParts: { present: 'dua', aorist: 'desh', participle: 'dashur' },
  sources: [{ source: 'husic', reference: '3B' }],
  flags: { irregularAorist: true },
  dialect: 'tosk',
  cellOverrides: {
    'indicative.present.middle-passive': {
      '1sg': 'duhem', '2sg': 'duhesh', '3sg': 'duhet',
      '1pl': 'duhemi', '2pl': 'duheni', '3pl': 'duhen',
    },
    'indicative.imperfect.middle-passive': {
      '1sg': 'duhesha', '2sg': 'duheshe', '3sg': 'duhej',
      '1pl': 'duheshim', '2pl': 'duheshit', '3pl': 'duheshin',
    },
  },
};

const voiceAxis: VerbEntry = {
  id: 'voice-axis',
  lemma: 'voice-axis',
  translationEn: 'voice-axis sentinel',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'vois', aorist: 'voisua', participle: 'voisuar' },
  sources: [{ source: 'manual', reference: 'test' }],
  dialect: 'tosk',
  cellOverrides: {
    'indicative.present': { '2pl': 'ACTIVE-2PL' },
    'indicative.present.middle-passive': { '2pl': 'MP-2PL' },
  },
};

beforeAll(() => {
  // Replace djeg/pjek from fixtures.ts with our locally-overridden copies.
  const overrideIds = new Set(['djeg', 'pjek']);
  const baseFixtures = fixtures.filter((f) => !overrideIds.has(f.id));
  configure([...baseFixtures, djeg, pjek, marr, dua, voiceAxis], '0.1.4');
});

const mp = (lemma: string, mood: ConjugateOptions['mood'], tense: ConjugateOptions['tense'], person: 1 | 2 | 3, number: 'singular' | 'plural'): string =>
  conjugate(lemma, { mood, tense, voice: 'middle-passive', person, number, polarity: 'affirmative', modality: 'declarative' }).form;

const active = (lemma: string, mood: ConjugateOptions['mood'], tense: ConjugateOptions['tense'], person: 1 | 2 | 3, number: 'singular' | 'plural'): string =>
  conjugate(lemma, { mood, tense, voice: 'active', person, number, polarity: 'affirmative', modality: 'declarative' }).form;

describe('Class 2B mutation MP cells', () => {
  it.each([
    ['djeg', 'present', 'digjem', 'digjen'],
    ['djeg', 'imperfect', 'digjesha', 'digjeshin'],
    ['pjek', 'present', 'piqem', 'piqen'],
    ['pjek', 'imperfect', 'piqesha', 'piqeshin'],
    ['marr', 'present', 'merrem', 'merren'],
    ['marr', 'imperfect', 'merresha', 'merreshin'],
  ] as const)('%s indicative %s MP 1sg/3pl', (lemma, tense, expected1sg, expected3pl) => {
    expect(mp(lemma, 'indicative', tense, 1, 'singular')).toBe(expected1sg);
    expect(mp(lemma, 'indicative', tense, 3, 'plural')).toBe(expected3pl);
  });

  it('cascades through subjunctive imperfect MP (compound reuses inner stem)', () => {
    expect(mp('marr', 'subjunctive', 'imperfect', 1, 'singular')).toBe('të merresha');
    expect(mp('djeg', 'subjunctive', 'imperfect', 1, 'singular')).toBe('të digjesha');
  });

  it('cascades through conditional present MP (built on imperfect inner)', () => {
    expect(mp('marr', 'conditional', 'present', 1, 'singular')).toBe('do të merresha');
  });
});

describe('dua irregular MP', () => {
  it.each([
    [['present', 1, 'singular'], 'duhem'],
    [['present', 3, 'plural'], 'duhen'],
    [['imperfect', 1, 'singular'], 'duhesha'],
    [['imperfect', 3, 'plural'], 'duheshin'],
  ] as const)('dua indicative %s MP → %s', ([tense, p, n], expected) => {
    expect(mp('dua', 'indicative', tense, p, n)).toBe(expected);
  });
});

describe('Voice-axis isolation', () => {
  it('active and MP overrides on the same <mood>.<tense> resolve independently', () => {
    expect(active('voice-axis', 'indicative', 'present', 2, 'plural')).toBe('ACTIVE-2PL');
    expect(mp('voice-axis', 'indicative', 'present', 2, 'plural')).toBe('MP-2PL');
  });
});

describe('Optative 2pl produces -shi (no -shit)', () => {
  // After deleting the bad overrides on bitis/djeg/gudulis/laj/pjek, the
  // paradigm default (class-1 'fshi', class-2 'shi') emits the correct form.
  // djeg/pjek tested via the local fixtures above.
  it.each([
    ['djeg', 'active', 'djegshi'],
    ['djeg', 'middle-passive', 'u djegshi'],
    ['pjek', 'active', 'pjekshi'],
    ['pjek', 'middle-passive', 'u pjekshi'],
  ] as const)('%s optative 2pl %s → %s', (lemma, voice, expected) => {
    const r = conjugate(lemma, {
      mood: 'optative',
      tense: 'present',
      voice,
      person: 2,
      number: 'plural',
      polarity: 'affirmative',
      modality: 'declarative',
    });
    expect(r.form).toBe(expected);
  });
});
