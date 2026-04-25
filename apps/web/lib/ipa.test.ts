import { describe, expect, it } from 'vitest';

import { toIpa, toIpaBracketed } from './ipa';

describe('toIpa — single-letter mapping with stress', () => {
  it('punoj → puˈnɔj (Class 1 -j lemma → final stress)', () => {
    expect(toIpa('punoj')).toBe('puˈnɔj');
  });

  it('hap → ˈhap (monosyllable)', () => {
    expect(toIpa('hap')).toBe('ˈhap');
  });

  it('pi → ˈpi (monosyllable)', () => {
    expect(toIpa('pi')).toBe('ˈpi');
  });

  it('jam → ˈjam (monosyllable)', () => {
    expect(toIpa('jam')).toBe('ˈjam');
  });

  it('bëj → ˈbəj (ë → ə, monosyllable)', () => {
    expect(toIpa('bëj')).toBe('ˈbəj');
  });

  it('mund → ˈmund (monosyllable)', () => {
    expect(toIpa('mund')).toBe('ˈmund');
  });
});

describe('toIpa — digraphs with stress', () => {
  it('shoh → ˈʃɔh (sh digraph, monosyllable)', () => {
    expect(toIpa('shoh')).toBe('ˈʃɔh');
  });

  it('thashë → ˈθaʃə (penult stress on first syllable)', () => {
    expect(toIpa('thashë')).toBe('ˈθaʃə');
  });

  it('djeg → ˈdjɛɡ (no digraph collision; monosyllable)', () => {
    expect(toIpa('djeg')).toBe('ˈdjɛɡ');
  });

  it('dogja → ˈdɔɟa (gj digraph, penult on first syllable)', () => {
    expect(toIpa('dogja')).toBe('ˈdɔɟa');
  });

  it('marrë → ˈmarə (rr ≠ r, penult)', () => {
    expect(toIpa('marrë')).toBe('ˈmarə');
  });

  it('rri → ˈri (rr at start, monosyllable)', () => {
    expect(toIpa('rri')).toBe('ˈri');
  });

  it('q → c (palatal stop): poq → ˈpɔc', () => {
    expect(toIpa('poq')).toBe('ˈpɔc');
  });
});

describe('toIpa — special characters', () => {
  it('ç → tʃ (single grapheme; toIpa treats as 0-syllable string)', () => {
    // `ç` alone has no vowel, so it's a degenerate case — emit as plain IPA
    expect(toIpa('ç')).toBe('tʃ');
  });

  it('ll → ɫ (velarized): mall → ˈmaɫ', () => {
    expect(toIpa('mall')).toBe('ˈmaɫ');
  });
});

describe('toIpa — multi-word forms', () => {
  it('kam punuar → ˈkam puˈnuaɾ (each word independently stressed)', () => {
    expect(toIpa('kam punuar')).toBe('ˈkam puˈnuaɾ');
  });

  it('do të punoja → ˈdɔ ˈtə puˈnɔja (three words, three stresses)', () => {
    expect(toIpa('do të punoja')).toBe('ˈdɔ ˈtə puˈnɔja');
  });

  it('jam larë → ˈjam ˈlaɾə', () => {
    expect(toIpa('jam larë')).toBe('ˈjam ˈlaɾə');
  });
});

describe('toIpa — admirative + MP voice forms', () => {
  it('folkësha → fɔlˈkəʃa (admirative imperfect 1sg)', () => {
    expect(toIpa('folkësha')).toBe('fɔlˈkəʃa');
  });

  it('paskësha folur → paˈskəʃa ˈfɔluɾ (admirative pluperfect 1sg)', () => {
    expect(toIpa('paskësha folur')).toBe('paˈskəʃa ˈfɔluɾ');
  });

  it('u folkësha → ˈu fɔlˈkəʃa (MP admirative imperfect 1sg)', () => {
    expect(toIpa('u folkësha')).toBe('ˈu fɔlˈkəʃa');
  });

  it('punohem → puˈnɔhɛm (MP indicative present 1sg)', () => {
    expect(toIpa('punohem')).toBe('puˈnɔhɛm');
  });

  it('punohesha → punɔˈhɛʃa (MP indicative imperfect 1sg)', () => {
    expect(toIpa('punohesha')).toBe('punɔˈhɛʃa');
  });
});

describe('toIpa — stress overrides', () => {
  it('është → əˈʃtə (registry override: 3sg of jam, final stress)', () => {
    expect(toIpa('është')).toBe('əˈʃtə');
  });

  it('per-call overrides win over the default', () => {
    // Hypothetical: force stress on the first syllable of `punoj`.
    expect(
      toIpa('punoj', { overrides: [{ form: 'punoj', stressedSyllableIndex: 0, source: 'test' }] }),
    ).toBe('ˈpunɔj');
  });
});

describe('toIpa — case insensitivity', () => {
  it('Punoj → puˈnɔj (lowercased input)', () => {
    expect(toIpa('Punoj')).toBe('puˈnɔj');
  });
});

describe('toIpaBracketed', () => {
  it('wraps the result in slashes with stress', () => {
    expect(toIpaBracketed('punoj')).toBe('/puˈnɔj/');
  });
});
