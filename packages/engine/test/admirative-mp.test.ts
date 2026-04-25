/**
 * Golden-form tests for middle-passive admirative across all four tenses.
 * Surface forms verified against Kaikki / Wiktionary.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate } from '../src/conjugate.js';

import { fixtures, punoj, flas, jam, shoh, jap } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

describe('MP admirative present (u-prefix)', () => {
  it('flas 3sg returns "u folka"', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'present', voice: 'middle-passive',
      person: 3, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('u folka');
  });

  it('flas 3pl returns "u folkan"', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'present', voice: 'middle-passive',
      person: 3, number: 'plural',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('u folkan');
  });

  it('punoj 1sg returns "u punuakam" — regression: buildSimpleCell-ignores-voice bug fix', () => {
    const r = conjugate(punoj.id, {
      mood: 'admirative', tense: 'present', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('u punuakam');
  });

  it('shoh 1sg returns "u pakam"', () => {
    const r = conjugate(shoh.id, {
      mood: 'admirative', tense: 'present', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('u pakam');
  });

  it('decomposition contains u voice-marker followed by active segments', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'present', voice: 'middle-passive',
      person: 3, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.decomposition[0]?.surface).toBe('u');
    expect(r.decomposition[0]?.role).toBe('voice-marker');
    expect(r.decomposition[0]?.meta?.particleName).toBe('u');
  });
});

describe('MP admirative imperfect (u-prefix)', () => {
  it('flas 1sg returns "u folkësha"', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('u folkësha');
  });

  it('flas 3sg returns "u folkësh"', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'middle-passive',
      person: 3, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('u folkësh');
  });

  it('punoj 1sg returns "u punuakësha"', () => {
    const r = conjugate(punoj.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('u punuakësha');
  });

  it('shoh 1sg returns "u pakësha"', () => {
    const r = conjugate(shoh.id, {
      mood: 'admirative', tense: 'imperfect', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('u pakësha');
  });
});

describe('MP admirative perfect (jam-aux compound)', () => {
  it('flas 1sg returns "qenkam folur"', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'perfect', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('qenkam folur');
  });

  it('punoj 1sg returns "qenkam punuar"', () => {
    const r = conjugate(punoj.id, {
      mood: 'admirative', tense: 'perfect', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('qenkam punuar');
  });

  it('jap 1sg returns "qenkam dhënë"', () => {
    const r = conjugate(jap.id, {
      mood: 'admirative', tense: 'perfect', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('qenkam dhënë');
  });
});

describe('MP admirative pluperfect (jam-aux compound on imperfect)', () => {
  it('flas 1sg returns "qenkësha folur"', () => {
    const r = conjugate(flas.id, {
      mood: 'admirative', tense: 'pluperfect', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('qenkësha folur');
  });

  it('shoh 3pl returns "qenkëshin parë"', () => {
    const r = conjugate(shoh.id, {
      mood: 'admirative', tense: 'pluperfect', voice: 'middle-passive',
      person: 3, number: 'plural',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('qenkëshin parë');
  });

  it('jam 1sg returns "qenkësha qenë"', () => {
    const r = conjugate(jam.id, {
      mood: 'admirative', tense: 'pluperfect', voice: 'middle-passive',
      person: 1, number: 'singular',
      polarity: 'affirmative', modality: 'declarative',
    });
    expect(r.form).toBe('qenkësha qenë');
  });
});
