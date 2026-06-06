import type { VerbEntry } from '@foljapp/engine';
import { describe, expect, it } from 'vitest';

import {
  derivePast,
  deriveGerund,
  pickFirstSense,
  getEnglishForms,
} from './english-forms';

const make = (over: Partial<VerbEntry>): VerbEntry =>
  ({
    id: 'x',
    lemma: 'x',
    translationEn: 'to work',
    class: 1,
    auxiliary: 'kam',
    principalParts: { present: 'p', aorist: 'a', participle: 'pp' },
    sources: [{ source: 'manual', reference: 'test' }],
    ...over,
  }) as VerbEntry;

describe('pickFirstSense', () => {
  it('strips "to " and uses single sense', () => {
    expect(pickFirstSense('to work')).toBe('work');
  });
  it('takes first sense from " / "', () => {
    expect(pickFirstSense('to want / to love')).toBe('want');
  });
  it('handles non-"to "-prefixed translations', () => {
    expect(pickFirstSense('must / need')).toBe('must');
  });
});

describe('derivePast', () => {
  it('regular: work → worked', () => {
    expect(derivePast('work')).toBe('worked');
  });
  it('e-final: love → loved', () => {
    expect(derivePast('love')).toBe('loved');
  });
  it('consonant+y: try → tried', () => {
    expect(derivePast('try')).toBe('tried');
  });
  it('consonant+y: study → studied', () => {
    expect(derivePast('study')).toBe('studied');
  });
  it('vowel+y: play → played', () => {
    expect(derivePast('play')).toBe('played');
  });
  it('CVC monosyllable: stop → stopped', () => {
    expect(derivePast('stop')).toBe('stopped');
  });
  it('CVC monosyllable: plan → planned', () => {
    expect(derivePast('plan')).toBe('planned');
  });
  it('CVC monosyllable: hop → hopped', () => {
    expect(derivePast('hop')).toBe('hopped');
  });
  it('non-doubling consonant: bow → bowed (w not doubled)', () => {
    expect(derivePast('bow')).toBe('bowed');
  });
  it('polysyllabic skip: visit → visited (no doubling)', () => {
    expect(derivePast('visit')).toBe('visited');
  });
});

describe('deriveGerund', () => {
  it('regular: work → working', () => {
    expect(deriveGerund('work')).toBe('working');
  });
  it('silent-e: love → loving (drop e)', () => {
    expect(deriveGerund('love')).toBe('loving');
  });
  it('-ee keeps both: see → seeing', () => {
    expect(deriveGerund('see')).toBe('seeing');
  });
  it('-ie → ying: lie → lying', () => {
    expect(deriveGerund('lie')).toBe('lying');
  });
  it('CVC: stop → stopping', () => {
    expect(deriveGerund('stop')).toBe('stopping');
  });
  it('y-final: try → trying', () => {
    expect(deriveGerund('try')).toBe('trying');
  });
});

describe('getEnglishForms', () => {
  it('regular verb auto-derives', () => {
    const v = make({ translationEn: 'to work' });
    expect(getEnglishForms(v)).toEqual({
      base: 'work',
      past: 'worked',
      participle: 'worked',
      gerund: 'working',
    });
  });
  it('e-final verb', () => {
    const v = make({ translationEn: 'to love' });
    expect(getEnglishForms(v)).toEqual({
      base: 'love',
      past: 'loved',
      participle: 'loved',
      gerund: 'loving',
    });
  });
  it('irregular verb from registry: see', () => {
    const v = make({ translationEn: 'to see' });
    expect(getEnglishForms(v)).toEqual({
      base: 'see',
      past: 'saw',
      participle: 'seen',
      gerund: 'seeing',
    });
  });
  it('irregular verb from registry: eat', () => {
    const v = make({ translationEn: 'to eat' });
    expect(getEnglishForms(v)).toEqual({
      base: 'eat',
      past: 'ate',
      participle: 'eaten',
      gerund: 'eating',
    });
  });
  it('irregular verb from registry: give', () => {
    const v = make({ translationEn: 'to give' });
    expect(getEnglishForms(v)).toEqual({
      base: 'give',
      past: 'gave',
      participle: 'given',
      gerund: 'giving',
    });
  });
  it('per-verb override: jam → be', () => {
    const v = make({
      translationEn: 'to be',
      englishForms: {
        base: 'be',
        past: 'was',
        participle: 'been',
        gerund: 'being',
      },
    });
    expect(getEnglishForms(v)).toEqual({
      base: 'be',
      past: 'was',
      participle: 'been',
      gerund: 'being',
    });
  });
  it('partial override: just base', () => {
    const v = make({
      translationEn: 'to look for / to ask',
      englishForms: { base: 'look for' },
    });
    const result = getEnglishForms(v);
    expect(result.base).toBe('look for');
    expect(result.gerund).toBe('looking for');
    expect(result.past).toBe('looked for');
  });
  it('multi-sense translationEn picks first sense', () => {
    const v = make({ translationEn: 'to want / to love' });
    expect(getEnglishForms(v).base).toBe('want');
  });
  it('compound with irregular head: forget about', () => {
    const v = make({
      translationEn: 'to forget about',
    });
    const r = getEnglishForms(v);
    expect(r.base).toBe('forget about');
    expect(r.past).toBe('forgot about');
    expect(r.participle).toBe('forgotten about');
    expect(r.gerund).toBe('forgetting about');
  });
});
