/**
 * Build a local-only morphology review artifact for corpus misses.
 *
 * This does not run a morphological analyzer and does not edit verb data. If a
 * UniParser Albanian verb lexeme file is provided, it uses lemma-level tags as
 * evidence only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_TARGETS = join(REPO_ROOT, '.cache', 'corpus-targets.json');
const DEFAULT_COVERAGE = join(REPO_ROOT, '.cache', 'corpus-coverage-report.json');
const DEFAULT_VERBS = join(REPO_ROOT, 'data', 'verbs', '_corpus.client.json');
const DEFAULT_JSON_OUT = join(REPO_ROOT, '.cache', 'external-morphology-audit.json');
const DEFAULT_MD_OUT = join(REPO_ROOT, '.cache', 'external-morphology-audit.md');

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

interface VoiceRow {
  activeTotal: number;
  activeHit: number;
  activeMiss: number;
  middlePassiveTotal: number;
  middlePassiveHit: number;
  middlePassiveMiss: number;
}

function valueAfter(prefix: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
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

function middlePassiveOverrideKeys(verb: VerbEntry | undefined): string[] {
  return Object.keys(verb?.cellOverrides ?? {})
    .filter((key) => key.includes('middle-passive'))
    .sort();
}

function parseUniparserLexemes(path: string): LexemeIndex {
  const text = readFileSync(path, 'utf8').replaceAll('\r', '\n');
  const chunks = text
    .split(/(?=-lexeme\s+lex:\s*)/g)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith('-lexeme'));
  const entries: LexemeEntry[] = [];

  for (const chunk of chunks) {
    const lex = chunk.match(/-lexeme\s+lex:\s*([^\s]+)/)?.[1];
    const gramm = chunk.match(/\sgramm:\s*([^\s]+)/)?.[1];
    if (!lex || !gramm) continue;
    entries.push({
      lex,
      tags: gramm.split(',').filter(Boolean),
      paradigm: chunk.match(/\sparadigm:\s*([^\s]+)/)?.[1] ?? null,
      lexref: chunk.match(/\slexref:\s*([^\s]+)/)?.[1] ?? null,
      transEn: chunk.match(/\strans_en:\s*([\s\S]*)$/)?.[1]?.trim() ?? '',
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
  const matchKind = exact ? 'exact_or_id' : folded ? 'diacritic_fold' : 'no_match';
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
    row.middlePassiveTotal === 0 ? 0 : row.middlePassiveMiss / row.middlePassiveTotal;

  if (target.tokens.length > 1) reasons.push('multiword_target_head_token_only');
  if (localSourceLevel === 'lexicon-only') reasons.push('lexicon_only');
  if (middlePassiveOverrideKeys(verb).length === 0) {
    reasons.push('no_middle_passive_overrides');
  }
  if (mpMissRate >= 0.75) reasons.push('high_middle_passive_miss_pressure');
  if (!lexeme.found) reasons.push(lexeme.matchKind === 'not_provided' ? 'no_external_lexeme_file' : 'no_external_lexeme_match');
  if (lexeme.dialectOrRegister.length > 0) {
    reasons.push(`dialect_or_register:${lexeme.dialectOrRegister.join(',')}`);
  }

  if (target.options.voice !== 'middle-passive') {
    return {
      form: 'not_validated',
      voiceEligibility: 'not_applicable_active',
      proofLevel: lexeme.found ? 'lexeme' : localProof,
      reasons,
      action: 'none',
    };
  }

  if (verb?.flags?.noMiddlePassive) {
    reasons.push('local_no_middle_passive_flag');
    return {
      form: 'not_validated',
      voiceEligibility: 'blocked_candidate',
      proofLevel: 'local_flag',
      reasons,
      action: 'keep_blocked',
    };
  }

  if (lexeme.tags.includes('med')) {
    reasons.push('external_lexeme_medial');
    return {
      form: 'not_validated',
      voiceEligibility: 'attested',
      proofLevel: 'lexeme',
      reasons,
      action: 'review_as_attested_middle_or_reflexive',
    };
  }

  if (
    lexeme.found &&
    lexeme.tags.includes('vi') &&
    !lexeme.tags.includes('vt') &&
    !lexeme.tags.includes('med')
  ) {
    reasons.push('external_lexeme_intransitive_only');
    return {
      form: 'not_validated',
      voiceEligibility: 'blocked_candidate',
      proofLevel: 'lexeme',
      reasons,
      action: 'review_no_middle_passive',
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

function topCounts(map: Map<string, number>): Array<{ key: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));
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

function main(): void {
  const targetsPath = valueAfter('--targets=') ?? DEFAULT_TARGETS;
  const coveragePath = valueAfter('--coverage=') ?? DEFAULT_COVERAGE;
  const verbsPath = valueAfter('--verbs=') ?? DEFAULT_VERBS;
  const lexemesPath =
    valueAfter('--uniparser-lexemes=') ?? process.env.FOLJAPP_UNIPARSER_LEXEMES;
  const jsonOut = valueAfter('--json=') ?? DEFAULT_JSON_OUT;
  const mdOut = valueAfter('--md=') ?? DEFAULT_MD_OUT;

  const targetFile = readJson<TargetFile>(targetsPath);
  const coverage = readJson<CoverageReport>(coveragePath);
  const verbs = readJson<VerbEntry[]>(verbsPath);
  const targetsById = new Map(targetFile.targets.map((target) => [target.id, target]));
  const missingIds = new Set(coverage.misses.map((miss) => miss.id));
  const verbsById = new Map(verbs.map((verb) => [verb.id, verb]));
  const lexemes =
    lexemesPath && existsSync(lexemesPath) ? parseUniparserLexemes(lexemesPath) : null;

  const byLemmaVoice = new Map<string, VoiceRow>();
  for (const target of targetFile.targets) {
    if (target.options.voice !== 'active' && target.options.voice !== 'middle-passive') {
      continue;
    }
    const row =
      byLemmaVoice.get(target.verbId) ?? {
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
      if (!target) throw new Error(`Coverage miss not found in targets: ${miss.id}`);
      const verb = verbsById.get(target.verbId);
      const sources = sourceKeys(verb);
      const voiceRow =
        byLemmaVoice.get(target.verbId) ?? {
          activeTotal: 0,
          activeHit: 0,
          activeMiss: 0,
          middlePassiveTotal: 0,
          middlePassiveHit: 0,
          middlePassiveMiss: 0,
        };
      const lexeme = lexemeByVerb.get(target.verbId) ?? lexemeEvidence(verb, lexemes);
      const verdict = classifyVoice(target, verb, lexeme, voiceRow);
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
          uniparserStrict: [],
          uniparserNoDiacritics: [],
          uniparserLexeme: lexeme,
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

  const lemmaReviews = verbs
    .map((verb) => {
      const sources = sourceKeys(verb);
      const row =
        byLemmaVoice.get(verb.id) ?? {
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
        verdict: classifyVoice(fakeTarget, verb, lexeme, row),
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
  for (const audit of targetAudits) {
    add(verdictCounts, audit.verdict.voiceEligibility);
    add(formCounts, audit.verdict.form);
    add(proofCounts, audit.verdict.proofLevel);
    add(sourceLevelCounts, audit.localVerb.sourceLevel);
    add(scopeCounts, audit.scope);
  }

  const report = {
    run: {
      generatedAt: new Date().toISOString(),
      analyzerStatus: 'not_run',
      strictMode: false,
      noDiacriticsMode: false,
      tool: 'scripts/audit-external-morphology.ts',
    },
    inputs: {
      targetsPath,
      coveragePath,
      verbsPath,
      uniparserLexemesPath: lexemesPath ?? null,
    },
    externalMorphology: {
      uniparserLexemesStatus: lexemes
        ? 'loaded'
        : lexemesPath
          ? 'path_missing'
          : 'missing',
      uniparserLexemeEntries: lexemes?.entries.length ?? 0,
      analyzerStatus: 'not_run',
      webCorporaStatus: 'not_provided',
    },
    boundaries: [
      'This explains generated foljapp targets and retained-evidence misses; it does not prove universal raw-corpus absence.',
      'Analyzer acceptance would not be corpus attestation.',
      'Analyzer rejection would not prove impossibility.',
      'Multiword targets are token/head checks, not whole-phrase validation.',
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
      lexemeMatchedLemmas: lemmaReviews.filter((row) => row.lexeme.found).length,
    },
    formVerdictCounts: topCounts(formCounts),
    voiceEligibilityCounts: topCounts(verdictCounts),
    proofLevelCounts: topCounts(proofCounts),
    sourceLevelCounts: topCounts(sourceLevelCounts),
    scopeCounts: topCounts(scopeCounts),
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
    '',
    '## Caveats',
    '',
    '- Analyzer acceptance would not be corpus attestation.',
    '- Analyzer rejection would not prove impossibility.',
    '- This first artifact uses optional lemma-level lexeme tags only.',
    '- Multiword targets are marked `head-token-only`; their full foljapp signature is not a token-level analyzer expectation.',
    '',
    '## Voice Eligibility Counts',
    '',
    '| Verdict | Missed Targets |',
    '| --- | ---: |',
    ...report.voiceEligibilityCounts.map((row) => `| ${row.key} | ${row.count} |`),
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
    '## Top Lemma Reviews',
    '',
    '| Lemma | Verb ID | MP Misses | MP Hit Rate | Active Hit Rate | Source Level | Lexeme Tags | Voice Verdict | Action |',
    '| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- |',
    ...report.verbs.slice(0, 60).map(
      (row) =>
        `| ${md(row.lemma)} | ${md(row.verbId)} | ${row.middlePassiveMisses} | ${row.middlePassiveHitRate} | ${row.activeHitRate} | ${row.sourceLevel} | ${md(row.lexeme.tags.join(', ') || '')} | ${row.verdict.voiceEligibility} | ${row.verdict.action} |`,
    ),
    '',
    '## Top Target Reviews',
    '',
    'Balanced sample: at most three targets per lemma.',
    '',
    '| Target | Lemma | Signature | Scope | Voice Verdict | Proof | Reasons |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...markdownTargets.map(
      (row) =>
        `| ${md(row.targetKey)} | ${md(row.lemma)} | ${md(row.signature)} | ${row.scope} | ${row.verdict.voiceEligibility} | ${row.verdict.proofLevel} | ${md(row.verdict.reasons.join(', '))} |`,
    ),
    '',
  ].join('\n');
  writeFileSync(mdOut, markdown, 'utf8');

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${mdOut}`);
}

main();
