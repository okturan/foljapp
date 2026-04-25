/**
 * Golden-form tests for admirative imperfect and pluperfect cells.
 * Surface forms verified against four independent sources: Kaikki / Wiktionary
 * JSONL, Wiktionary direct, CoolJugator, and timarkh/uniparser-grammar-albanian
 * paradigms.txt (paradigm `ipf-adm-act`).
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate } from '../src/conjugate.js';

import { fixtures, punoj, flas, jam, jap, shoh, pjek } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

describe('admirative imperfect — active', () => {
  it('punoj all six cells', () => {
    const expected = [
      { person: 1, number: 'singular', form: 'punuakësha' },
      { person: 2, number: 'singular', form: 'punuakëshe' },
      { person: 3, number: 'singular', form: 'punuakësh' },
      { person: 1, number: 'plural', form: 'punuakëshim' },
      { person: 2, number: 'plural', form: 'punuakëshit' },
      { person: 3, number: 'plural', form: 'punuakëshin' },
    ] as const;
    for (const c of expected) {
      const r = conjugate(punoj.id, {
        mood: 'admirative', tense: 'imperfect', voice: 'active',
        person: c.person, number: c.number,
        polarity: 'affirmative', modality: 'declarative',
      });
      expect(r.form).toBe(c.form);
    }
  });

  it('flas all six cells', () => {
    const expected = [
      { person: 1, number: 'singular', form: 'folkësha' },
      { person: 2, number: 'singular', form: 'folkëshe' },
      { person: 3, number: 'singular', form: 'folkësh' },
      { person: 1, number: 'plural', form: 'folkëshim' },
      { person: 2, number: 'plural', form: 'folkëshit' },
      { person: 3, number: 'plural', form: 'folkëshin' },
    ] as const;
    for (const c of expected) {
      const r = conjugate(flas.id, {
        mood: 'admirative', tense: 'imperfect', voice: 'active',
        person: c.person, number: c.number,
        polarity: 'affirmative', modality: 'declarative',
      });
      expect(r.form).toBe(c.form);
    }
  });

  it('pjek 1sg returns "pjekkësha" — palatalization does not apply (built on participle stem, not aorist)', () => {
    const r = conjugate(pjek.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('pjekkësha');
  });

  it('jam 1sg returns "qenkësha" via the auxiliary table (suppletive root qen-)', () => {
    const r = conjugate(jam.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('qenkësha');
  });

  it('shoh 1sg returns "pakësha" (suppletive root pa-, parallel to admirative present pakam)', () => {
    const r = conjugate(shoh.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('pakësha');
  });

  it('jap 1sg returns "dhënkësha" (suppletive root dhën-)', () => {
    const r = conjugate(jap.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('dhënkësha');
  });
});

describe('admirative pluperfect — active (kam-aux compound)', () => {
  it('punoj all six cells', () => {
    const expected = [
      { person: 1, number: 'singular', form: 'paskësha punuar' },
      { person: 2, number: 'singular', form: 'paskëshe punuar' },
      { person: 3, number: 'singular', form: 'paskësh punuar' },
      { person: 1, number: 'plural', form: 'paskëshim punuar' },
      { person: 2, number: 'plural', form: 'paskëshit punuar' },
      { person: 3, number: 'plural', form: 'paskëshin punuar' },
    ] as const;
    for (const c of expected) {
      const r = conjugate(punoj.id, {
        mood: 'admirative', tense: 'pluperfect', voice: 'active',
        person: c.person, number: c.number,
        polarity: 'affirmative', modality: 'declarative',
      });
      expect(r.form).toBe(c.form);
    }
  });

  it('flas 1sg returns "paskësha folur"', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'pluperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('paskësha folur');
  });

  it('jam 1sg returns "paskësha qenë" (kam-aux on jam participle)', () => {
    const r = conjugate(jam.id, {
      mood: 'admirative', tense: 'pluperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('paskësha qenë');
  });

  it('decomposition: 1sg punoj has auxiliary "paskësha" + stem "punuar"', () => {
    const r = conjugate(punoj.id, {
      mood: 'admirative', tense: 'pluperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    const aux = r.decomposition.find((s) => s.role === 'auxiliary');
    const stem = r.decomposition.find((s) => s.role === 'stem');
    expect(aux?.surface).toBe('paskësha');
    expect(stem?.surface).toBe('punuar');
  });
});

describe('negation and modality compose with new admirative tenses', () => {
  it('negative polarity prepends "nuk" to admirative imperfect', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'negative', modality: 'declarative',
    });
    expect(r.form).toBe('nuk folkësha');
  });

  it('negative polarity prepends "nuk" to admirative pluperfect', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'pluperfect', voice: 'active',
      person: 1, number: 'singular',
      polarity: 'negative', modality: 'declarative',
    });
    expect(r.form).toBe('nuk paskësha folur');
  });
});

// MP admirative imperfect / pluperfect coverage moved to admirative-mp.test.ts
// (added by add-mp-admirative-coverage which supersedes the deferral noted here).
