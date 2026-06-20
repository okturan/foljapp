/**
 * Aggregate completed phrase-variant chunk reports.
 *
 * Inputs:
 *   .cache/corpus-phrase-variant-stress.chunk-000.json, ...
 *
 * Outputs:
 *   .cache/corpus-phrase-variant-stress.aggregate.json
 *   .cache/corpus-phrase-variant-stress.aggregate.md
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_INPUT_DIR = join(REPO_ROOT, '.cache');
const DEFAULT_FILE_REGEX =
  '^corpus-phrase-variant-stress\\.chunk-(\\d{3})\\.json$';
const DEFAULT_JSON_OUT = join(
  REPO_ROOT,
  '.cache',
  'corpus-phrase-variant-stress.aggregate.json',
);
const DEFAULT_MD_OUT = join(
  REPO_ROOT,
  '.cache',
  'corpus-phrase-variant-stress.aggregate.md',
);

interface ChunkReport {
  generated_at: string;
  audit_path: string;
  audit_generated_at?: string;
  candidate_cache_dir: string;
  summary: ChunkSummary;
  pattern_kind_counts: PatternKind[];
  targets: ChunkTarget[];
  samples: ChunkSample[];
}

interface ChunkSummary {
  plan_only: boolean;
  audit_total_targets?: number;
  pre_chunk_targets: number;
  chunk_index?: number;
  chunk_count?: number;
  chunk_size_targets?: number;
  chunk_start: number;
  chunk_end: number;
  selected_targets: number;
  stress_patterns: number;
  anchor_tokens: number;
  matched_targets: number;
  matched_patterns: number;
  raw_matches: number;
  source_partitions: number;
  skipped_partitions: number;
  scanned_partitions: number;
  existing_anchor_row_partitions: number;
  missing_anchor_row_partitions: number;
  fallback_anchor_row_partitions: number;
  candidates_seen: number;
  anchor_candidates_seen: number;
  empty_candidates: number;
  duration_ms: number;
}

interface PatternKind {
  key: string;
  patterns: number;
  raw_matches: number;
}

interface ChunkTarget {
  id: string;
  target_key: string;
  lemma: string;
  signature: string;
  primary: string;
  anchor: string;
  matched: boolean;
  raw_matches: number;
}

interface ChunkSample {
  target_id: string;
  kind: string;
  pattern: string;
  resource_id: string;
  sentence: string;
}

interface ChunkRow {
  file: string;
  index: number;
  start: number;
  end: number;
  selectedTargets: number;
  stressPatterns: number;
  rawMatches: number;
  matchedTargets: number;
  matchedPatterns: number;
  anchorTokens: number;
  skippedPartitions: number;
  scannedPartitions: number;
  anchorRows: number;
  durationMs: number;
}

function valueAfter(prefix: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberAfter(prefix: string): number | undefined {
  const value = valueAfter(prefix);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${prefix}${value} must be a non-negative integer`);
  }
  return parsed;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function mdEscape(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

const inputDir = resolve(valueAfter('--input-dir=') ?? DEFAULT_INPUT_DIR);
const fileRegex = new RegExp(valueAfter('--file-regex=') ?? DEFAULT_FILE_REGEX);
const expectedChunksArg = numberAfter('--expected-chunks=');
const outJson = resolve(valueAfter('--out-json=') ?? DEFAULT_JSON_OUT);
const outMd = resolve(valueAfter('--out-md=') ?? DEFAULT_MD_OUT);

const files = readdirSync(inputDir)
  .map((file) => ({ file, match: file.match(fileRegex) }))
  .filter((row): row is { file: string; match: RegExpMatchArray } =>
    Boolean(row.match),
  )
  .sort((a, b) => a.file.localeCompare(b.file));

if (files.length === 0) {
  throw new Error(`no chunk reports matched ${fileRegex} in ${inputDir}`);
}

const chunks = new Map<number, ChunkReport & { file: string }>();
for (const { file, match } of files) {
  const index = Number(match[1]);
  if (!Number.isInteger(index)) {
    throw new Error(`file regex must capture a numeric chunk index: ${file}`);
  }
  if (chunks.has(index)) {
    throw new Error(`duplicate chunk index ${index}`);
  }
  const report = readJson<ChunkReport>(join(inputDir, file));
  if (report.summary.plan_only) {
    throw new Error(`${file} is plan-only; aggregate completed chunk reports`);
  }
  if (report.summary.chunk_index !== index) {
    throw new Error(
      `${file} has chunk_index ${report.summary.chunk_index}, expected ${index}`,
    );
  }
  chunks.set(index, { ...report, file });
}

const ordered = [...chunks.entries()].sort((a, b) => a[0] - b[0]);
const expectedChunks =
  expectedChunksArg ?? ordered[0]?.[1].summary.chunk_count ?? ordered.length;
const missingChunks = [];
for (let index = 0; index < expectedChunks; index += 1) {
  if (!chunks.has(index)) missingChunks.push(index);
}

const preChunkTargets = ordered[0]?.[1].summary.pre_chunk_targets;
const auditTotalTargets = ordered[0]?.[1].summary.audit_total_targets;
const chunkSizeTargets = ordered[0]?.[1].summary.chunk_size_targets;
const sourcePartitions = ordered[0]?.[1].summary.source_partitions;
const auditPath = ordered[0]?.[1].audit_path;
const auditGeneratedAt = ordered[0]?.[1].audit_generated_at;
const candidateCacheDir = ordered[0]?.[1].candidate_cache_dir;
const seenTargetIds = new Set<string>();
for (const [index, report] of ordered) {
  const summary = report.summary;
  if (report.summary.pre_chunk_targets !== preChunkTargets) {
    throw new Error(`chunk ${index} has a different pre_chunk_targets value`);
  }
  if (report.summary.audit_total_targets !== auditTotalTargets) {
    throw new Error(`chunk ${index} has a different audit_total_targets value`);
  }
  if (report.summary.chunk_count !== expectedChunks) {
    throw new Error(`chunk ${index} has a different chunk_count value`);
  }
  if (report.summary.chunk_size_targets !== chunkSizeTargets) {
    throw new Error(`chunk ${index} has a different chunk_size_targets value`);
  }
  if (report.summary.source_partitions !== sourcePartitions) {
    throw new Error(`chunk ${index} has a different source_partitions value`);
  }
  if (report.audit_path !== auditPath) {
    throw new Error(`chunk ${index} has a different audit_path value`);
  }
  if (report.audit_generated_at !== auditGeneratedAt) {
    throw new Error(`chunk ${index} has a different audit_generated_at value`);
  }
  if (report.candidate_cache_dir !== candidateCacheDir) {
    throw new Error(`chunk ${index} has a different candidate_cache_dir value`);
  }
  const expectedStart = index * (chunkSizeTargets ?? summary.selected_targets);
  const expectedEnd = Math.min(
    expectedStart + (chunkSizeTargets ?? summary.selected_targets),
    preChunkTargets ?? summary.chunk_end,
  );
  if (summary.chunk_start !== expectedStart) {
    throw new Error(
      `chunk ${index} starts at ${summary.chunk_start}; expected ${expectedStart}`,
    );
  }
  if (summary.chunk_end !== expectedEnd) {
    throw new Error(`chunk ${index} ends at ${summary.chunk_end}; expected ${expectedEnd}`);
  }
  if (summary.chunk_end <= summary.chunk_start) {
    throw new Error(`chunk ${index} has an empty or reversed range`);
  }
  if (summary.selected_targets !== summary.chunk_end - summary.chunk_start) {
    throw new Error(`chunk ${index} selected target count does not match range`);
  }
  for (const target of report.targets) {
    if (seenTargetIds.has(target.id)) {
      throw new Error(`duplicate target id across chunks: ${target.id}`);
    }
    seenTargetIds.add(target.id);
  }
}
const completeRanges = missingChunks.length === 0;

const byKind = new Map<string, { patterns: number; rawMatches: number }>();
const matchedTargets = [];
const samples = [];
const rows: ChunkRow[] = [];
let totalSelectedTargets = 0;
let totalStressPatterns = 0;
let totalRawMatches = 0;
let totalMatchedPatterns = 0;
let totalAnchorRows = 0;
let totalDurationMs = 0;

for (const [index, report] of ordered) {
  const summary = report.summary;
  totalSelectedTargets += summary.selected_targets;
  totalStressPatterns += summary.stress_patterns;
  totalRawMatches += summary.raw_matches;
  totalMatchedPatterns += summary.matched_patterns;
  totalAnchorRows += summary.anchor_candidates_seen;
  totalDurationMs += summary.duration_ms;
  rows.push({
    file: report.file,
    index,
    start: summary.chunk_start,
    end: summary.chunk_end,
    selectedTargets: summary.selected_targets,
    stressPatterns: summary.stress_patterns,
    rawMatches: summary.raw_matches,
    matchedTargets: summary.matched_targets,
    matchedPatterns: summary.matched_patterns,
    anchorTokens: summary.anchor_tokens,
    skippedPartitions: summary.skipped_partitions,
    scannedPartitions: summary.scanned_partitions,
    anchorRows: summary.anchor_candidates_seen,
    durationMs: summary.duration_ms,
  });
  for (const row of report.pattern_kind_counts) {
    const entry = byKind.get(row.key) ?? { patterns: 0, rawMatches: 0 };
    entry.patterns += row.patterns;
    entry.rawMatches += row.raw_matches;
    byKind.set(row.key, entry);
  }
  for (const target of report.targets.filter((target) => target.matched)) {
    matchedTargets.push({ chunk: index, ...target });
  }
  samples.push(
    ...report.samples.slice(0, 200 - samples.length).map((sample) => ({
      chunk: index,
      ...sample,
    })),
  );
}

const patternKindCounts = [...byKind.entries()]
  .map(([key, value]) => ({
    key,
    patterns: value.patterns,
    rawMatches: value.rawMatches,
  }))
  .sort(
    (a, b) =>
      b.rawMatches - a.rawMatches ||
      b.patterns - a.patterns ||
      a.key.localeCompare(b.key),
  );

const aggregate = {
  generatedAt: new Date().toISOString(),
  inputDir,
  fileRegex: fileRegex.source,
  auditPath,
  auditGeneratedAt,
  candidateCacheDir,
  summary: {
    expectedChunks,
    completedChunks: ordered.length,
    missingChunks,
    auditTotalTargets,
    preChunkTargets,
    chunkSizeTargets,
    totalSelectedTargets,
    totalStressPatterns,
    totalRawMatches,
    totalMatchedTargets: matchedTargets.length,
    totalMatchedPatterns,
    totalAnchorRowsChecked: totalAnchorRows,
    summedChunkDurationMs: totalDurationMs,
    complete: completeRanges,
    coverageNote:
      'candidate and partition counts are chunk-summed and are not unique corpus totals',
  },
  chunks: rows,
  patternKindCounts,
  matchedTargets,
  samples,
};

function markdown(): string {
  const lines = [
    '# Corpus Phrase-Variant Chunk Aggregate',
    '',
    `Generated: ${aggregate.generatedAt}`,
    `Input: ${aggregate.inputDir}`,
    '',
    '## Summary',
    '',
    `- Complete: ${aggregate.summary.complete}`,
    `- Completed chunks: ${aggregate.summary.completedChunks} / ${aggregate.summary.expectedChunks}`,
    `- Missing chunks: ${aggregate.summary.missingChunks.join(', ') || 'none'}`,
    `- Pre-chunk selected targets: ${aggregate.summary.preChunkTargets}`,
    `- Total selected targets: ${aggregate.summary.totalSelectedTargets}`,
    `- Total stress patterns: ${aggregate.summary.totalStressPatterns}`,
    `- Total raw variant matches: ${aggregate.summary.totalRawMatches}`,
    `- Matched targets: ${aggregate.summary.totalMatchedTargets}`,
    `- Matched patterns: ${aggregate.summary.totalMatchedPatterns}`,
    `- Anchor rows checked: ${aggregate.summary.totalAnchorRowsChecked}`,
    `- Summed chunk duration: ${(aggregate.summary.summedChunkDurationMs / 1000).toFixed(1)}s`,
    '',
    aggregate.summary.coverageNote,
    '',
    '## Chunks',
    '',
    '| Chunk | Rows | Targets | Patterns | Raw Matches | Anchor Rows | Duration | File |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const row of aggregate.chunks) {
    lines.push(
      `| ${row.index} | [${row.start}..${row.end}) | ${row.selectedTargets} | ${row.stressPatterns} | ${row.rawMatches} | ${row.anchorRows} | ${(row.durationMs / 1000).toFixed(1)}s | ${mdEscape(row.file)} |`,
    );
  }
  lines.push('', '## Variant Kinds', '');
  lines.push('| Kind | Patterns | Raw Matches |', '| --- | ---: | ---: |');
  for (const row of aggregate.patternKindCounts.slice(0, 40)) {
    lines.push(`| ${mdEscape(row.key)} | ${row.patterns} | ${row.rawMatches} |`);
  }
  lines.push('', '## Matched Targets', '');
  lines.push('| Chunk | Target | Lemma | Signature | Raw Matches |', '| ---: | --- | --- | --- | ---: |');
  for (const row of aggregate.matchedTargets.slice(0, 80)) {
    lines.push(
      `| ${row.chunk} | ${mdEscape(row.target_key)} | ${mdEscape(row.lemma)} | ${mdEscape(row.signature)} | ${row.raw_matches} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

mkdirSync(dirname(outJson), { recursive: true });
mkdirSync(dirname(outMd), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(aggregate, null, 2)}\n`);
writeFileSync(outMd, markdown());

console.log(
  `Wrote ${outJson} and ${outMd}: ${ordered.length}/${expectedChunks} chunk(s), ${totalRawMatches} raw match(es)`,
);
