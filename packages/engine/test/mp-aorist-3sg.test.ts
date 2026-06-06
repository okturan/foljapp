/**
 * Regression: middle-passive aorist 3sg surfaces the bare aorist stem,
 * not the active 3sg form. See openspec/changes/fix-mp-aorist-3sg.
 *
 * Truth source: Newmark/Hubbard/Prifti 1982 §10.4.2 + Husić-direct cache
 * (`u bë`, `u buar`, `u ça`, `u djeg`).
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate } from '../src/conjugate.js';
import type { ConjugateOptions, VerbEntry } from '../src/types.js';

import { fixtures } from './fixtures.js';

const lexoj: VerbEntry = {
  id: 'lexoj',
  lemma: 'lexoj',
  translationEn: 'to read',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'lexo', aorist: 'lexua', participle: 'lexuar' },
  sources: [{ source: 'husic', reference: '1A' }],
  dialect: 'tosk',
};

const kerkoj: VerbEntry = {
  id: 'kerkoj',
  lemma: 'kërkoj',
  translationEn: 'to look for / to ask',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'kërko', aorist: 'kërkua', participle: 'kërkuar' },
  sources: [{ source: 'husic', reference: '1A' }],
  dialect: 'tosk',
};

const bej: VerbEntry = {
  id: 'bej',
  lemma: 'bëj',
  translationEn: 'to make / to do',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'bë', aorist: 'bë', participle: 'bërë' },
  sources: [{ source: 'husic', reference: '1B' }],
  dialect: 'tosk',
  cellOverrides: {
    'indicative.aorist': {
      '1sg': 'bëra',
      '2sg': 'bëre',
      '3sg': 'bëri',
      '1pl': 'bëmë',
      '2pl': 'bëtë',
      '3pl': 'bënë',
    },
  },
};

/** Synthetic verb wired purely to assert cellOverride precedence. */
const overrideVerb: VerbEntry = {
  id: 'override-verb',
  lemma: 'override-verb',
  translationEn: 'override sentinel',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'overrid', aorist: 'overridua', participle: 'overriduar' },
  sources: [{ source: 'manual', reference: 'test fixture' }],
  dialect: 'tosk',
  cellOverrides: {
    'indicative.aorist.middle-passive': { '3sg': 'u dialectal' },
  },
};

beforeAll(() => {
  configure([...fixtures, lexoj, kerkoj, bej, overrideVerb], '0.1.0');
});

const mpAorist3sg = (lemma: string) =>
  conjugate(lemma, {
    mood: 'indicative',
    tense: 'aorist',
    voice: 'middle-passive',
    person: 3,
    number: 'singular',
    polarity: 'affirmative',
    modality: 'declarative',
  } satisfies ConjugateOptions);

describe('MP aorist 3sg uses the bare aorist stem', () => {
  it.each([
    ['lexoj', 'u lexua'],
    ['punoj', 'u punua'],
    ['kerkoj', 'u kërkua'],
    ['bej', 'u bë'],
    ['laj', 'u la'],
    ['hap', 'u hap'],
    ['pi', 'u pi'],
  ])('%s → %s', (lemma, expected) => {
    expect(mpAorist3sg(lemma).form).toBe(expected);
  });

  it('decomposes lexoj as [voice-marker u, stem lexua]', () => {
    const r = mpAorist3sg('lexoj');
    expect(r.decomposition.map((s) => ({ surface: s.surface, role: s.role }))).toEqual([
      { surface: 'u', role: 'voice-marker' },
      { surface: 'lexua', role: 'stem' },
    ]);
    expect(r.decomposition[0].meta?.particleName).toBe('u');
  });
});

describe('MP aorist non-3sg cells remain u + active form', () => {
  it.each([
    [['lexoj', 1, 'singular'], 'u lexova'],
    [['lexoj', 2, 'singular'], 'u lexove'],
    [['lexoj', 1, 'plural'], 'u lexuam'],
    [['lexoj', 2, 'plural'], 'u lexuat'],
    [['lexoj', 3, 'plural'], 'u lexuan'],
  ] as const)('lexoj %s → %s', ([_, person, number], expected) => {
    const r = conjugate(_, {
      mood: 'indicative',
      tense: 'aorist',
      voice: 'middle-passive',
      person,
      number,
      polarity: 'affirmative',
      modality: 'declarative',
    });
    expect(r.form).toBe(expected);
  });
});

describe('cellOverride wins over the bare-stem default', () => {
  it('returns the override surface verbatim', () => {
    const r = mpAorist3sg('override-verb');
    expect(r.form).toBe('u dialectal');
  });
});
