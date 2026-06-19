/**
 * Summarize local corpus coverage for generated foljapp search targets.
 *
 * Inputs:
 *   .cache/corpus-targets.json
 *   .cache/corpus-local-full.sqlite
 *
 * Outputs:
 *   .cache/corpus-coverage-report.json
 *   .cache/corpus-coverage-report.md
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_TARGETS = join(REPO_ROOT, '.cache', 'corpus-targets.json');
const DEFAULT_DB = join(REPO_ROOT, '.cache', 'corpus-local-full.sqlite');
const DEFAULT_JSON_OUT = join(REPO_ROOT, '.cache', 'corpus-coverage-report.json');
const DEFAULT_MD_OUT = join(REPO_ROOT, '.cache', 'corpus-coverage-report.md');

interface TargetRecord {
  id: string;
  targetKey: string;
  displayForm: string;
  tokens: string[];
  signature: string;
  cellLabel: string;
  verbId: string;
  lemma: string;
  translationEn: string;
  options: Record<string, unknown>;
}

interface TargetFile {
  generatedAt: string;
  corpusVersion: string;
  targets: TargetRecord[];
}

interface OccurrenceRow {
  target_id: string;
  occurrences: number;
  resources: number;
  best_score: number;
}

interface ResourceStatsRow {
  resource_id: string;
  candidates_seen: number;
  sentences_inserted: number;
  quality_rejected: number;
  unmatched_rejected: number;
  duration_ms: number;
}

interface CountRow {
  count: number;
}

interface TextRow {
  value: string;
}

function valueAfter(prefix: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function sqliteJson<T>(dbPath: string, sql: string): T[] {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 128,
  }).trim();
  return output ? (JSON.parse(output) as T[]) : [];
}

function sqliteText(dbPath: string, sql: string): string | null {
  return sqliteJson<TextRow>(dbPath, sql)[0]?.value ?? null;
}

function evidenceScope(selectedSources: string | null): string {
  return selectedSources === 'all'
    ? 'all-configured-downloaded-resources'
    : 'selected-source-subset';
}

function groupKey(target: TargetRecord): string {
  const o = target.options;
  if (o.mood === 'non-finite') return `non-finite.${String(o.form ?? '')}`;
  return [
    o.mood,
    o.tense,
    o.voice,
    o.polarity,
    o.modality,
    o.person,
    o.number,
  ]
    .map((part) => String(part ?? ''))
    .join('.');
}

function missBucket(target: TargetRecord): string {
  const o = target.options;
  if (target.tokens[0] === 'mos' && target.tokens[1] === 'të') {
    return 'negative_subjunctive_order';
  }
  if (o.voice === 'middle-passive') return 'middle_passive';
  if (o.mood === 'admirative' && o.tense !== 'present') {
    return 'rare_admirative_nonpresent';
  }
  if (o.mood === 'optative' && o.tense === 'perfect') {
    return 'rare_optative_perfect';
  }
  if (typeof o.tense === 'string' && o.tense.includes('future-perfect')) {
    return 'future_perfect_analytic';
  }
  if (o.tense === 'past-anterior') return 'past_anterior';
  if (target.tokens.length >= 4) return 'long_analytic_phrase';
  return 'other';
}

function alternantSuggestion(target: TargetRecord): string | null {
  if (target.tokens[0] === 'mos' && target.tokens[1] === 'të') {
    return ['të', 'mos', ...target.tokens.slice(2)].join(' ');
  }
  return null;
}

function inc(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function topEntries(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function pct(part: number, total: number): string {
  return total === 0 ? '0.0%' : `${((part / total) * 100).toFixed(1)}%`;
}

function main(): void {
  const targetsPath = valueAfter('--targets=') ?? DEFAULT_TARGETS;
  const dbPath = valueAfter('--db=') ?? DEFAULT_DB;
  const jsonOut = valueAfter('--json=') ?? DEFAULT_JSON_OUT;
  const mdOut = valueAfter('--md=') ?? DEFAULT_MD_OUT;

  if (!existsSync(targetsPath)) throw new Error(`Missing targets: ${targetsPath}`);
  if (!existsSync(dbPath)) throw new Error(`Missing local corpus DB: ${dbPath}`);

  const targetFile = JSON.parse(readFileSync(targetsPath, 'utf8')) as TargetFile;
  const occurrenceRows = sqliteJson<OccurrenceRow>(
    dbPath,
    `
    SELECT
      o.target_id,
      count(*) AS occurrences,
      count(DISTINCT s.resource_id) AS resources,
      max(o.score) AS best_score
    FROM occurrences o
    JOIN sentences s ON s.id = o.sentence_id
    GROUP BY o.target_id
    `,
  );
  const resourceStats = sqliteJson<ResourceStatsRow>(
    dbPath,
    `
    SELECT resource_id, candidates_seen, sentences_inserted, quality_rejected,
           unmatched_rejected, duration_ms
    FROM resource_stats
    ORDER BY candidates_seen DESC, resource_id ASC
    `,
  );
  const sentenceCount = Number(
    sqliteJson<CountRow>(dbPath, 'SELECT count(*) AS count FROM sentences')[0]?.count ?? 0,
  );
  const schemaVersion = sqliteText(
    dbPath,
    "SELECT value FROM metadata WHERE key = 'schema_version'",
  );
  const indexMode = sqliteText(
    dbPath,
    "SELECT value FROM metadata WHERE key = 'index_mode'",
  );
  const selectedSources = sqliteText(
    dbPath,
    "SELECT value FROM metadata WHERE key = 'selected_sources'",
  );

  const hitsByTarget = new Map(
    occurrenceRows.map((row) => [
      row.target_id,
      {
        occurrences: Number(row.occurrences),
        resources: Number(row.resources),
        bestScore: Number(row.best_score),
      },
    ]),
  );

  const byCell = new Map<string, { total: number; hit: number; miss: number }>();
  const byMood = new Map<string, { total: number; hit: number; miss: number }>();
  const missBuckets = new Map<string, number>();
  const missedByLemma = new Map<string, number>();
  const alternants = new Map<string, number>();
  const misses: Array<{
    id: string;
    targetKey: string;
    lemma: string;
    signature: string;
    cellLabel: string;
    bucket: string;
    alternant: string | null;
  }> = [];

  let hitTargets = 0;
  let totalOccurrences = 0;

  for (const target of targetFile.targets) {
    const hit = hitsByTarget.get(target.id);
    const hasHit = Boolean(hit);
    if (hasHit) {
      hitTargets += 1;
      totalOccurrences += hit?.occurrences ?? 0;
    }

    const cell = groupKey(target);
    const mood = String(target.options.mood ?? 'unknown');
    const cellRow = byCell.get(cell) ?? { total: 0, hit: 0, miss: 0 };
    const moodRow = byMood.get(mood) ?? { total: 0, hit: 0, miss: 0 };
    cellRow.total += 1;
    moodRow.total += 1;
    if (hasHit) {
      cellRow.hit += 1;
      moodRow.hit += 1;
    } else {
      cellRow.miss += 1;
      moodRow.miss += 1;
      const bucket = missBucket(target);
      const alternant = alternantSuggestion(target);
      inc(missBuckets, bucket);
      inc(missedByLemma, `${target.lemma} (${target.verbId})`);
      if (alternant) inc(alternants, alternant);
      misses.push({
        id: target.id,
        targetKey: target.targetKey,
        lemma: target.lemma,
        signature: target.signature,
        cellLabel: target.cellLabel,
        bucket,
        alternant,
      });
    }
    byCell.set(cell, cellRow);
    byMood.set(mood, moodRow);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    targetsPath,
    dbPath,
    targetGeneratedAt: targetFile.generatedAt,
    corpusVersion: targetFile.corpusVersion,
    summary: {
      totalTargets: targetFile.targets.length,
      hitTargets,
      missedTargets: targetFile.targets.length - hitTargets,
      hitRate: pct(hitTargets, targetFile.targets.length),
      evidenceScope: evidenceScope(selectedSources),
      selectedSources,
      indexMode,
      schemaVersion,
      totalOccurrences,
      scannedResources: resourceStats.length,
      candidatesSeen: resourceStats.reduce(
        (sum, row) => sum + Number(row.candidates_seen),
        0,
      ),
      matchedSentenceCandidates: resourceStats.reduce(
        (sum, row) => sum + Number(row.sentences_inserted),
        0,
      ),
      matchedSentenceCandidatesBeforeWriterCap: resourceStats.reduce(
        (sum, row) => sum + Number(row.sentences_inserted),
        0,
      ),
      storedExampleSentences: sentenceCount,
      scanDurationMs: resourceStats.reduce(
        (sum, row) => sum + Number(row.duration_ms),
        0,
      ),
    },
    byMood: [...byMood.entries()].map(([key, row]) => ({ key, ...row })),
    byCell: [...byCell.entries()]
      .map(([key, row]) => ({ key, ...row }))
      .sort((a, b) => b.miss - a.miss || a.key.localeCompare(b.key)),
    missBuckets: topEntries(missBuckets, 20),
    missedByLemma: topEntries(missedByLemma, 40),
    alternantCandidates: topEntries(alternants, 80),
    resourceStats,
    misses,
  };

  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const md = [
    '# Corpus Coverage Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Targets: ${report.summary.totalTargets}`,
    `- Hit targets: ${report.summary.hitTargets} (${report.summary.hitRate})`,
    `- Missed targets: ${report.summary.missedTargets}`,
    `- Evidence scope: ${report.summary.evidenceScope}`,
    `- Selected sources: ${report.summary.selectedSources ?? 'unknown'}`,
    `- Index mode: ${report.summary.indexMode ?? 'unknown'}`,
    `- Stored occurrences: ${report.summary.totalOccurrences}`,
    `- Scanned resource partitions: ${report.summary.scannedResources}`,
    `- Candidates seen: ${report.summary.candidatesSeen}`,
    `- Matched sentence candidates before writer cap: ${report.summary.matchedSentenceCandidatesBeforeWriterCap}`,
    `- Stored example sentences after cap: ${report.summary.storedExampleSentences}`,
    `- Aggregate scan time: ${(report.summary.scanDurationMs / 1000).toFixed(1)}s`,
    '',
    '## Miss Buckets',
    '',
    '| Bucket | Misses |',
    '| --- | ---: |',
    ...report.missBuckets.map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '## Mood Coverage',
    '',
    '| Mood | Total | Hit | Miss | Hit Rate |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...report.byMood.map(
      (row) =>
        `| ${row.key} | ${row.total} | ${row.hit} | ${row.miss} | ${pct(row.hit, row.total)} |`,
    ),
    '',
    '## Worst Cell Groups',
    '',
    '| Cell | Total | Hit | Miss | Hit Rate |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...report.byCell
      .slice(0, 40)
      .map(
        (row) =>
          `| ${row.key} | ${row.total} | ${row.hit} | ${row.miss} | ${pct(row.hit, row.total)} |`,
      ),
    '',
    '## Top Alternant Candidates',
    '',
    '| Alternant | Misses |',
    '| --- | ---: |',
    ...report.alternantCandidates
      .slice(0, 40)
      .map((row) => `| ${row.key} | ${row.count} |`),
    '',
  ].join('\n');
  writeFileSync(mdOut, md, 'utf8');

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${mdOut}`);
}

main();
