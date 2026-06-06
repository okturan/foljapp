/**
 * One-time-and-maintenance script to add `husic` source citations to
 * corpus verbs whose `id` matches a `.cache/husic/<id>.jsonl` file
 * but currently lack the citation.
 *
 * Reference text (D1 of improve-source-citations):
 *   "Husić 2002 — parsed cache (.cache/husic/<id>.jsonl)"
 *
 * Re-runnable: when new verbs gain a Husić cache file (via
 * `parse-husic-pdf.py`), running this script appends the citation
 * automatically. The CI test in apps/web/lib/corpus-husic-citations.test.ts
 * fails until the citation is added, so drift is detected immediately.
 *
 * Run: `npx tsx scripts/add-husic-citations.ts`
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const VERBS_DIR = join(REPO_ROOT, 'data', 'verbs');
const HUSIC_CACHE_DIR = join(REPO_ROOT, '.cache', 'husic');

const SKIP_FILES = new Set([
  'index.json',
  'version.json',
  'frequency.json',
  '_corpus.client.json',
]);

interface VerbEntryFile {
  id: string;
  sources: Array<{ source: string; reference: string }>;
  [k: string]: unknown;
}

function main(): void {
  const cacheIds = new Set(
    readdirSync(HUSIC_CACHE_DIR)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => f.replace(/\.jsonl$/, '')),
  );

  console.log(`▶ ${cacheIds.size} Husić cache files found`);

  let modified = 0;
  let alreadyCited = 0;
  let noCacheNoCite = 0;

  for (const file of readdirSync(VERBS_DIR).sort()) {
    if (!file.endsWith('.json')) continue;
    if (SKIP_FILES.has(file)) continue;

    const path = join(VERBS_DIR, file);
    const raw = readFileSync(path, 'utf8');
    const entry = JSON.parse(raw) as VerbEntryFile;

    const hasCache = cacheIds.has(entry.id);
    const citesHusic = entry.sources.some((s) => s.source === 'husic');

    if (!hasCache) {
      if (!citesHusic) noCacheNoCite++;
      continue;
    }
    if (citesHusic) {
      alreadyCited++;
      continue;
    }

    // Cache exists, citation missing — add it.
    entry.sources.push({
      source: 'husic',
      reference: `Husić 2002 — parsed cache (.cache/husic/${entry.id}.jsonl)`,
    });

    writeFileSync(path, JSON.stringify(entry, null, 2) + '\n', 'utf8');
    modified++;
    console.log(`  + ${entry.id}`);
  }

  console.log();
  console.log(`✓ Modified ${modified} verbs`);
  console.log(`  (${alreadyCited} already cited husic — unchanged)`);
  console.log(`  (${noCacheNoCite} no cache + no citation — unchanged)`);
}

main();
