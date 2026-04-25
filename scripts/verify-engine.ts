/**
 * Engine vs. Kaikki verification.
 *
 * For every verb in our corpus, fetch the matching Kaikki entry, build
 * a (mood, tense, person, number) → form map from its tagged forms,
 * then ask our engine to produce every cell and compare.
 *
 * Output: a per-verb match/mismatch report, plus a summary.
 *
 * Run: `npx tsx scripts/verify-engine.ts [--verbose] [--verb=<id>]`
 *
 * Cached Kaikki JSONL files live in `.cache/kaikki/<id>.jsonl` and are
 * gitignored. Re-fetch with `--refresh`.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  configure,
  conjugate,
  UnsupportedCellError,
  type ConjugateOptions,
  type Mood,
  type Tense,
  type VerbEntry,
} from '@foljapp/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const VERBS_DIR = join(REPO_ROOT, 'data', 'verbs');
const CACHE_DIR = join(REPO_ROOT, '.cache', 'kaikki');

interface CliOptions {
  verbose: boolean;
  refresh: boolean;
  onlyVerb: string | null;
}

function parseArgs(): CliOptions {
  const opts: CliOptions = { verbose: false, refresh: false, onlyVerb: null };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--verbose' || arg === '-v') opts.verbose = true;
    else if (arg === '--refresh') opts.refresh = true;
    else if (arg.startsWith('--verb=')) opts.onlyVerb = arg.split('=')[1] ?? null;
  }
  return opts;
}

function loadCorpus(): VerbEntry[] {
  const files = readdirSync(VERBS_DIR).filter(
    (f) => f.endsWith('.json') && f !== 'index.json' && f !== 'version.json',
  );
  return files.map((f) =>
    JSON.parse(readFileSync(join(VERBS_DIR, f), 'utf8')) as VerbEntry,
  );
}

function kaikkiUrlFor(lemma: string): string {
  // Kaikki path: /dictionary/Albanian/meaning/{first-letter}/{first-2-letters}/{lemma}.jsonl
  // First letter and first-2 letters are URL-encoded. Lemma itself appears decoded in the trailing segment.
  const first = encodeURIComponent(lemma.charAt(0));
  const firstTwo = encodeURIComponent(lemma.slice(0, 2));
  const trailing = encodeURIComponent(lemma);
  return `https://kaikki.org/dictionary/Albanian/meaning/${first}/${firstTwo}/${trailing}.jsonl`;
}

async function fetchKaikki(
  lemma: string,
  refresh: boolean,
): Promise<string | null> {
  const cachePath = join(CACHE_DIR, `${lemma}.jsonl`);
  if (!refresh && existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf8');
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  const url = kaikkiUrlFor(lemma);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const text = await res.text();
    writeFileSync(cachePath, text, 'utf8');
    return text;
  } catch {
    return null;
  }
}

interface KaikkiForm {
  form: string;
  tags: string[];
}

function parseKaikkiForms(jsonl: string): KaikkiForm[] {
  const forms: KaikkiForm[] = [];
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line) as { forms?: Array<{ form: string; tags?: string[]; source?: string }> };
    for (const f of entry.forms ?? []) {
      if (f.source !== 'conjugation' || !f.tags) continue;
      // Skip table-tags / inflection-template noise
      if (f.tags.includes('table-tags') || f.tags.includes('inflection-template')) continue;
      forms.push({ form: f.form, tags: f.tags });
    }
  }
  return forms;
}

interface CellSpec {
  mood: Mood;
  tense?: Tense;
  person?: 1 | 2 | 3;
  number?: 'singular' | 'plural';
}

function tagsFor(spec: CellSpec): Set<string> {
  const tags = new Set<string>();
  // Mood
  if (spec.mood === 'indicative') tags.add('indicative');
  else if (spec.mood === 'subjunctive') tags.add('subjunctive');
  else if (spec.mood === 'conditional') tags.add('conditional');
  else if (spec.mood === 'admirative') tags.add('admirative');
  else if (spec.mood === 'optative') tags.add('optative');
  else if (spec.mood === 'imperative') tags.add('imperative');

  // Tense — Kaikki tags vary slightly from ours
  if (spec.tense === 'present' && spec.mood !== 'imperative') tags.add('present');
  if (spec.tense === 'imperfect') tags.add('imperfect');
  if (spec.tense === 'aorist') tags.add('aorist');
  if (spec.tense === 'perfect') tags.add('perfect');
  if (spec.tense === 'pluperfect') tags.add('pluperfect');
  if (spec.tense === 'future') tags.add('future');
  if (spec.tense === 'present' && spec.mood === 'imperative') tags.add('present');

  // Person
  if (spec.person === 1) tags.add('first-person');
  if (spec.person === 2) tags.add('second-person');
  if (spec.person === 3) tags.add('third-person');

  // Number
  if (spec.number === 'singular') tags.add('singular');
  if (spec.number === 'plural') tags.add('plural');

  return tags;
}

function findKaikkiForm(
  forms: KaikkiForm[],
  spec: CellSpec,
): string | null {
  const wanted = tagsFor(spec);
  for (const f of forms) {
    const ftags = new Set(f.tags);
    let matches = true;
    for (const t of wanted) {
      if (!ftags.has(t)) {
        matches = false;
        break;
      }
    }
    // Extra check: avoid matching a richer cell when we asked for a leaner one
    if (matches) {
      // Filter: the form must NOT have an extra mood that conflicts with what we want
      const conflictingMoods = ['indicative', 'subjunctive', 'conditional', 'admirative', 'optative', 'imperative'];
      const wantMood = [...wanted].find((t) => conflictingMoods.includes(t));
      const fMood = [...ftags].find((t) => conflictingMoods.includes(t));
      if (wantMood && fMood && wantMood !== fMood) continue;
      // Filter: if we asked for indicative and the form is also tagged future, skip (we want plain indicative)
      if (spec.mood === 'indicative' && spec.tense === 'present' && ftags.has('future')) continue;
      return f.form === '-' ? null : f.form;
    }
  }
  return null;
}

const PERSON_NUMBERS: Array<{ person: 1 | 2 | 3; number: 'singular' | 'plural' }> = [
  { person: 1, number: 'singular' },
  { person: 2, number: 'singular' },
  { person: 3, number: 'singular' },
  { person: 1, number: 'plural' },
  { person: 2, number: 'plural' },
  { person: 3, number: 'plural' },
];

const FINITE_TENSE_KEYS: Array<{ mood: Mood; tense: Tense }> = [
  { mood: 'indicative', tense: 'present' },
  { mood: 'indicative', tense: 'imperfect' },
  { mood: 'indicative', tense: 'aorist' },
  { mood: 'indicative', tense: 'perfect' },
  { mood: 'indicative', tense: 'pluperfect' },
  { mood: 'indicative', tense: 'future' },
  { mood: 'subjunctive', tense: 'present' },
  { mood: 'subjunctive', tense: 'imperfect' },
  { mood: 'subjunctive', tense: 'perfect' },
  { mood: 'subjunctive', tense: 'pluperfect' },
  { mood: 'conditional', tense: 'present' },
  { mood: 'conditional', tense: 'perfect' },
  { mood: 'admirative', tense: 'present' },
  { mood: 'admirative', tense: 'perfect' },
  { mood: 'optative', tense: 'present' },
];

interface CellOutcome {
  spec: CellSpec;
  engineForm: string | null;
  kaikkiForm: string | null;
  status: 'match' | 'mismatch' | 'missing-kaikki' | 'engine-error';
  engineError?: string;
}

function probeCell(verbId: string, spec: CellSpec, kaikki: KaikkiForm[]): CellOutcome {
  const opts: ConjugateOptions = {
    mood: spec.mood,
    tense: spec.tense,
    voice: 'active',
    polarity: 'affirmative',
    modality: 'declarative',
  };
  if (spec.person !== undefined) opts.person = spec.person;
  if (spec.number !== undefined) opts.number = spec.number;

  let engineForm: string | null = null;
  let engineError: string | undefined = undefined;
  try {
    engineForm = conjugate(verbId, opts).form;
  } catch (e) {
    if (e instanceof UnsupportedCellError) {
      engineError = 'unsupported';
    } else {
      engineError = (e as Error).message;
    }
  }

  const kaikkiForm = findKaikkiForm(kaikki, spec);

  let status: CellOutcome['status'];
  if (engineError === 'unsupported') {
    if (kaikkiForm === null) status = 'match';
    else status = 'mismatch';
  } else if (engineError) {
    status = 'engine-error';
  } else if (kaikkiForm === null) {
    status = 'missing-kaikki';
  } else if (engineForm === kaikkiForm) {
    status = 'match';
  } else {
    status = 'mismatch';
  }

  const outcome: CellOutcome = {
    spec,
    engineForm,
    kaikkiForm,
    status,
  };
  if (engineError !== undefined) outcome.engineError = engineError;
  return outcome;
}

function cellLabel(spec: CellSpec): string {
  const parts = [spec.mood];
  if (spec.tense) parts.push(spec.tense);
  if (spec.person) parts.push(`${spec.person}${spec.number === 'singular' ? 'sg' : 'pl'}`);
  return parts.join('/');
}

async function verifyVerb(
  entry: VerbEntry,
  opts: CliOptions,
): Promise<{ verbId: string; outcomes: CellOutcome[]; cached: boolean; fetched: boolean }> {
  const jsonl = await fetchKaikki(entry.lemma, opts.refresh);
  if (!jsonl) {
    return { verbId: entry.id, outcomes: [], cached: false, fetched: false };
  }

  const kaikki = parseKaikkiForms(jsonl);
  const outcomes: CellOutcome[] = [];

  for (const tense of FINITE_TENSE_KEYS) {
    for (const pn of PERSON_NUMBERS) {
      outcomes.push(probeCell(entry.id, { ...tense, ...pn }, kaikki));
    }
  }

  // Imperative — only 2sg/2pl
  outcomes.push(probeCell(entry.id, { mood: 'imperative', tense: 'present', person: 2, number: 'singular' }, kaikki));
  outcomes.push(probeCell(entry.id, { mood: 'imperative', tense: 'present', person: 2, number: 'plural' }, kaikki));

  return { verbId: entry.id, outcomes, cached: true, fetched: true };
}

async function main() {
  const opts = parseArgs();
  const corpus = loadCorpus();

  configure(corpus, '0.1.0');

  const filtered = opts.onlyVerb
    ? corpus.filter((c) => c.id === opts.onlyVerb)
    : corpus;

  if (filtered.length === 0) {
    console.error(`✗ No corpus entries matched ${opts.onlyVerb}`);
    process.exit(1);
  }

  let totalMatches = 0;
  let totalMismatches = 0;
  let totalMissing = 0;
  let totalErrors = 0;
  const verbsWithoutKaikki: string[] = [];
  const mismatchesByVerb: Map<string, CellOutcome[]> = new Map();

  for (const entry of filtered) {
    const result = await verifyVerb(entry, opts);
    if (!result.fetched) {
      verbsWithoutKaikki.push(entry.id);
      console.log(`  ${entry.id.padEnd(10)} no Kaikki entry — skipping`);
      continue;
    }
    let v_matches = 0, v_mismatches = 0, v_missing = 0, v_errors = 0;
    const localMismatches: CellOutcome[] = [];
    for (const o of result.outcomes) {
      if (o.status === 'match') v_matches++;
      else if (o.status === 'mismatch') {
        v_mismatches++;
        localMismatches.push(o);
      } else if (o.status === 'missing-kaikki') v_missing++;
      else if (o.status === 'engine-error') v_errors++;
    }
    totalMatches += v_matches;
    totalMismatches += v_mismatches;
    totalMissing += v_missing;
    totalErrors += v_errors;
    if (localMismatches.length) mismatchesByVerb.set(entry.id, localMismatches);

    const verdict =
      v_mismatches === 0 ? '✓' :
      v_mismatches < 5 ? '~' : '✗';
    console.log(
      `  ${verdict} ${entry.id.padEnd(10)}  match=${v_matches.toString().padStart(3)}  mismatch=${v_mismatches.toString().padStart(3)}  missing=${v_missing.toString().padStart(3)}  err=${v_errors}`,
    );

    if (opts.verbose && localMismatches.length) {
      for (const o of localMismatches.slice(0, 8)) {
        console.log(
          `      ${cellLabel(o.spec).padEnd(35)}  engine="${o.engineForm}"  kaikki="${o.kaikkiForm}"`,
        );
      }
      if (localMismatches.length > 8) {
        console.log(`      … and ${localMismatches.length - 8} more`);
      }
    }
  }

  console.log();
  console.log('Summary:');
  console.log(`  matches:    ${totalMatches}`);
  console.log(`  mismatches: ${totalMismatches}`);
  console.log(`  missing:    ${totalMissing}  (Kaikki has no form for that cell)`);
  console.log(`  errors:     ${totalErrors}`);
  if (verbsWithoutKaikki.length) {
    console.log(`  no Kaikki entry: ${verbsWithoutKaikki.join(', ')}`);
  }
  console.log();
  if (totalMismatches > 0 && !opts.verbose) {
    const verbsWithMismatch = Array.from(mismatchesByVerb.keys());
    console.log(`Run with --verbose to see mismatches for: ${verbsWithMismatch.join(', ')}`);
  }
}

void main();
