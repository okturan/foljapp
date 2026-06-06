import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { FREQUENCY, getFrequency, tierRank } from './frequency';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBS_DIR = join(__dirname, '..', '..', '..', 'data', 'verbs');

const ALLOWED_TIERS = new Set(['core', 'common', 'uncommon', 'rare']);

describe('frequency', () => {
  it('every corpus verb has a frequency entry with a valid tier', () => {
    const ids = readdirSync(VERBS_DIR)
      .filter(
        (f) =>
          f.endsWith('.json') &&
          f !== 'index.json' &&
          f !== 'version.json' &&
          f !== 'frequency.json' &&
          f !== '_corpus.client.json',
      )
      .map((f) => f.replace(/\.json$/, ''));
    expect(ids.length).toBeGreaterThanOrEqual(20);
    for (const id of ids) {
      const entry = getFrequency(id);
      expect(entry, `expected frequency entry for "${id}"`).toBeDefined();
      expect(ALLOWED_TIERS.has(entry!.tier)).toBe(true);
    }
  });

  it('jam is core', () => {
    expect(getFrequency('jam')?.tier).toBe('core');
  });

  it('djeg is rare or uncommon', () => {
    const tier = getFrequency('djeg')?.tier;
    expect(tier === 'rare' || tier === 'uncommon').toBe(true);
  });

  it('tierRank gives ordinal sort order', () => {
    expect(tierRank('core')).toBeLessThan(tierRank('common'));
    expect(tierRank('common')).toBeLessThan(tierRank('uncommon'));
    expect(tierRank('uncommon')).toBeLessThan(tierRank('rare'));
  });

  it('FREQUENCY object is keyed by verb id', () => {
    expect(FREQUENCY.jam?.tier).toBe('core');
    expect(FREQUENCY.punoj?.tier).toBe('common');
  });
});
