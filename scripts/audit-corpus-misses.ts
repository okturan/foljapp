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
 *   .cache/corpus-missing-dossier.json
 *   .cache/corpus-missing-dossier.md
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
const DEFAULT_DOSSIER_JSON_OUT = join(
  REPO_ROOT,
  '.cache',
  'corpus-missing-dossier.json',
);
const DEFAULT_DOSSIER_MD_OUT = join(
  REPO_ROOT,
  '.cache',
  'corpus-missing-dossier.md',
);

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
  sources?: Array<{ source: string; reference?: string }>;
  cellOverrides?: Record<string, Record<string, string>>;
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

interface VoiceCoverageRow {
  verbId: string;
  lemma: string;
  translationEn: string;
  activeTotal: number;
  activeHit: number;
  activeMiss: number;
  middlePassiveTotal: number;
  middlePassiveHit: number;
  middlePassiveMiss: number;
  middlePassiveHitRate: string;
  sourceLevel: string;
  sources: string[];
  flags: Record<string, unknown>;
  middlePassiveOverrideKeys: string[];
}

interface DbEvidence {
  dbPath: string;
  schemaVersion: string | null;
  indexMode: string | null;
  selectedSources: string | null;
  hasOccurrenceVariantEvidence: boolean;
  occurrenceVariantCounts: CountRow[];
  canonicalHitTargets: number;
  variantHitTargets: number;
  variantOnlyHitTargets: number;
  variantOnlyTargetCounts: CountRow[];
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

function sourceKeys(verb: VerbEntry | undefined): string[] {
  return [...new Set((verb?.sources ?? []).map((source) => source.source))].sort();
}

function sourceLevel(sources: string[]): string {
  if (sources.includes('husic')) return 'husic-backed';
  if (sources.includes('uniparser')) return 'uniparser-backed';
  if (sources.length > 0) return 'lexicon-only';
  return 'unknown-source';
}

function middlePassiveOverrideKeys(verb: VerbEntry | undefined): string[] {
  return Object.keys(verb?.cellOverrides ?? {})
    .filter((key) => key.includes('middle-passive'))
    .sort();
}

function voiceCoverageRows(
  map: Map<
    string,
    {
      activeTotal: number;
      activeHit: number;
      activeMiss: number;
      middlePassiveTotal: number;
      middlePassiveHit: number;
      middlePassiveMiss: number;
    }
  >,
  verbsById: Map<string, VerbEntry>,
): VoiceCoverageRow[] {
  return [...map.entries()]
    .map(([verbId, row]) => {
      const verb = verbsById.get(verbId);
      const sources = sourceKeys(verb);
      return {
        verbId,
        lemma: verb?.lemma ?? verbId,
        translationEn: verb?.translationEn ?? '',
        ...row,
        middlePassiveHitRate: pct(row.middlePassiveHit, row.middlePassiveTotal),
        sourceLevel: sourceLevel(sources),
        sources,
        flags: verb?.flags ?? {},
        middlePassiveOverrideKeys: middlePassiveOverrideKeys(verb),
      };
    })
    .sort(
      (a, b) =>
        b.middlePassiveMiss - a.middlePassiveMiss ||
        a.lemma.localeCompare(b.lemma),
    );
}

function readDbEvidence(dbPath: string): DbEvidence {
  const hasOccurrenceVariantEvidence =
    hasColumn(dbPath, 'occurrences', 'variant_kind') &&
    hasColumn(dbPath, 'occurrences', 'matched_pattern');
  const variantTargetCounts = hasOccurrenceVariantEvidence
    ? sqliteJson<{
        canonical_hit_targets: number;
        variant_hit_targets: number;
        variant_only_hit_targets: number;
      }>(
        dbPath,
        `
        WITH target_variant AS (
          SELECT
            target_id,
            max(CASE WHEN variant_kind = 'canonical' THEN 1 ELSE 0 END) AS canonical_hit,
            max(CASE WHEN variant_kind <> 'canonical' THEN 1 ELSE 0 END) AS variant_hit
          FROM occurrences
          GROUP BY target_id
        )
        SELECT
          coalesce(sum(canonical_hit), 0) AS canonical_hit_targets,
          coalesce(sum(variant_hit), 0) AS variant_hit_targets,
          coalesce(sum(CASE WHEN canonical_hit = 0 AND variant_hit = 1 THEN 1 ELSE 0 END), 0) AS variant_only_hit_targets
        FROM target_variant
        `,
      )[0]
    : null;
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
    canonicalHitTargets: Number(variantTargetCounts?.canonical_hit_targets ?? 0),
    variantHitTargets: Number(variantTargetCounts?.variant_hit_targets ?? 0),
    variantOnlyHitTargets: Number(
      variantTargetCounts?.variant_only_hit_targets ?? 0,
    ),
    variantOnlyTargetCounts: hasOccurrenceVariantEvidence
      ? sqliteJson<VariantCountRow>(
          dbPath,
          `
          WITH target_variant AS (
            SELECT
              target_id,
              max(CASE WHEN variant_kind = 'canonical' THEN 1 ELSE 0 END) AS canonical_hit
            FROM occurrences
            GROUP BY target_id
          )
          SELECT o.variant_kind, count(DISTINCT o.target_id) AS count
          FROM occurrences o
          JOIN target_variant tv ON tv.target_id = o.target_id
          WHERE tv.canonical_hit = 0
            AND o.variant_kind <> 'canonical'
          GROUP BY o.variant_kind
          ORDER BY count(DISTINCT o.target_id) DESC, o.variant_kind ASC
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

function wordOrderAlternants(target: TargetRecord): string[] {
  const out = new Set<string>();
  if (target.tokens[0] === 'mos' && target.tokens[1] === 'të') {
    out.add(['të', 'mos', ...target.tokens.slice(2)].join(' '));
  }
  return [...out].sort();
}

function scannerVariantAlternants(target: TargetRecord): string[] {
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
  scannerVariantsRecorded: boolean,
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
    labels.push(
      scannerVariantsRecorded
        ? 'te_mos_order_scanner_variant_checked'
        : 'te_mos_order_variant_probe',
    );
  }
  if (target.tokens[0] === 'nuk') {
    labels.push(
      scannerVariantsRecorded
        ? 's_negative_scanner_variant_checked'
        : 'apostrophe_negative_variant_probe',
    );
  }
  if (target.targetKey !== noDiacritics(target.targetKey)) {
    labels.push(
      scannerVariantsRecorded
        ? 'diacritic_fold_scanner_variant_checked'
        : 'diacriticless_variant_probe',
    );
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
  if (
    labels.includes('te_mos_order_scanner_variant_checked') ||
    labels.includes('s_negative_scanner_variant_checked') ||
    labels.includes('diacritic_fold_scanner_variant_checked')
  ) {
    return 'scanner_variant_checked_but_absent';
  }
  if (labels.includes('long_exact_phrase')) return 'broader_phrase_search_needed';
  if (labels.includes('lemma_outlier')) return 'lemma_outlier';
  if (labels.includes('duplicate_surface_targets')) return 'duplicate_surface_target';
  if (labels.includes('te_mos_order_variant_probe')) return 'variant_probe_candidate';
  return 'unexplained_exact_absence';
}

function sql(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function lookupSql(miss: {
  targetKey: string;
  verbId: string;
  signature: string;
}): Record<string, string> {
  return {
    exactTarget:
      'SELECT o.variant_kind, o.matched_pattern, t.target_key, t.signature, r.title, s.url, s.sentence ' +
      'FROM occurrences o JOIN targets t ON t.id = o.target_id ' +
      'JOIN sentences s ON s.id = o.sentence_id JOIN resources r ON r.id = s.resource_id ' +
      `WHERE t.target_key = ${sql(miss.targetKey)} ORDER BY o.score DESC LIMIT 10;`,
    sameLemma:
      'SELECT o.variant_kind, o.target_key, t.signature, count(*) occurrences, count(DISTINCT s.resource_id) resources ' +
      'FROM occurrences o JOIN targets t ON t.id = o.target_id JOIN sentences s ON s.id = o.sentence_id ' +
      `WHERE t.verb_id = ${sql(miss.verbId)} ` +
      'GROUP BY o.variant_kind, o.target_key, t.signature ORDER BY occurrences DESC, resources DESC LIMIT 20;',
    sameCell:
      'SELECT o.variant_kind, o.target_key, t.lemma, count(*) occurrences, count(DISTINCT s.resource_id) resources ' +
      'FROM occurrences o JOIN targets t ON t.id = o.target_id JOIN sentences s ON s.id = o.sentence_id ' +
      `WHERE t.signature = ${sql(miss.signature)} ` +
      'GROUP BY o.variant_kind, o.target_key, t.lemma ORDER BY occurrences DESC, resources DESC LIMIT 20;',
  };
}

function cellHitRate(row: { total: number; hit: number }): string {
  return `${row.hit}/${row.total} (${pct(row.hit, row.total)})`;
}

function mdCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
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
  const byLemmaVoice = new Map<
    string,
    {
      activeTotal: number;
      activeHit: number;
      activeMiss: number;
      middlePassiveTotal: number;
      middlePassiveHit: number;
      middlePassiveMiss: number;
    }
  >();

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
    if (target.options.voice === 'active' || target.options.voice === 'middle-passive') {
      const row =
        byLemmaVoice.get(target.verbId) ?? {
          activeTotal: 0,
          activeHit: 0,
          activeMiss: 0,
          middlePassiveTotal: 0,
          middlePassiveHit: 0,
          middlePassiveMiss: 0,
        };
      if (target.options.voice === 'active') {
        row.activeTotal += 1;
        if (missed) row.activeMiss += 1;
        else row.activeHit += 1;
      } else {
        row.middlePassiveTotal += 1;
        if (missed) row.middlePassiveMiss += 1;
        else row.middlePassiveHit += 1;
      }
      byLemmaVoice.set(target.verbId, row);
    }
  }

  const labelCounts = new Map<string, number>();
  const primaryCounts = new Map<string, number>();
  const scannerVariantsRecorded =
    dbEvidence?.schemaVersion === '2' && dbEvidence.hasOccurrenceVariantEvidence;
  const wordOrderAlternantCounts = new Map<string, number>();
  const scannerVariantCounts = new Map<string, number>();
  const auditedMisses = coverage.misses.map((miss) => {
    const target = targetsById.get(miss.id);
    if (!target) throw new Error(`Coverage miss not found in targets: ${miss.id}`);
    const labels = labelMiss(
      target,
      byCell.get(cellKey(target))!,
      byLemma.get(target.verbId)!,
      bySurface.get(target.targetKey)!,
      scannerVariantsRecorded,
    );
    for (const label of labels) add(labelCounts, label);
    const primary = primaryCategory(labels);
    add(primaryCounts, primary);
    const wordOrder = wordOrderAlternants(target);
    const scannerVariants = scannerVariantAlternants(target);
    for (const alternant of wordOrder) add(wordOrderAlternantCounts, alternant);
    for (const alternant of scannerVariants) add(scannerVariantCounts, alternant);
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
      wordOrderAlternants: wordOrder,
      scannerVariantAlternants: scannerVariants,
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
      const sources = sourceKeys(verb);
      return {
        ...row,
        lemma: verb?.lemma ?? row.key,
        translationEn: verb?.translationEn ?? '',
        flags: verb?.flags ?? {},
        sources,
        sourceLevel: sourceLevel(sources),
        middlePassiveOverrideKeys: middlePassiveOverrideKeys(verb),
      };
    });
  const voiceCoverage = voiceCoverageRows(byLemmaVoice, verbsById);
  const middlePassivePressure = voiceCoverage
    .filter(
      (row) =>
        row.middlePassiveTotal > 0 &&
        row.middlePassiveMiss > 0 &&
        !row.flags.noMiddlePassive,
    )
    .map((row) => ({
      ...row,
      activeHitRate: pct(row.activeHit, row.activeTotal),
      needsExternalVoiceCheck:
        row.sourceLevel === 'lexicon-only' &&
        row.middlePassiveOverrideKeys.length === 0,
    }));
  const weakMiddlePassivePressure = middlePassivePressure.filter(
    (row) => row.needsExternalVoiceCheck,
  );
  const sourceCounts = new Map<string, number>();
  for (const verb of verbs) {
    const sources = sourceKeys(verb);
    add(sourceCounts, sourceLevel(sources));
    for (const source of sources) add(sourceCounts, `source:${source}`);
  }

  const unexplained = auditedMisses.filter(
    (miss) => miss.primary === 'unexplained_exact_absence',
  );
  const missesWithWordOrderAlternants = auditedMisses.filter(
    (miss) => miss.wordOrderAlternants.length > 0,
  ).length;
  const missesWithScannerVariantAlternants = auditedMisses.filter(
    (miss) => miss.scannerVariantAlternants.length > 0,
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
      weakMiddlePassivePressureCount: weakMiddlePassivePressure.length,
      noMiddlePassiveFlaggedVerbs: verbs.filter(
        (verb) => verb.flags?.noMiddlePassive,
      ).length,
      verbsWithMiddlePassiveOverrides: verbs.filter(
        (verb) => middlePassiveOverrideKeys(verb).length > 0,
      ).length,
      unexplainedMisses: unexplained.length,
      scannerVariantsRecorded,
      missesWithWordOrderAlternants,
      missesWithScannerVariantAlternants,
    },
    primaryCategories: topEntries(primaryCounts, 20),
    evidenceLabels: topEntries(labelCounts, 40),
    dbEvidence,
    duplicateMissSurfaces: duplicateMissSurfaces.slice(0, 80),
    nearEmptyCells: nearEmptyCells.slice(0, 80),
    lemmaOutliers: lemmaOutliers.slice(0, 80),
    sourceSummary: topEntries(sourceCounts, 40),
    middlePassivePressure: middlePassivePressure.slice(0, 80),
    weakMiddlePassivePressure: weakMiddlePassivePressure.slice(0, 80),
    wordOrderAlternants: topEntries(wordOrderAlternantCounts, 100),
    scannerVariantAlternants: topEntries(scannerVariantCounts, 100),
    unexplainedSample: unexplained.slice(0, 100),
    misses: auditedMisses,
  };

  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const dossierReasons = new Map<string, string[]>();
  const missesById = new Map(auditedMisses.map((miss) => [miss.id, miss]));
  const addDossierMiss = (miss: (typeof auditedMisses)[number], reason: string) => {
    const reasons = dossierReasons.get(miss.id) ?? [];
    if (!reasons.includes(reason)) reasons.push(reason);
    dossierReasons.set(miss.id, reasons);
  };
  const takeDossierMisses = (
    candidates: typeof auditedMisses,
    reason: string,
    maxTotal: number,
    groupKey?: (miss: (typeof auditedMisses)[number]) => string,
    maxPerGroup = 1,
  ) => {
    const byGroup = new Map<string, number>();
    let added = 0;
    for (const miss of candidates) {
      if (added >= maxTotal) break;
      if (dossierReasons.size >= 120) break;
      const group = groupKey?.(miss) ?? miss.id;
      const groupCount = byGroup.get(group) ?? 0;
      if (groupCount >= maxPerGroup) continue;
      addDossierMiss(miss, reason);
      byGroup.set(group, groupCount + 1);
      added += 1;
    }
  };

  const topLemmaOutliers = new Set(
    report.lemmaOutliers.slice(0, 20).map((row) => row.key),
  );
  const topNearEmptyCells = new Set(
    report.nearEmptyCells.slice(0, 20).map((row) => row.key),
  );

  takeDossierMisses(
    unexplained,
    'unexplained exact absence',
    24,
    (miss) => miss.verbId,
    2,
  );
  takeDossierMisses(
    auditedMisses.filter((miss) => topLemmaOutliers.has(miss.verbId)),
    'lemma outlier',
    36,
    (miss) => miss.verbId,
    2,
  );
  takeDossierMisses(
    auditedMisses.filter((miss) => miss.scannerVariantAlternants.length > 0),
    scannerVariantsRecorded
      ? 'scanner variant checked but absent'
      : 'scanner variant probe',
    24,
    (miss) =>
      miss.labels.find((label) => label.includes('scanner_variant')) ??
      miss.labels.find((label) => label.includes('variant_probe')) ??
      miss.primary,
    8,
  );
  takeDossierMisses(
    auditedMisses.filter((miss) =>
      miss.labels.includes('middle_passive_needs_attestation'),
    ),
    'middle-passive attestation check',
    24,
    (miss) => miss.verbId,
    1,
  );
  takeDossierMisses(
    auditedMisses.filter((miss) => topNearEmptyCells.has(miss.cellKey)),
    'near-empty grammatical cell',
    36,
    (miss) => miss.cellKey,
    3,
  );

  const dossierEntries = [...dossierReasons.entries()].map(([id, reasons]) => {
    const miss = missesById.get(id);
    if (!miss) throw new Error(`Dossier miss not found: ${id}`);
    const cell = byCell.get(miss.cellKey) ?? { total: 0, hit: 0, miss: 0 };
    const lemma = byLemma.get(miss.verbId) ?? { total: 0, hit: 0, miss: 0 };
    const verb = verbsById.get(miss.verbId);
    const sources = sourceKeys(verb);
    return {
      priority: reasons,
      targetKey: miss.targetKey,
      lemma: miss.lemma,
      verbId: miss.verbId,
      translationEn: miss.translationEn,
      signature: miss.signature,
      cellKey: miss.cellKey,
      primary: miss.primary,
      labels: miss.labels,
      cellHitRate: cellHitRate(cell),
      lemmaHitRate: cellHitRate(lemma),
      sameLemmaHitTargets: lemma.hit,
      sourceLevel: sourceLevel(sources),
      sources,
      middlePassiveOverrideKeys: middlePassiveOverrideKeys(verb),
      wordOrderAlternants: miss.wordOrderAlternants,
      scannerVariantAlternants: miss.scannerVariantAlternants,
      lookupSql: lookupSql(miss),
    };
  });
  const dossier = {
    generatedAt: report.generatedAt,
    summary: {
      ...report.summary,
      selectedMisses: dossierEntries.length,
    },
    variantCounts: report.dbEvidence?.occurrenceVariantCounts ?? [],
    entries: dossierEntries,
  };
  writeFileSync(
    DEFAULT_DOSSIER_JSON_OUT,
    JSON.stringify(dossier, null, 2) + '\n',
    'utf8',
  );

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
    `- Fully absent in retained evidence: ${report.summary.fullyMissedSurfaces}; mixed hit/miss surfaces: ${report.summary.mixedHitMissSurfaces}`,
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
    `- Scanner variant evidence recorded: ${report.summary.scannerVariantsRecorded ? 'yes' : 'no'}`,
    `- Misses with word-order alternants: ${report.summary.missesWithWordOrderAlternants}`,
    `- Misses with scanner variant alternants: ${report.summary.missesWithScannerVariantAlternants}`,
    `- Near-empty grammatical cells: ${report.summary.nearEmptyCellCount}`,
    `- Lemma outliers at >=75% miss rate: ${report.summary.lemmaOutlierCount}`,
    `- Weakly sourced lemmas with middle-passive miss pressure: ${report.summary.weakMiddlePassivePressureCount}`,
    `- Verbs flagged noMiddlePassive: ${report.summary.noMiddlePassiveFlaggedVerbs}`,
    `- Verbs with explicit middle-passive overrides: ${report.summary.verbsWithMiddlePassiveOverrides}`,
    `- Unexplained exact absences after heuristics: ${report.summary.unexplainedMisses}`,
    '',
    '## Methodology & Caveats',
    '',
    'This audit reads the existing generated target list, coverage report, and optional SQLite example DB. It does not rescan raw corpora.',
    'A target miss is a generated target ID with no retained occurrence. A unique surface miss deduplicates those misses by normalized `targetKey`, so repeated forms across cells or lemmas do not inflate the surface count.',
    'Evidence labels overlap; the primary category is a single prioritized bucket per missed target.',
    'Exact retained absence is not universal raw-corpus absence. Ungenerated alternants, OCR/tokenization variants, filtered examples, and examples dropped by the per-target cap can all remain outside the retained SQLite evidence.',
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
          `| Canonical-hit target IDs | ${report.dbEvidence.canonicalHitTargets} | Target IDs with at least one exact canonical occurrence. |`,
          `| Variant-hit target IDs | ${report.dbEvidence.variantHitTargets} | Target IDs with at least one non-canonical scanner variant occurrence. |`,
          `| Variant-only target IDs | ${report.dbEvidence.variantOnlyHitTargets} | Target IDs whose retained evidence is only non-canonical scanner variants. |`,
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
          '| Variant Kind | Variant-Only Target IDs |',
          '| --- | ---: |',
          ...report.dbEvidence.variantOnlyTargetCounts.map(
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
      ? `Schema-2 Rust scans also record \`s ...\` negative variants and diacritic-fold variants. Retained sentences include ${report.dbEvidence.retainedSentencesWithSApostrophe} apostrophe-negation examples; variant-only hits are lower-confidence evidence than canonical hits.`
      : 'Schema-2 Rust scans also record `s ...` negative variants and diacritic-fold variants, but SQLite evidence was unavailable for counts.',
    '',
    '## Corpus Source Levels',
    '',
    'These are local source tags on generated verb entries. They are not independent proof of voice eligibility, but they show which lemmas need outside morphology checks first.',
    '',
    '| Source Level | Verbs |',
    '| --- | ---: |',
    ...report.sourceSummary
      .filter((row) => !row.key.startsWith('source:'))
      .map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '| Source Tag | Verbs |',
    '| --- | ---: |',
    ...report.sourceSummary
      .filter((row) => row.key.startsWith('source:'))
      .map((row) => `| ${row.key.replace('source:', '')} | ${row.count} |`),
    '',
    '## Middle-Passive Pressure',
    '',
    'These rows are generated-form pressure, not a verdict that a middle-passive is impossible. `needs external check` means the lemma has no Husić/UniParser source tag and no explicit middle-passive override in local data.',
    '',
    '| Lemma | Verb ID | MP Total | MP Hit | MP Miss | MP Hit Rate | Active Hit Rate | Source Level | Needs External Check | MP Overrides |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
    ...report.middlePassivePressure
      .slice(0, 40)
      .map(
        (row) =>
          `| ${row.lemma} | ${row.verbId} | ${row.middlePassiveTotal} | ${row.middlePassiveHit} | ${row.middlePassiveMiss} | ${row.middlePassiveHitRate} | ${row.activeHitRate} | ${row.sourceLevel} | ${row.needsExternalVoiceCheck ? 'yes' : 'no'} | ${row.middlePassiveOverrideKeys.join(', ') || ''} |`,
      ),
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
    '| Lemma | Verb ID | Total | Hit | Miss | Hit Rate | Source Level |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- |',
    ...report.lemmaOutliers
      .slice(0, 40)
      .map(
        (row) =>
          `| ${row.lemma} | ${row.key} | ${row.total} | ${row.hit} | ${row.miss} | ${row.hitRate} | ${row.sourceLevel} |`,
      ),
    '',
    '## Scanner Variant Alternants On Misses',
    '',
    report.summary.scannerVariantsRecorded
      ? 'These normalized alternants were part of the schema-2 scanner surface space. Their remaining misses are retained-evidence absences, not unscanned alternants.'
      : 'These normalized alternants require a schema-2 scan before they can be treated as checked.',
    '',
    '| Normalized Alternant | Misses It Could Probe |',
    '| --- | ---: |',
    ...report.scannerVariantAlternants
      .slice(0, 40)
      .map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '## Word-Order Alternants On Misses',
    '',
    'These `të mos ...` alternants are handled by the scanner for canonical `mos të ...` targets.',
    '',
    '| Alternant | Misses Still Open |',
    '| --- | ---: |',
    ...report.wordOrderAlternants
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

  const dossierMd = [
    '# Corpus Missing Dossier',
    '',
    `Generated: ${dossier.generatedAt}`,
    '',
    'This is a bounded triage view over the aggregate missing-form audit. It does not rescan raw corpora.',
    '',
    '## Summary',
    '',
    `- Selected misses: ${dossier.entries.length}`,
    `- Total target misses: ${report.summary.missedTargets} / ${report.summary.totalTargets}`,
    `- Unique surfaces fully absent in retained evidence: ${report.summary.fullyMissedSurfaces}`,
    `- Scanned candidates: ${report.summary.candidatesSeen}`,
    `- Stored occurrences: ${report.summary.storedOccurrences ?? 'unknown'}`,
    '',
    '## Priority Samples',
    '',
    '| Priority | Target | Lemma | Signature | Cell Hit Rate | Lemma Hit Rate | Primary |',
    '| --- | --- | --- | --- | ---: | ---: | --- |',
    ...dossier.entries.map(
      (entry) =>
        `| ${mdCell(entry.priority.join(', '))} | ${mdCell(entry.targetKey)} | ${mdCell(entry.lemma)} | ${mdCell(entry.signature)} | ${entry.cellHitRate} | ${entry.lemmaHitRate} | ${mdCell(entry.primary)} |`,
    ),
    '',
    '## SQLite Lookup Anchors',
    '',
    'Each JSON dossier entry includes `lookupSql.exactTarget`, `lookupSql.sameLemma`, and `lookupSql.sameCell` for targeted inspection against `.cache/corpus-local-full.sqlite`.',
    '',
    'Example:',
    '',
    '```bash',
    'sqlite3 -readonly .cache/corpus-local-full.sqlite "<lookupSql.sameLemma>"',
    '```',
    '',
  ].join('\n');
  writeFileSync(DEFAULT_DOSSIER_MD_OUT, dossierMd, 'utf8');

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${mdOut}`);
  console.log(`Wrote ${DEFAULT_DOSSIER_JSON_OUT}`);
  console.log(`Wrote ${DEFAULT_DOSSIER_MD_OUT}`);
}

main();
