import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  generatedSearchTarget,
  normalizeSearchKey,
  type ConjugateOptions,
  type Mood,
  type NonFiniteForm,
  type Tense,
} from '@foljapp/engine';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { lookupOpusExamples } from '@/lib/opus-examples';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ApiExample {
  id: string;
  sourceType: 'local' | 'parallel';
  resourceId: string;
  corpus: string;
  title: string | null;
  url: string | null;
  domain: string | null;
  genre: string | null;
  quality: string | null;
  sentence: string;
  translation: string | null;
  matchKind: string;
  score: number;
  flags: string[];
  cellLabel: string | null;
  ancQuery: string | null;
}

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (
      existsSync(join(dir, 'package.json')) &&
      existsSync(join(dir, 'data', 'corpora', 'resources.json'))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), '..', '..');
}

function localDbPath(): string {
  return (
    process.env.FOLJAPP_LOCAL_EXAMPLES_DB ??
    join(findRepoRoot(), '.cache', 'corpus-local-full.sqlite')
  );
}

function sqliteBin(): string {
  return process.env.FOLJAPP_SQLITE3_BIN ?? '/usr/bin/sqlite3';
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function ftsPhrase(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseOptions(url: URL): ConjugateOptions | null {
  const mood = url.searchParams.get('mood') as Mood | null;
  if (!mood) return null;

  if (mood === 'non-finite') {
    return {
      mood,
      form: (url.searchParams.get('nonFiniteForm') ??
        'participle') as NonFiniteForm,
    };
  }

  const personRaw = Number(url.searchParams.get('person') ?? '0');
  const number = url.searchParams.get('number');
  if (![1, 2, 3].includes(personRaw)) return null;
  if (number !== 'singular' && number !== 'plural') return null;

  return {
    mood,
    tense: (url.searchParams.get('tense') ?? 'present') as Tense,
    voice:
      (url.searchParams.get('voice') as ConjugateOptions['voice'] | null) ??
      'active',
    person: personRaw as 1 | 2 | 3,
    number,
    polarity:
      (url.searchParams.get('polarity') as
        | ConjugateOptions['polarity']
        | null) ?? 'affirmative',
    modality:
      (url.searchParams.get('modality') as
        | ConjugateOptions['modality']
        | null) ?? 'declarative',
  };
}

function runSqliteJson<T>(dbPath: string, sql: string): T[] {
  const output = execFileSync(sqliteBin(), ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8,
  }).trim();
  if (!output) return [];
  return JSON.parse(output) as T[];
}

function localExamples(
  dbPath: string,
  targetKey: string,
  signature: string | null,
  limit: number,
): ApiExample[] {
  const baseSelect = `
    SELECT
      'local-' || o.id AS id,
      'local' AS sourceType,
      r.id AS resourceId,
      r.title AS corpus,
      s.title AS title,
      s.url AS url,
      s.domain AS domain,
      s.genre AS genre,
      s.quality AS quality,
      s.sentence AS sentence,
      NULL AS translation,
      o.match_kind AS matchKind,
      o.score AS score,
      s.flags_json AS flagsJson,
      t.cell_label AS cellLabel,
      t.anc_query AS ancQuery
    FROM occurrences o
    JOIN targets t ON t.id = o.target_id
    JOIN sentences s ON s.id = o.sentence_id
    JOIN resources r ON r.id = s.resource_id
  `;

  const exactWhere = signature
    ? `o.target_key = ${sqlString(targetKey)} AND o.signature = ${sqlString(signature)}`
    : `o.target_key = ${sqlString(targetKey)}`;
  const publicExampleWhere = `
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
  const exactSql = `
    ${baseSelect}
    WHERE ${exactWhere} AND ${publicExampleWhere}
    ORDER BY o.score DESC, length(s.sentence) ASC, s.id ASC
    LIMIT ${limit}
  `;
  const exactRows = runSqliteJson<Record<string, unknown>>(dbPath, exactSql);
  const rows =
    exactRows.length > 0 || !signature
      ? exactRows
      : runSqliteJson<Record<string, unknown>>(
          dbPath,
          `
          ${baseSelect}
          WHERE o.target_key = ${sqlString(targetKey)}
            AND ${publicExampleWhere}
          ORDER BY o.score DESC, length(s.sentence) ASC, s.id ASC
          LIMIT ${limit}
        `,
        );

  if (rows.length > 0) return rows.map(apiExampleFromSqliteRow);

  const ftsSql = `
    SELECT
      'local-fts-' || s.id AS id,
      'local' AS sourceType,
      r.id AS resourceId,
      r.title AS corpus,
      s.title AS title,
      s.url AS url,
      s.domain AS domain,
      s.genre AS genre,
      s.quality AS quality,
      s.sentence AS sentence,
      NULL AS translation,
      'fts_phrase' AS matchKind,
      40 - bm25(sentence_fts) AS score,
      s.flags_json AS flagsJson,
      NULL AS cellLabel,
      NULL AS ancQuery
    FROM sentence_fts
    JOIN sentences s ON s.id = sentence_fts.rowid
    JOIN resources r ON r.id = s.resource_id
    WHERE sentence_fts MATCH ${sqlString(ftsPhrase(targetKey))}
      AND ${publicExampleWhere}
    ORDER BY bm25(sentence_fts), length(s.sentence) ASC, s.id ASC
    LIMIT ${limit}
  `;
  return runSqliteJson<Record<string, unknown>>(dbPath, ftsSql).map(
    apiExampleFromSqliteRow,
  );
}

function apiExampleFromSqliteRow(row: Record<string, unknown>): ApiExample {
  let flags: string[] = [];
  if (typeof row.flagsJson === 'string') {
    try {
      flags = JSON.parse(row.flagsJson) as string[];
    } catch {
      flags = [];
    }
  }

  return {
    id: String(row.id),
    sourceType: row.sourceType as 'local',
    resourceId: String(row.resourceId),
    corpus: String(row.corpus),
    title: typeof row.title === 'string' ? row.title : null,
    url: typeof row.url === 'string' ? row.url : null,
    domain: typeof row.domain === 'string' ? row.domain : null,
    genre: typeof row.genre === 'string' ? row.genre : null,
    quality: typeof row.quality === 'string' ? row.quality : null,
    sentence: String(row.sentence),
    translation: null,
    matchKind: String(row.matchKind),
    score: Number(row.score),
    flags,
    cellLabel: typeof row.cellLabel === 'string' ? row.cellLabel : null,
    ancQuery: typeof row.ancQuery === 'string' ? row.ancQuery : null,
  };
}

function opusFallbackExamples(form: string, limit: number): ApiExample[] {
  const lookup = lookupOpusExamples(form);
  return lookup.examples.slice(0, limit).map((example, index) => ({
    id: `opus-${example.corpus}-${example.sentenceNumber}-${index}`,
    sourceType: 'parallel',
    resourceId: 'opus-en-sq-moses-latest',
    corpus: example.corpus,
    title: null,
    url: example.opusUrl,
    domain: 'opus.nlpl.eu',
    genre: null,
    quality: null,
    sentence: example.sq,
    translation: example.en,
    matchKind: 'opus_parallel',
    score: 55,
    flags: [],
    cellLabel: null,
    ancQuery: null,
  }));
}

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const surface =
    url.searchParams.get('surface') ?? url.searchParams.get('form') ?? '';
  const targetKey = normalizeSearchKey(surface);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '8') || 8, 20);
  const options = parseOptions(url);
  const generatedTarget =
    surface && options ? generatedSearchTarget(surface, options) : null;
  const lookupKey = generatedTarget?.targetKey ?? targetKey;
  const signature = generatedTarget?.signature ?? null;
  const dbPath = localDbPath();
  const dbAvailable = existsSync(dbPath);
  const examples: ApiExample[] = [];
  let localError: string | null = null;

  if (dbAvailable && lookupKey) {
    try {
      examples.push(...localExamples(dbPath, lookupKey, signature, limit));
    } catch (err) {
      localError = (err as Error).message;
    }
  }

  const remaining = Math.max(limit - examples.length, 0);
  if (remaining > 0) {
    examples.push(...opusFallbackExamples(surface, remaining));
  }

  return NextResponse.json({
    lookupForm: lookupKey || null,
    target: generatedTarget
      ? {
          signature: generatedTarget.signature,
          ancQuery: generatedTarget.ancQuery,
          ancTags: generatedTarget.ancTags,
          cellLabel: generatedTarget.cellLabel,
        }
      : null,
    local: {
      available: dbAvailable,
      path: '.cache/corpus-local-full.sqlite',
      bytes: dbAvailable ? statSync(dbPath).size : 0,
      error: localError,
    },
    examples,
  });
}
