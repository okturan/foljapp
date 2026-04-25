import { describe, expect, it } from 'vitest';

import { toIpa, toIpaBracketed } from './ipa';

describe('toIpa — single-letter mapping', () => {
  it('punoj → punɔj', () => {
    expect(toIpa('punoj')).toBe('punɔj');
  });

  it('hap → hap', () => {
    expect(toIpa('hap')).toBe('hap');
  });

  it('pi → pi', () => {
    expect(toIpa('pi')).toBe('pi');
  });

  it('jam → jam', () => {
    expect(toIpa('jam')).toBe('jam');
  });

  it('bëj → bəj (ë → ə)', () => {
    expect(toIpa('bëj')).toBe('bəj');
  });

  it('mund → mund', () => {
    expect(toIpa('mund')).toBe('mund');
  });
});

describe('toIpa — digraphs', () => {
  it('shoh → ʃɔh (sh digraph)', () => {
    expect(toIpa('shoh')).toBe('ʃɔh');
  });

  it('thashë → θaʃə (th + sh)', () => {
    expect(toIpa('thashë')).toBe('θaʃə');
  });

  it('djeg → djɛɡ (no digraph collision)', () => {
    expect(toIpa('djeg')).toBe('djɛɡ');
  });

  it('dogja → dɔɟa (gj digraph)', () => {
    expect(toIpa('dogja')).toBe('dɔɟa');
  });

  it('marrë → marə (rr ≠ r)', () => {
    // rr → r (trill), single r → ɾ (tap)
    expect(toIpa('marrë')).toBe('marə');
  });

  it('rri → ri (rr at start)', () => {
    expect(toIpa('rri')).toBe('ri');
  });

  it('q → c (palatal stop)', () => {
    expect(toIpa('poq')).toBe('pɔc');
  });
});

describe('toIpa — special characters', () => {
  it('ç → tʃ', () => {
    expect(toIpa('ç')).toBe('tʃ');
  });

  it('ll → ɫ (velarized)', () => {
    expect(toIpa('mall')).toBe('maɫ');
  });
});

describe('toIpa — multi-word forms', () => {
  it('preserves word boundaries: kam punuar → kam punuaɾ', () => {
    expect(toIpa('kam punuar')).toBe('kam punuaɾ');
  });

  it('do të punoja preserves three words', () => {
    expect(toIpa('do të punoja')).toBe('dɔ tə punɔja');
  });

  it('jam larë', () => {
    expect(toIpa('jam larë')).toBe('jam laɾə');
  });
});

describe('toIpa — case insensitivity', () => {
  it('Punoj → punɔj (lowercased input)', () => {
    expect(toIpa('Punoj')).toBe('punɔj');
  });
});

describe('toIpaBracketed', () => {
  it('wraps the result in slashes', () => {
    expect(toIpaBracketed('punoj')).toBe('/punɔj/');
  });
});
