/**
 * Loads the verb corpus from data/verbs/ and configures the engine
 * once at module load. Subsequent imports of @foljapp/engine see a
 * fully-configured singleton.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { configure, type VerbEntry } from '@foljapp/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = join(__dirname, '..', '..', '..', 'data', 'verbs');

interface CorpusVersion {
  version: string;
  generatedAt: string;
  engineVersion: string;
}

function loadCorpus(): { entries: VerbEntry[]; version: CorpusVersion } {
  const files = readdirSync(CORPUS_DIR).filter(
    (f) =>
      f.endsWith('.json') &&
      f !== 'index.json' &&
      f !== 'version.json' &&
      f !== 'frequency.json',
  );

  const entries: VerbEntry[] = [];
  for (const file of files) {
    const raw = readFileSync(join(CORPUS_DIR, file), 'utf8');
    entries.push(JSON.parse(raw) as VerbEntry);
  }

  const versionRaw = readFileSync(join(CORPUS_DIR, 'version.json'), 'utf8');
  const version = JSON.parse(versionRaw) as CorpusVersion;

  return { entries, version };
}

const { entries, version } = loadCorpus();

configure(entries, version.version);

export const corpus = entries;
export const corpusVersion = version;

export function findEntryByLemma(lemma: string): VerbEntry | undefined {
  return corpus.find((e) => e.lemma === lemma);
}

export function allLemmas(): string[] {
  return corpus.map((e) => e.lemma).sort();
}
