/**
 * Build pipeline: validate every verb JSON entry, gate against engine
 * round-trip, and emit data/verbs/index.json + version.json.
 *
 * Run: `npx tsx scripts/build-corpus.ts [--frozen-time]`
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { verbEntrySchema, type VerbEntry } from '@foljapp/data';
import {
  configure,
  table,
  UnsupportedCellError,
  VERSION as ENGINE_VERSION,
  type VerbEntry as EngineVerbEntry,
} from '@foljapp/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const VERBS_DIR = join(REPO_ROOT, 'data', 'verbs');

/**
 * Bump this constant when the corpus shape changes (additive or
 * breaking). The same value is written to `data/verbs/version.json`
 * and consumed by both the server-side and client-side corpus loaders.
 */
const CORPUS_VERSION = '0.1.7';

interface BuildOptions {
  frozenTime: boolean;
}

function parseArgs(): BuildOptions {
  return {
    frozenTime: process.argv.includes('--frozen-time'),
  };
}

function loadVerbFiles(): { id: string; entry: VerbEntry; file: string }[] {
  const files = readdirSync(VERBS_DIR)
    .filter(
      (f) =>
        f.endsWith('.json') &&
        f !== 'index.json' &&
        f !== 'version.json' &&
        f !== 'frequency.json' &&
        f !== '_corpus.client.json',
    )
    .sort();

  const entries: { id: string; entry: VerbEntry; file: string }[] = [];

  for (const file of files) {
    const path = join(VERBS_DIR, file);
    const raw = readFileSync(path, 'utf8');
    const json: unknown = JSON.parse(raw);
    const result = verbEntrySchema.safeParse(json);

    if (!result.success) {
      console.error(`✗ ${file} — schema validation failed:`);
      console.error(result.error.format());
      process.exit(1);
    }

    const entry = result.data;
    const expectedFilename = `${entry.id}.json`;
    if (file !== expectedFilename) {
      console.error(
        `✗ ${file} — filename does not match id "${entry.id}" (expected ${expectedFilename})`,
      );
      process.exit(1);
    }

    entries.push({ id: entry.id, entry, file });
  }

  return entries;
}

function checkUniqueness(entries: { id: string; entry: VerbEntry; file: string }[]): void {
  const ids = new Map<string, string>();
  const lemmas = new Map<string, string>();

  for (const { id, entry, file } of entries) {
    if (ids.has(id)) {
      console.error(`✗ duplicate id "${id}" in ${file} (also in ${ids.get(id)})`);
      process.exit(1);
    }
    if (lemmas.has(entry.lemma)) {
      console.error(
        `✗ duplicate lemma "${entry.lemma}" in ${file} (also in ${lemmas.get(entry.lemma)})`,
      );
      process.exit(1);
    }
    ids.set(id, file);
    lemmas.set(entry.lemma, file);
  }
}

function roundTripGate(entries: { entry: VerbEntry }[]): void {
  const corpus: EngineVerbEntry[] = entries.map(({ entry }) => entry as EngineVerbEntry);
  configure(corpus, '0.1.0');

  for (const { entry } of entries) {
    try {
      const t = table(entry.id);
      const sanityCell = entry.flags?.thirdPersonOnly ? '3sg.active' : '1sg.active';
      const presentActive =
        (t.indicative.present as Record<string, unknown>)[sanityCell];
      if (presentActive === undefined) {
        console.error(
          `✗ engine round-trip: ${entry.id} produced no indicative present ${sanityCell} form`,
        );
        process.exit(1);
      }
    } catch (err) {
      if (err instanceof UnsupportedCellError) {
        // Expected for some cells; engine.table() handles internally
        continue;
      }
      console.error(`✗ engine round-trip threw for ${entry.id}:`, err);
      process.exit(1);
    }
  }
}

function emitClientBundle(entries: { entry: VerbEntry }[]): void {
  const payload = entries
    .map(({ entry }) => entry)
    .sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(
    join(VERBS_DIR, '_corpus.client.json'),
    JSON.stringify(payload, null, 2) + '\n',
    'utf8',
  );
}

function emitIndex(entries: { entry: VerbEntry }[]): void {
  const index = entries
    .map(({ entry }) => ({
      id: entry.id,
      lemma: entry.lemma,
      translationEn: entry.translationEn,
      class: entry.class,
      auxiliary: entry.auxiliary,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(
    join(VERBS_DIR, 'index.json'),
    JSON.stringify(index, null, 2) + '\n',
    'utf8',
  );
}

function emitVersion(opts: BuildOptions): void {
  const generatedAt = opts.frozenTime
    ? '2026-04-25T00:00:00.000Z'
    : new Date().toISOString();

  writeFileSync(
    join(VERBS_DIR, 'version.json'),
    JSON.stringify(
      {
        version: CORPUS_VERSION,
        generatedAt,
        engineVersion: ENGINE_VERSION,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

function main(): void {
  const opts = parseArgs();

  console.log('▶ Loading verb files...');
  const entries = loadVerbFiles();
  console.log(`  loaded ${entries.length} entries`);

  console.log('▶ Checking uniqueness...');
  checkUniqueness(entries);
  console.log('  ok');

  console.log('▶ Engine round-trip gate...');
  roundTripGate(entries);
  console.log('  ok');

  console.log('▶ Emitting _corpus.client.json...');
  emitClientBundle(entries);
  console.log(`  ok (${entries.length} entries)`);

  console.log('▶ Emitting index.json...');
  emitIndex(entries);
  console.log('  ok');

  console.log('▶ Emitting version.json...');
  emitVersion(opts);
  console.log('  ok');

  console.log(`✓ Build complete — ${entries.length} verbs corpus version ${CORPUS_VERSION}`);
}

main();
