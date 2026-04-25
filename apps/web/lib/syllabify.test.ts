import { describe, expect, it } from 'vitest';

import { syllabify } from './syllabify';

describe('syllabify — open + closed syllables', () => {
  it('punoj → [pu, noj]', () => {
    const result = syllabify('punoj');
    expect(result.map((s) => s.surface)).toEqual(['pu', 'noj']);
    expect(result[0]).toEqual(expect.objectContaining({ onset: 'p', nucleus: 'u', coda: '' }));
    expect(result[1]).toEqual(expect.objectContaining({ onset: 'n', nucleus: 'o', coda: 'j' }));
  });

  it('hap → [hap] (single syllable)', () => {
    expect(syllabify('hap').map((s) => s.surface)).toEqual(['hap']);
  });

  it('pi → [pi] (open monosyllable)', () => {
    expect(syllabify('pi').map((s) => s.surface)).toEqual(['pi']);
  });
});

describe('syllabify — initial vowel', () => {
  it('është → [ë, shtë]', () => {
    const result = syllabify('është');
    expect(result.map((s) => s.surface)).toEqual(['ë', 'shtë']);
    expect(result[0]).toEqual(expect.objectContaining({ onset: '', nucleus: 'ë', coda: '' }));
    expect(result[1]).toEqual(expect.objectContaining({ onset: 'sht', nucleus: 'ë', coda: '' }));
  });
});

describe('syllabify — digraph atomicity', () => {
  it('shoh → [shoh] (sh digraph stays together)', () => {
    const result = syllabify('shoh');
    expect(result.map((s) => s.surface)).toEqual(['shoh']);
    expect(result[0]?.onset).toBe('sh');
    expect(result[0]?.coda).toBe('h');
  });

  it('thashë → [tha, shë] (th + sh digraphs stay together)', () => {
    const result = syllabify('thashë');
    expect(result.map((s) => s.surface)).toEqual(['tha', 'shë']);
  });

  it('marrë → [ma, rrë] (rr digraph stays at next-syllable onset)', () => {
    const result = syllabify('marrë');
    expect(result.map((s) => s.surface)).toEqual(['ma', 'rrë']);
    expect(result[1]?.onset).toBe('rr');
  });
});

describe('syllabify — admirative imperfect / MP forms', () => {
  it('folkësha → [fol, kë, sha]', () => {
    expect(syllabify('folkësha').map((s) => s.surface)).toEqual(['fol', 'kë', 'sha']);
  });

  it('punohesha → [pu, no, he, sha]', () => {
    expect(syllabify('punohesha').map((s) => s.surface)).toEqual(['pu', 'no', 'he', 'sha']);
  });

  it('punohem → [pu, no, hem]', () => {
    expect(syllabify('punohem').map((s) => s.surface)).toEqual(['pu', 'no', 'hem']);
  });
});

describe('syllabify — empty / degenerate', () => {
  it('"" → []', () => {
    expect(syllabify('')).toEqual([]);
  });
});
