/**
 * CI guard: every corpus verb whose `id` matches a parsed Husić cache
 * file at `.cache/husic/<id>.jsonl` SHALL include a `husic` source
 * citation in its `sources` field. Catches drift in either direction —
 * a new cache file without a citation, or an accidentally-removed
 * citation while the cache file still exists.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBS_DIR = join(__dirname, '..', '..', '..', 'data', 'verbs');
const HUSIC_CACHE_DIR = join(__dirname, '..', '..', '..', '.cache', 'husic');

const SKIP_FILES = new Set([
  'index.json',
  'version.json',
  'frequency.json',
  '_corpus.client.json',
]);

interface VerbEntryFile {
  id: string;
  sources: Array<{ source: string; reference: string }>;
}

describe('Husić citation completeness', () => {
  it('every corpus verb with a Husić cache file cites husic', () => {
    if (!existsSync(HUSIC_CACHE_DIR)) {
      // Cache dir absent in some CI configurations — treat as no-op.
      return;
    }
    const cacheIds = new Set(
      readdirSync(HUSIC_CACHE_DIR)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => f.replace(/\.jsonl$/, '')),
    );

    const missing: string[] = [];
    for (const file of readdirSync(VERBS_DIR)) {
      if (!file.endsWith('.json')) continue;
      if (SKIP_FILES.has(file)) continue;
      const entry = JSON.parse(
        readFileSync(join(VERBS_DIR, file), 'utf8'),
      ) as VerbEntryFile;
      if (!cacheIds.has(entry.id)) continue;
      const citesHusic = entry.sources.some((s) => s.source === 'husic');
      if (!citesHusic) missing.push(entry.id);
    }
    expect(
      missing,
      `verbs with cache files but no husic citation: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
