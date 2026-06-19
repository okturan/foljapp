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
const DEFAULT_MORPHOLOGY = join(
  REPO_ROOT,
  '.cache',
  'external-morphology-audit.json',
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
  generatedAt?: string;
  corpusVersion?: string;
  targets: TargetRecord[];
}

interface CoverageReport {
  targetGeneratedAt?: string;
  corpusVersion?: string;
  summary: {
    totalTargets: number;
    hitTargets: number;
    missedTargets: number;
    candidatesSeen: number;
    totalOccurrences?: number;
    evidenceScope?: string;
    selectedSources?: string | null;
    indexMode?: string | null;
    scannedResources?: number;
  };
  misses: Array<{ id: string; targetKey: string; bucket: string }>;
}

interface ExternalMorphologyAudit {
  run?: {
    generatedAt?: string;
  };
  inputs?: {
    targetGeneratedAt?: string | null;
    coverageTargetGeneratedAt?: string | null;
    corpusVersion?: string | null;
  };
  externalMorphology?: {
    uniparserLexemesStatus?: string;
    analyzerStatus?: string;
    analyzerRowsLoaded?: number;
    analyzerRowsMatched?: number;
    analyzerRowsSkipped?: number;
    analyzerDuplicateRows?: number;
    webCorporaStatus?: string;
  };
  summary?: {
    auditedMissTargets?: number;
    middlePassiveMissTargets?: number;
    lexemeMatchedLemmas?: number;
    analyzerRowMatchedTargets?: number;
    analyzerAnalyzedTargets?: number;
    analyzerNoTokenAnalysisTargets?: number;
    analyzerAcceptedTargets?: number;
  };
  targets?: Array<{
    targetId: string;
    targetKey?: string;
    signature?: string;
    headToken?: string;
    scope?: string;
    verdict?: {
      form?: string;
      voiceEligibility?: string;
      proofLevel?: string;
      reasons?: string[];
      action?: string;
    };
  }>;
}

interface MorphologyTargetVerdict {
  headToken: string | null;
  scope: string | null;
  form: string | null;
  voiceEligibility: string | null;
  proofLevel: string | null;
  reasons: string[];
  action: string | null;
}

interface MorphologyEvidence {
  status: string;
  path: string;
  generatedAt: string | null;
  matchedMissRows: number;
  skippedRows: number;
  duplicateTargetIds: number;
  summary: {
    auditedMissTargets: number | null;
    middlePassiveMissTargets: number | null;
    lexemeMatchedLemmas: number | null;
    analyzerRowMatchedTargets: number | null;
    analyzerAnalyzedTargets: number | null;
    analyzerNoTokenAnalysisTargets: number | null;
    analyzerAcceptedTargets: number | null;
  };
  external: {
    uniparserLexemesStatus: string | null;
    analyzerStatus: string | null;
    analyzerRowsLoaded: number | null;
    analyzerRowsMatched: number | null;
    analyzerRowsSkipped: number | null;
    analyzerDuplicateRows: number | null;
    webCorporaStatus: string | null;
  };
  byTargetId: Map<string, MorphologyTargetVerdict>;
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
  sourceFamilies: SourceFamilyEvidenceRow[];
}

interface OccurrenceDbRow {
  target_id: string;
  target_key: string;
  variant_kind: string | null;
  sentence_id: number;
}

interface ResourceEvidenceRow {
  resource_id: string;
  candidates_seen: number | null;
  sentences_inserted: number | null;
  quality_rejected: number | null;
}

interface SentenceResourceRow {
  id: number;
  resource_id: string;
}

interface SourceFamilyEvidenceRow {
  family: string;
  partitions: number;
  candidatesSeen: number;
  scannerHitSentences: number;
  qualityRejectedCandidates: number;
  retainedSentences: number;
  retainedOccurrences: number;
  hitTargets: number;
  hitSurfaces: number;
}

function valueAfter(prefix: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function requireFreshInputs(targetFile: TargetFile, coverage: CoverageReport): void {
  if (!targetFile.generatedAt) throw new Error('Target file is missing generatedAt');
  if (!targetFile.corpusVersion) throw new Error('Target file is missing corpusVersion');
  if (!coverage.targetGeneratedAt) {
    throw new Error('Coverage report is missing targetGeneratedAt');
  }
  if (!coverage.corpusVersion) throw new Error('Coverage report is missing corpusVersion');
  if (coverage.targetGeneratedAt !== targetFile.generatedAt) {
    throw new Error(
      `Coverage target generation mismatch: ${coverage.targetGeneratedAt} != ${targetFile.generatedAt}`,
    );
  }
  if (coverage.corpusVersion !== targetFile.corpusVersion) {
    throw new Error(
      `Coverage corpus version mismatch: ${coverage.corpusVersion} != ${targetFile.corpusVersion}`,
    );
  }
}

function emptyMorphologyEvidence(
  status: string,
  path: string,
  overrides: Partial<MorphologyEvidence> = {},
): MorphologyEvidence {
  return {
    status,
    path,
    generatedAt: null,
    matchedMissRows: 0,
    skippedRows: 0,
    duplicateTargetIds: 0,
    summary: {
      auditedMissTargets: null,
      middlePassiveMissTargets: null,
      lexemeMatchedLemmas: null,
      analyzerRowMatchedTargets: null,
      analyzerAnalyzedTargets: null,
      analyzerNoTokenAnalysisTargets: null,
      analyzerAcceptedTargets: null,
    },
    external: {
      uniparserLexemesStatus: null,
      analyzerStatus: null,
      analyzerRowsLoaded: null,
      analyzerRowsMatched: null,
      analyzerRowsSkipped: null,
      analyzerDuplicateRows: null,
      webCorporaStatus: null,
    },
    byTargetId: new Map(),
    ...overrides,
  };
}

function readMorphologyEvidence(
  path: string,
  targetFile: TargetFile,
  coverage: CoverageReport,
  targetsById: Map<string, TargetRecord>,
): MorphologyEvidence {
  if (!existsSync(path)) {
    return emptyMorphologyEvidence('missing', path);
  }

  let audit: ExternalMorphologyAudit;
  try {
    audit = readJson<ExternalMorphologyAudit>(path);
  } catch (error) {
    console.warn(
      `Ignoring optional morphology audit at ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return emptyMorphologyEvidence('invalid', path);
  }
  if (!Array.isArray(audit.targets)) {
    console.warn(`Ignoring optional morphology audit at ${path}: missing targets[]`);
    return emptyMorphologyEvidence('invalid', path);
  }
  if (!audit.inputs?.targetGeneratedAt) {
    throw new Error(`Morphology audit is missing inputs.targetGeneratedAt: ${path}`);
  }
  if (!audit.inputs.coverageTargetGeneratedAt) {
    throw new Error(`Morphology audit is missing inputs.coverageTargetGeneratedAt: ${path}`);
  }
  if (!audit.inputs.corpusVersion) {
    throw new Error(`Morphology audit is missing inputs.corpusVersion: ${path}`);
  }
  if (audit.inputs.targetGeneratedAt !== targetFile.generatedAt) {
    throw new Error(
      `Morphology target generation mismatch: ${audit.inputs.targetGeneratedAt} != ${targetFile.generatedAt}`,
    );
  }
  if (audit.inputs.coverageTargetGeneratedAt !== coverage.targetGeneratedAt) {
    throw new Error(
      `Morphology coverage generation mismatch: ${audit.inputs.coverageTargetGeneratedAt} != ${coverage.targetGeneratedAt}`,
    );
  }
  if (audit.inputs.corpusVersion !== targetFile.corpusVersion) {
    throw new Error(
      `Morphology corpus version mismatch: ${audit.inputs.corpusVersion} != ${targetFile.corpusVersion}`,
    );
  }

  const byTargetId = new Map<string, MorphologyTargetVerdict>();
  const skippedRows = 0;
  const duplicateTargetIds = 0;
  for (const target of audit.targets ?? []) {
    if (!target.targetId) throw new Error(`Morphology audit row is missing targetId: ${path}`);
    if (!target.targetKey) throw new Error(`Morphology audit row is missing targetKey: ${path}`);
    if (!target.signature) throw new Error(`Morphology audit row is missing signature: ${path}`);
    const current = targetsById.get(target.targetId);
    if (!current) {
      throw new Error(`Morphology audit has unknown targetId ${target.targetId}: ${path}`);
    }
    if (target.targetKey !== current.targetKey || target.signature !== current.signature) {
      throw new Error(`Morphology audit stale row for ${target.targetId}: ${path}`);
    }
    if (byTargetId.has(target.targetId)) {
      throw new Error(`Morphology audit has duplicate targetId ${target.targetId}: ${path}`);
    }
    byTargetId.set(target.targetId, {
      headToken: target.headToken ?? null,
      scope: target.scope ?? null,
      form: target.verdict?.form ?? null,
      voiceEligibility: target.verdict?.voiceEligibility ?? null,
      proofLevel: target.verdict?.proofLevel ?? null,
      reasons: Array.isArray(target.verdict?.reasons) ? target.verdict.reasons : [],
      action: target.verdict?.action ?? null,
    });
  }

  return {
    status: 'loaded',
    path,
    generatedAt: audit.run?.generatedAt ?? null,
    matchedMissRows: byTargetId.size,
    skippedRows,
    duplicateTargetIds,
    summary: {
      auditedMissTargets: audit.summary?.auditedMissTargets ?? null,
      middlePassiveMissTargets: audit.summary?.middlePassiveMissTargets ?? null,
      lexemeMatchedLemmas: audit.summary?.lexemeMatchedLemmas ?? null,
      analyzerRowMatchedTargets: audit.summary?.analyzerRowMatchedTargets ?? null,
      analyzerAnalyzedTargets: audit.summary?.analyzerAnalyzedTargets ?? null,
      analyzerNoTokenAnalysisTargets:
        audit.summary?.analyzerNoTokenAnalysisTargets ?? null,
      analyzerAcceptedTargets: audit.summary?.analyzerAcceptedTargets ?? null,
    },
    external: {
      uniparserLexemesStatus:
        audit.externalMorphology?.uniparserLexemesStatus ?? null,
      analyzerStatus: audit.externalMorphology?.analyzerStatus ?? null,
      analyzerRowsLoaded: audit.externalMorphology?.analyzerRowsLoaded ?? null,
      analyzerRowsMatched: audit.externalMorphology?.analyzerRowsMatched ?? null,
      analyzerRowsSkipped: audit.externalMorphology?.analyzerRowsSkipped ?? null,
      analyzerDuplicateRows:
        audit.externalMorphology?.analyzerDuplicateRows ?? null,
      webCorporaStatus: audit.externalMorphology?.webCorporaStatus ?? null,
    },
    byTargetId,
  };
}

function sqliteJson<T>(dbPath: string, sql: string): T[] {
  const output = execFileSync(
    'sqlite3',
    ['-readonly', '-cmd', '.timeout 5000', '-json', dbPath, sql],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 64,
    },
  ).trim();
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

function resourceFamily(resourceId: string): string {
  if (resourceId.startsWith('hplt-v3-')) return 'HPLT v3';
  if (resourceId.startsWith('mc4-')) return 'mC4';
  if (resourceId.startsWith('opus-')) return 'OPUS';
  if (resourceId.startsWith('fineweb2-')) return 'FineWeb2';
  if (resourceId.startsWith('macocu-')) return 'MaCoCu';
  if (resourceId.startsWith('cc100-')) return 'CC100';
  if (resourceId.startsWith('hf-')) return 'Hugging Face';
  if (resourceId.startsWith('wikimedia-')) return 'Wikimedia';
  if (resourceId.startsWith('leipzig-')) return 'Leipzig';
  if (resourceId.startsWith('seeuniversity-')) return 'SEEUniversity';
  if (resourceId.startsWith('tatoeba-')) return 'Tatoeba';
  if (resourceId.startsWith('ud-')) return 'Universal Dependencies';
  const hashIndex = resourceId.indexOf('#');
  return hashIndex === -1 ? resourceId : resourceId.slice(0, hashIndex);
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

function readDbEvidence(dbPath: string, currentTargetIds: Set<string>): DbEvidence {
  const hasOccurrenceVariantEvidence =
    hasColumn(dbPath, 'occurrences', 'variant_kind') &&
    hasColumn(dbPath, 'occurrences', 'matched_pattern');
  const variantColumn = hasOccurrenceVariantEvidence
    ? 'variant_kind'
    : "'canonical' AS variant_kind";
  const retainedOccurrences = sqliteJson<OccurrenceDbRow>(
    dbPath,
    `
    SELECT target_id, target_key, ${variantColumn}, sentence_id
    FROM occurrences
    `,
  ).filter((row) => currentTargetIds.has(row.target_id));

  const sentenceIds = new Set(retainedOccurrences.map((row) => row.sentence_id));
  const targetKeys = new Set(retainedOccurrences.map((row) => row.target_key));
  const occurrencesByTarget = new Map<
    string,
    { count: number; canonical: boolean; variants: Set<string> }
  >();
  const occurrenceVariantCounts = new Map<string, number>();

  for (const row of retainedOccurrences) {
    const variantKind = row.variant_kind ?? 'canonical';
    add(occurrenceVariantCounts, variantKind);
    const target = occurrencesByTarget.get(row.target_id) ?? {
      count: 0,
      canonical: false,
      variants: new Set<string>(),
    };
    target.count += 1;
    if (variantKind === 'canonical') {
      target.canonical = true;
    } else {
      target.variants.add(variantKind);
    }
    occurrencesByTarget.set(row.target_id, target);
  }

  let canonicalHitTargets = 0;
  let variantHitTargets = 0;
  let variantOnlyHitTargets = 0;
  let maxStoredOccurrencesPerTarget = 0;
  const variantOnlyTargetCounts = new Map<string, number>();

  for (const target of occurrencesByTarget.values()) {
    if (target.canonical) canonicalHitTargets += 1;
    if (target.variants.size > 0) variantHitTargets += 1;
    if (!target.canonical && target.variants.size > 0) {
      variantOnlyHitTargets += 1;
      for (const variantKind of target.variants) {
        add(variantOnlyTargetCounts, variantKind);
      }
    }
    maxStoredOccurrencesPerTarget = Math.max(
      maxStoredOccurrencesPerTarget,
      target.count,
    );
  }

  const teMosSentenceIds = new Set(
    sqliteJson<{ id: number }>(
      dbPath,
      "SELECT id FROM sentences WHERE normalized LIKE '%të mos %'",
    ).map((row) => row.id),
  );
  const mosTeTargetsMatchedInTeMosOrder = new Set(
    retainedOccurrences
      .filter(
        (row) =>
          row.target_key.startsWith('mos të ') && teMosSentenceIds.has(row.sentence_id),
      )
      .map((row) => row.target_id),
  ).size;
  const sApostropheSentenceIds = new Set(
    sqliteJson<{ id: number }>(
      dbPath,
      "SELECT id FROM sentences WHERE sentence LIKE '%s''%' OR sentence LIKE '%s’%'",
    ).map((row) => row.id),
  );
  const familyRows = sqliteJson<ResourceEvidenceRow>(
    dbPath,
    `
    SELECT
      r.id AS resource_id,
      rs.candidates_seen,
      rs.sentences_inserted,
      rs.quality_rejected
    FROM resources r
    LEFT JOIN resource_stats rs ON rs.resource_id = r.id
    GROUP BY r.id
    `,
  );
  const sentenceResources = new Map(
    sqliteJson<SentenceResourceRow>(
      dbPath,
      'SELECT id, resource_id FROM sentences',
    ).map((row) => [row.id, row.resource_id]),
  );
  const familyTargets = new Map<string, Set<string>>();
  const familySurfaces = new Map<string, Set<string>>();
  const familySentences = new Map<string, Set<number>>();
  const familyEvidence = new Map<string, SourceFamilyEvidenceRow>();
  for (const row of familyRows) {
    const family = resourceFamily(row.resource_id);
    const current =
      familyEvidence.get(family) ?? {
        family,
        partitions: 0,
        candidatesSeen: 0,
        scannerHitSentences: 0,
        qualityRejectedCandidates: 0,
        retainedSentences: 0,
        retainedOccurrences: 0,
        hitTargets: 0,
        hitSurfaces: 0,
      };
    current.partitions += 1;
    current.candidatesSeen += row.candidates_seen ?? 0;
    current.scannerHitSentences += row.sentences_inserted ?? 0;
    current.qualityRejectedCandidates += row.quality_rejected ?? 0;
    familyEvidence.set(family, current);
  }
  for (const occurrence of retainedOccurrences) {
    const resourceId = sentenceResources.get(occurrence.sentence_id);
    if (!resourceId) continue;
    const family = resourceFamily(resourceId);
    const current =
      familyEvidence.get(family) ?? {
        family,
        partitions: 0,
        candidatesSeen: 0,
        scannerHitSentences: 0,
        qualityRejectedCandidates: 0,
        retainedSentences: 0,
        retainedOccurrences: 0,
        hitTargets: 0,
        hitSurfaces: 0,
      };
    const sentences = familySentences.get(family) ?? new Set<number>();
    const targets = familyTargets.get(family) ?? new Set<string>();
    const surfaces = familySurfaces.get(family) ?? new Set<string>();
    sentences.add(occurrence.sentence_id);
    targets.add(occurrence.target_id);
    surfaces.add(occurrence.target_key);
    current.retainedOccurrences += 1;
    familySentences.set(family, sentences);
    familyTargets.set(family, targets);
    familySurfaces.set(family, surfaces);
    familyEvidence.set(family, current);
  }
  for (const row of familyEvidence.values()) {
    row.retainedSentences = familySentences.get(row.family)?.size ?? 0;
    row.hitTargets = familyTargets.get(row.family)?.size ?? 0;
    row.hitSurfaces = familySurfaces.get(row.family)?.size ?? 0;
  }

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
      ? topEntries(occurrenceVariantCounts, occurrenceVariantCounts.size)
      : [],
    canonicalHitTargets,
    variantHitTargets,
    variantOnlyHitTargets,
    variantOnlyTargetCounts: hasOccurrenceVariantEvidence
      ? topEntries(variantOnlyTargetCounts, variantOnlyTargetCounts.size)
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
    retainedSentences: sentenceIds.size,
    retainedOccurrences: retainedOccurrences.length,
    distinctHitTargets: occurrencesByTarget.size,
    distinctHitSurfaces: targetKeys.size,
    maxStoredOccurrencesPerTarget,
    targetIdsAtMaxStoredOccurrences:
      maxStoredOccurrencesPerTarget === 0
        ? 0
        : [...occurrencesByTarget.values()].filter(
            (target) => target.count === maxStoredOccurrencesPerTarget,
          ).length,
    mosTeTargetsMatchedInTeMosOrder,
    retainedSentencesWithSApostrophe: [...sentenceIds].filter((sentenceId) =>
      sApostropheSentenceIds.has(sentenceId),
    ).length,
    sourceFamilies: [...familyEvidence.values()].sort(
      (a, b) =>
        b.retainedOccurrences - a.retainedOccurrences ||
        b.candidatesSeen - a.candidatesSeen ||
        a.family.localeCompare(b.family),
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
  morphology: MorphologyTargetVerdict | undefined,
): string[] {
  const labels: string[] = [];
  const o = target.options;
  const hitRate = cell.total === 0 ? 0 : cell.hit / cell.total;
  const lemmaMissRate = lemma.total === 0 ? 0 : lemma.miss / lemma.total;

  if (o.voice === 'middle-passive') labels.push('middle_passive_needs_attestation');
  if (cell.total >= 100 && cell.hit <= 3) labels.push('near_empty_grammatical_cell');
  else if (cell.total >= 100 && hitRate < 0.1) labels.push('low_coverage_grammatical_cell');
  if (o.voice === 'active' && o.mood === 'admirative' && o.tense === 'present') {
    labels.push('rare_admirative_present');
  }
  if (o.mood === 'admirative' && o.tense !== 'present') {
    labels.push('rare_admirative_nonpresent');
  }
  if (o.voice === 'active' && o.mood === 'optative' && o.tense === 'present') {
    labels.push('rare_optative_present');
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

  if (morphology?.form === 'analyzer_accepted') {
    labels.push(
      target.tokens.length === 1
        ? 'analyzer_accepted_exact_absence'
        : 'analyzer_accepted_head_token_absence',
    );
  }
  if (labels.length > 0) return labels;
  if (target.tokens.length > 1 && morphology?.scope === 'head-token-only') {
    labels.push('component_morphology_only_exact_absence');
  }
  if (morphology?.form === 'not_validated') {
    labels.push('morphology_not_validated_exact_absence');
  }
  if (labels.length > 0) return labels;
  return ['unexplained_exact_absence'];
}

function primaryCategory(labels: string[]): string {
  if (labels.includes('middle_passive_needs_attestation')) {
    return 'needs_middle_passive_attestation';
  }
  if (labels.includes('near_empty_grammatical_cell')) return 'near_empty_cell';
  if (
    labels.includes('rare_admirative_present') ||
    labels.includes('rare_admirative_nonpresent') ||
    labels.includes('rare_optative_present') ||
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
  if (labels.includes('analyzer_accepted_exact_absence')) {
    return 'analyzer_valid_exact_absence';
  }
  if (labels.includes('component_morphology_only_exact_absence')) {
    return 'component_valid_phrase_absence';
  }
  if (labels.includes('morphology_not_validated_exact_absence')) {
    return 'morphology_unvalidated_exact_absence';
  }
  return 'unexplained_exact_absence';
}

function analyzerAcceptedClass(miss: {
  labels: string[];
  cellKey: string;
}): string {
  if (miss.cellKey.includes('.middle-passive.')) return 'middle-passive';
  if (
    miss.cellKey.startsWith('admirative.') ||
    miss.cellKey.startsWith('optative.')
  ) {
    return 'active rare mood: admirative/optative';
  }
  if (miss.labels.includes('analyzer_accepted_head_token_absence')) {
    return 'other multiword active';
  }
  return 'other single-token active';
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
  const morphologyPath = valueAfter('--morphology=') ?? DEFAULT_MORPHOLOGY;
  const jsonOut = valueAfter('--json=') ?? DEFAULT_JSON_OUT;
  const mdOut = valueAfter('--md=') ?? DEFAULT_MD_OUT;
  const dossierJsonOut = valueAfter('--dossier-json=') ?? DEFAULT_DOSSIER_JSON_OUT;
  const dossierMdOut = valueAfter('--dossier-md=') ?? DEFAULT_DOSSIER_MD_OUT;

  const targetFile = readJson<TargetFile>(targetsPath);
  const coverage = readJson<CoverageReport>(coveragePath);
  requireFreshInputs(targetFile, coverage);
  const verbs = readJson<VerbEntry[]>(verbsPath);
  const targetsById = new Map(targetFile.targets.map((target) => [target.id, target]));
  const dbEvidence = existsSync(dbPath)
    ? readDbEvidence(dbPath, new Set(targetsById.keys()))
    : null;
  const morphologyEvidence = readMorphologyEvidence(
    morphologyPath,
    targetFile,
    coverage,
    targetsById,
  );
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
    const morphology = morphologyEvidence.byTargetId.get(target.id);
    const labels = labelMiss(
      target,
      byCell.get(cellKey(target))!,
      byLemma.get(target.verbId)!,
      bySurface.get(target.targetKey)!,
      scannerVariantsRecorded,
      morphology,
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
      morphologyAction: morphology?.action ?? null,
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
  const primaryCategoryDetails = topEntries(primaryCounts, 20).map((primary) => {
    const rows = auditedMisses.filter((miss) => miss.primary === primary.key);
    const labels = new Map<string, number>();
    for (const row of rows) {
      for (const label of row.labels) add(labels, label);
    }
    return {
      primary: primary.key,
      count: primary.count,
      labels: topEntries(labels, 5),
      samples: rows.slice(0, 5).map((row) => ({
        targetKey: row.targetKey,
        lemma: row.lemma,
        signature: row.signature,
      })),
    };
  });
  const analyzerAcceptedMisses = auditedMisses.filter(
    (miss) =>
      miss.labels.includes('analyzer_accepted_exact_absence') ||
      miss.labels.includes('analyzer_accepted_head_token_absence'),
  );
  const analyzerAcceptedPrimaryCounts = new Map<string, number>();
  const analyzerAcceptedCellCounts = new Map<string, number>();
  const analyzerAcceptedLemmaCounts = new Map<string, number>();
  const analyzerAcceptedScopeCounts = new Map<string, number>();
  const analyzerAcceptedClassCounts = new Map<string, number>();
  for (const miss of analyzerAcceptedMisses) {
    add(analyzerAcceptedPrimaryCounts, miss.primary);
    add(analyzerAcceptedCellCounts, miss.cellKey);
    add(analyzerAcceptedLemmaCounts, miss.verbId);
    add(analyzerAcceptedClassCounts, analyzerAcceptedClass(miss));
    add(
      analyzerAcceptedScopeCounts,
      miss.labels.includes('analyzer_accepted_exact_absence')
        ? 'single-token'
        : 'head-token-only',
    );
  }
  const analyzerAcceptedSamples = (rows: typeof analyzerAcceptedMisses) =>
    rows.slice(0, 4).map((row) => ({
      targetKey: row.targetKey,
      lemma: row.lemma,
      signature: row.signature,
      primary: row.primary,
    }));
  const analyzerAcceptedByCell = topEntries(analyzerAcceptedCellCounts, 20).map(
    (row) => ({
      ...row,
      samples: analyzerAcceptedSamples(
        analyzerAcceptedMisses.filter((miss) => miss.cellKey === row.key),
      ),
    }),
  );
  const analyzerAcceptedByLemma = topEntries(analyzerAcceptedLemmaCounts, 20).map(
    (row) => {
      const verb = verbsById.get(row.key);
      return {
        ...row,
        lemma: verb?.lemma ?? row.key,
        translationEn: verb?.translationEn ?? '',
        sourceLevel: sourceLevel(sourceKeys(verb)),
        samples: analyzerAcceptedSamples(
          analyzerAcceptedMisses.filter((miss) => miss.verbId === row.key),
        ),
      };
    },
  );
  const worklistSamples = (rows: typeof auditedMisses) =>
    rows.slice(0, 5).map((row) => ({
      targetKey: row.targetKey,
      lemma: row.lemma,
      signature: row.signature,
      primary: row.primary,
    }));
  const worklistRow = (
    key: string,
    title: string,
    basis: string,
    rows: typeof auditedMisses,
  ) => ({
    key,
    title,
    basis,
    targetCount: rows.length,
    lemmaCount: new Set(rows.map((row) => row.verbId)).size,
    samples: worklistSamples(rows),
  });
  const reviewWorklist = [
    worklistRow(
      'keep_rare_valid_unattested',
      'Keep rare-valid forms unless policy changes',
      'UniParser accepts these missing forms; current evidence says they are valid-looking but unattested in retained examples, not wrong.',
      analyzerAcceptedMisses.filter(
        (miss) =>
          analyzerAcceptedClass(miss) === 'active rare mood: admirative/optative',
      ),
    ),
    worklistRow(
      'review_middle_passive_voice_eligibility',
      'Review middle-passive voice eligibility by lemma',
      'These misses all come from generated middle-passive cells; inspect lemma voice semantics, local flags, and external morphology before suppressing output.',
      auditedMisses.filter((miss) => miss.primary === 'needs_middle_passive_attestation'),
    ),
    worklistRow(
      'review_scanner_variant_absences',
      'Review checked scanner variants only when examples are needed',
      'The Rust scan already checked configured word-order, apostrophe-negative, or diacritic-fold variants; remaining absences may need broader phrase search rather than generation changes.',
      auditedMisses.filter(
        (miss) => miss.primary === 'scanner_variant_checked_but_absent',
      ),
    ),
    worklistRow(
      'review_near_empty_cells',
      'Treat near-empty grammatical cells as grammar-wide rarity first',
      'These cells have very low corpus yield across many lemmas, so they are better reviewed as cell-level rarity than as isolated verb bugs.',
      auditedMisses.filter((miss) => miss.primary === 'near_empty_cell'),
    ),
    worklistRow(
      'review_lemma_outliers',
      'Inspect lemma-level source/status outliers',
      'These lemmas have unusually high miss pressure relative to their generated target count.',
      auditedMisses.filter((miss) => miss.primary === 'lemma_outlier'),
    ),
    worklistRow(
      'review_component_valid_phrases',
      'Check full phrases whose head/component is morphologically supported',
      'Morphology evidence supports the token or lemma component, but retained corpus evidence does not attest the full generated phrase.',
      auditedMisses.filter((miss) => miss.primary === 'component_valid_phrase_absence'),
    ),
  ].filter((row) => row.targetCount > 0);
  const middlePassiveReviewActionCounts = new Map<string, number>();
  const middlePassiveReviewMisses = auditedMisses.filter(
    (miss) => miss.primary === 'needs_middle_passive_attestation',
  );
  for (const miss of middlePassiveReviewMisses) {
    add(middlePassiveReviewActionCounts, miss.morphologyAction ?? 'unknown');
  }
  const middlePassiveReviewActions = topEntries(
    middlePassiveReviewActionCounts,
    20,
  ).map((row) => {
    const rows = middlePassiveReviewMisses.filter(
      (miss) => (miss.morphologyAction ?? 'unknown') === row.key,
    );
    return {
      ...row,
      lemmaCount: new Set(rows.map((miss) => miss.verbId)).size,
      samples: worklistSamples(rows),
    };
  });
  const middlePassiveReviewLemmas = middlePassiveReviewActions.map((action) => {
    const actionRows = middlePassiveReviewMisses.filter(
      (miss) => (miss.morphologyAction ?? 'unknown') === action.key,
    );
    const lemmaCounts = new Map<string, number>();
    for (const miss of actionRows) add(lemmaCounts, miss.verbId);
    return {
      action: action.key,
      lemmas: topEntries(lemmaCounts, 6).map((row) => {
        const verb = verbsById.get(row.key);
        const rows = actionRows.filter((miss) => miss.verbId === row.key);
        return {
          verbId: row.key,
          lemma: verb?.lemma ?? row.key,
          count: row.count,
          sourceLevel: sourceLevel(sourceKeys(verb)),
          samples: worklistSamples(rows),
        };
      }),
    };
  });
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
      evidenceScope:
        coverage.summary.evidenceScope ??
        (dbEvidence?.selectedSources === 'all'
          ? 'all-configured-downloaded-resources'
          : 'selected-source-subset'),
      selectedSources: coverage.summary.selectedSources ?? dbEvidence?.selectedSources ?? null,
      indexMode: coverage.summary.indexMode ?? dbEvidence?.indexMode ?? null,
      scannedResources: coverage.summary.scannedResources ?? dbEvidence?.scannedResources ?? null,
      candidatesSeen: coverage.summary.candidatesSeen,
      storedSentences: dbEvidence?.retainedSentences ?? null,
      storedOccurrences: coverage.summary.totalOccurrences ?? dbEvidence?.retainedOccurrences ?? null,
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
      morphologyStatus: morphologyEvidence.status,
      morphologyMatchedMissTargets: morphologyEvidence.matchedMissRows,
      morphologyAnalyzerRowsLoaded:
        morphologyEvidence.external.analyzerRowsLoaded ?? null,
      morphologyAnalyzerRowsMatched:
        morphologyEvidence.external.analyzerRowsMatched ?? null,
      morphologyAnalyzerRowsSkipped:
        morphologyEvidence.external.analyzerRowsSkipped ?? null,
      morphologyAnalyzerAnalyzedTargets:
        morphologyEvidence.summary.analyzerAnalyzedTargets ?? null,
      morphologyAnalyzerAcceptedTargets:
        morphologyEvidence.summary.analyzerAcceptedTargets ?? null,
      morphologyAnalyzerNoTokenAnalysisTargets:
        morphologyEvidence.summary.analyzerNoTokenAnalysisTargets ?? null,
    },
    primaryCategories: topEntries(primaryCounts, 20),
    primaryCategoryDetails,
    analyzerAcceptedMisses: {
      total: analyzerAcceptedMisses.length,
      byScope: topEntries(analyzerAcceptedScopeCounts, 10),
      byClass: topEntries(analyzerAcceptedClassCounts, 10),
      byPrimary: topEntries(analyzerAcceptedPrimaryCounts, 10),
      byCell: analyzerAcceptedByCell,
      byLemma: analyzerAcceptedByLemma,
      samples: analyzerAcceptedSamples(analyzerAcceptedMisses),
    },
    reviewWorklist,
    middlePassiveReviewActions,
    middlePassiveReviewLemmas,
    evidenceLabels: topEntries(labelCounts, 40),
    dbEvidence,
    duplicateMissSurfaces: duplicateMissSurfaces.slice(0, 80),
    nearEmptyCells: nearEmptyCells.slice(0, 80),
    lemmaOutliers: lemmaOutliers.slice(0, 80),
    sourceSummary: topEntries(sourceCounts, 40),
    middlePassivePressure: middlePassivePressure.slice(0, 80),
    weakMiddlePassivePressure: weakMiddlePassivePressure.slice(0, 80),
    morphologyEvidence: {
      status: morphologyEvidence.status,
      path: morphologyEvidence.path,
      generatedAt: morphologyEvidence.generatedAt,
      matchedMissRows: morphologyEvidence.matchedMissRows,
      skippedRows: morphologyEvidence.skippedRows,
      duplicateTargetIds: morphologyEvidence.duplicateTargetIds,
      summary: morphologyEvidence.summary,
      external: morphologyEvidence.external,
    },
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
    auditedMisses.filter((miss) =>
      miss.labels.includes('analyzer_accepted_exact_absence') ||
      miss.labels.includes('analyzer_accepted_head_token_absence'),
    ),
    'evidence: analyzer-accepted missing form',
    24,
    (miss) => miss.verbId,
    2,
  );
  takeDossierMisses(
    auditedMisses.filter((miss) =>
      miss.labels.includes('component_morphology_only_exact_absence'),
    ),
    'evidence: component-valid phrase absence',
    12,
    (miss) => miss.cellKey,
    3,
  );
  takeDossierMisses(
    auditedMisses.filter((miss) => miss.primary === 'lemma_outlier'),
    'primary: lemma outlier',
    24,
    (miss) => miss.verbId,
    3,
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
    const morphology = morphologyEvidence.byTargetId.get(id);
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
      morphology: morphology
        ? {
            scope: morphology.scope,
            headToken: morphology.headToken,
            form: morphology.form,
            voiceEligibility: morphology.voiceEligibility,
            proofLevel: morphology.proofLevel,
            reasons: morphology.reasons,
            action: morphology.action,
          }
        : null,
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
  mkdirSync(dirname(dossierJsonOut), { recursive: true });
  writeFileSync(dossierJsonOut, JSON.stringify(dossier, null, 2) + '\n', 'utf8');

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
    `- Evidence scope: ${report.summary.evidenceScope}`,
    `- Selected sources: ${report.summary.selectedSources ?? 'unknown'}`,
    `- Index mode: ${report.summary.indexMode ?? 'unknown'}`,
    `- Resource partitions: ${report.summary.scannedResources ?? 'unknown'}`,
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
    `- External morphology audit: ${report.summary.morphologyStatus}; joined target verdicts: ${report.summary.morphologyMatchedMissTargets}`,
    `- Unexplained exact absences after heuristics: ${report.summary.unexplainedMisses}`,
    '',
    '## Methodology & Caveats',
    '',
    'This audit reads the existing generated target list, coverage report, and optional SQLite example DB. It does not rescan raw corpora.',
    'A target miss is a generated target ID with no retained occurrence. A unique surface miss deduplicates those misses by normalized `targetKey`, so repeated forms across cells or lemmas do not inflate the surface count.',
    'Evidence labels overlap; the primary category is a single prioritized bucket per missed target.',
    'Exact retained absence is not universal raw-corpus absence. Ungenerated alternants, OCR/tokenization variants, filtered examples, and examples dropped by the per-target cap can all remain outside the retained SQLite evidence.',
    'External morphology verdicts, when present, are review hints only. They do not change hit/miss counts and do not prove corpus attestation or impossibility.',
    '`analyzer_valid_exact_absence` means UniParser accepted the exact single-token form. `component_valid_phrase_absence` means the target is a multiword phrase where only the head token or lemma has morphology evidence.',
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
          `| Raw candidates seen | ${report.dbEvidence.candidatesSeen} | Candidates streamed by scanner workers for the selected source scope. |`,
          `| Rejected before target match | ${report.dbEvidence.unmatchedRejectedCandidates} | Candidates with no generated target match. |`,
          `| Rejected by quality filters | ${report.dbEvidence.qualityRejectedCandidates} | Target-matching candidates dropped before retention. |`,
          `| Scanner-emitted hit sentences after saturation suppression | ${report.dbEvidence.matchedSentenceCandidatesBeforeWriterCap} | Worker-emitted hit sentences after globally capped target IDs are suppressed and before final SQLite occurrence insertion checks. |`,
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
    ...(report.dbEvidence
      ? [
          '## Corpus Source-Family Contribution',
          '',
          'These rows group current SQLite resources by downloaded corpus family. Candidate and scanner-hit counts come from `resource_stats`; retained counts come from stored SQLite sentences and occurrences.',
          '',
          '| Family | Partitions | Candidates Seen | Scanner-Hit Sentences | Quality Rejected | Retained Sentences | Retained Occurrences | Hit Targets | Hit Surfaces |',
          '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
          ...report.dbEvidence.sourceFamilies.map(
            (row) =>
              `| ${row.family} | ${row.partitions} | ${row.candidatesSeen} | ${row.scannerHitSentences} | ${row.qualityRejectedCandidates} | ${row.retainedSentences} | ${row.retainedOccurrences} | ${row.hitTargets} | ${row.hitSurfaces} |`,
          ),
          '',
          'Family contribution is aggregate evidence only. The current examples DB intentionally caps retained occurrences per target, so this table should not be read as raw-corpus diversity for any one form.',
          '',
        ]
      : []),
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
    '## External Morphology Evidence',
    '',
    `Status: ${report.morphologyEvidence.status}`,
    `Path: ${report.morphologyEvidence.path}`,
    `Generated: ${report.morphologyEvidence.generatedAt ?? 'unknown'}`,
    `Matched miss rows: ${report.morphologyEvidence.matchedMissRows}`,
    `Skipped stale/invalid rows: ${report.morphologyEvidence.skippedRows}`,
    `Duplicate target IDs skipped: ${report.morphologyEvidence.duplicateTargetIds}`,
    `Analyzer status: ${report.morphologyEvidence.external.analyzerStatus ?? 'unknown'}`,
    `Analyzer rows loaded: ${report.morphologyEvidence.external.analyzerRowsLoaded ?? 'unknown'}`,
    `Analyzer rows matched: ${report.morphologyEvidence.external.analyzerRowsMatched ?? 'unknown'}`,
    `Analyzer skipped rows: ${report.morphologyEvidence.external.analyzerRowsSkipped ?? 'unknown'}`,
    `Analyzer accepted targets: ${report.morphologyEvidence.summary.analyzerAcceptedTargets ?? 'unknown'}`,
    `Analyzer analyzed targets: ${report.morphologyEvidence.summary.analyzerAnalyzedTargets ?? 'unknown'}`,
    `Analyzer no-token-analysis targets: ${report.morphologyEvidence.summary.analyzerNoTokenAnalysisTargets ?? 'unknown'}`,
    `UniParser lexeme status: ${report.morphologyEvidence.external.uniparserLexemesStatus ?? 'unknown'}`,
    `Lexeme-matched lemmas in morphology artifact: ${report.morphologyEvidence.summary.lexemeMatchedLemmas ?? 'unknown'}`,
    '',
    'Joined morphology fields are copied into the compact dossier by target ID when `.cache/external-morphology-audit.json` exists. They explain why a generated miss deserves review; they do not prove that a form is used in real text, and they do not prove that a form is impossible.',
    '`proofLevel` describes the strength of the morphology evidence. `local-source` means foljapp-internal verb data only. `lexeme` or `analyzer` evidence, when present, means an external morphology source recognized the lemma or token, not that the full generated phrase is corpus-attested.',
    'For multiword targets, `scope=head-token-only` or `tokens-only` means the review covers component tokens rather than the whole phrase. Morphology fields never change hit/miss counts.',
    '',
    '## UniParser-Accepted Missing Forms',
    '',
    `UniParser accepted ${report.analyzerAcceptedMisses.total} missed target(s) at the analyzer layer. Single-token rows are exact token validation; head-token-only rows validate the inflected verb inside a multiword target, not the whole phrase.`,
    '',
    '| Analyzer Scope | Misses |',
    '| --- | ---: |',
    ...report.analyzerAcceptedMisses.byScope.map(
      (row) => `| ${mdCell(row.key)} | ${row.count} |`,
    ),
    '',
    '| Coarse Class | Analyzer-Accepted Misses |',
    '| --- | ---: |',
    ...report.analyzerAcceptedMisses.byClass.map(
      (row) => `| ${mdCell(row.key)} | ${row.count} |`,
    ),
    '',
    '| Primary Bucket | Analyzer-Accepted Misses |',
    '| --- | ---: |',
    ...report.analyzerAcceptedMisses.byPrimary.map(
      (row) => `| ${mdCell(row.key)} | ${row.count} |`,
    ),
    '',
    '| Cell | Analyzer-Accepted Misses | Samples |',
    '| --- | ---: | --- |',
    ...report.analyzerAcceptedMisses.byCell.slice(0, 12).map(
      (row) =>
        `| ${mdCell(row.key)} | ${row.count} | ${mdCell(row.samples.map((sample) => `${sample.targetKey} (${sample.lemma})`).join(', '))} |`,
    ),
    '',
    '| Lemma | Verb ID | Analyzer-Accepted Misses | Source Level | Samples |',
    '| --- | --- | ---: | --- | --- |',
    ...report.analyzerAcceptedMisses.byLemma.slice(0, 12).map(
      (row) =>
        `| ${mdCell(row.lemma)} | ${mdCell(row.key)} | ${row.count} | ${row.sourceLevel} | ${mdCell(row.samples.map((sample) => `${sample.targetKey} [${sample.primary}]`).join(', '))} |`,
    ),
    '',
    '## Next Review Worklist',
    '',
    'These buckets are conservative review guidance from existing evidence. They may overlap; they do not change generated forms or prove impossibility.',
    '',
    '| Action | Targets | Lemmas | Evidence Basis | Samples |',
    '| --- | ---: | ---: | --- | --- |',
    ...report.reviewWorklist.map(
      (row) =>
        `| ${mdCell(row.title)} | ${row.targetCount} | ${row.lemmaCount} | ${mdCell(row.basis)} | ${mdCell(row.samples.map((sample) => `${sample.targetKey} (${sample.lemma}; ${sample.signature}; ${sample.primary})`).join(', '))} |`,
    ),
    '',
    '### Middle-Passive Review Actions',
    '',
    'These rows split the middle-passive review bucket by the morphology action joined from `.cache/external-morphology-audit.json`.',
    '',
    '| Morphology Action | Targets | Lemmas | Samples |',
    '| --- | ---: | ---: | --- |',
    ...report.middlePassiveReviewActions.map(
      (row) =>
        `| ${mdCell(row.key)} | ${row.count} | ${row.lemmaCount} | ${mdCell(row.samples.map((sample) => `${sample.targetKey} (${sample.lemma}; ${sample.signature})`).join(', '))} |`,
    ),
    '',
    '### Middle-Passive Lemma Shortlist',
    '',
    'Top lemmas per morphology action, ordered by missed middle-passive targets.',
    '',
    '| Morphology Action | Lemma | Verb ID | Targets | Source Level | Samples |',
    '| --- | --- | --- | ---: | --- | --- |',
    ...report.middlePassiveReviewLemmas.flatMap((group) =>
      group.lemmas.map(
        (row) =>
          `| ${mdCell(group.action)} | ${mdCell(row.lemma)} | ${mdCell(row.verbId)} | ${row.count} | ${row.sourceLevel} | ${mdCell(row.samples.map((sample) => `${sample.targetKey} (${sample.signature})`).join(', '))} |`,
      ),
    ),
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
    '## Primary Category Details',
    '',
    '| Category | Misses | Top Labels | Sample Targets |',
    '| --- | ---: | --- | --- |',
    ...report.primaryCategoryDetails.map(
      (row) =>
        `| ${row.primary} | ${row.count} | ${mdCell(row.labels.map((label) => `${label.key} ${label.count}`).join(', '))} | ${mdCell(row.samples.map((sample) => `${sample.targetKey} (${sample.lemma})`).join(', '))} |`,
    ),
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
    `- Evidence scope: ${report.summary.evidenceScope}`,
    `- Selected sources: ${report.summary.selectedSources ?? 'unknown'}`,
    `- Resource partitions: ${report.summary.scannedResources ?? 'unknown'}`,
    `- Scanned candidates: ${report.summary.candidatesSeen}`,
    `- Stored occurrences: ${report.summary.storedOccurrences ?? 'unknown'}`,
    `- Analyzer accepted targets: ${report.summary.morphologyAnalyzerAcceptedTargets ?? 'unknown'}`,
    `- Analyzer analyzed targets: ${report.summary.morphologyAnalyzerAnalyzedTargets ?? 'unknown'}`,
    `- Analyzer no-token-analysis targets: ${report.summary.morphologyAnalyzerNoTokenAnalysisTargets ?? 'unknown'}`,
    '',
    '## Selected By Primary',
    '',
    '| Primary | Selected Rows |',
    '| --- | ---: |',
    ...topEntries(
      dossier.entries.reduce((counts, entry) => {
        add(counts, entry.primary);
        return counts;
      }, new Map<string, number>()),
      40,
    ).map((row) => `| ${mdCell(row.key)} | ${row.count} |`),
    '',
    '## Priority Samples',
    '',
    'Morphology columns are review hints. They refine the likely explanation for a miss but never change hit/miss counts.',
    'Priority `lemma outlier` means sampled from a high-miss lemma; `primary: lemma outlier` means the row itself has primary category `lemma_outlier`.',
    '',
    '| Priority | Target | Lemma | Signature | Cell Hit Rate | Lemma Hit Rate | Primary | Morphology Form | Voice Eligibility | Proof | Scope | Morphology Reasons |',
    '| --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |',
    ...dossier.entries.map(
      (entry) =>
        `| ${mdCell(entry.priority.join(', '))} | ${mdCell(entry.targetKey)} | ${mdCell(entry.lemma)} | ${mdCell(entry.signature)} | ${entry.cellHitRate} | ${entry.lemmaHitRate} | ${mdCell(entry.primary)} | ${mdCell(entry.morphology?.form ?? 'not joined')} | ${mdCell(entry.morphology?.voiceEligibility ?? '')} | ${mdCell(entry.morphology?.proofLevel ?? '')} | ${mdCell(entry.morphology?.scope ?? '')} | ${mdCell(entry.morphology?.reasons.join(', ') ?? '')} |`,
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
  mkdirSync(dirname(dossierMdOut), { recursive: true });
  writeFileSync(dossierMdOut, dossierMd, 'utf8');

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${mdOut}`);
  console.log(`Wrote ${dossierJsonOut}`);
  console.log(`Wrote ${dossierMdOut}`);
}

main();
