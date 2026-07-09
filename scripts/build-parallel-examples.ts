/**
 * Build a compact parallel-example index for generated Albanian verb forms.
 *
 * The script uses OPUS' metadata API to locate zipped Moses files for
 * Albanian-English corpora, scans the Albanian side for exact generated forms
 * and contiguous generated phrases, then writes a small JSON lookup table
 * consumed by the playground.
 *
 * Run:
 *   npm run build:parallel-examples -- --forms=punoj,punon,punojnë,punuar,punuake
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import { configure, table, type VerbEntry } from '@foljapp/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CACHE_DIR = join(REPO_ROOT, '.cache', 'opus');
const LOCAL_MANIFEST_PATH = join(
  REPO_ROOT,
  '.cache',
  'datasets',
  'opus',
  'en-sq',
  'moses',
  'latest',
  'manifest.json',
);
const OUT_PATH = join(REPO_ROOT, 'data', 'opus', 'examples.json');
const VERB_BUNDLE_PATH = join(
  REPO_ROOT,
  'data',
  'verbs',
  '_corpus.client.json',
);
const VERB_VERSION_PATH = join(REPO_ROOT, 'data', 'verbs', 'version.json');

const DEFAULT_CORPORA = ['Tatoeba', 'GlobalVoices', 'GNOME'];
const DEFAULT_MAX_PER_FORM = 4;

const CORPUS_PRIORITY = [
  'Tatoeba',
  'GlobalVoices',
  'wikimedia',
  'WikiMatrix',
  'SETIMES',
  'GNOME',
  'ELRC-3052-wikipedia_health',
  'ELRC-wikipedia_health',
  'ELRC_2922',
  'ELRC-5067-SciPar',
  'EUbookshop',
  'TildeMODEL',
  'Ubuntu',
  'TED2020',
  'NeuLab-TedTalks',
  'QED',
  'bible-uedin',
  'Tanzil',
  'MaCoCu',
  'MultiMaCoCu',
  'XLEnt',
  'OpenSubtitles',
  'CCAligned',
  'HPLT',
  'MultiHPLT',
  'CCMatrix',
  'NLLB',
];

const STOP_TOKENS = new Set([
  'dhe',
  'jam',
  'je',
  'jemi',
  'jeni',
  'janë',
  'kam',
  'ke',
  'kemi',
  'keni',
  'kanë',
  'mos',
  'nuk',
  'për',
  'të',
]);

interface Args {
  corpora: string[];
  forms: Set<string> | null;
  fromLocalCache: boolean;
  frozenTime: boolean;
  manifestPath: string;
  maxPerForm: number;
  refresh: boolean;
}

interface OpusApiCorpus {
  alignment_pairs: number;
  corpus: string;
  latest: string;
  preprocessing: string;
  size: number;
  source: string;
  source_tokens: number;
  target: string;
  target_tokens: number;
  url: string;
  version: string;
}

interface OpusApiResponse {
  corpora?: OpusApiCorpus[];
}

interface CorpusMetadata {
  corpus: string;
  version: string;
  preprocessing: string;
  sentencePairs: number;
  sourceLanguage: string;
  targetLanguage: string;
  opusUrl: string;
  downloadUrl: string;
}

interface ParallelExample {
  corpus: string;
  version: string;
  sentenceNumber: number;
  sq: string;
  en: string;
  opusUrl: string;
}

interface Output {
  generatedAt: string;
  source: 'OPUS';
  sourceUrl: string;
  apiUrl: string;
  languagePair: { source: 'sq'; target: 'en' };
  formFilter: string[] | null;
  corpora: CorpusMetadata[];
  examples: Record<string, ParallelExample[]>;
}

interface LocalDownloadRecord extends OpusApiCorpus {
  localPath: string;
  status: 'pending' | 'downloaded';
}

interface LocalManifest {
  apiUrl: string;
  corpora: LocalDownloadRecord[];
}

interface CorpusSource {
  meta: CorpusMetadata;
  zipPath: string;
}

interface PhraseTarget {
  form: string;
  tokens: string[];
}

interface SearchTargets {
  phraseTargetsByFirstToken: Map<string, PhraseTarget[]>;
  tokenTargets: Set<string>;
}

function valueAfter(prefix: string): string | undefined {
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}

function parseArgs(): Args {
  const fromLocalCache = process.argv.includes('--from-local-cache');
  const corporaArg = valueAfter('--corpora=');
  const corpora = corporaArg
    ? corporaArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : fromLocalCache
      ? []
      : DEFAULT_CORPORA;

  const formValues = valueAfter('--forms=')
    ?.split(',')
    .map(normalizeFormKey)
    .filter(Boolean);

  const maxRaw = valueAfter('--max-per-form=');
  const maxPerForm = maxRaw ? Number(maxRaw) : DEFAULT_MAX_PER_FORM;
  if (!Number.isInteger(maxPerForm) || maxPerForm < 1) {
    throw new Error('--max-per-form must be a positive integer');
  }

  return {
    corpora,
    forms: formValues && formValues.length > 0 ? new Set(formValues) : null,
    fromLocalCache,
    frozenTime: process.argv.includes('--frozen-time'),
    manifestPath: valueAfter('--manifest=') ?? LOCAL_MANIFEST_PATH,
    maxPerForm,
    refresh: process.argv.includes('--refresh'),
  };
}

function normalizeToken(token: string): string {
  return token
    .normalize('NFC')
    .toLocaleLowerCase('sq-AL')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceTokens(text: string): string[] {
  return (text.match(/\p{L}+/gu) ?? []).map(normalizeToken);
}

function normalizeFormKey(form: string): string {
  return sentenceTokens(form).join(' ');
}

function loadGeneratedForms(): Set<string> {
  const rawCorpus = readFileSync(VERB_BUNDLE_PATH, 'utf8');
  const rawVersion = readFileSync(VERB_VERSION_PATH, 'utf8');
  const corpus = JSON.parse(rawCorpus) as VerbEntry[];
  const version = JSON.parse(rawVersion) as { version: string };
  configure(corpus, version.version);

  const forms = new Set<string>();
  for (const entry of corpus) {
    collectForms(table(entry.id), forms);
  }
  return forms;
}

function collectForms(value: unknown, forms: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectForms(item, forms);
    return;
  }
  if (!value || typeof value !== 'object') return;

  const record = value as Record<string, unknown>;
  if (typeof record.form === 'string') {
    const tokens = sentenceTokens(record.form);
    if (tokens.length > 1) {
      forms.add(tokens.join(' '));
    }
    for (const token of tokens) {
      if (token.length >= 3 && !STOP_TOKENS.has(token)) {
        forms.add(token);
      }
    }
  }

  for (const child of Object.values(record)) {
    collectForms(child, forms);
  }
}

async function fetchCorpusMetadata(corpus: string): Promise<CorpusMetadata> {
  const apiUrl = new URL('https://opus.nlpl.eu/opusapi');
  apiUrl.searchParams.set('corpus', corpus);
  apiUrl.searchParams.set('source', 'sq');
  apiUrl.searchParams.set('target', 'en');
  apiUrl.searchParams.set('preprocessing', 'moses');
  apiUrl.searchParams.set('version', 'latest');

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`OPUS API ${response.status} for ${corpus}`);
  }

  const payload = (await response.json()) as OpusApiResponse;
  const row = payload.corpora?.[0];
  if (!row) {
    throw new Error(`No OPUS moses sq/en corpus found for ${corpus}`);
  }

  return {
    corpus: row.corpus,
    version: row.version,
    preprocessing: row.preprocessing,
    sentencePairs: row.alignment_pairs,
    sourceLanguage: row.source,
    targetLanguage: row.target,
    opusUrl: `https://opus.nlpl.eu/datasets/${encodeURIComponent(row.corpus)}`,
    downloadUrl: row.url,
  };
}

async function downloadZip(
  meta: CorpusMetadata,
  refresh: boolean,
): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const safeName = meta.corpus.replace(/[^a-z0-9_-]+/gi, '_');
  const zipPath = join(CACHE_DIR, `${safeName}-${meta.version}.zip`);
  if (existsSync(zipPath) && !refresh) return zipPath;

  const response = await fetch(meta.downloadUrl);
  if (!response.ok) {
    throw new Error(`download failed ${response.status}: ${meta.downloadUrl}`);
  }
  writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
  return zipPath;
}

function corpusRank(corpus: string): number {
  const rank = CORPUS_PRIORITY.indexOf(corpus);
  return rank === -1 ? CORPUS_PRIORITY.length : rank;
}

function sortCorpusSources(sources: CorpusSource[]): CorpusSource[] {
  return sources.sort((a, b) => {
    const rank = corpusRank(a.meta.corpus) - corpusRank(b.meta.corpus);
    if (rank !== 0) return rank;
    return a.meta.corpus.localeCompare(b.meta.corpus);
  });
}

function loadLocalCorpusSources(args: Args): CorpusSource[] {
  if (!existsSync(args.manifestPath)) {
    throw new Error(`Local OPUS manifest does not exist: ${args.manifestPath}`);
  }

  const raw = readFileSync(args.manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as LocalManifest;
  const allowed = new Set(args.corpora);
  const rows = manifest.corpora.filter(
    (row) =>
      row.status === 'downloaded' &&
      existsSync(row.localPath) &&
      (allowed.size === 0 || allowed.has(row.corpus)),
  );

  if (rows.length === 0) {
    throw new Error(`No downloaded OPUS corpora matched ${args.manifestPath}`);
  }

  return sortCorpusSources(
    rows.map((row) => ({
      meta: {
        corpus: row.corpus,
        version: row.version,
        preprocessing: row.preprocessing,
        sentencePairs: Number(row.alignment_pairs || 0),
        sourceLanguage: row.source,
        targetLanguage: row.target,
        opusUrl: `https://opus.nlpl.eu/datasets/${encodeURIComponent(row.corpus)}`,
        downloadUrl: row.url,
      },
      zipPath: row.localPath,
    })),
  );
}

async function loadRemoteCorpusSources(args: Args): Promise<CorpusSource[]> {
  const sources: CorpusSource[] = [];
  for (const corpus of args.corpora) {
    const meta = await fetchCorpusMetadata(corpus);
    const zipPath = await downloadZip(meta, args.refresh);
    sources.push({ meta, zipPath });
  }
  return sortCorpusSources(sources);
}

function zipEntries(zipPath: string): string[] {
  return execFileSync('unzip', ['-Z', '-1', zipPath], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function alignedTextFiles(zipPath: string): { sq: string; en: string } {
  const entries = zipEntries(zipPath);
  const sq = entries.find((entry) => entry.endsWith('.sq'));
  const en = entries.find((entry) => entry.endsWith('.en'));
  if (!sq || !en) {
    throw new Error(`Could not find .sq and .en files in ${zipPath}`);
  }
  return { sq, en };
}

function keepSentence(sq: string, en: string): boolean {
  return (
    sq.length > 0 &&
    en.length > 0 &&
    sq.length <= 260 &&
    en.length <= 260 &&
    !sq.includes('<') &&
    !en.includes('<')
  );
}

function compileSearchTargets(targetForms: Set<string>): SearchTargets {
  const tokenTargets = new Set<string>();
  const phraseTargetsByFirstToken = new Map<string, PhraseTarget[]>();

  for (const form of targetForms) {
    const tokens = sentenceTokens(form);
    if (tokens.length === 0) continue;

    if (tokens.length === 1) {
      tokenTargets.add(tokens[0]);
      continue;
    }

    const phraseTarget = { form: tokens.join(' '), tokens };
    const firstToken = tokens[0];
    const bucket = phraseTargetsByFirstToken.get(firstToken) ?? [];
    bucket.push(phraseTarget);
    phraseTargetsByFirstToken.set(firstToken, bucket);
  }

  return { phraseTargetsByFirstToken, tokenTargets };
}

function phraseMatchesAt(
  sentenceTokenList: string[],
  start: number,
  phraseTokens: string[],
): boolean {
  if (start + phraseTokens.length > sentenceTokenList.length) return false;
  return phraseTokens.every(
    (token, offset) => sentenceTokenList[start + offset] === token,
  );
}

function matchedFormsInSentence(
  sentenceTokenList: string[],
  targets: SearchTargets,
): Set<string> {
  const matchedForms = new Set<string>();

  for (let index = 0; index < sentenceTokenList.length; index++) {
    const token = sentenceTokenList[index];
    if (targets.tokenTargets.has(token)) {
      matchedForms.add(token);
    }

    const phraseTargets = targets.phraseTargetsByFirstToken.get(token);
    if (!phraseTargets) continue;

    for (const target of phraseTargets) {
      if (phraseMatchesAt(sentenceTokenList, index, target.tokens)) {
        matchedForms.add(target.form);
      }
    }
  }

  return matchedForms;
}

async function waitForProcess(
  proc: ReturnType<typeof spawn>,
  label: string,
): Promise<void> {
  let stderr = '';
  proc.stderr?.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const code = await new Promise<number | null>((resolveProcess, reject) => {
    proc.on('error', reject);
    proc.on('close', resolveProcess);
  });

  if (code !== 0) {
    throw new Error(`${label} exited ${code}: ${stderr.trim()}`);
  }
}

async function scanCorpus(
  meta: CorpusMetadata,
  zipPath: string,
  targetForms: Set<string>,
  examples: Map<string, ParallelExample[]>,
  maxPerForm: number,
): Promise<number> {
  const files = alignedTextFiles(zipPath);
  const sqProc = spawn('unzip', ['-p', zipPath, files.sq], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const enProc = spawn('unzip', ['-p', zipPath, files.en], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!sqProc.stdout || !enProc.stdout) {
    throw new Error(`Could not stream ${zipPath}`);
  }

  const sqWait = waitForProcess(sqProc, `${meta.corpus} ${files.sq}`);
  const enWait = waitForProcess(enProc, `${meta.corpus} ${files.en}`);
  const sqLines = createInterface({
    input: sqProc.stdout,
    crlfDelay: Infinity,
  });
  const enLines = createInterface({
    input: enProc.stdout,
    crlfDelay: Infinity,
  });
  const sqIterator = sqLines[Symbol.asyncIterator]();
  const enIterator = enLines[Symbol.asyncIterator]();
  const targets = compileSearchTargets(targetForms);
  let added = 0;
  let index = 0;

  while (true) {
    const [sqNext, enNext] = await Promise.all([
      sqIterator.next(),
      enIterator.next(),
    ]);
    if (sqNext.done || enNext.done) break;

    index++;
    const sq = sqNext.value.trim();
    const en = enNext.value.trim();
    if (!keepSentence(sq, en)) continue;

    const matchedForms = matchedFormsInSentence(sentenceTokens(sq), targets);

    for (const form of matchedForms) {
      const bucket = examples.get(form) ?? [];
      if (bucket.length >= maxPerForm) continue;
      if (bucket.some((example) => example.corpus === meta.corpus)) continue;
      bucket.push({
        corpus: meta.corpus,
        version: meta.version,
        sentenceNumber: index,
        sq,
        en,
        opusUrl: meta.opusUrl,
      });
      examples.set(form, bucket);
      added++;
    }

    if (index % 500_000 === 0) {
      console.log(
        `    ${index.toLocaleString()} aligned rows scanned, ${added} added`,
      );
    }
  }

  sqLines.close();
  enLines.close();
  await Promise.all([sqWait, enWait]);
  return added;
}

function emitOutput(
  args: Args,
  corpora: CorpusMetadata[],
  examples: Map<string, ParallelExample[]>,
): void {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  const sortedExamples = Object.fromEntries(
    [...examples.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([form, rows]) => [
        form,
        rows.sort((a, b) =>
          a.corpus === b.corpus
            ? a.sentenceNumber - b.sentenceNumber
            : corpusRank(a.corpus) - corpusRank(b.corpus) ||
              a.corpus.localeCompare(b.corpus),
        ),
      ]),
  );

  const output: Output = {
    generatedAt: args.frozenTime
      ? '2026-06-16T00:00:00.000Z'
      : new Date().toISOString(),
    source: 'OPUS',
    sourceUrl: 'https://opus.nlpl.eu/',
    apiUrl: 'https://opus.nlpl.eu/opusapi',
    languagePair: { source: 'sq', target: 'en' },
    formFilter: args.forms
      ? [...args.forms].sort((a, b) => a.localeCompare(b))
      : null,
    corpora,
    examples: sortedExamples,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  const args = parseArgs();
  const generatedForms = args.forms ?? loadGeneratedForms();
  const examples = new Map<string, ParallelExample[]>();
  const sources = args.fromLocalCache
    ? loadLocalCorpusSources(args)
    : await loadRemoteCorpusSources(args);
  const corpora = sources.map((source) => source.meta);

  console.log(
    `Indexing ${generatedForms.size} form(s) from ${sources.length} OPUS corpora`,
  );

  for (const { meta, zipPath } of sources) {
    const added = await scanCorpus(
      meta,
      zipPath,
      generatedForms,
      examples,
      args.maxPerForm,
    );
    console.log(`  ${meta.corpus} ${meta.version}: ${added} example(s)`);
  }

  emitOutput(args, corpora, examples);
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
