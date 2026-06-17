/**
 * Emit the generated forms and grammar metadata that local corpus indexing
 * should search for.
 *
 * The output is intentionally kept in .cache: it is a build artifact derived
 * from the checked-in verb corpus and engine, not source data.
 *
 * Run:
 *   npx tsx scripts/build-corpus-example-targets.ts
 *   npx tsx scripts/build-corpus-example-targets.ts --forms=punoj,"të punoj",punuakam
 */

import {
  allCells,
  configure,
  conjugate,
  generatedSearchTarget,
  normalizeSearchKey,
  UnsupportedCellError,
  type CellKey,
  type ConjugateOptions,
  type VerbEntry,
} from '@foljapp/engine';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_OUT = join(REPO_ROOT, '.cache', 'corpus-example-targets.json');
const VERB_BUNDLE_PATH = join(
  REPO_ROOT,
  'data',
  'verbs',
  '_corpus.client.json',
);
const VERB_VERSION_PATH = join(REPO_ROOT, 'data', 'verbs', 'version.json');

interface TargetRecord {
  id: string;
  targetKey: string;
  displayForm: string;
  tokens: string[];
  signature: string;
  ancTags: string[];
  ancQuery: string;
  cellLabel: string;
  verbId: string;
  lemma: string;
  translationEn: string;
  options: ConjugateOptions;
}

interface Output {
  generatedAt: string;
  engine: 'foljapp';
  corpusVersion: string;
  formFilter: string[] | null;
  targets: TargetRecord[];
}

function valueAfter(prefix: string): string | undefined {
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}

function parseFormFilter(): Set<string> | null {
  const raw = valueAfter('--forms=');
  if (!raw) return null;
  const forms = raw
    .split(',')
    .map((form) => normalizeSearchKey(form))
    .filter(Boolean);
  return forms.length > 0 ? new Set(forms) : null;
}

function outPath(): string {
  return valueAfter('--out=') ?? DEFAULT_OUT;
}

function loadCorpus(): { corpus: VerbEntry[]; version: string } {
  if (!existsSync(VERB_BUNDLE_PATH)) {
    throw new Error(`Missing corpus bundle: ${VERB_BUNDLE_PATH}`);
  }
  const rawCorpus = readFileSync(VERB_BUNDLE_PATH, 'utf8');
  const rawVersion = readFileSync(VERB_VERSION_PATH, 'utf8');
  const corpus = JSON.parse(rawCorpus) as VerbEntry[];
  const version = (JSON.parse(rawVersion) as { version: string }).version;
  configure(corpus, version);
  return { corpus, version };
}

function optionsForCell(
  cell: CellKey,
  polarity: 'affirmative' | 'negative',
): ConjugateOptions {
  if (cell.mood === 'non-finite') {
    return { mood: 'non-finite', form: cell.form };
  }

  return {
    mood: cell.mood,
    tense: cell.tense,
    voice: cell.voice,
    person: cell.person,
    number: cell.number,
    polarity,
    modality: 'declarative',
  };
}

function targetId(
  verbId: string,
  targetKey: string,
  signature: string,
): string {
  return `${verbId}:${signature}:${targetKey}`.replace(/\s+/g, '_');
}

function pushTarget(
  targets: TargetRecord[],
  seen: Set<string>,
  entry: VerbEntry,
  options: ConjugateOptions,
  formFilter: Set<string> | null,
): void {
  try {
    const result = conjugate(entry.id, options);
    const target = generatedSearchTarget(result.form, options);
    if (!target) return;
    if (formFilter && !formFilter.has(target.targetKey)) return;

    const id = targetId(entry.id, target.targetKey, target.signature);
    if (seen.has(id)) return;
    seen.add(id);
    targets.push({
      ...target,
      id,
      verbId: entry.id,
      lemma: entry.lemma,
      translationEn: entry.translationEn,
      options,
    });
  } catch (err) {
    if (err instanceof UnsupportedCellError) return;
    throw err;
  }
}

function buildTargets(corpus: VerbEntry[], formFilter: Set<string> | null) {
  const targets: TargetRecord[] = [];
  const seen = new Set<string>();
  const cells = allCells();

  for (const entry of corpus) {
    for (const cell of cells) {
      pushTarget(
        targets,
        seen,
        entry,
        optionsForCell(cell, 'affirmative'),
        formFilter,
      );
      if (cell.mood !== 'non-finite') {
        pushTarget(
          targets,
          seen,
          entry,
          optionsForCell(cell, 'negative'),
          formFilter,
        );
      }
    }
  }

  return targets.sort((a, b) =>
    a.targetKey === b.targetKey
      ? a.id.localeCompare(b.id)
      : a.targetKey.localeCompare(b.targetKey),
  );
}

function main(): void {
  const formFilter = parseFormFilter();
  const { corpus, version } = loadCorpus();
  const targets = buildTargets(corpus, formFilter);
  const output: Output = {
    generatedAt: new Date().toISOString(),
    engine: 'foljapp',
    corpusVersion: version,
    formFilter: formFilter ? [...formFilter].sort() : null,
    targets,
  };

  const path = outPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${targets.length} target(s) to ${path}`);
}

main();
