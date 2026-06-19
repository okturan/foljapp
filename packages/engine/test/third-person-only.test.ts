import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate, table } from '../src/conjugate.js';
import { UnsupportedCellError } from '../src/errors.js';
import type { VerbEntry } from '../src/types.js';

import { fixtures } from './fixtures.js';

const defective: VerbEntry = {
  id: 'defective',
  lemma: 'defective',
  translationEn: 'defective sentinel',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'duh', aorist: 'desh', participle: 'dashur' },
  sources: [{ source: 'manual', reference: 'test fixture' }],
  flags: { thirdPersonOnly: true, noMiddlePassive: true },
  dialect: 'tosk',
};

const mpThirdPersonOnly: VerbEntry = {
  id: 'mp-third-only',
  lemma: 'mp-third-only',
  translationEn: 'middle passive third-person-only sentinel',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'çalo', aorist: 'çalua', participle: 'çaluar' },
  sources: [{ source: 'manual', reference: 'test fixture' }],
  flags: { middlePassiveThirdPersonOnly: true },
  dialect: 'tosk',
};

beforeAll(() => {
  configure([...fixtures, defective, mpThirdPersonOnly], '0.1.5');
});

describe('thirdPersonOnly', () => {
  it('throws for finite first and second person cells', () => {
    for (const [person, number] of [
      [1, 'singular'],
      [2, 'singular'],
      [1, 'plural'],
      [2, 'plural'],
    ] as const) {
      expect(() =>
        conjugate('defective', {
          mood: 'indicative',
          tense: 'present',
          voice: 'active',
          person,
          number,
          polarity: 'affirmative',
          modality: 'declarative',
        }),
      ).toThrow(UnsupportedCellError);
    }
  });

  it('keeps third person and non-finite forms available', () => {
    expect(
      conjugate('defective', {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 3,
        number: 'singular',
        polarity: 'affirmative',
        modality: 'declarative',
      }).form,
    ).toBeTruthy();
    expect(conjugate('defective', { mood: 'non-finite', form: 'participle' }).form).toBe(
      'dashur',
    );
  });

  it('table omits unsupported finite cells', () => {
    const present = table('defective').indicative.present as Record<string, unknown>;
    expect(present['1sg.active']).toBeUndefined();
    expect(present['2pl.active']).toBeUndefined();
    expect(present['3sg.active']).toBeDefined();
    expect(present['3pl.active']).toBeDefined();
    expect(present['3sg.middle-passive']).toBeUndefined();
  });
});

describe('middlePassiveThirdPersonOnly', () => {
  it('keeps active first and second person cells available', () => {
    expect(
      conjugate('mp-third-only', {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'affirmative',
        modality: 'declarative',
      }).form,
    ).toBe('çaloj');
  });

  it('throws for finite first and second person middle-passive cells', () => {
    for (const [person, number] of [
      [1, 'singular'],
      [2, 'singular'],
      [1, 'plural'],
      [2, 'plural'],
    ] as const) {
      expect(() =>
        conjugate('mp-third-only', {
          mood: 'indicative',
          tense: 'present',
          voice: 'middle-passive',
          person,
          number,
          polarity: 'affirmative',
          modality: 'declarative',
        }),
      ).toThrow(UnsupportedCellError);
    }
  });

  it('keeps third-person middle-passive cells available', () => {
    expect(
      conjugate('mp-third-only', {
        mood: 'indicative',
        tense: 'present',
        voice: 'middle-passive',
        person: 3,
        number: 'singular',
        polarity: 'affirmative',
        modality: 'declarative',
      }).form,
    ).toBe('çalohet');
  });

  it('table omits unsupported middle-passive cells only', () => {
    const present = table('mp-third-only').indicative.present as Record<string, unknown>;
    expect(present['1sg.active']).toBeDefined();
    expect(present['1sg.middle-passive']).toBeUndefined();
    expect(present['3sg.middle-passive']).toBeDefined();
  });
});
