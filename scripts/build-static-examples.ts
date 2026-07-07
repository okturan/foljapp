/**
 * Export retained corpus examples into static per-verb assets.
 *
 * Reads `.cache/corpus-local-full.sqlite` (the local corpus lab's
 * retained-examples DB), keeps the top examples per generated target with
 * the same public-example quality filter as `apps/web/app/api/examples`,
 * and writes one minified JSON per verb to `apps/web/public/examples/`
 * plus an `index.json` manifest. The output is committed so the deployed
 * playground can show corpus examples without the local DB.
 *
 * Run:
 *   npm run build:static-examples
 *   npm run build:static-examples -- --frozen-time   # reproducible output
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'apps', 'web', 'public', 'examples');
const FROZEN_TIME = '2026-07-07T00:00:00.000Z';
// 3 matches the scan-time retention cap (--max-per-target=3), so the assets
// carry everything the retained DB has for each target.
const MAX_PER_TARGET = 3;

interface Row {
  verb_id: string;
  target_key: string;
  signature: string;
  corpus: string;
  url: string;
  domain: string;
  genre: string;
  quality: string;
  sentence: string;
  match_kind: string;
  score: number;
}

// tuple: [sigIdx, corpusIdx, domainIdx, kindIdx, genreIdx, qualityIdx, score, url, sentence]
type ExampleTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  string,
  string,
];

interface VerbFile {
  v: 1;
  verbId: string;
  generatedAt: string;
  sigs: string[];
  corpora: string[];
  domains: string[];
  kinds: string[];
  genres: string[];
  qualities: string[];
  targets: Record<string, ExampleTuple[]>;
}

function valueAfter(prefix: string): string | undefined {
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}

function dbPath(): string {
  return (
    valueAfter('--db=') ??
    process.env.FOLJAPP_LOCAL_EXAMPLES_DB ??
    join(REPO_ROOT, '.cache', 'corpus-local-full.sqlite')
  );
}

function sqliteBin(): string {
  return process.env.FOLJAPP_SQLITE3_BIN ?? '/usr/bin/sqlite3';
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function runSqliteJson<T>(path: string, sql: string): T[] {
  const output = execFileSync(sqliteBin(), ['-json', path, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  }).trim();
  if (!output) return [];
  return JSON.parse(output) as T[];
}

// Must stay in sync with the public-example filter in
// apps/web/app/api/examples/route.ts (localExamples).
const PUBLIC_EXAMPLE_WHERE = `
  s.flags_json NOT LIKE '%reference_prose%' AND
  s.flags_json NOT LIKE '%inflection_list%' AND
  s.flags_json NOT LIKE '%adult_or_spam%' AND
  s.sentence NOT LIKE '%morfologjik%' AND
  s.sentence NOT LIKE '%paskajor%' AND
  s.sentence NOT LIKE '%lidhor%' AND
  s.sentence NOT LIKE '%format e së ardhmes%' AND
  NOT (
    s.sentence LIKE '%e kështu me radhë%' AND
    (length(s.sentence) - length(replace(s.sentence, ',', ''))) >= 3 AND
    (length(s.sentence) - length(replace(s.sentence, ';', ''))) >= 1
  )
`;

function verbRows(path: string, verbId: string): Row[] {
  return runSqliteJson<Row>(
    path,
    `
    WITH ranked AS (
      SELECT
        t.verb_id AS verb_id,
        o.target_key AS target_key,
        o.signature AS signature,
        r.title AS corpus,
        coalesce(s.url, '') AS url,
        coalesce(s.domain, '') AS domain,
        coalesce(s.genre, '') AS genre,
        coalesce(s.quality, '') AS quality,
        s.sentence AS sentence,
        o.match_kind AS match_kind,
        o.score AS score,
        ROW_NUMBER() OVER (
          PARTITION BY o.target_id
          ORDER BY o.score DESC, length(s.sentence) ASC, s.id ASC
        ) AS rn
      FROM occurrences o
      JOIN targets t ON t.id = o.target_id
      JOIN sentences s ON s.id = o.sentence_id
      JOIN resources r ON r.id = s.resource_id
      WHERE t.verb_id = ${sqlString(verbId)} AND ${PUBLIC_EXAMPLE_WHERE}
    )
    SELECT verb_id, target_key, signature, corpus, url, domain, genre,
           quality, sentence, match_kind, score
    FROM ranked
    WHERE rn <= ${MAX_PER_TARGET}
    ORDER BY target_key ASC, signature ASC, score DESC,
             length(sentence) ASC, sentence ASC
  `,
  );
}

class Dictionary {
  private indexes = new Map<string, number>();
  readonly values: string[] = [];

  index(value: string): number {
    const existing = this.indexes.get(value);
    if (existing !== undefined) return existing;
    const index = this.values.length;
    this.indexes.set(value, index);
    this.values.push(value);
    return index;
  }
}

function buildVerbFile(
  verbId: string,
  rows: Row[],
  generatedAt: string,
): VerbFile {
  const sigs = new Dictionary();
  const corpora = new Dictionary();
  const domains = new Dictionary();
  const kinds = new Dictionary();
  const genres = new Dictionary();
  const qualities = new Dictionary();
  const targets: Record<string, ExampleTuple[]> = {};

  for (const row of rows) {
    const bucket = (targets[row.target_key] ??= []);
    bucket.push([
      sigs.index(row.signature),
      corpora.index(row.corpus),
      row.domain ? domains.index(row.domain) : -1,
      kinds.index(row.match_kind),
      row.genre ? genres.index(row.genre) : -1,
      row.quality ? qualities.index(row.quality) : -1,
      row.score,
      row.url,
      row.sentence,
    ]);
  }

  return {
    v: 1,
    verbId,
    generatedAt,
    sigs: sigs.values,
    corpora: corpora.values,
    domains: domains.values,
    kinds: kinds.values,
    genres: genres.values,
    qualities: qualities.values,
    targets,
  };
}

function main(): void {
  const path = dbPath();
  if (!existsSync(path)) {
    throw new Error(`retained-examples DB not found: ${path}`);
  }
  const generatedAt = process.argv.includes('--frozen-time')
    ? FROZEN_TIME
    : new Date().toISOString();

  const verbIds = runSqliteJson<{ verb_id: string }>(
    path,
    'SELECT DISTINCT verb_id FROM targets ORDER BY verb_id ASC',
  ).map((row) => row.verb_id);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const manifest: Record<string, { targets: number; rows: number }> = {};
  let totalRows = 0;
  let totalBytes = 0;
  let largest = { verbId: '', bytes: 0 };

  for (const verbId of verbIds) {
    const rows = verbRows(path, verbId);
    const file = buildVerbFile(verbId, rows, generatedAt);
    const json = JSON.stringify(file) + '\n';
    writeFileSync(join(OUT_DIR, `${verbId}.json`), json, 'utf8');

    manifest[verbId] = {
      targets: Object.keys(file.targets).length,
      rows: rows.length,
    };
    totalRows += rows.length;
    totalBytes += Buffer.byteLength(json);
    if (Buffer.byteLength(json) > largest.bytes) {
      largest = { verbId, bytes: Buffer.byteLength(json) };
    }
  }

  writeFileSync(
    join(OUT_DIR, 'index.json'),
    JSON.stringify({ v: 1, generatedAt, verbs: manifest }) + '\n',
    'utf8',
  );

  console.log(
    `Wrote ${verbIds.length} verb file(s) to ${OUT_DIR}: ` +
      `${totalRows.toLocaleString()} example row(s), ` +
      `${(totalBytes / 1024 / 1024).toFixed(1)}MB total, ` +
      `largest ${largest.verbId} at ${(largest.bytes / 1024).toFixed(0)}KB`,
  );
}

main();
