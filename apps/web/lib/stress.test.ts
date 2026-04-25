import { describe, expect, it } from 'vitest';

import { placeStress } from './stress';
import { syllabify } from './syllabify';

describe('placeStress — default rule', () => {
  it('monosyllabic → 0', () => {
    expect(placeStress(syllabify('hap'))).toBe(0);
    expect(placeStress(syllabify('jam'))).toBe(0);
    expect(placeStress(syllabify('shoh'))).toBe(0);
  });

  it('polysyllabic non-j-final → penultimate', () => {
    expect(placeStress(syllabify('punuar'))).toBe(1); // pu.nu.aɾ → nu
    expect(placeStress(syllabify('thashë'))).toBe(0); // tha.shë → tha
    expect(placeStress(syllabify('punohesha'))).toBe(2); // pu.no.he.sha → he
  });

  it('penultimate on -kësha forms', () => {
    expect(placeStress(syllabify('folkësha'))).toBe(1); // fol.kë.sha (3 syll) → kë (idx 1)
    expect(placeStress(syllabify('punuakësha'))).toBe(3); // pu.nu.a.kë.sha (5 syll) → kë (idx 3)
  });
});

describe('placeStress — Class 1 -j heuristic', () => {
  it('punoj → final', () => {
    expect(placeStress(syllabify('punoj'))).toBe(1);
  });

  it('mësoj → final', () => {
    expect(placeStress(syllabify('mësoj'))).toBe(1);
  });

  it('kërkoj → final', () => {
    expect(placeStress(syllabify('kërkoj'))).toBe(1);
  });

  it('punohej (MP imperfect 3sg) → final', () => {
    expect(placeStress(syllabify('punohej'))).toBe(2); // pu.no.hej → hej
  });
});

describe('placeStress — overrides', () => {
  it('override wins over default', () => {
    expect(placeStress(syllabify('punoj'), { stressedSyllableIndex: 0 })).toBe(0);
  });

  it('out-of-range override is ignored', () => {
    // 2-syllable word, override index 5 → fall back to default (final via -j)
    expect(placeStress(syllabify('punoj'), { stressedSyllableIndex: 5 })).toBe(1);
  });
});

describe('placeStress — empty input', () => {
  it('returns -1 for no syllables', () => {
    expect(placeStress([])).toBe(-1);
  });
});
