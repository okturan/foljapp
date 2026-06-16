import { describe, expect, it } from 'vitest';

import { lookupOpusExamples, normalizeOpusToken } from './opus-examples';

describe('opus examples lookup', () => {
  it('normalizes Albanian tokens', () => {
    expect(normalizeOpusToken(' PUNON ')).toBe('punon');
  });

  it('finds indexed examples for a generated form', () => {
    const lookup = lookupOpusExamples('punoj');

    expect(lookup.lookupForm).toBe('punoj');
    expect(lookup.examples.length).toBeGreaterThan(0);
    expect(lookup.examples[0]?.sq.toLocaleLowerCase('sq-AL')).toContain(
      'punoj',
    );
  });

  it('returns an honest empty state for unindexed rare forms', () => {
    const lookup = lookupOpusExamples('punuake');

    expect(lookup.lookupForm).toBe('punuake');
    expect(lookup.examples).toEqual([]);
  });
});
