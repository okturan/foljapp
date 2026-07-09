/**
 * Mutated middle-passive stem tests: flas uses flit-, tërheq uses tërhiq-
 * in the MP present and imperfect (Newmark et al. 1982; FGJSH), delivered
 * via cellOverrides mirroring data/verbs/{flas,terheq}.json. Asserted by
 * the fix-flas-terheq-mp-stems spec delta.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate } from '../src/conjugate.js';

import { fixtures, flas, terheq, them } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

const mp = (
  verb: string,
  tense: 'present' | 'imperfect' | 'aorist',
  person: 1 | 2 | 3,
  number: 'singular' | 'plural',
) =>
  conjugate(verb, {
    mood: 'indicative',
    tense,
    voice: 'middle-passive',
    person,
    number,
    polarity: 'affirmative',
    modality: 'declarative',
  }).form;

describe('flas middle-passive uses the flit- stem', () => {
  it('present across all 6 cells', () => {
    expect(mp(flas.id, 'present', 1, 'singular')).toBe('flitem');
    expect(mp(flas.id, 'present', 2, 'singular')).toBe('flitesh');
    expect(mp(flas.id, 'present', 3, 'singular')).toBe('flitet');
    expect(mp(flas.id, 'present', 1, 'plural')).toBe('flitemi');
    expect(mp(flas.id, 'present', 2, 'plural')).toBe('fliteni');
    expect(mp(flas.id, 'present', 3, 'plural')).toBe('fliten');
  });

  it('imperfect 3sg = "flitej"', () => {
    expect(mp(flas.id, 'imperfect', 3, 'singular')).toBe('flitej');
  });

  it('subjunctive present MP derives as "të flitet"', () => {
    const r = conjugate(flas.id, {
      mood: 'subjunctive',
      tense: 'present',
      voice: 'middle-passive',
      person: 3,
      number: 'singular',
      polarity: 'affirmative',
      modality: 'declarative',
    });
    expect(r.form).toBe('të flitet');
  });

  it('aorist MP is unchanged: "u fol"', () => {
    expect(mp(flas.id, 'aorist', 3, 'singular')).toBe('u fol');
  });
});

describe('tërheq middle-passive uses the tërhiq- stem', () => {
  it('present 3sg/3pl = "tërhiqet"/"tërhiqen"', () => {
    expect(mp(terheq.id, 'present', 3, 'singular')).toBe('tërhiqet');
    expect(mp(terheq.id, 'present', 3, 'plural')).toBe('tërhiqen');
  });

  it('imperfect 3sg = "tërhiqej"', () => {
    expect(mp(terheq.id, 'imperfect', 3, 'singular')).toBe('tërhiqej');
  });

  it('aorist MP is unchanged: "u tërhoq"', () => {
    expect(mp(terheq.id, 'aorist', 3, 'singular')).toBe('u tërhoq');
  });
});

describe('controls are unaffected', () => {
  it('suppletive them present MP 3sg stays "thuhet"', () => {
    expect(mp(them.id, 'present', 3, 'singular')).toBe('thuhet');
  });
});
