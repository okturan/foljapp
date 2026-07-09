import { describe, expect, it } from 'vitest';

import {
  lookupStaticExamples,
  type StaticVerbExamples,
} from './static-examples';

const file: StaticVerbExamples = {
  v: 1,
  verbId: 'djeg',
  generatedAt: '2026-07-07T00:00:00.000Z',
  sigs: [
    'indicative.present.3sg.middle-passive.affirmative.declarative',
    'subjunctive.present.3sg.middle-passive.affirmative.declarative',
  ],
  corpora: ['MaCoCu-sq 1.0', 'Leipzig sq news'],
  domains: ['gazeta.example'],
  kinds: ['exact', 'variant'],
  genres: ['news'],
  qualities: [],
  targets: {
    digjet: [
      [0, 0, 0, 0, 0, -1, 90, 'https://gazeta.example/a', 'Zjarri digjet ende.'],
      [0, 1, -1, 1, -1, -1, 70, '', 'Drita digjet natën.'],
      [1, 0, 0, 0, 0, -1, 80, 'https://gazeta.example/b', 'Të digjet zemra.'],
    ],
  },
};

describe('lookupStaticExamples', () => {
  it('restricts to the requested signature first', () => {
    const rows = lookupStaticExamples(file, 'digjet', file.sigs[1] ?? '', 8);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.sentence).toBe('Të digjet zemra.');
    expect(rows[0]?.sourceType).toBe('local');
  });

  it('falls back to every row for the target key on a signature miss', () => {
    const rows = lookupStaticExamples(file, 'digjet', 'optative.nope', 8);

    expect(rows).toHaveLength(3);
  });

  it('decodes dictionary indexes, treating -1 as absent', () => {
    const [first, second] = lookupStaticExamples(file, 'digjet', null, 2);

    expect(first?.corpus).toBe('MaCoCu-sq 1.0');
    expect(first?.domain).toBe('gazeta.example');
    expect(first?.genre).toBe('news');
    expect(first?.url).toBe('https://gazeta.example/a');
    expect(first?.matchKind).toBe('exact');
    expect(second?.domain).toBeNull();
    expect(second?.genre).toBeNull();
    expect(second?.url).toBeNull();
    expect(second?.matchKind).toBe('variant');
  });

  it('applies the limit and handles unknown target keys', () => {
    expect(lookupStaticExamples(file, 'digjet', null, 1)).toHaveLength(1);
    expect(lookupStaticExamples(file, 'ndizet', null, 8)).toHaveLength(0);
  });
});
