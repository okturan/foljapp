/**
 * Decomposition round-trip: concatenating segments reproduces the form.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { joinDecomposition } from '../src/compose/decomposition.js';
import { configure, conjugate } from '../src/conjugate.js';

import { fixtures } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

describe('decomposition reproduces form', () => {
  const samples = [
    { id: 'punoj', mood: 'indicative', tense: 'present', voice: 'active', p: 1, n: 'singular' },
    { id: 'punoj', mood: 'indicative', tense: 'perfect', voice: 'active', p: 1, n: 'singular' },
    { id: 'punoj', mood: 'subjunctive', tense: 'present', voice: 'active', p: 2, n: 'singular' },
    { id: 'punoj', mood: 'conditional', tense: 'present', voice: 'active', p: 3, n: 'plural' },
    { id: 'punoj', mood: 'admirative', tense: 'present', voice: 'active', p: 1, n: 'singular' },
    { id: 'punoj', mood: 'optative', tense: 'present', voice: 'active', p: 1, n: 'plural' },
    { id: 'hap', mood: 'indicative', tense: 'imperfect', voice: 'active', p: 2, n: 'singular' },
    { id: 'pjek', mood: 'indicative', tense: 'aorist', voice: 'active', p: 1, n: 'singular' },
    { id: 'jam', mood: 'indicative', tense: 'present', voice: 'active', p: 3, n: 'singular' },
    { id: 'laj', mood: 'indicative', tense: 'aorist', voice: 'middle-passive', p: 1, n: 'singular' },
    { id: 'laj', mood: 'indicative', tense: 'perfect', voice: 'middle-passive', p: 1, n: 'singular' },
  ] as const;

  for (const s of samples) {
    it(`${s.id} ${s.mood}/${s.tense}/${s.voice}/${s.p}${s.n} round-trips`, () => {
      const r = conjugate(s.id, {
        mood: s.mood,
        tense: s.tense,
        voice: s.voice,
        person: s.p,
        number: s.n,
      });
      const reassembled = joinDecomposition(r.decomposition);
      expect(reassembled).toBe(r.form);
    });
  }

  it('non-finite forms also round-trip', () => {
    const forms = ['participle', 'infinitive', 'gerund', 'privative', 'temporal'] as const;
    for (const form of forms) {
      const r = conjugate('punoj', { mood: 'non-finite', form });
      const reassembled = joinDecomposition(r.decomposition);
      expect(reassembled).toBe(r.form);
    }
  });
});
