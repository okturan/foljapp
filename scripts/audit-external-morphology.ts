/**
 * Build a local-only morphology review artifact for corpus misses.
 *
 * This does not run a morphological analyzer and does not edit verb data. If
 * UniParser Albanian lexeme or analyzer-output files are provided, it uses them
 * as review evidence only.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_TARGETS = join(REPO_ROOT, '.cache', 'corpus-targets.json');
const DEFAULT_COVERAGE = join(
  REPO_ROOT,
  '.cache',
  'corpus-coverage-report.json',
);
const DEFAULT_VERBS = join(REPO_ROOT, 'data', 'verbs', '_corpus.client.json');
const DEFAULT_JSON_OUT = join(
  REPO_ROOT,
  '.cache',
  'external-morphology-audit.json',
);
const DEFAULT_MD_OUT = join(
  REPO_ROOT,
  '.cache',
  'external-morphology-audit.md',
);
const DEFAULT_UNIPARSER_LEXEME_PATHS = [
  join(REPO_ROOT, '.cache', 'uniparser-grammar-albanian', 'sqi_lexemes_V.txt'),
  join(REPO_ROOT, '.cache', 'sqi_lexemes_V.txt'),
  ...localUniparserPackageLexemePaths(),
];

interface TargetRecord {
  id: string;
  targetKey: string;
  tokens: string[];
  signature: string;
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

interface LexemeEntry {
  lex: string;
  tags: string[];
  paradigm: string | null;
  lexref: string | null;
  transEn: string;
}

interface LexemeIndex {
  entries: LexemeEntry[];
  byLex: Map<string, LexemeEntry[]>;
  byFoldedLex: Map<string, LexemeEntry[]>;
}

interface AnalyzerEntry {
  wf: string | null;
  lemma: string | null;
  gramm: string | null;
  pos: string | null;
  tags: string[];
}

interface AnalyzerRow {
  targetId: string;
  targetKey: string | null;
  signature: string | null;
  targetGeneratedAt: string | null;
  corpusVersion: string | null;
  coverageTargetGeneratedAt: string | null;
  mode: 'strict' | 'no_diacritics';
  token: string;
  analyses: AnalyzerEntry[];
}

interface AnalyzerMatch {
  token: string;
  wf: string | null;
  lemma: string | null;
  gramm: string | null;
  pos: string | null;
  tags: string[];
  mode: string;
  lemmaMatches: boolean;
  missingExpectedTags: string[];
  compatible: boolean;
}

interface AnalyzerEvidence {
  status: string;
  strict: AnalyzerMatch[];
  noDiacritics: AnalyzerMatch[];
  accepted: boolean;
  componentSupported: boolean;
  analyzedRows: number;
  compatibleRows: number;
  componentRows: number;
}

interface AnalyzerEvidenceFile {
  status: string;
  path: string | null;
  source: string;
  searchedPaths: string[];
  rowsLoaded: number;
  rowsMatched: number;
  rowsSkipped: number;
  duplicateRows: number;
  byTargetId: Map<string, AnalyzerEvidence>;
}

interface VoiceRow {
  activeTotal: number;
  activeHit: number;
  activeMiss: number;
  middlePassiveTotal: number;
  middlePassiveHit: number;
  middlePassiveMiss: number;
}

interface LemmaAnalyzerSummary {
  accepted: number;
  incompatible: number;
  noTokenAnalysis: number;
  notProvided: number;
  compatibleRows: number;
  acceptedSamples: string[];
}

function valueAfter(prefix: string): string | undefined {
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function resolveUniparserLexemes(explicitPath: string | undefined): {
  path: string | null;
  searchedPaths: string[];
  source: string;
} {
  if (explicitPath) {
    return {
      path: existsSync(explicitPath) ? explicitPath : null,
      searchedPaths: [explicitPath],
      source: 'explicit',
    };
  }
  const found = DEFAULT_UNIPARSER_LEXEME_PATHS.find((path) => existsSync(path));
  return {
    path: found ?? null,
    searchedPaths: DEFAULT_UNIPARSER_LEXEME_PATHS,
    source: found ? 'auto' : 'default-search',
  };
}

function localUniparserPackageLexemePaths(): string[] {
  const lib = join(REPO_ROOT, '.cache', 'uniparser-venv', 'lib');
  if (!existsSync(lib)) return [];
  return readdirSync(lib, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('python'))
    .flatMap((entry) => {
      const base = join(lib, entry.name, 'site-packages', 'uniparser_albanian');
      return [
        join(base, 'data_strict', 'lexemes.txt'),
        join(base, 'data_nodiacritics', 'lexemes.txt'),
      ];
    });
}

function resolveUniparserAnalysis(explicitPath: string | undefined): {
  path: string | null;
  searchedPaths: string[];
  source: string;
} {
  if (!explicitPath) {
    return {
      path: null,
      searchedPaths: [],
      source: 'not-provided',
    };
  }
  return {
    path: existsSync(explicitPath) ? explicitPath : null,
    searchedPaths: [explicitPath],
    source: 'explicit',
  };
}

function requireFreshInputs(
  targetFile: TargetFile,
  coverage: CoverageReport,
): void {
  if (!targetFile.generatedAt)
    throw new Error('Target file is missing generatedAt');
  if (!targetFile.corpusVersion)
    throw new Error('Target file is missing corpusVersion');
  if (!coverage.targetGeneratedAt) {
    throw new Error('Coverage report is missing targetGeneratedAt');
  }
  if (!coverage.corpusVersion)
    throw new Error('Coverage report is missing corpusVersion');
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

function pct(part: number, total: number): string {
  return total === 0 ? '0.0%' : `${((part / total) * 100).toFixed(1)}%`;
}

function noDiacritics(text: string): string {
  return text.replaceAll('ë', 'e').replaceAll('ç', 'c');
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function sourceKeys(verb: VerbEntry | undefined): string[] {
  return unique((verb?.sources ?? []).map((source) => source.source));
}

function sourceLevel(sources: string[]): string {
  if (sources.includes('husic')) return 'husic-backed';
  if (sources.includes('uniparser')) return 'uniparser-backed';
  if (sources.length > 0) return 'lexicon-only';
  return 'unknown-source';
}

function lexemeVoiceBucket(tags: string[]): string {
  const hasMed = tags.includes('med');
  const hasVi = tags.includes('vi');
  const hasVt = tags.includes('vt');
  if (hasMed) return 'med';
  if (hasVi && hasVt) return 'vi+vt';
  if (hasVt) return 'vt';
  if (hasVi) return 'vi-only';
  return tags.length > 0 ? 'other-lexeme' : 'no-lexeme';
}

function middlePassiveOverrideKeys(verb: VerbEntry | undefined): string[] {
  return Object.keys(verb?.cellOverrides ?? {})
    .filter((key) => key.includes('middle-passive'))
    .sort();
}

function sourceBackedUMarkerTarget(
  target: TargetRecord,
  verb: VerbEntry | undefined,
): boolean {
  if (!verb || !sourceKeys(verb).includes('husic')) return false;
  if (target.options.voice !== 'middle-passive') return false;
  const mood =
    typeof target.options.mood === 'string' ? target.options.mood : '';
  const tense =
    typeof target.options.tense === 'string' ? target.options.tense : 'present';
  const person = target.options.person;
  const number = target.options.number;
  if (typeof person !== 'number' || typeof number !== 'string') return false;
  const cell = `${person}${number === 'singular' ? 'sg' : 'pl'}`;
  const positive = target.targetKey.startsWith('nuk ')
    ? target.targetKey.slice(4)
    : target.targetKey;
  const middlePassiveOverride =
    verb.cellOverrides?.[`${mood}.${tense}.middle-passive`]?.[cell];
  if (middlePassiveOverride === positive) return true;
  const override = verb.cellOverrides?.[`${mood}.${tense}`]?.[cell];
  if (!override) return false;
  const bareOverride = override.startsWith('të ')
    ? override.slice(3)
    : override;
  return positive === `u ${bareOverride}`;
}

function parseUniparserLexemes(path: string): LexemeIndex {
  const text = readFileSync(path, 'utf8')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n');
  const chunks = text
    .split(/(?=^-lexeme\b)/gm)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith('-lexeme'));
  const entries: LexemeEntry[] = [];

  for (const chunk of chunks) {
    const lex = chunk.match(/(?:^|\n)\s*lex:\s*([^\s]+)/)?.[1];
    const gramm = chunk.match(/(?:^|\n)\s*gramm:\s*([^\n]+)/)?.[1];
    if (!lex || !gramm) continue;
    const tags = gramm
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (!tags.includes('V')) continue;
    entries.push({
      lex,
      tags,
      paradigm: chunk.match(/(?:^|\n)\s*paradigm:\s*([^\s]+)/)?.[1] ?? null,
      lexref: chunk.match(/(?:^|\n)\s*lexref:\s*([^\s]+)/)?.[1] ?? null,
      transEn:
        chunk.match(/(?:^|\n)\s*trans_en:\s*([\s\S]*)$/)?.[1]?.trim() ?? '',
    });
  }

  const byLex = new Map<string, LexemeEntry[]>();
  const byFoldedLex = new Map<string, LexemeEntry[]>();
  for (const entry of entries) {
    byLex.set(entry.lex, [...(byLex.get(entry.lex) ?? []), entry]);
    const folded = noDiacritics(entry.lex);
    byFoldedLex.set(folded, [...(byFoldedLex.get(folded) ?? []), entry]);
  }
  return { entries, byLex, byFoldedLex };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return unique(value.flatMap((item) => parseTags(item)));
  }
  if (typeof value !== 'string') return [];
  return unique(
    value
      .split(/[,\s;|]+/g)
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function analyzerEntryFromRecord(
  row: Record<string, unknown>,
): AnalyzerEntry | null {
  const tags = unique([
    ...parseTags(row.tags),
    ...parseTags(row.gramm),
    ...parseTags(row.grammar),
    ...parseTags(row.tag),
    ...parseTags(row.pos),
  ]);
  if (tags.length === 0) return null;
  return {
    wf: optionalString(row.wf),
    lemma:
      optionalString(row.lemma) ??
      optionalString(row.lex) ??
      optionalString(row.lexeme),
    gramm: optionalString(row.gramm) ?? optionalString(row.grammar),
    pos: optionalString(row.pos),
    tags,
  };
}

function analyzerRowFromRecord(row: unknown): AnalyzerRow | null {
  if (!isRecord(row)) return null;
  const targetId = optionalString(row.targetId);
  const targetKey = optionalString(row.targetKey);
  const signature = optionalString(row.signature);
  const targetGeneratedAt = optionalString(row.targetGeneratedAt);
  const corpusVersion = optionalString(row.corpusVersion);
  const coverageTargetGeneratedAt = optionalString(
    row.coverageTargetGeneratedAt,
  );
  const mode = row.mode;
  const token = optionalString(row.token);
  if (
    !targetId ||
    !targetKey ||
    !signature ||
    !targetGeneratedAt ||
    !corpusVersion ||
    !coverageTargetGeneratedAt ||
    !token ||
    (mode !== 'strict' && mode !== 'no_diacritics') ||
    !Array.isArray(row.analyses)
  ) {
    return null;
  }
  return {
    targetId,
    targetKey,
    signature,
    targetGeneratedAt,
    corpusVersion,
    coverageTargetGeneratedAt,
    mode,
    token,
    analyses: row.analyses
      .map((analysis) =>
        isRecord(analysis) ? analyzerEntryFromRecord(analysis) : null,
      )
      .filter((analysis): analysis is AnalyzerEntry => Boolean(analysis)),
  };
}

function analyzerRowMatchesTarget(
  row: AnalyzerRow,
  target: TargetRecord,
): boolean {
  const headToken = target.tokens[target.tokens.length - 1] ?? target.targetKey;
  return row.mode === 'strict'
    ? row.token === headToken
    : noDiacritics(row.token) === noDiacritics(headToken);
}

function emptyAnalyzerFile(
  status: string,
  location: ReturnType<typeof resolveUniparserAnalysis>,
): AnalyzerEvidenceFile {
  return {
    status,
    path: location.path,
    source: location.source,
    searchedPaths: location.searchedPaths,
    rowsLoaded: 0,
    rowsMatched: 0,
    rowsSkipped: 0,
    duplicateRows: 0,
    byTargetId: new Map(),
  };
}

function loadAnalyzerEvidenceFile(
  location: ReturnType<typeof resolveUniparserAnalysis>,
  targetsById: Map<string, TargetRecord>,
  targetFile: TargetFile,
  coverage: CoverageReport,
): AnalyzerEvidenceFile {
  if (!location.path) {
    return emptyAnalyzerFile(
      location.source === 'not-provided' ? 'not_provided' : 'missing',
      location,
    );
  }
  const output = emptyAnalyzerFile('loaded', location);
  const rowsByTarget = new Map<
    string,
    { strict: AnalyzerRow | null; noDiacritics: AnalyzerRow | null }
  >();

  for (const line of readFileSync(location.path, 'utf8')
    .replaceAll('\r', '\n')
    .split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      output.rowsSkipped += 1;
      continue;
    }
    const row = analyzerRowFromRecord(parsed);
    const target = row ? targetsById.get(row.targetId) : null;
    if (
      !row ||
      !target ||
      row.targetKey !== target.targetKey ||
      row.signature !== target.signature ||
      row.targetGeneratedAt !== targetFile.generatedAt ||
      row.corpusVersion !== targetFile.corpusVersion ||
      row.coverageTargetGeneratedAt !== coverage.targetGeneratedAt ||
      !analyzerRowMatchesTarget(row, target)
    ) {
      output.rowsSkipped += 1;
      continue;
    }
    const current = rowsByTarget.get(row.targetId) ?? {
      strict: null,
      noDiacritics: null,
    };
    const key = row.mode === 'strict' ? 'strict' : 'noDiacritics';
    if (current[key]) {
      output.duplicateRows += 1;
      continue;
    }
    current[key] = row;
    rowsByTarget.set(row.targetId, current);
    output.rowsLoaded += 1;
  }

  for (const [targetId, rows] of rowsByTarget) {
    const target = targetsById.get(targetId);
    if (!target) continue;
    output.byTargetId.set(targetId, analyzerEvidence(target, rows));
    output.rowsMatched += 1;
  }
  return output;
}

function lexemeEvidence(
  verb: VerbEntry | undefined,
  lexemes: LexemeIndex | null,
): {
  found: boolean;
  matchKey: string | null;
  matchKind: string;
  tags: string[];
  paradigms: string[];
  lexrefs: string[];
  dialectOrRegister: string[];
  entries: number;
} {
  if (!verb || !lexemes) {
    return {
      found: false,
      matchKey: null,
      matchKind: lexemes ? 'no_match' : 'not_provided',
      tags: [],
      paradigms: [],
      lexrefs: [],
      dialectOrRegister: [],
      entries: 0,
    };
  }

  const exact =
    lexemes.byLex.get(verb.lemma) ??
    lexemes.byLex.get(verb.id) ??
    lexemes.byLex.get(noDiacritics(verb.lemma));
  const folded = lexemes.byFoldedLex.get(noDiacritics(verb.lemma));
  const matches = exact ?? folded ?? [];
  const matchKind = exact
    ? 'exact_or_id'
    : folded
      ? 'diacritic_fold'
      : 'no_match';
  const tags = unique(matches.flatMap((entry) => entry.tags));
  return {
    found: matches.length > 0,
    matchKey: matches[0]?.lex ?? null,
    matchKind,
    tags,
    paradigms: unique(matches.map((entry) => entry.paradigm ?? '')),
    lexrefs: unique(matches.map((entry) => entry.lexref ?? '')),
    dialectOrRegister: tags.filter((tag) => tag === 'Gheg' || tag === 'nonst'),
    entries: matches.length,
  };
}

function expectedTags(target: TargetRecord): string[] {
  const expected = expectedFromOptions(target);
  return Array.isArray(expected.tags) ? (expected.tags as string[]) : [];
}

function analyzerMatches(
  target: TargetRecord,
  row: AnalyzerRow | null,
): AnalyzerMatch[] {
  if (!row) return [];
  const expected = expectedTags(target);
  const expectedLemma = noDiacritics(target.lemma);
  const expectedId = noDiacritics(target.verbId);
  return row.analyses.map((entry) => {
    const entryLemma = entry.lemma ? noDiacritics(entry.lemma) : '';
    const lemmaMatches =
      entryLemma === expectedLemma || entryLemma === expectedId;
    const missingExpectedTags = expected.filter(
      (tag) => !entry.tags.includes(tag),
    );
    return {
      token: row.token,
      wf: entry.wf,
      lemma: entry.lemma,
      gramm: entry.gramm,
      pos: entry.pos,
      tags: entry.tags,
      mode: row.mode,
      lemmaMatches,
      missingExpectedTags,
      compatible: lemmaMatches && missingExpectedTags.length === 0,
    };
  });
}

function analyzerEvidence(
  target: TargetRecord,
  rows: { strict: AnalyzerRow | null; noDiacritics: AnalyzerRow | null } | null,
): AnalyzerEvidence {
  if (!rows) {
    return {
      status: 'not_provided',
      strict: [],
      noDiacritics: [],
      accepted: false,
      componentSupported: false,
      analyzedRows: 0,
      compatibleRows: 0,
      componentRows: 0,
    };
  }

  const strict = analyzerMatches(target, rows.strict);
  const noDiacriticsMatches = analyzerMatches(target, rows.noDiacritics);
  const all = [...strict, ...noDiacriticsMatches];
  const compatibleRows = all.filter((match) => match.compatible).length;
  const componentRows =
    target.tokens.length > 1
      ? all.filter((match) => match.lemmaMatches && match.tags.includes('V'))
          .length
      : 0;
  return {
    status:
      compatibleRows > 0
        ? 'accepted'
        : all.length > 0
          ? 'analyzed_incompatible'
          : 'no_token_analysis',
    strict,
    noDiacritics: noDiacriticsMatches,
    accepted: compatibleRows > 0,
    componentSupported: componentRows > 0,
    analyzedRows: all.length,
    compatibleRows,
    componentRows,
  };
}

function emptyAnalyzerEvidence(): AnalyzerEvidence {
  return {
    status: 'not_provided',
    strict: [],
    noDiacritics: [],
    accepted: false,
    componentSupported: false,
    analyzedRows: 0,
    compatibleRows: 0,
    componentRows: 0,
  };
}

function expectedFromOptions(target: TargetRecord): Record<string, unknown> {
  const o = target.options;
  const moodTags: Record<string, string> = {
    indicative: 'ind',
    subjunctive: 'sbjv',
    admirative: 'adm',
    imperative: 'imp',
    optative: 'opt',
    conditional: 'cond',
  };
  const tenseTags: Record<string, string> = {
    present: 'pres',
    imperfect: 'ipf',
    aorist: 'aor',
  };
  const tags = unique([
    'V',
    typeof o.mood === 'string' ? (moodTags[o.mood] ?? o.mood) : '',
    typeof o.tense === 'string' ? (tenseTags[o.tense] ?? o.tense) : '',
    o.person === undefined ? '' : String(o.person),
    typeof o.number === 'string' ? (o.number === 'singular' ? 'sg' : 'pl') : '',
    typeof o.voice === 'string' ? (o.voice === 'active' ? 'act' : 'pass') : '',
  ]);
  return {
    pos: 'V',
    lemma: target.lemma,
    tags,
    mood: o.mood ?? null,
    tense: o.tense ?? null,
    voice: o.voice ?? null,
    person: o.person ?? null,
    number: o.number ?? null,
    polarity: o.polarity ?? null,
    modality: o.modality ?? null,
  };
}

function classifyVoice(
  target: TargetRecord,
  verb: VerbEntry | undefined,
  lexeme: ReturnType<typeof lexemeEvidence>,
  analyzer: AnalyzerEvidence,
  row: VoiceRow,
): {
  form: string;
  voiceEligibility: string;
  proofLevel: string;
  reasons: string[];
  action: string;
} {
  const reasons: string[] = [];
  const sources = sourceKeys(verb);
  const localSourceLevel = sourceLevel(sources);
  const localProof = sources.length > 0 ? 'local-source' : 'none';
  const mpMissRate =
    row.middlePassiveTotal === 0
      ? 0
      : row.middlePassiveMiss / row.middlePassiveTotal;

  if (target.tokens.length > 1)
    reasons.push('multiword_target_head_token_only');
  if (localSourceLevel === 'lexicon-only') reasons.push('lexicon_only');
  if (middlePassiveOverrideKeys(verb).length === 0) {
    reasons.push('no_middle_passive_overrides');
  }
  if (mpMissRate >= 0.75) reasons.push('high_middle_passive_miss_pressure');
  if (!lexeme.found)
    reasons.push(
      lexeme.matchKind === 'not_provided'
        ? 'no_external_lexeme_file'
        : 'no_external_lexeme_match',
    );
  if (analyzer.accepted) {
    reasons.push('uniparser_analyzer_accepts_head_token');
  } else if (analyzer.componentSupported) {
    reasons.push('uniparser_analyzer_supports_head_component');
  } else if (analyzer.status === 'analyzed_incompatible') {
    reasons.push('uniparser_analyzer_incompatible_head_token');
  } else if (analyzer.status === 'no_token_analysis') {
    reasons.push('uniparser_analyzer_no_head_token_analysis');
  }
  if (lexeme.dialectOrRegister.length > 0) {
    reasons.push(`dialect_or_register:${lexeme.dialectOrRegister.join(',')}`);
  }

  if (target.options.voice !== 'middle-passive') {
    return {
      form: analyzer.accepted
        ? 'analyzer_accepted'
        : analyzer.componentSupported
          ? 'component_supported'
          : 'not_validated',
      voiceEligibility: 'not_applicable_active',
      proofLevel:
        analyzer.accepted || analyzer.componentSupported
          ? 'analyzer'
          : lexeme.found
            ? 'lexeme'
            : localProof,
      reasons,
      action: 'none',
    };
  }

  if (analyzer.accepted) {
    return {
      form: 'analyzer_accepted',
      voiceEligibility: 'morphologically_accepted',
      proofLevel: 'analyzer',
      reasons,
      action: 'review_as_analyzer_accepted',
    };
  }

  if (sourceBackedUMarkerTarget(target, verb)) {
    reasons.push('husic_backed_u_marker_from_active_override');
    return {
      form: 'source_backed_composed',
      voiceEligibility: 'source_backed_composed_middle_passive',
      proofLevel: 'local-source',
      reasons,
      action: 'review_source_backed_composed_phrase',
    };
  }

  if (verb?.flags?.noMiddlePassive) {
    reasons.push('local_no_middle_passive_flag');
    return {
      form: 'not_validated',
      voiceEligibility: 'locally_blocked_by_no_middle_passive_flag',
      proofLevel: 'local_flag',
      reasons,
      action: 'keep_local_no_middle_passive_flag',
    };
  }

  if (lexeme.tags.includes('med')) {
    reasons.push('uniparser_lexeme_medial_tag');
    return {
      form: 'not_validated',
      voiceEligibility: 'lexeme_medial_tagged',
      proofLevel: 'lexeme',
      reasons,
      action: 'review_medial_or_reflexive_candidate',
    };
  }

  if (
    lexeme.found &&
    lexeme.tags.includes('vi') &&
    !lexeme.tags.includes('vt') &&
    !lexeme.tags.includes('med')
  ) {
    reasons.push('uniparser_lexeme_vi_no_vt_med');
    return {
      form: 'not_validated',
      voiceEligibility: 'ambiguous',
      proofLevel: 'lexeme',
      reasons,
      action: 'review_vi_tagged_nonactive_candidate',
    };
  }

  if (lexeme.found && lexeme.dialectOrRegister.length > 0) {
    return {
      form: 'not_validated',
      voiceEligibility: 'ambiguous',
      proofLevel: 'lexeme',
      reasons,
      action: 'review_lemma_status',
    };
  }

  if (analyzer.componentSupported) {
    return {
      form: 'component_supported',
      voiceEligibility: 'full_phrase_unchecked',
      proofLevel: 'analyzer',
      reasons,
      action: 'review_component_supported_phrase',
    };
  }

  if (analyzer.status === 'analyzed_incompatible') {
    return {
      form: 'analyzer_incompatible',
      voiceEligibility: 'ambiguous',
      proofLevel: 'analyzer',
      reasons,
      action: 'review_analyzer_nonacceptance',
    };
  }

  return {
    form: 'not_validated',
    voiceEligibility: 'unknown',
    proofLevel: lexeme.found ? 'lexeme' : localProof,
    reasons,
    action: mpMissRate >= 0.75 ? 'review_with_external_analyzer' : 'none',
  };
}

function add(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topCounts(
  map: Map<string, number>,
): Array<{ key: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));
}

function flagsText(flags: Record<string, unknown>): string {
  return Object.entries(flags)
    .filter(([, value]) => value === true)
    .map(([key]) => key)
    .sort()
    .join(', ');
}

function md(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function balancedTargetSample<T extends { lemma: string }>(
  rows: T[],
  limit: number,
  perLemma: number,
): T[] {
  const out: T[] = [];
  const byLemma = new Map<string, number>();
  for (const row of rows) {
    if (out.length >= limit) break;
    const used = byLemma.get(row.lemma) ?? 0;
    if (used >= perLemma) continue;
    out.push(row);
    byLemma.set(row.lemma, used + 1);
  }
  return out;
}

function isAnalyzerNonacceptance(audit: {
  verdict: { action: string };
}): boolean {
  return audit.verdict.action === 'review_analyzer_nonacceptance';
}

function main(): void {
  const targetsPath = valueAfter('--targets=') ?? DEFAULT_TARGETS;
  const coveragePath = valueAfter('--coverage=') ?? DEFAULT_COVERAGE;
  const verbsPath = valueAfter('--verbs=') ?? DEFAULT_VERBS;
  const lexemesInput =
    valueAfter('--uniparser-lexemes=') ?? process.env.FOLJAPP_UNIPARSER_LEXEMES;
  const analyzerInput =
    valueAfter('--uniparser-analysis=') ??
    valueAfter('--uniparser-analyzer=') ??
    process.env.FOLJAPP_UNIPARSER_ANALYZER ??
    process.env.FOLJAPP_UNIPARSER_ANALYSIS;
  const lexemesInputProvided = Boolean(lexemesInput);
  const analyzerInputProvided = Boolean(analyzerInput);
  const lexemesLocation = resolveUniparserLexemes(lexemesInput);
  const analyzerLocation = resolveUniparserAnalysis(analyzerInput);
  const lexemesPath = lexemesLocation.path;
  const jsonOut = valueAfter('--json=') ?? DEFAULT_JSON_OUT;
  const mdOut = valueAfter('--md=') ?? DEFAULT_MD_OUT;

  const targetFile = readJson<TargetFile>(targetsPath);
  const coverage = readJson<CoverageReport>(coveragePath);
  requireFreshInputs(targetFile, coverage);
  const verbs = readJson<VerbEntry[]>(verbsPath);
  const targetsById = new Map(
    targetFile.targets.map((target) => [target.id, target]),
  );
  const missingIds = new Set(coverage.misses.map((miss) => miss.id));
  const verbsById = new Map(verbs.map((verb) => [verb.id, verb]));
  const lexemes = lexemesPath ? parseUniparserLexemes(lexemesPath) : null;
  if (lexemesPath && lexemes?.entries.length === 0) {
    throw new Error(
      `UniParser lexeme file contained no entries: ${lexemesPath}`,
    );
  }
  if (analyzerInputProvided && !analyzerLocation.path) {
    throw new Error(
      `UniParser analyzer file not found: ${analyzerLocation.searchedPaths[0]}`,
    );
  }
  const analyzerFile = loadAnalyzerEvidenceFile(
    analyzerLocation,
    targetsById,
    targetFile,
    coverage,
  );
  if (analyzerInputProvided && analyzerFile.rowsSkipped > 0) {
    throw new Error(
      `UniParser analyzer file has ${analyzerFile.rowsSkipped} stale or invalid row(s): ${analyzerFile.path}`,
    );
  }
  if (analyzerInputProvided && analyzerFile.duplicateRows > 0) {
    throw new Error(
      `UniParser analyzer file has ${analyzerFile.duplicateRows} duplicate row(s): ${analyzerFile.path}`,
    );
  }

  const byLemmaVoice = new Map<string, VoiceRow>();
  for (const target of targetFile.targets) {
    if (
      target.options.voice !== 'active' &&
      target.options.voice !== 'middle-passive'
    ) {
      continue;
    }
    const row = byLemmaVoice.get(target.verbId) ?? {
      activeTotal: 0,
      activeHit: 0,
      activeMiss: 0,
      middlePassiveTotal: 0,
      middlePassiveHit: 0,
      middlePassiveMiss: 0,
    };
    const missed = missingIds.has(target.id);
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

  const lexemeByVerb = new Map(
    verbs.map((verb) => [verb.id, lexemeEvidence(verb, lexemes)]),
  );
  const targetAudits = coverage.misses
    .map((miss) => {
      const target = targetsById.get(miss.id);
      if (!target)
        throw new Error(`Coverage miss not found in targets: ${miss.id}`);
      const verb = verbsById.get(target.verbId);
      const sources = sourceKeys(verb);
      const voiceRow = byLemmaVoice.get(target.verbId) ?? {
        activeTotal: 0,
        activeHit: 0,
        activeMiss: 0,
        middlePassiveTotal: 0,
        middlePassiveHit: 0,
        middlePassiveMiss: 0,
      };
      const lexeme =
        lexemeByVerb.get(target.verbId) ?? lexemeEvidence(verb, lexemes);
      const analyzer =
        analyzerFile.byTargetId.get(target.id) ?? emptyAnalyzerEvidence();
      const verdict = classifyVoice(target, verb, lexeme, analyzer, voiceRow);
      return {
        targetId: target.id,
        targetKey: target.targetKey,
        verbId: target.verbId,
        lemma: target.lemma,
        signature: target.signature,
        options: target.options,
        tokens: target.tokens,
        headTokenIndex: Math.max(0, target.tokens.length - 1),
        headToken: target.tokens[target.tokens.length - 1] ?? target.targetKey,
        scope: target.tokens.length > 1 ? 'head-token-only' : 'single-token',
        expected: expectedFromOptions(target),
        localVerb: {
          verbId: target.verbId,
          lemma: target.lemma,
          sourceLevel: sourceLevel(sources),
          sources,
          flags: verb?.flags ?? {},
          middlePassiveOverrideKeys: middlePassiveOverrideKeys(verb),
        },
        voiceCoverage: {
          activeHit: voiceRow.activeHit,
          activeTotal: voiceRow.activeTotal,
          activeHitRate: pct(voiceRow.activeHit, voiceRow.activeTotal),
          middlePassiveHit: voiceRow.middlePassiveHit,
          middlePassiveTotal: voiceRow.middlePassiveTotal,
          middlePassiveMiss: voiceRow.middlePassiveMiss,
          middlePassiveHitRate: pct(
            voiceRow.middlePassiveHit,
            voiceRow.middlePassiveTotal,
          ),
        },
        external: {
          uniparserStrict: analyzer.strict,
          uniparserNoDiacritics: analyzer.noDiacritics,
          uniparserLexeme: lexeme,
          uniparserAnalyzer: {
            status: analyzer.status,
            accepted: analyzer.accepted,
            componentSupported: analyzer.componentSupported,
            analyzedRows: analyzer.analyzedRows,
            compatibleRows: analyzer.compatibleRows,
            componentRows: analyzer.componentRows,
          },
          wordlist: null,
        },
        verdict,
      };
    })
    .sort((a, b) => {
      const aMp = a.expected.voice === 'middle-passive' ? 1 : 0;
      const bMp = b.expected.voice === 'middle-passive' ? 1 : 0;
      if (aMp !== bMp) return bMp - aMp;
      return (
        b.voiceCoverage.middlePassiveMiss - a.voiceCoverage.middlePassiveMiss ||
        a.lemma.localeCompare(b.lemma) ||
        a.targetKey.localeCompare(b.targetKey)
      );
    });

  const analyzerByVerb = new Map<string, LemmaAnalyzerSummary>();
  for (const audit of targetAudits) {
    if (audit.expected.voice !== 'middle-passive') continue;
    const summary = analyzerByVerb.get(audit.verbId) ?? {
      accepted: 0,
      incompatible: 0,
      noTokenAnalysis: 0,
      notProvided: 0,
      compatibleRows: 0,
      acceptedSamples: [],
    };
    const analyzer = audit.external.uniparserAnalyzer;
    if (analyzer.status === 'accepted') {
      summary.accepted += 1;
      if (summary.acceptedSamples.length < 2) {
        summary.acceptedSamples.push(audit.targetKey);
      }
    } else if (isAnalyzerNonacceptance(audit)) {
      summary.incompatible += 1;
    } else if (analyzer.status === 'no_token_analysis') {
      summary.noTokenAnalysis += 1;
    } else {
      summary.notProvided += 1;
    }
    summary.compatibleRows += analyzer.compatibleRows;
    analyzerByVerb.set(audit.verbId, summary);
  }

  const lemmaReviews = verbs
    .map((verb) => {
      const sources = sourceKeys(verb);
      const row = byLemmaVoice.get(verb.id) ?? {
        activeTotal: 0,
        activeHit: 0,
        activeMiss: 0,
        middlePassiveTotal: 0,
        middlePassiveHit: 0,
        middlePassiveMiss: 0,
      };
      const lexeme = lexemeByVerb.get(verb.id) ?? lexemeEvidence(verb, lexemes);
      const fakeTarget: TargetRecord = {
        id: verb.id,
        targetKey: verb.lemma,
        tokens: [verb.lemma],
        signature: 'lemma.middle-passive.review',
        verbId: verb.id,
        lemma: verb.lemma,
        translationEn: verb.translationEn,
        options: { voice: 'middle-passive' },
      };
      return {
        verbId: verb.id,
        lemma: verb.lemma,
        translationEn: verb.translationEn,
        sourceLevel: sourceLevel(sources),
        sources,
        flags: verb.flags ?? {},
        middlePassiveOverrideKeys: middlePassiveOverrideKeys(verb),
        activeHitRate: pct(row.activeHit, row.activeTotal),
        middlePassiveTargets: row.middlePassiveTotal,
        middlePassiveMisses: row.middlePassiveMiss,
        middlePassiveHitRate: pct(row.middlePassiveHit, row.middlePassiveTotal),
        lexeme,
        lexemeVoiceBucket: lexemeVoiceBucket(lexeme.tags),
        analyzerSummary: analyzerByVerb.get(verb.id) ?? {
          accepted: 0,
          incompatible: 0,
          noTokenAnalysis: 0,
          notProvided: 0,
          compatibleRows: 0,
          acceptedSamples: [],
        },
        verdict: classifyVoice(
          fakeTarget,
          verb,
          lexeme,
          emptyAnalyzerEvidence(),
          row,
        ),
      };
    })
    .filter((row) => row.middlePassiveTargets > 0)
    .sort(
      (a, b) =>
        b.middlePassiveMisses - a.middlePassiveMisses ||
        a.lemma.localeCompare(b.lemma),
    );

  const verdictCounts = new Map<string, number>();
  const formCounts = new Map<string, number>();
  const proofCounts = new Map<string, number>();
  const sourceLevelCounts = new Map<string, number>();
  const scopeCounts = new Map<string, number>();
  const analyzerStatusCounts = new Map<string, number>();
  const analyzerNonAcceptedLemmaCounts = new Map<string, number>();
  const analyzerNonAcceptedSignatureCounts = new Map<string, number>();
  const lemmaActionCounts = new Map<string, number>();
  const lemmaVoiceEligibilityCounts = new Map<string, number>();
  const lemmaLexemeVoiceBucketCounts = new Map<string, number>();
  for (const audit of targetAudits) {
    add(verdictCounts, audit.verdict.voiceEligibility);
    add(formCounts, audit.verdict.form);
    add(proofCounts, audit.verdict.proofLevel);
    add(sourceLevelCounts, audit.localVerb.sourceLevel);
    add(scopeCounts, audit.scope);
    add(analyzerStatusCounts, audit.external.uniparserAnalyzer.status);
    if (isAnalyzerNonacceptance(audit)) {
      add(analyzerNonAcceptedLemmaCounts, audit.lemma);
      add(analyzerNonAcceptedSignatureCounts, audit.signature);
    }
  }
  for (const row of lemmaReviews) {
    add(lemmaActionCounts, row.verdict.action);
    add(lemmaVoiceEligibilityCounts, row.verdict.voiceEligibility);
    add(lemmaLexemeVoiceBucketCounts, row.lexemeVoiceBucket);
  }

  const report = {
    run: {
      generatedAt: new Date().toISOString(),
      analyzerStatus: analyzerFile.status,
      strictMode: analyzerFile.rowsLoaded > 0,
      noDiacriticsMode: analyzerFile.rowsLoaded > 0,
      tool: 'scripts/audit-external-morphology.ts',
    },
    inputs: {
      targetsPath,
      targetGeneratedAt: targetFile.generatedAt ?? null,
      coveragePath,
      coverageTargetGeneratedAt: coverage.targetGeneratedAt ?? null,
      corpusVersion: targetFile.corpusVersion ?? null,
      verbsPath,
      uniparserLexemesPath: lexemesPath ?? null,
      uniparserLexemesSearchedPaths: lexemesLocation.searchedPaths,
      uniparserLexemesSource: lexemesLocation.source,
      uniparserAnalyzerPath: analyzerFile.path,
      uniparserAnalyzerSearchedPaths: analyzerFile.searchedPaths,
      uniparserAnalyzerSource: analyzerFile.source,
    },
    externalMorphology: {
      uniparserLexemesStatus: lexemes
        ? 'loaded'
        : lexemesInputProvided
          ? 'path_missing'
          : 'missing',
      uniparserLexemeEntries: lexemes?.entries.length ?? 0,
      analyzerStatus: analyzerFile.status,
      analyzerRowsLoaded: analyzerFile.rowsLoaded,
      analyzerRowsMatched: analyzerFile.rowsMatched,
      analyzerRowsSkipped: analyzerFile.rowsSkipped,
      analyzerDuplicateRows: analyzerFile.duplicateRows,
      webCorporaStatus: 'not_provided',
    },
    boundaries: [
      'This explains generated foljapp targets and retained-evidence misses; it does not prove universal raw-corpus absence.',
      'Analyzer acceptance would not be corpus attestation.',
      'Analyzer rejection would not prove impossibility.',
      'Multiword targets are token/head checks, not whole-phrase validation.',
      '`component_supported` means UniParser recognized the head token as a verb form for the expected lemma, while auxiliary/person/tense features remain phrase-level and unchecked.',
      '`source_backed_composed` means a Husić-backed active simple-cell override composes with the middle-passive `u` marker; it is source-backed morphology, not corpus attestation.',
      'This script never edits data/verbs/*.json.',
    ],
    summary: {
      totalTargets: coverage.summary.totalTargets,
      missedTargets: coverage.summary.missedTargets,
      auditedMissTargets: targetAudits.length,
      lemmaReviews: lemmaReviews.length,
      middlePassiveMissTargets: targetAudits.filter(
        (audit) => audit.expected.voice === 'middle-passive',
      ).length,
      lexemeMatchedLemmas: lemmaReviews.filter((row) => row.lexeme.found)
        .length,
      analyzerRowMatchedTargets: targetAudits.filter(
        (audit) => audit.external.uniparserAnalyzer.status !== 'not_provided',
      ).length,
      analyzerAnalyzedTargets: targetAudits.filter(
        (audit) => audit.external.uniparserAnalyzer.analyzedRows > 0,
      ).length,
      analyzerNoTokenAnalysisTargets: targetAudits.filter(
        (audit) =>
          audit.external.uniparserAnalyzer.status === 'no_token_analysis',
      ).length,
      analyzerAcceptedTargets: targetAudits.filter(
        (audit) => audit.external.uniparserAnalyzer.accepted,
      ).length,
    },
    formVerdictCounts: topCounts(formCounts),
    voiceEligibilityCounts: topCounts(verdictCounts),
    proofLevelCounts: topCounts(proofCounts),
    sourceLevelCounts: topCounts(sourceLevelCounts),
    scopeCounts: topCounts(scopeCounts),
    analyzerStatusCounts: topCounts(analyzerStatusCounts),
    analyzerNonAcceptedLemmaCounts: topCounts(analyzerNonAcceptedLemmaCounts),
    analyzerNonAcceptedSignatureCounts: topCounts(
      analyzerNonAcceptedSignatureCounts,
    ),
    lemmaActionCounts: topCounts(lemmaActionCounts),
    lemmaVoiceEligibilityCounts: topCounts(lemmaVoiceEligibilityCounts),
    lemmaLexemeVoiceBucketCounts: topCounts(lemmaLexemeVoiceBucketCounts),
    verbs: lemmaReviews,
    targets: targetAudits,
  };

  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify(report) + '\n', 'utf8');
  const markdownTargets = balancedTargetSample(report.targets, 80, 3);

  const markdown = [
    '# External Morphology Audit',
    '',
    `Generated: ${report.run.generatedAt}`,
    '',
    'This is a local review artifact. It does not run UniParser, does not prove usage, and does not edit foljapp verb data.',
    '',
    '## Summary',
    '',
    `- Missed targets audited: ${report.summary.auditedMissTargets}`,
    `- Middle-passive missed targets: ${report.summary.middlePassiveMissTargets}`,
    `- Lemmas reviewed: ${report.summary.lemmaReviews}`,
    `- UniParser lexeme status: ${report.externalMorphology.uniparserLexemesStatus}`,
    `- UniParser lexeme entries loaded: ${report.externalMorphology.uniparserLexemeEntries}`,
    `- Lexeme-matched foljapp lemmas: ${report.summary.lexemeMatchedLemmas}`,
    `- UniParser lexeme source: ${report.inputs.uniparserLexemesSource}`,
    `- UniParser lexeme searched paths: ${report.inputs.uniparserLexemesSearchedPaths.join(', ')}`,
    `- UniParser analyzer status: ${report.externalMorphology.analyzerStatus}`,
    `- UniParser analyzer rows loaded: ${report.externalMorphology.analyzerRowsLoaded}`,
    `- UniParser analyzer row-matched targets: ${report.summary.analyzerRowMatchedTargets}`,
    `- UniParser analyzer analyzed targets: ${report.summary.analyzerAnalyzedTargets}`,
    `- UniParser analyzer no-token-analysis targets: ${report.summary.analyzerNoTokenAnalysisTargets}`,
    `- UniParser analyzer accepted targets: ${report.summary.analyzerAcceptedTargets}`,
    `- UniParser analyzer skipped rows: ${report.externalMorphology.analyzerRowsSkipped}`,
    `- UniParser analyzer duplicate rows: ${report.externalMorphology.analyzerDuplicateRows}`,
    '',
    '## Caveats',
    '',
    '- Analyzer acceptance would not be corpus attestation.',
    '- Analyzer rejection would not prove impossibility.',
    '- Analyzer rows are target-id joined head-token checks, not whole-phrase validation.',
    '- Multiword targets are marked `head-token-only`; their full foljapp signature is not a token-level analyzer expectation.',
    '',
    '## Voice Eligibility Counts',
    '',
    '| Verdict | Missed Targets |',
    '| --- | ---: |',
    ...report.voiceEligibilityCounts.map(
      (row) => `| ${row.key} | ${row.count} |`,
    ),
    '',
    '## Lemma Review Actions',
    '',
    '| Action | Lemmas |',
    '| --- | ---: |',
    ...report.lemmaActionCounts.map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '| Lemma Voice Verdict | Lemmas |',
    '| --- | ---: |',
    ...report.lemmaVoiceEligibilityCounts.map(
      (row) => `| ${row.key} | ${row.count} |`,
    ),
    '',
    '| UniParser Lexeme Bucket | Lemmas |',
    '| --- | ---: |',
    ...report.lemmaLexemeVoiceBucketCounts.map(
      (row) => `| ${row.key} | ${row.count} |`,
    ),
    '',
    '## Source And Scope Counts',
    '',
    '| Source Level | Missed Targets |',
    '| --- | ---: |',
    ...report.sourceLevelCounts.map((row) => `| ${row.key} | ${row.count} |`),
    '',
    '| Scope | Missed Targets |',
    '| --- | ---: |',
    ...report.scopeCounts.map((row) => `| ${row.key} | ${row.count} |`),
    '',
    ...(report.externalMorphology.analyzerRowsLoaded > 0
      ? [
          '## UniParser Analyzer Status Counts',
          '',
          '| Status | Missed Targets |',
          '| --- | ---: |',
          ...report.analyzerStatusCounts.map(
            (row) => `| ${row.key} | ${row.count} |`,
          ),
          '',
          '## Post-Verdict Analyzer Nonacceptance Lemma Clusters',
          '',
          '| Lemma | Targets |',
          '| --- | ---: |',
          ...report.analyzerNonAcceptedLemmaCounts
            .slice(0, 20)
            .map((row) => `| ${md(row.key)} | ${row.count} |`),
          '',
          '## Post-Verdict Analyzer Nonacceptance Signature Clusters',
          '',
          '| Signature | Targets |',
          '| --- | ---: |',
          ...report.analyzerNonAcceptedSignatureCounts
            .slice(0, 20)
            .map((row) => `| ${md(row.key)} | ${row.count} |`),
          '',
        ]
      : []),
    '## Top Lemma Reviews',
    '',
    '| Lemma | Verb ID | Flags | MP Misses | MP Hit Rate | Active Hit Rate | Source Level | Lexeme Bucket | MP Analyzer Accepted | MP Analyzer Nonacceptance | Accepted Samples | Lexeme Tags | Voice Verdict | Action |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | --- | --- | --- | --- |',
    ...report.verbs
      .slice(0, 60)
      .map(
        (row) =>
          `| ${md(row.lemma)} | ${md(row.verbId)} | ${md(flagsText(row.flags))} | ${row.middlePassiveMisses} | ${row.middlePassiveHitRate} | ${row.activeHitRate} | ${row.sourceLevel} | ${row.lexemeVoiceBucket} | ${row.analyzerSummary.accepted} | ${row.analyzerSummary.incompatible} | ${md(row.analyzerSummary.acceptedSamples.join(', '))} | ${md(row.lexeme.tags.join(', ') || '')} | ${row.verdict.voiceEligibility} | ${row.verdict.action} |`,
      ),
    '',
    '## Top Target Reviews',
    '',
    'Balanced sample: at most three targets per lemma.',
    '',
    '| Target | Lemma | Signature | Scope | Analyzer | Voice Verdict | Proof | Reasons |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...markdownTargets.map(
      (row) =>
        `| ${md(row.targetKey)} | ${md(row.lemma)} | ${md(row.signature)} | ${row.scope} | ${md(row.external.uniparserAnalyzer.status)} | ${row.verdict.voiceEligibility} | ${row.verdict.proofLevel} | ${md(row.verdict.reasons.join(', '))} |`,
    ),
    '',
  ].join('\n');
  writeFileSync(mdOut, markdown, 'utf8');

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${mdOut}`);
}

main();
