/**
 * Explain local corpus misses without rerunning the raw-corpus scanner.
 *
 * Inputs:
 *   .cache/corpus-targets.json
 *   .cache/corpus-coverage-report.json
 *   data/verbs/_corpus.client.json
 *
 * Outputs:
 *   .cache/corpus-missing-audit.json
 *   .cache/corpus-missing-audit.md
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_TARGETS = join(REPO_ROOT, '.cache', 'corpus-targets.json');
const DEFAULT_COVERAGE = join(REPO_ROOT, '.cache', 'corpus-coverage-report.json');
const DEFAULT_DB = join(REPO_ROOT, '.cache', 'corpus-local-full.sqlite');
const DEFAULT_VERBS = join(REPO_ROOT, 'data', 'verbs', '_corpus.client.json');
const DEFAULT_JSON_OUT = join(REPO_ROOT, '.cache', 'corpus-missing-audit.json');
const DEFAULT_MD_OUT = join(REPO_ROOT, '.cache', 'corpus-missing-audit.md');

interface TargetRecord {
  id: string;
  targetKey: string;
  tokens: string[];
  signature: string;
  cellLabel: string;
  verbId: string;
  lemma: string;
  translationEn: string;
  options: Record<string, unknown>;
}

interface TargetFile {
  targets: TargetRecord[];
}

interface CoverageReport {
  summary: {
    totalTargets: number;
    hitTargets: number;
    missedTargets: number;
    candidatesSeen: number;
  };
  misses: Array<{ id: string; targetKey: string; bucket: string }>;
}

interface VerbEntry {
  id: string;
  lemma: string;
  translationEn: string;
  flags?: Record<string, unknown>;
}

interface CountRow {
  key: string;
  count: number;
}

interface SqlCountRow {
  count: number;
}

interface SqlTextRow {
  value: string;
}

interface VariantCountRow {
  variant_kind: string;
  count: number;
}

interface CoverageRow {
  key: string;
  total: number;
  hit: number;
  miss: number;
  hitRate: string;
}

interface DbEvidence {
  dbPath: string;
  schemaVersion: string | null;
  indexMode: string | null;
  selectedSources: string | null;
  hasOccurrenceVariantEvidence: boolean;
  occurrenceVariantCounts: CountRow[];
  scannedResources: number;
  candidatesSeen: number;
  unmatchedRejectedCandidates: number;
  qualityRejectedCandidates: number;
  emptyCandidates: number;
  matchedSentenceCandidatesBeforeWriterCap: number;
  retainedSentences: number;
  retainedOccurrences: number;
  distinctHitTargets: number;
  distinctHitSurfaces: number;
  maxStoredOccurrencesPerTarget: number;
  targetIdsAtMaxStoredOccurrences: number;
  mosTeTargetsMatchedInTeMosOrder: number;
  retainedSentencesWithSApostrophe: number;
}

function valueAfter(prefix: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function sqliteJson<T>(dbPath: string, sql: string): T[] {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  }).trim();
  return output ? (JSON.parse(output) as T[]) : [];
}

function sqliteCount(dbPath: string, sql: string): number {
  return Number(sqliteJson<SqlCountRow>(dbPath, sql)[0]?.count ?? 0);
}

function sqliteText(dbPath: string, sql: string): string | null {
  return sqliteJson<SqlTextRow>(dbPath, sql)[0]?.value ?? null;
}

function hasColumn(dbPath: string, table: string, column: string): boolean {
  const rows = sqliteJson<{ name: string }>(dbPath, `PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
}

function pct(part: number, total: number): string {
  return total === 0 ? '0.0%' : `${((part / total) * 100).toFixed(1)}%`;
}

function cellKey(target: TargetRecord): string {
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

function add(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function topEntries(map: Map<string, number>, limit: number): CountRow[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function coverageRows(
  map: Map<string, { total: number; hit: number; miss: number }>,
): CoverageRow[] {
  return [...map.entries()]
    .map(([key, row]) => ({ key, ...row, hitRate: pct(row.hit, row.total) }))
    .sort((a, b) => b.miss - a.miss || a.key.localeCompare(b.key));
}

function readDbEvidence(dbPath: string): DbEvidence {
  const hasOccurrenceVariantEvidence =
    hasColumn(dbPath, 'occurrences', 'variant_kind') &&
    hasColumn(dbPath, 'occurrences', 'matched_pattern');
  const maxStoredOccurrencesPerTarget = sqliteCount(
    dbPath,
    `
    SELECT coalesce(max(occurrences_per_target), 0) AS count
    FROM (
      SELECT count(*) AS occurrences_per_target
      FROM occurrences
      GROUP BY target_id
    )
    `,
  );

  return {
    dbPath,
    schemaVersion: sqliteText(
      dbPath,
      "SELECT value FROM metadata WHERE key = 'schema_version'",
    ),
    indexMode: sqliteText(
      dbPath,
      "SELECT value FROM metadata WHERE key = 'index_mode'",
    ),
    selectedSources: sqliteText(
      dbPath,
      "SELECT value FROM metadata WHERE key = 'selected_sources'",
    ),
    hasOccurrenceVariantEvidence,
    occurrenceVariantCounts: hasOccurrenceVariantEvidence
      ? sqliteJson<VariantCountRow>(
          dbPath,
          `
          SELECT variant_kind, count(*) AS count
          FROM occurrences
          GROUP BY variant_kind
          ORDER BY count(*) DESC, variant_kind ASC
          `,
        ).map((row) => ({ key: row.variant_kind, count: Number(row.count) }))
      : [],
    scannedResources: sqliteCount(
      dbPath,
      'SELECT count(*) AS count FROM resource_stats',
    ),
    candidatesSeen: sqliteCount(
      dbPath,
      'SELECT coalesce(sum(candidates_seen), 0) AS count FROM resource_stats',
    ),
    unmatchedRejectedCandidates: sqliteCount(
      dbPath,
      'SELECT coalesce(sum(unmatched_rejected), 0) AS count FROM resource_stats',
    ),
    qualityRejectedCandidates: sqliteCount(
      dbPath,
      'SELECT coalesce(sum(quality_rejected), 0) AS count FROM resource_stats',
    ),
    emptyCandidates: sqliteCount(
      dbPath,
      'SELECT coalesce(sum(empty_candidates), 0) AS count FROM resource_stats',
    ),
    matchedSentenceCandidatesBeforeWriterCap: sqliteCount(
      dbPath,
      'SELECT coalesce(sum(sentences_inserted), 0) AS count FROM resource_stats',
    ),
    retainedSentences: sqliteCount(dbPath, 'SELECT count(*) AS count FROM sentences'),
    retainedOccurrences: sqliteCount(dbPath, 'SELECT count(*) AS count FROM occurrences'),
    distinctHitTargets: sqliteCount(
      dbPath,
      'SELECT count(DISTINCT target_id) AS count FROM occurrences',
    ),
    distinctHitSurfaces: sqliteCount(
      dbPath,
      'SELECT count(DISTINCT target_key) AS count FROM occurrences',
    ),
    maxStoredOccurrencesPerTarget,
    targetIdsAtMaxStoredOccurrences:
      maxStoredOccurrencesPerTarget === 0
        ? 0
        : sqliteCount(
            dbPath,
            `
            SELECT count(*) AS count
            FROM (
              SELECT target_id, count(*) AS occurrences_per_target
              FROM occurrences
              GROUP BY target_id
            )
            WHERE occurrences_per_target = ${maxStoredOccurrencesPerTarget}
            `,
          ),
    mosTeTargetsMatchedInTeMosOrder: sqliteCount(
      dbPath,
      `
      SELECT count(DISTINCT o.target_id) AS count
      FROM occurrences o
      JOIN sentences s ON s.id = o.sentence_id
      WHERE o.target_key LIKE 'mos të %'
        AND s.normalized LIKE '%të mos %'
      `,
    ),
    retainedSentencesWithSApostrophe: sqliteCount(
      dbPath,
      `
      SELECT count(*) AS count
      FROM sentences
      WHERE sentence LIKE '%s''%' OR sentence LIKE '%s’%'
      `,
    ),
  };
}

function noDiacritics(text: string): string {
  return text.replaceAll('ë', 'e').replaceAll('ç', 'c');
}

function activeAlternants(target: TargetRecord): string[] {
  const out = new Set<string>();
  if (target.tokens[0] === 'mos' && target.tokens[1] === 'të') {
    out.add(['të', 'mos', ...target.tokens.slice(2)].join(' '));
  }
  return [...out].sort();
}

function variantProbeAlternants(target: TargetRecord): string[] {
  const out = new Set<string>();
  if (target.tokens[0] === 'nuk' && target.tokens.length > 1) {
    out.add(['s', ...target.tokens.slice(1)].join(' '));
  }
  const folded = noDiacritics(target.targetKey);
  if (folded !== target.targetKey) out.add(folded);
  return [...out].sort();
}

function labelMiss(
  target: TargetRecord,
  cell: { total: number; hit: number; miss: number },
  lemma: { total: number; hit: number; miss: number },
  surface: { total: number; hit: number; miss: number },
): string[] {
  const labels: string[] = [];
  const o = target.options;
  const hitRate = cell.total === 0 ? 0 : cell.hit / cell.total;
  const lemmaMissRate = lemma.total === 0 ? 0 : lemma.miss / lemma.total;

  if (o.voice === 'middle-passive') labels.push('middle_passive_needs_attestation');
  if (cell.total >= 100 && cell.hit <= 3) labels.push('near_empty_grammatical_cell');
  else if (cell.total >= 100 && hitRate < 0.1) labels.push('low_coverage_grammatical_cell');
  if (o.mood === 'admirative' && o.tense !== 'present') {
    labels.push('rare_admirative_nonpresent');
  }
  if (o.mood === 'optative' && o.tense === 'perfect') {
    labels.push('rare_optative_perfect');
  }
  if (typeof o.tense === 'string' && o.tense.includes('future-perfect')) {
    labels.push('future_perfect_analytic');
  }
  if (o.tense === 'past-anterior') labels.push('past_anterior');
  if (target.tokens.length >= 4) labels.push('long_exact_phrase');
  if (target.tokens[0] === 'mos' && target.tokens[1] === 'të') {
    labels.push('active_scanner_alternant_already_checked');
  }
  if (target.tokens[0] === 'nuk') {
    labels.push('apostrophe_negative_variant_probe');
  }
  if (target.targetKey !== noDiacritics(target.targetKey)) {
    labels.push('diacriticless_variant_probe');
  }
  if (lemma.total >= 100 && lemmaMissRate >= 0.75) labels.push('lemma_outlier');
  if (surface.total > 1) labels.push('duplicate_surface_targets');

  return labels.length > 0 ? labels : ['unexplained_exact_absence'];
}

function primaryCategory(labels: string[]): string {
  if (labels.includes('middle_passive_needs_attestation')) {
    return 'needs_middle_passive_attestation';
  }
  if (labels.includes('near_empty_grammatical_cell')) return 'near_empty_cell';
  if (
    labels.includes('rare_admirative_nonpresent') ||
    labels.includes('rare_optative_perfect') ||
    labels.includes('future_perfect_analytic') ||
    labels.includes('past_anterior')
  ) {
    return 'rare_or_analytic_cell';
  }
  if (
    labels.includes('apostrophe_negative_variant_probe') ||
    labels.includes('diacriticless_variant_probe')
  ) {
    return 'variant_probe_candidate';
  }
  if (labels.includes('long_exact_phrase')) return 'broader_phrase_search_needed';
  if (labels.includes('lemma_outlier')) return 'lemma_outlier';
  if (labels.includes('duplicate_surface_targets')) return 'duplicate_surface_target';
  if (labels.includes('active_scanner_alternant_already_checked')) {
    return 'active_alternant_already_scanned_but_absent';
  }
  return 'unexplained_exact_absence';
}

function main(): void {
  const targetsPath = valueAfter('--targets=') ?? DEFAULT_TARGETS;
  const coveragePath = valueAfter('--coverage=') ?? DEFAULT_COVERAGE;
  const dbPath = valueAfter('--db=') ?? DEFAULT_DB;
  const verbsPath = valueAfter('--verbs=') ?? DEFAULT_VERBS;
  const jsonOut = valueAfter('--json=') ?? DEFAULT_JSON_OUT;
  const mdOut = valueAfter('--md=') ?? DEFAULT_MD_OUT;

  const targetFile = readJson<TargetFile>(targetsPath);
  const coverage = readJson<CoverageReport>(coveragePath);
  const verbs = readJson<VerbEntry[]>(verbsPath);
  const dbEvidence = existsSync(dbPath) ? readDbEvidence(dbPath) : null;
  const targetsById = new Map(targetFile.targets.map((target) => [target.id, target]));
  const missingIds = new Set(coverage.misses.map((miss) => miss.id));
  const verbsById = new Map(verbs.map((verb) => [verb.id, verb]));

  const byCell = new Map<string, { total: number; hit: number; miss: number }>();
  const byLemma = new Map<string, { total: number; hit: number; miss: number }>();
  const bySurface = new Map<string, { total: number; hit: number; miss: number }>();

  for (const target of targetFile.targets) {
    const missed = missingIds.has(target.id);
    for (const [map, key] of [
      [byCell, cellKey(target)],
      [byLemma, target.verbId],
      [bySurface, target.targetKey],
    ] as const) {
      const row = map.get(key) ?? { total: 0, hit: 0, miss: 0 };
      row.total += 1;
      if (missed) row.miss += 1;
      else row.hit += 1;
      map.set(key, row);
    }
  }

  const labelCounts = new Map<string, number>();
  const primaryCounts = new Map<string, number>();
  const activeAlternantCounts = new Map<string, number>();
  const variantProbeCounts = new Map<string, number>();
  const auditedMisses = coverage.misses.map((miss) => {
    const target = targetsById.get(miss.id);
    if (!target) throw new Error(`Coverage miss not found in targets: ${miss.id}`);
    const labels = labelMiss(
      target,
      byCell.get(cellKey(target))!,
      byLemma.get(target.verbId)!,
      bySurface.get(target.targetKey)!,
    );
    for (const label of labels) add(labelCounts, label);
    const primary = primaryCategory(labels);
    add(primaryCounts, primary);
    const active = activeAlternants(target);
    const unscanned = variantProbeAlternants(target);
    for (const alternant of active) add(activeAlternantCounts, alternant);
    for (const alternant of unscanned) add(variantProbeCounts, alternant);
    return {
      id: target.id,
      targetKey: target.targetKey,
      verbId: target.verbId,
      lemma: target.lemma,
      translationEn: target.translationEn,
      signature: target.signature,
      cellKey: cellKey(target),
      bucket: miss.bucket,
      primary,
      labels,
      activeAlternants: active,
      variantProbeAlternants: unscanned,
    };
  });

  const uniqueSurfaces = coverageRows(bySurface);
  const uniqueHitSurfaces = uniqueSurfaces.filter((row) => row.hit > 0);
  const uniqueMissedSurfaces = uniqueSurfaces.filter((row) => row.miss > 0);
  const fullyMissedSurfaces = uniqueSurfaces.filter(
    (row) => row.miss > 0 && row.hit === 0,
  );
  const mixedHitMissSurfaces = uniqueSurfaces.filter(
    (row) => row.miss > 0 && row.hit > 0,
  );
  const duplicateMissRowsCollapsed = uniqueMissedSurfaces.reduce(
    (sum, row) => sum + Math.max(0, row.miss - 1),
    0,
  );
  const duplicateMissSurfaces = uniqueMissedSurfaces.filter((row) => row.miss > 1);
  const nearEmptyCells = coverageRows(byCell).filter(
    (row) => row.total >= 100 && row.hit <= 3,
  );
  const lemmaOutliers = coverageRows(byLemma)
    .filter((row) => row.total >= 100 && row.miss / row.total >= 0.75)
    .map((row) => {
      const verb = verbsById.get(row.key);
      return {
        ...row,
        lemma: verb?.lemma ?? row.key,
        translationEn: verb?.translationEn ?? '',
        flags: verb?.flags ?? {},
      };
    });

  const unexplained = auditedMisses.filter(
    (miss) => miss.primary === 'unexplained_exact_absence',
  );
  const missesWithActiveScannerAlternants = auditedMisses.filter(
    (miss) => miss.activeAlternants.length > 0,
  ).length;
  const missesWithUnscannedAlternants = auditedMisses.filter(
    (miss) => miss.variantProbeAlternants.length > 0,
  ).length;
  const report = {
    generatedAt: new Date().toISOString(),
    targetsPath,
    coveragePath,
    summary: {
      totalTargets: coverage.summary.totalTargets,
      hitTargets: coverage.summary.hitTargets,
      missedTargets: coverage.summary.missedTargets,
      uniqueSurfaces: uniqueSurfaces.length,
      uniqueHitSurfaces: uniqueHitSurfaces.length,
      uniqueMissedSurfaces: uniqueMissedSurfaces.length,
      fullyMissedSurfaces: fullyMissedSurfaces.length,
      mixedHitMissSurfaces: mixedHitMissSurfaces.length,
      duplicateMissRowsCollapsed,
      candidatesSeen: coverage.summary.candidatesSeen,
      storedSentences: dbEvidence?.retainedSentences ?? null,
      storedOccurrences: dbEvidence?.retainedOccurrences ?? null,
      targetIdsAtMaxStoredOccurrences:
        dbEvidence?.targetIdsAtMaxStoredOccurrences ?? null,
      qualityRejectedCandidates: dbEvidence?.qualityRejectedCandidates ?? null,
      nearEmptyCellCount: nearEmptyCells.length,
      lemmaOutlierCount: lemmaOutliers.length,
      unexplainedMisses: unexplained.length,
      missesWithActiveScannerAlternants,
      missesWithUnscannedAlternants,
    },
    primaryCategories: topEntries(primaryCounts, 20),
    evidenceLabels: topEntries(labelCounts, 40),
    dbEvidence,
    duplicateMissSurfaces: duplicateMissSurfaces.slice(0, 80),
    nearEmptyCells: nearEmptyCells.slice(0, 80),
    lemmaOutliers: lemmaOutliers.slice(0, 80),
    activeAlternantsAlreadyScanned: topEntries(activeAlternantCounts, 100),
    variantProbeCandidates: topEntries(variantProbeCounts, 100),
    unexplainedSample: unexplained.slice(0, 100),
    misses: auditedMisses,
  };

  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const md = [
    '# Corpus Missing Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target misses: ${report.summary.missedTargets} / ${report.summary.totalTargets}`,
    `- Unique surface misses: ${report.summary.uniqueMissedSurfaces} / ${report.summary.uniqueSurfaces}`,
    `- Duplicate target misses collapsed by surface: ${report.summary.duplicateMissRowsCollapsed}`,
    `- Fully absent surfaces: ${report.summary.fullyMissedSurfaces}; mixed hit/miss surfaces: ${report.summary.mixedHitMissSurfaces}`,
    `- Candidates scanned in source coverage run: ${report.summary.candidatesSeen}`,
    report.dbEvidence
      ? `- Stored examples: ${report.dbEvidence.retainedSentences} sentences, ${report.dbEvidence.retainedOccurrences} occurrences`
      : '- Stored examples: no local SQLite DB available',
    report.dbEvidence
      ? `- Target IDs at observed per-target cap (${report.dbEvidence.maxStoredOccurrencesPerTarget}): ${report.dbEvidence.targetIdsAtMaxStoredOccurrences}`
      : '- Target IDs at observed per-target cap: unknown',
    report.dbEvidence
      ? `- Quality-rejected candidates: ${report.dbEvidence.qualityRejectedCandidates}`
      : '- Quality-rejected candidates: unknown',
    `- Misses with active scanner alternants already checked: ${report.summary.missesWithActiveScannerAlternants}`,
    `- Misses with scanner-variant probe candidates: ${report.summary.missesWithUnscannedAlternants}`,
    `- Near-empty grammatical cells: ${report.summary.nearEmptyCellCount}`,
    `- Lemma outliers at >=75% miss rate: ${report.summary.lemmaOutlierCount}`,
    `- Unexplained exact absences after heuristics: ${report.summary.unexplainedMisses}`,
    '',
    '## Methodology & Caveats',
    '',
    'This audit reads the existing generated target list, coverage report, and optional SQLite example DB. It does not rescan raw corpora.',
    'A target miss is a generated target ID with no retained occurrence. A unique surface miss deduplicates those misses by normalized `targetKey`, so repeated forms across cells or lemmas do not inflate the surface count.',
    'Evidence labels overlap; the primary category is a single prioritized bucket per missed target.',
    'Exact stored absence is not universal absence. Ungenerated alternants, diacritic-free spellings, OCR/tokenization variants, filtered examples, and examples dropped by the per-target cap can all remain outside the retained SQLite evidence.',
    '',
    '## DB Cap/Filter Evidence',
    '',
    ...(report.dbEvidence
      ? [
          `- SQLite DB: ${report.dbEvidence.dbPath}`,
          `- Schema version: ${report.dbEvidence.schemaVersion ?? 'unknown'}; occurrence variant evidence: ${report.dbEvidence.hasOccurrenceVariantEvidence ? 'present' : 'absent'}`,
          `- Index mode: ${report.dbEvidence.indexMode ?? 'unknown'}; selected sources: ${report.dbEvidence.selectedSources ?? 'unknown'}; resource partitions: ${report.dbEvidence.scannedResources}`,
          '',
          '| Stage | Count | Evidence Meaning |',
          '| --- | ---: | --- |',
          `| Raw candidates seen | ${report.dbEvidence.candidatesSeen} | All source candidates streamed by scanner workers. |`,
          `| Rejected before target match | ${report.dbEvidence.unmatchedRejectedCandidates} | Candidates with no generated target match. |`,
          `| Rejected by quality filters | ${report.dbEvidence.qualityRejectedCandidates} | Target-matching candidates dropped before retention. |`,
          `| Matched quality candidates before DB writer cap | ${report.dbEvidence.matchedSentenceCandidatesBeforeWriterCap} | Worker-emitted hit sentences before the central writer applies the global per-target cap. |`,
          `| Retained sentences in SQLite | ${report.dbEvidence.retainedSentences} | Stored example sentences after DB retention and cap behavior. |`,
          `| Retained occurrences in SQLite | ${report.dbEvidence.retainedOccurrences} | Stored target-occurrence rows. |`,
          `| Distinct retained target IDs | ${report.dbEvidence.distinctHitTargets} | Target IDs with at least one stored occurrence. |`,
          `| Distinct retained surfaces | ${report.dbEvidence.distinctHitSurfaces} | Normalized target surfaces with at least one stored occurrence. |`,
          '',
          `Observed max stored occurrences per target is ${report.dbEvidence.maxStoredOccurrencesPerTarget}; ${report.dbEvidence.targetIdsAtMaxStoredOccurrences} target IDs are at that observed cap.`,
        ]
      : [
          'The SQLite DB was not available, so scanner cap/filter evidence could not be summarized.',
        ]),
    '',
    ...(report.dbEvidence?.hasOccurrenceVariantEvidence
      ? [
          '## Occurrence Variant Counts',
          '',
          '| Variant Kind | Retained Occurrences |',
          '| --- | ---: |',
          ...report.dbEvidence.occurrenceVariantCounts.map(
            (row) => `| ${row.key} | ${row.count} |`,
          ),
          '',
        ]
      : [
          '## Occurrence Variant Counts',
          '',
          'This DB has no `occurrences.variant_kind` / `occurrences.matched_pattern` columns, so it predates scanner-side variant evidence. Rerun `npm run scan:local-corpus` before treating `s ...` or diacritic-fold probes as checked in retained evidence.',
          '',
        ]),
    '## Alternant Handling',
    '',
    report.dbEvidence
      ? `The Rust matcher already expands canonical \`mos të ...\` targets to scan active \`të mos ...\` order; retained SQLite evidence includes ${report.dbEvidence.mosTeTargetsMatchedInTeMosOrder} such target IDs matched in \`të mos ...\` sentences.`
      : 'The Rust matcher expands canonical `mos të ...` targets to scan active `të mos ...` order, but SQLite evidence was unavailable for counts.',
    report.dbEvidence
      ? `Retained sentences include ${report.dbEvidence.retainedSentencesWithSApostrophe} apostrophe-negation examples. New scanner builds can probe normalized \`s ...\` alternants for generated \`nuk ...\` targets, but this existing DB only proves those probes were checked if occurrence variant evidence is present.`
      : 'New scanner builds can probe normalized `s ...` alternants for generated `nuk ...` targets, but SQLite evidence was unavailable for counts.',
    '',
    '## Primary Categories',
    '',
    '| Category | Misses |',
    '| --- | ---: |',
    ...report.primaryCategories.map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '## Evidence Labels',
    '',
    'Labels are overlapping evidence flags, not mutually exclusive cause buckets.',
    '',
    '| Label | Misses |',
    '| --- | ---: |',
    ...report.evidenceLabels.map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '## Duplicate Missed Surfaces',
    '',
    '| Surface | Target Rows | Hit Rows | Miss Rows |',
    '| --- | ---: | ---: | ---: |',
    ...report.duplicateMissSurfaces
      .slice(0, 40)
      .map((row) => `| ${row.key} | ${row.total} | ${row.hit} | ${row.miss} |`),
    '',
    '## Near-Empty Grammatical Cells',
    '',
    '| Cell | Total | Hit | Miss | Hit Rate |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...report.nearEmptyCells
      .slice(0, 40)
      .map(
        (row) =>
          `| ${row.key} | ${row.total} | ${row.hit} | ${row.miss} | ${row.hitRate} |`,
      ),
    '',
    '## Lemma Outliers',
    '',
    '| Lemma | Verb ID | Total | Hit | Miss | Hit Rate |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...report.lemmaOutliers
      .slice(0, 40)
      .map(
        (row) =>
          `| ${row.lemma} | ${row.key} | ${row.total} | ${row.hit} | ${row.miss} | ${row.hitRate} |`,
      ),
    '',
    '## Top Scanner-Variant Probe Candidates',
    '',
    'These are normalized strings the scanner can probe as variants. They only count as checked in a DB that has occurrence variant evidence from a post-variant scan.',
    '',
    '| Normalized Probe | Misses It Could Probe |',
    '| --- | ---: |',
    ...report.variantProbeCandidates
      .slice(0, 40)
      .map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '## Already-Scanned Alternants',
    '',
    'These alternants are already handled by the scanner, so their remaining misses should not be treated as unscanned word-order gaps.',
    '',
    '| Alternant | Misses Still Open |',
    '| --- | ---: |',
    ...report.activeAlternantsAlreadyScanned
      .slice(0, 20)
      .map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '## Unexplained Exact-Absence Sample',
    '',
    '| Target | Lemma | Signature |',
    '| --- | --- | --- |',
    ...report.unexplainedSample
      .slice(0, 40)
      .map((miss) => `| ${miss.targetKey} | ${miss.lemma} | ${miss.signature} |`),
    '',
  ].join('\n');
  writeFileSync(mdOut, md, 'utf8');

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${mdOut}`);
}

main();
