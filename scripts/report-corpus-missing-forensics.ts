/**
 * Summarize traced corpus misses without rescanning corpora.
 *
 * Inputs:
 *   .cache/corpus-missing-audit.json
 *
 * Outputs:
 *   .cache/corpus-missing-forensics.json
 *   .cache/corpus-missing-forensics.md
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_AUDIT = join(REPO_ROOT, '.cache', 'corpus-missing-audit.json');
const DEFAULT_JSON_OUT = join(
  REPO_ROOT,
  '.cache',
  'corpus-missing-forensics.json',
);
const DEFAULT_MD_OUT = join(
  REPO_ROOT,
  '.cache',
  'corpus-missing-forensics.md',
);

interface MissingAudit {
  generatedAt?: string;
  summary: Record<string, unknown>;
  middlePassiveReviewCoverage?: Record<string, unknown>;
  misses: MissingTarget[];
}

interface MissingTarget {
  id: string;
  targetKey: string;
  verbId: string;
  lemma: string;
  signature: string;
  tokenCount: number;
  primary: string;
  labels?: string[];
  morphologyAction?: string;
  morphologyProofLevel?: string;
  morphologyVoiceEligibility?: string;
  traceStatus?: string;
  trace?: {
    counts?: Record<string, number>;
    retained?: Record<string, number | string[]>;
  };
}

interface Bucket {
  key: string;
  count: number;
}

function valueAfter(prefix: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function inc(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function topEntries(map: Map<string, number>, limit: number): Bucket[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function numberValue(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' ? value : null;
}

function signaturePart(signature: string, index: number): string {
  return signature.split('.')[index] ?? 'unknown';
}

function phraseShape(miss: MissingTarget): string {
  if (miss.tokenCount <= 1) return 'single-token';
  const key = miss.targetKey.replaceAll('_', ' ');
  if (key.startsWith('mos të ')) return 'mos-te phrase';
  if (key.startsWith('të ')) return 'te phrase';
  if (key.startsWith('nuk ')) return 'nuk phrase';
  if (key.startsWith('s ')) return 's-negative phrase';
  if (key.startsWith('do të ')) return 'do-te phrase';
  return 'other multiword';
}

function traceRawCount(miss: MissingTarget, key: string): number {
  return miss.trace?.counts?.[key] ?? 0;
}

function likelyReason(miss: MissingTarget): string {
  const labels = new Set(miss.labels ?? []);
  const mood = signaturePart(miss.signature, 0);
  const tense = signaturePart(miss.signature, 1);
  const voice = signaturePart(miss.signature, 3);

  if (miss.traceStatus === 'raw_seen_filtered') return 'found-only-in-rejected-text';
  if (voice === 'middle-passive') return 'middle-passive-attestation-needed';
  if (labels.has('near_empty_grammatical_cell')) return 'near-empty-generated-cell';
  if (labels.has('future_perfect_analytic')) return 'long-analytic-future-perfect';
  if (labels.has('long_exact_phrase')) return 'long-exact-phrase';
  if (mood === 'admirative' && tense !== 'present') return 'rare-admirative-nonpresent';
  if (mood === 'optative') return `rare-optative-${tense}`;
  if (miss.morphologyProofLevel === 'analyzer') return 'analyzer-accepted-but-unattested';
  return miss.primary || 'unclassified';
}

function summarizeGroup(misses: MissingTarget[]) {
  const byMood = new Map<string, number>();
  const byTense = new Map<string, number>();
  const byVoice = new Map<string, number>();
  const byPolarity = new Map<string, number>();
  const byModality = new Map<string, number>();
  const byLemma = new Map<string, number>();
  const byPrimary = new Map<string, number>();
  const byAction = new Map<string, number>();
  const byProof = new Map<string, number>();
  const byShape = new Map<string, number>();
  const byReason = new Map<string, number>();

  for (const miss of misses) {
    inc(byMood, signaturePart(miss.signature, 0));
    inc(byTense, signaturePart(miss.signature, 1));
    inc(byVoice, signaturePart(miss.signature, 3));
    inc(byPolarity, signaturePart(miss.signature, 4));
    inc(byModality, signaturePart(miss.signature, 5));
    inc(byLemma, miss.lemma);
    inc(byPrimary, miss.primary);
    inc(byAction, miss.morphologyAction ?? 'unknown');
    inc(byProof, miss.morphologyProofLevel ?? 'unknown');
    inc(byShape, phraseShape(miss));
    inc(byReason, likelyReason(miss));
  }

  return {
    count: misses.length,
    byMood: topEntries(byMood, 20),
    byTense: topEntries(byTense, 30),
    byVoice: topEntries(byVoice, 10),
    byPolarity: topEntries(byPolarity, 10),
    byModality: topEntries(byModality, 10),
    byPhraseShape: topEntries(byShape, 20),
    byPrimary: topEntries(byPrimary, 20),
    byMorphologyAction: topEntries(byAction, 20),
    byMorphologyProofLevel: topEntries(byProof, 20),
    byLikelyReason: topEntries(byReason, 20),
    topLemmas: topEntries(byLemma, 30),
  };
}

function sumTrace(misses: MissingTarget[]) {
  return misses.reduce(
    (totals, miss) => {
      totals.rawPatternMatches += traceRawCount(miss, 'raw_pattern_matches');
      totals.variantSupportedMatches += traceRawCount(
        miss,
        'variant_supported_matches',
      );
      totals.variantRejectedMatches += traceRawCount(
        miss,
        'variant_rejected_matches',
      );
      totals.qualityRejectedMatches += traceRawCount(
        miss,
        'quality_rejected_matches',
      );
      totals.emittedMatchesBeforeWriterCap += traceRawCount(
        miss,
        'emitted_matches_before_writer_cap',
      );
      return totals;
    },
    {
      rawPatternMatches: 0,
      variantSupportedMatches: 0,
      variantRejectedMatches: 0,
      qualityRejectedMatches: 0,
      emittedMatchesBeforeWriterCap: 0,
    },
  );
}

function buildMarkdown(report: ReturnType<typeof buildReport>): string {
  const lines: string[] = [];
  lines.push('# Corpus Missing Forensics', '');
  lines.push(`Generated: ${report.generatedAt}`, '');
  lines.push('## Summary', '');
  lines.push(`- Total targets: ${report.summary.totalTargets}`);
  lines.push(`- Hit targets: ${report.summary.hitTargets}`);
  lines.push(`- Missed targets: ${report.summary.missedTargets}`);
  lines.push(`- Unique missed surfaces: ${report.summary.uniqueMissedSurfaces}`);
  lines.push(
    `- Duplicate missed target rows collapsed by surface: ${report.summary.duplicateMissRowsCollapsed}`,
  );
  lines.push(`- Traced miss targets: ${report.summary.tracedMissTargets}`);
  lines.push(`- Raw-zero misses: ${report.summary.rawZeroMisses}`);
  lines.push(`- Raw-seen filtered misses: ${report.summary.rawSeenFilteredMisses}`);
  lines.push(
    `- Raw pattern matches inside missed targets: ${report.traceTotals.rawPatternMatches}`,
  );
  lines.push(
    `- Emitted matches before writer cap inside missed targets: ${report.traceTotals.emittedMatchesBeforeWriterCap}`,
    '',
  );

  lines.push('## How To Read The Miss Count', '');
  lines.push(
    `The headline miss count is ${report.summary.missedTargets} target rows, not ${report.summary.missedTargets} independent Albanian forms.`,
  );
  lines.push(
    `${report.summary.uniqueMissedSurfaces} unique surface strings remain missed after collapsing duplicate target rows.`,
  );
  lines.push(
    `${report.summary.rawZeroMisses} missed target rows have zero raw pattern matches in the traced local candidate universe; ${report.summary.rawSeenFilteredMisses} were found only in rejected text or unsupported variants.`,
  );
  lines.push(
    `${report.middlePassiveBacklog.totalMiddlePassiveMisses} misses are middle-passive rows; ${report.middlePassiveBacklog.unreviewedMiddlePassiveMisses} still belong to the voice-eligibility review backlog.`,
  );
  lines.push(
    `${report.middlePassiveBacklog.sourceCacheEvidenceTargetMisses} middle-passive misses have local source-cache evidence, so corpus absence alone is not enough to suppress them.`,
    '',
  );

  addTable(lines, 'Overall Likely Reason', report.overall.byLikelyReason);

  lines.push('## Middle-Passive Backlog', '');
  lines.push('| Metric | Targets |');
  lines.push('|---|---:|');
  for (const [key, value] of Object.entries(report.middlePassiveBacklog)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');

  for (const [status, group] of Object.entries(report.byTraceStatus)) {
    lines.push(`## ${status}`, '');
    lines.push(`Targets: ${group.count}`, '');
    addTable(lines, 'Likely Reason', group.byLikelyReason);
    addTable(lines, 'Primary Category', group.byPrimary);
    addTable(lines, 'Voice', group.byVoice);
    addTable(lines, 'Mood', group.byMood);
    addTable(lines, 'Tense', group.byTense);
    addTable(lines, 'Polarity', group.byPolarity);
    addTable(lines, 'Modality', group.byModality);
    addTable(lines, 'Phrase Shape', group.byPhraseShape);
    addTable(lines, 'Morphology Action', group.byMorphologyAction);
    addTable(lines, 'Top Lemmas', group.topLemmas.slice(0, 15));
  }

  return `${lines.join('\n')}\n`;
}

function addTable(lines: string[], title: string, rows: Bucket[]): void {
  lines.push(`### ${title}`, '');
  lines.push('| Key | Targets |');
  lines.push('|---|---:|');
  for (const row of rows) lines.push(`| ${row.key} | ${row.count} |`);
  lines.push('');
}

function buildReport(audit: MissingAudit) {
  const byTraceStatus = new Map<string, MissingTarget[]>();
  for (const miss of audit.misses) {
    const status = miss.traceStatus ?? 'unknown';
    const list = byTraceStatus.get(status) ?? [];
    list.push(miss);
    byTraceStatus.set(status, list);
  }

  const middlePassiveReviewCoverage = audit.middlePassiveReviewCoverage ?? {};
  const rawZeroMisses = byTraceStatus.get('raw_zero')?.length ?? 0;
  const rawSeenFilteredMisses =
    byTraceStatus.get('raw_seen_filtered')?.length ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    inputs: {
      auditGeneratedAt: audit.generatedAt ?? null,
      evidenceScope: audit.summary.evidenceScope ?? null,
      selectedSources: audit.summary.selectedSources ?? null,
      scannedResources: audit.summary.scannedResources ?? null,
      candidatesSeen: audit.summary.candidatesSeen ?? null,
    },
    summary: {
      totalTargets: numberValue(audit.summary, 'totalTargets'),
      hitTargets: numberValue(audit.summary, 'hitTargets'),
      missedTargets:
        numberValue(audit.summary, 'missedTargets') ?? audit.misses.length,
      uniqueMissedSurfaces: numberValue(audit.summary, 'uniqueMissedSurfaces'),
      duplicateMissRowsCollapsed: numberValue(
        audit.summary,
        'duplicateMissRowsCollapsed',
      ),
      tracedMissTargets: audit.misses.filter((miss) => miss.traceStatus).length,
      rawZeroMisses,
      rawSeenFilteredMisses,
    },
    overall: summarizeGroup(audit.misses),
    middlePassiveBacklog: {
      totalMiddlePassiveMisses: numberValue(
        middlePassiveReviewCoverage,
        'totalMiddlePassiveMisses',
      ),
      reviewedTotalMiddlePassiveMisses: numberValue(
        middlePassiveReviewCoverage,
        'reviewedTotalMiddlePassiveMisses',
      ),
      unreviewedMiddlePassiveMisses: numberValue(
        middlePassiveReviewCoverage,
        'unreviewedMiddlePassiveMisses',
      ),
      sourceCacheEvidenceTargetMisses: numberValue(
        middlePassiveReviewCoverage,
        'sourceCacheEvidenceTargetMisses',
      ),
      sourceCacheExactTargetSupportMisses: numberValue(
        middlePassiveReviewCoverage,
        'sourceCacheExactTargetSupportMisses',
      ),
      sourceCacheHeadTokenSupportMisses: numberValue(
        middlePassiveReviewCoverage,
        'sourceCacheHeadTokenSupportMisses',
      ),
      unreviewedSourceCacheEvidenceTargetMisses: numberValue(
        middlePassiveReviewCoverage,
        'unreviewedSourceCacheEvidenceTargetMisses',
      ),
    },
    traceTotals: sumTrace(audit.misses),
    byTraceStatus: Object.fromEntries(
      [...byTraceStatus.entries()]
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .map(([status, misses]) => [status, summarizeGroup(misses)]),
    ),
  };
}

const auditPath = valueAfter('--audit=') ?? DEFAULT_AUDIT;
const jsonOut = valueAfter('--out-json=') ?? DEFAULT_JSON_OUT;
const mdOut = valueAfter('--out-md=') ?? DEFAULT_MD_OUT;
const report = buildReport(readJson<MissingAudit>(auditPath));

mkdirSync(dirname(jsonOut), { recursive: true });
mkdirSync(dirname(mdOut), { recursive: true });
writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdOut, buildMarkdown(report));
console.log(`Wrote ${jsonOut}`);
console.log(`Wrote ${mdOut}`);
