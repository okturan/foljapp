import { describe, expect, it } from 'vitest';

import {
  apaForVerb,
  BIBLIOGRAPHY,
  bibtexForEngine,
  bibtexForSource,
  bibtexForVerb,
  plainForVerb,
} from './bibliography';

const samplePunoj = {
  id: 'punoj',
  lemma: 'punoj',
  translationEn: 'to work',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'puno', aorist: 'punua', participle: 'punuar' },
  sources: [{ source: 'husic' as const, reference: '1A' }],
} as never;

describe('BIBLIOGRAPHY', () => {
  it('contains at least seven canonical sources', () => {
    expect(BIBLIOGRAPHY.length).toBeGreaterThanOrEqual(7);
    const ids = BIBLIOGRAPHY.map((s) => s.id);
    for (const expected of [
      'husic-2002',
      'kadriu-2015',
      'uniparser-albanian',
      'kaikki-albanian',
      'ud-albanian-tsa',
      'kote-biba-2019',
      'wikipedia-albanian-morphology',
    ]) {
      expect(ids).toContain(expected);
    }
  });
});

describe('bibtexForSource', () => {
  it('emits a @book entry for Husić', () => {
    const s = BIBLIOGRAPHY.find((b) => b.id === 'husic-2002')!;
    const out = bibtexForSource(s);
    expect(out).toMatch(/^@book\{husic-2002,/);
    expect(out).toContain("Husi{\\'c}");
    expect(out).toContain('Albanian Verb Dictionary');
  });

  it('emits an @inproceedings entry for Kadriu', () => {
    const s = BIBLIOGRAPHY.find((b) => b.id === 'kadriu-2015')!;
    const out = bibtexForSource(s);
    expect(out).toMatch(/^@inproceedings\{kadriu-2015,/);
    expect(out).toContain('booktitle');
  });

  it('emits a @software entry for uniparser', () => {
    const s = BIBLIOGRAPHY.find((b) => b.id === 'uniparser-albanian')!;
    const out = bibtexForSource(s);
    expect(out).toMatch(/^@software\{uniparser-albanian,/);
  });
});

describe('bibtexForVerb', () => {
  it('emits a @misc entry citing the verb URL', () => {
    const out = bibtexForVerb(
      samplePunoj,
      'https://foljapp.local/verb/punoj',
    );
    expect(out).toMatch(/^@misc\{foljapp-punoj-/);
    expect(out).toContain('punoj — to work');
    expect(out).toContain('https://foljapp.local/verb/punoj');
    expect(out).toContain('{foljapp contributors}');
  });
});

describe('bibtexForEngine', () => {
  it('emits a @software entry with engine + corpus versions', () => {
    const out = bibtexForEngine('0.1.0', '0.1.0');
    expect(out).toMatch(/^@software\{foljapp-/);
    expect(out).toContain('engine-0.1.0 corpus-0.1.0');
  });
});

describe('apaForVerb / plainForVerb', () => {
  it('apa contains lemma, translation, URL', () => {
    const url = 'https://foljapp.local/verb/punoj';
    const out = apaForVerb(samplePunoj, url);
    expect(out).toContain('punoj');
    expect(out).toContain('to work');
    expect(out).toContain(url);
  });

  it('plain is one short line', () => {
    const out = plainForVerb(samplePunoj, 'https://foljapp.local/verb/punoj');
    expect(out).toContain('punoj');
    expect(out.split('\n')).toHaveLength(1);
  });
});
