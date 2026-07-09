/**
 * Negation-particle tests. Standard Albanian negates the imperative,
 * subjunctive, and optative with "mos"; the subjunctive negator follows
 * the particle "të" ("të mos punoj"). Indicative, admirative, and
 * conditional negate with "nuk" (colloquial "s'"). Asserted by the
 * fix-negation-particles spec delta.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate } from '../src/conjugate.js';

import { fixtures, punoj, djeg, jam, them } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

const base = {
  voice: 'active' as const,
  polarity: 'negative' as const,
  modality: 'declarative' as const,
};

describe('optative negation uses mos', () => {
  it('jam (suppletive) optative present 1sg = "mos qofsha"', () => {
    const r = conjugate(jam.id, {
      mood: 'optative',
      tense: 'present',
      person: 1,
      number: 'singular',
      ...base,
    });
    expect(r.form).toBe('mos qofsha');
  });

  it('them optative present 1pl = "mos thënçim"', () => {
    const r = conjugate(them.id, {
      mood: 'optative',
      tense: 'present',
      person: 1,
      number: 'plural',
      ...base,
    });
    expect(r.form).toBe('mos thënçim');
  });

  it('never surfaces a negated optative with nuk, colloquial or not', () => {
    for (const colloquial of [false, true]) {
      const r = conjugate(punoj.id, {
        mood: 'optative',
        tense: 'present',
        person: 3,
        number: 'singular',
        colloquial,
        ...base,
      });
      expect(r.form.startsWith('mos ')).toBe(true);
    }
  });
});

describe('subjunctive negation places mos after të', () => {
  it('punoj subjunctive present 1sg = "të mos punoj"', () => {
    const r = conjugate(punoj.id, {
      mood: 'subjunctive',
      tense: 'present',
      person: 1,
      number: 'singular',
      ...base,
    });
    expect(r.form).toBe('të mos punoj');
    const particles = r.decomposition
      .filter((segment) => segment.role === 'particle')
      .map((segment) => segment.surface);
    expect(particles.slice(0, 2)).toEqual(['të', 'mos']);
  });

  it('djeg (mutating) middle-passive inserts mos after të', () => {
    const cell = {
      mood: 'subjunctive' as const,
      tense: 'present' as const,
      person: 3 as const,
      number: 'singular' as const,
      voice: 'middle-passive' as const,
      modality: 'declarative' as const,
    };
    const affirmative = conjugate(djeg.id, {
      ...cell,
      polarity: 'affirmative',
    });
    const negative = conjugate(djeg.id, { ...cell, polarity: 'negative' });
    expect(affirmative.form.startsWith('të ')).toBe(true);
    expect(negative.form).toBe(
      affirmative.form.replace(/^të /, 'të mos '),
    );
  });

  it('jam subjunctive present 1sg = "të mos jem"', () => {
    const r = conjugate(jam.id, {
      mood: 'subjunctive',
      tense: 'present',
      person: 1,
      number: 'singular',
      ...base,
    });
    expect(r.form).toBe('të mos jem');
  });

  it('compound tense keeps the insertion point: "të mos kem punuar"', () => {
    const r = conjugate(punoj.id, {
      mood: 'subjunctive',
      tense: 'perfect',
      person: 1,
      number: 'singular',
      ...base,
    });
    expect(r.form).toBe('të mos kem punuar');
  });

  it('interrogative wraps outside: "a të mos punoj"', () => {
    const r = conjugate(punoj.id, {
      mood: 'subjunctive',
      tense: 'present',
      person: 1,
      number: 'singular',
      voice: 'active',
      polarity: 'negative',
      modality: 'interrogative',
    });
    expect(r.form).toBe('a të mos punoj');
  });
});

describe('other moods keep their negators', () => {
  it('indicative present 1sg = "nuk punoj" ("s\'" when colloquial)', () => {
    const r = conjugate(punoj.id, {
      mood: 'indicative',
      tense: 'present',
      person: 1,
      number: 'singular',
      ...base,
    });
    expect(r.form).toBe('nuk punoj');

    const colloquial = conjugate(punoj.id, {
      mood: 'indicative',
      tense: 'present',
      person: 1,
      number: 'singular',
      colloquial: true,
      ...base,
    });
    expect(colloquial.form).toBe("s' punoj");
  });

  it('imperative 2sg = "mos puno"', () => {
    const r = conjugate(punoj.id, {
      mood: 'imperative',
      person: 2,
      number: 'singular',
      ...base,
    });
    expect(r.form).toBe('mos puno');
  });

  it('conditional present 1sg = "nuk do të punoja"', () => {
    const r = conjugate(punoj.id, {
      mood: 'conditional',
      tense: 'present',
      person: 1,
      number: 'singular',
      ...base,
    });
    expect(r.form).toBe('nuk do të punoja');
  });

  it('admirative present 1sg = "nuk punuakam"', () => {
    const r = conjugate(punoj.id, {
      mood: 'admirative',
      tense: 'present',
      person: 1,
      number: 'singular',
      ...base,
    });
    expect(r.form).toBe('nuk punuakam');
  });
});
