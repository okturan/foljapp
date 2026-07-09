/**
 * Write normalized UniParser analyzer request rows for generated corpus misses.
 *
 * The output is local review plumbing. A separate runner can submit each row's
 * token to UniParser and fill analyses[] using the same targetId/mode keys.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_TARGETS = join(REPO_ROOT, '.cache', 'corpus-targets.json');
const DEFAULT_COVERAGE = join(REPO_ROOT, '.cache', 'corpus-coverage-report.json');
const DEFAULT_MISSING_AUDIT = join(REPO_ROOT, '.cache', 'corpus-missing-audit.json');
const DEFAULT_PROVENANCE = join(REPO_ROOT, '.cache', 'corpus-target-provenance.json');
const DEFAULT_OUT = join(REPO_ROOT, '.cache', 'uniparser-analysis-requests.jsonl');

interface TargetRecord {
  id: string;
  targetKey: string;
  tokens: string[];
  signature: string;
  verbId: string;
  lemma: string;
  options: Record<string, unknown>;
}

interface TargetFile {
  generatedAt: string;
  corpusVersion: string;
  targets: TargetRecord[];
}

interface CoverageReport {
  targetGeneratedAt: string;
  corpusVersion: string;
  misses: Array<{ id: string }>;
}

interface MissingAudit {
  misses: Array<{
    id: string;
    primary?: string;
    labels?: string[];
    cellKey?: string;
  }>;
}

interface MissingMeta {
  primary: string;
  labels: string[];
  cellKey: string;
}

interface ProvenanceTrace {
  targets?: Array<{
    target_id?: string;
    targetId?: string;
    counts?: { raw_pattern_matches?: number };
    retained?: { retained_occurrences?: number };
  }>;
}

interface RequestRow {
  targetId: string;
  targetKey: string;
  signature: string;
  targetGeneratedAt: string;
  corpusVersion: string;
  coverageTargetGeneratedAt: string | null;
  mode: 'strict' | 'no_diacritics';
  token: string;
  analyses: [];
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

function noDiacritics(text: string): string {
  return text.replaceAll('ë', 'e').replaceAll('ç', 'c');
}

function splitCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function headToken(target: TargetRecord): string {
  return target.tokens[target.tokens.length - 1] ?? target.targetKey;
}

function targetMatchesKind(target: TargetRecord, kind: string): boolean {
  if (kind === 'all') return true;
  if (kind === 'active-single-token') {
    return target.tokens.length === 1 && target.options.voice === 'active';
  }
  if (kind === 'middle-passive') return target.options.voice === 'middle-passive';
  if (kind === 'single-token') return target.tokens.length === 1;
  if (kind === 'multiword') return target.tokens.length > 1;
  throw new Error(`Unknown --kind=${kind}`);
}

function primaryRank(primary: string): number {
  return (
    {
      unexplained_exact_absence: 0,
      lemma_outlier: 1,
      rare_or_analytic_cell: 2,
      scanner_variant_checked_but_absent: 3,
      near_empty_cell: 4,
      retained_evidence_gap: 5,
    }[primary] ?? 9
  );
}

function moodRank(signature: string): number {
  if (signature.startsWith('indicative.')) return 0;
  if (signature.startsWith('imperative.')) return 1;
  if (signature.startsWith('non-finite.')) return 2;
  if (signature.startsWith('optative.')) return 3;
  if (signature.startsWith('admirative.present.')) return 4;
  if (signature.startsWith('admirative.')) return 5;
  return 9;
}

function targetSortKey(target: TargetRecord, meta: MissingMeta | undefined): string {
  const voiceRank = target.options.voice === 'middle-passive' ? '1' : '0';
  const scopeRank = target.tokens.length === 1 ? '0' : '1';
  const scannerVariantRank = meta?.labels.some((label) =>
    label.includes('scanner_variant'),
  )
    ? '1'
    : '0';
  return [
    voiceRank,
    scopeRank,
    String(moodRank(target.signature)).padStart(2, '0'),
    String(primaryRank(meta?.primary ?? '')).padStart(2, '0'),
    scannerVariantRank,
    target.lemma,
    meta?.cellKey ?? '',
    target.targetKey,
    target.id,
  ].join('\t');
}

function loadMissingMeta(path: string): Map<string, MissingMeta> {
  if (!existsSync(path)) return new Map();
  const audit = readJson<MissingAudit>(path);
  return new Map(
    audit.misses.map((miss) => [
      miss.id,
      {
        primary: miss.primary ?? '',
        labels: miss.labels ?? [],
        cellKey: miss.cellKey ?? '',
      },
    ]),
  );
}

function dedupeTargets(targets: TargetRecord[]): TargetRecord[] {
  const seen = new Set<string>();
  const out: TargetRecord[] = [];
  for (const target of targets) {
    if (seen.has(target.targetKey)) continue;
    seen.add(target.targetKey);
    out.push(target);
  }
  return out;
}

function rawZeroIds(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  const trace = readJson<ProvenanceTrace>(path);
  return new Set(
    (trace.targets ?? [])
      .filter(
        (target) =>
          (target.counts?.raw_pattern_matches ?? 0) === 0 &&
          (target.retained?.retained_occurrences ?? 0) === 0,
      )
      .map((target) => target.target_id ?? target.targetId ?? '')
      .filter(Boolean),
  );
}

function applyPerVerbLimit(targets: TargetRecord[], perVerb: number): TargetRecord[] {
  if (perVerb <= 0) return targets;
  const firstPass: TargetRecord[] = [];
  const rest: TargetRecord[] = [];
  const used = new Map<string, number>();
  for (const target of targets) {
    const count = used.get(target.verbId) ?? 0;
    if (count < perVerb) {
      firstPass.push(target);
      used.set(target.verbId, count + 1);
    } else {
      rest.push(target);
    }
  }
  return [...firstPass, ...rest];
}

function buildRows(
  targets: TargetRecord[],
  includeNoDiacritics: boolean,
  targetFile: TargetFile,
  coverage: CoverageReport,
): RequestRow[] {
  const rows: RequestRow[] = [];
  for (const target of targets) {
    const token = headToken(target);
    rows.push({
      targetId: target.id,
      targetKey: target.targetKey,
      signature: target.signature,
      targetGeneratedAt: targetFile.generatedAt,
      corpusVersion: targetFile.corpusVersion,
      coverageTargetGeneratedAt: coverage.targetGeneratedAt ?? null,
      mode: 'strict',
      token,
      analyses: [],
    });

    const folded = noDiacritics(token);
    if (includeNoDiacritics && folded !== token) {
      rows.push({
        targetId: target.id,
        targetKey: target.targetKey,
        signature: target.signature,
        targetGeneratedAt: targetFile.generatedAt,
        corpusVersion: targetFile.corpusVersion,
        coverageTargetGeneratedAt: coverage.targetGeneratedAt ?? null,
        mode: 'no_diacritics',
        token: folded,
        analyses: [],
      });
    }
  }
  return rows;
}

function md(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function summarize(
  out: string,
  rows: RequestRow[],
  targets: TargetRecord[],
  kind: string,
  limit: number,
  perVerb: number,
  dedupe: boolean,
  includeNoDiacritics: boolean,
): string {
  const modeCounts = new Map<string, number>();
  for (const row of rows) modeCounts.set(row.mode, (modeCounts.get(row.mode) ?? 0) + 1);
  const targetSamples = targets.slice(0, 40);
  return [
    '# UniParser Analyzer Requests',
    '',
    `- Output: ${out}`,
    `- Targets: ${targets.length}`,
    `- Request rows: ${rows.length}`,
    `- Kind: ${kind}`,
    `- Limit: ${limit > 0 ? limit : 'none'}`,
    `- Per-verb diversity cap: ${perVerb > 0 ? perVerb : 'none'}`,
    `- Dedupe by targetKey: ${dedupe}`,
    `- Include no-diacritics rows: ${includeNoDiacritics}`,
    `- Strict rows: ${modeCounts.get('strict') ?? 0}`,
    `- No-diacritics rows: ${modeCounts.get('no_diacritics') ?? 0}`,
    '',
    '## Boundary',
    '',
    'This is a request file, not analyzer evidence. Empty `analyses` arrays mean the target still needs an external UniParser run.',
    '',
    '## First Targets',
    '',
    '| Target | Signature | Head Token | Verb |',
    '| --- | --- | --- | --- |',
    ...targetSamples.map(
      (target) =>
        `| ${md(target.targetKey)} | ${md(target.signature)} | ${md(headToken(target))} | ${md(target.verbId)} |`,
    ),
    '',
  ].join('\n');
}

function main(): void {
  const targetsPath = valueAfter('--targets=') ?? DEFAULT_TARGETS;
  const coveragePath = valueAfter('--coverage=') ?? DEFAULT_COVERAGE;
  const missingAuditPath = valueAfter('--missing-audit=') ?? DEFAULT_MISSING_AUDIT;
  const provenancePath = valueAfter('--provenance=') ?? DEFAULT_PROVENANCE;
  const out = valueAfter('--out=') ?? DEFAULT_OUT;
  const mdOut = valueAfter('--md=') ?? out.replace(/\.jsonl$/i, '.md');
  const kind = valueAfter('--kind=') ?? 'active-single-token';
  const limit = Number(valueAfter('--limit=') ?? '0');
  const perVerb = Number(valueAfter('--per-verb=') ?? '2');
  const forms = new Set(splitCsv(valueAfter('--forms=')));
  const targetIds = new Set(splitCsv(valueAfter('--target-ids=')));
  const includeNoDiacritics = valueAfter('--no-diacritics=') !== 'false';
  const dedupe = valueAfter('--dedupe-target-key=') === 'true';
  const effectiveDedupe = targetIds.size > 0 ? false : dedupe;

  const targetFile = readJson<TargetFile>(targetsPath);
  const coverage = readJson<CoverageReport>(coveragePath);
  requireFreshInputs(targetFile, coverage);
  const missingMeta = loadMissingMeta(missingAuditPath);
  const rawZero = kind === 'raw-zero-traced' ? rawZeroIds(provenancePath) : new Set<string>();
  if (kind === 'raw-zero-traced' && rawZero.size === 0) {
    throw new Error(`No raw-zero traced targets found in ${provenancePath}`);
  }
  const misses = new Set(coverage.misses.map((miss) => miss.id));
  const byId = new Map(targetFile.targets.map((target) => [target.id, target]));

  const filtered = targetFile.targets
    .filter((target) => misses.has(target.id))
    .filter((target) =>
      kind === 'raw-zero-traced' ? rawZero.has(target.id) : targetMatchesKind(target, kind),
    )
    .filter((target) => forms.size === 0 || forms.has(target.targetKey))
    .filter((target) => targetIds.size === 0 || targetIds.has(target.id))
    .sort((a, b) =>
      targetSortKey(a, missingMeta.get(a.id)).localeCompare(
        targetSortKey(b, missingMeta.get(b.id)),
      ),
    );
  const selected = applyPerVerbLimit(
    effectiveDedupe ? dedupeTargets(filtered) : filtered,
    perVerb,
  );

  const missingIds = [...targetIds].filter((id) => !byId.has(id));
  if (missingIds.length > 0) {
    throw new Error(`Unknown target id(s): ${missingIds.join(', ')}`);
  }
  const selectedIds = new Set(selected.map((target) => target.id));
  const unmatchedIds = [...targetIds].filter((id) => !selectedIds.has(id));
  if (unmatchedIds.length > 0) {
    throw new Error(`No missed target matched target id(s): ${unmatchedIds.join(', ')}`);
  }
  const selectedForms = new Set(selected.map((target) => target.targetKey));
  const missingForms = [...forms].filter((form) => !selectedForms.has(form));
  if (missingForms.length > 0) {
    throw new Error(`No missed target matched form(s): ${missingForms.join(', ')}`);
  }

  const limited = limit > 0 ? selected.slice(0, limit) : selected;
  const rows = buildRows(limited, includeNoDiacritics, targetFile, coverage);
  mkdirSync(dirname(out), { recursive: true });
  mkdirSync(dirname(mdOut), { recursive: true });
  writeFileSync(out, rows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');
  writeFileSync(
    mdOut,
    summarize(out, rows, limited, kind, limit, perVerb, effectiveDedupe, includeNoDiacritics),
    'utf8',
  );
  console.log(
    `Wrote ${rows.length} analyzer request row(s) for ${limited.length} target(s) to ${out}`,
  );
  console.log(`Wrote ${mdOut}`);
}

main();
