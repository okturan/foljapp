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
const HUSIC_CACHE_DIR = join(REPO_ROOT, '.cache', 'husic');

// Regression floor/ceiling for `--check` (corpus 0.1.8). Bump these in the
// SAME commit that legitimately moves the numbers, and explain the shift in
// the landing change — see packages/engine/docs/sources.md. Keep in sync
// with the baseline callout there.
const BASELINE_MIN_MATCHES = 19517;
const BASELINE_MAX_MISMATCHES = 168;

interface CliOptions {
  verbose: boolean;
  refresh: boolean;
  onlyVerb: string | null;
  check: boolean;
}

function parseArgs(): CliOptions {
  const opts: CliOptions = {
    verbose: false,
    refresh: false,
    onlyVerb: null,
    check: false,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--verbose' || arg === '-v') opts.verbose = true;
    else if (arg === '--refresh') opts.refresh = true;
    else if (arg === '--check') opts.check = true;
    else if (arg.startsWith('--verb=')) opts.onlyVerb = arg.split('=')[1] ?? null;
  }
  return opts;
}

function loadCorpus(): VerbEntry[] {
  const files = readdirSync(VERBS_DIR).filter(
    (f) =>
      f.endsWith('.json') &&
      f !== 'index.json' &&
      f !== 'version.json' &&
      f !== 'frequency.json' &&
      f !== '_corpus.client.json',
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
  voice?: 'active' | 'middle-passive';
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

  // Tense — Kaikki tags by *verb form*, not by construction label, so
  // conditional re-uses the imperfect-form tag (do të punoja → tagged
  // imperfect because the verb form is the imperfect indicative) and
  // pluperfect-shape tenses get past+perfect.
  if (spec.mood === 'conditional') {
    if (spec.tense === 'present') tags.add('imperfect');
    if (spec.tense === 'perfect') {
      tags.add('past');
      tags.add('perfect');
    }
  } else {
    if (spec.tense === 'present' && spec.mood !== 'imperative') tags.add('present');
    if (spec.tense === 'imperfect') tags.add('imperfect');
    if (spec.tense === 'aorist') tags.add('aorist');
    if (spec.tense === 'perfect') tags.add('perfect');
    // Kaikki tags pluperfect as `past + perfect` (no `pluperfect` tag);
    // we add both so the loop matches pluperfect cells.
    if (spec.tense === 'pluperfect') {
      tags.add('past');
      tags.add('perfect');
    }
    if (spec.tense === 'future') tags.add('future');
    if (spec.tense === 'present' && spec.mood === 'imperative') tags.add('present');
  }

  // Person
  if (spec.person === 1) tags.add('first-person');
  if (spec.person === 2) tags.add('second-person');
  if (spec.person === 3) tags.add('third-person');

  // Number
  if (spec.number === 'singular') tags.add('singular');
  if (spec.number === 'plural') tags.add('plural');

  return tags;
}

/**
 * Voice-aware form filter. Kaikki uses no explicit middle-passive tag —
 * active and MP forms share tags and are differentiated by surface
 * morphology. We filter by surface prefix to disambiguate.
 *
 *   Active simple/compound:  default (skip MP-shaped forms)
 *   MP simple tenses:        surface starts with "u "
 *   MP compound tenses:      surface starts with jam-aux ("qenkam" or
 *                            "qenkësha"); for indicative compound MP
 *                            tenses the prefix is jam-paradigm forms
 *                            (jam, je, është, jemi, jeni, janë / isha,
 *                            ishe, ...).
 */
function formMatchesVoice(form: string, voice: 'active' | 'middle-passive', spec: CellSpec): boolean {
  // Peel mood-particle prefixes so MP-shape regexes can see the inner stem.
  // Subjunctive uses `të X`; conditional/future use `do të X`; raw `do ` is
  // less common but appears in some tagged forms.
  let inner = form;
  if (inner.startsWith('do të ')) inner = inner.slice(6);
  else if (inner.startsWith('do ')) inner = inner.slice(3);
  if (inner.startsWith('të ')) inner = inner.slice(3);

  const isUPrefixed = inner.startsWith('u ');
  // Jam-paradigm prefixes count as MP only when followed by a participle
  // (i.e., compound form). Bare `jam`, `qenkam`, etc. are jam's own active
  // forms and must not match MP voice for non-jam verbs.
  const isJamAdmir = /^qenk(am|e|a|emi|eni|an|ësha|ëshe|ësh|ëshim|ëshit|ëshin)\s+\S/.test(inner);
  const isJamIndicCompound = /^(jam|je|është|jemi|jeni|janë|isha|ishe|ishte|ishim|ishit|ishin|qe(shë)?|qemë|qetë|qenë)\s+\S/.test(inner);

  if (voice === 'middle-passive') {
    if (spec.mood === 'admirative') {
      if (spec.tense === 'present' || spec.tense === 'imperfect') return isUPrefixed;
      if (spec.tense === 'perfect' || spec.tense === 'pluperfect') return isJamAdmir;
    }
    if (spec.mood === 'indicative') {
      if (spec.tense === 'aorist') return isUPrefixed;
      if (spec.tense === 'perfect' || spec.tense === 'pluperfect') return isJamIndicCompound;
    }
    return isUPrefixed || isJamAdmir || isJamIndicCompound;
  }
  // Active: reject MP-shaped forms.
  return !(isUPrefixed || isJamAdmir);
}

function findKaikkiForm(
  forms: KaikkiForm[],
  spec: CellSpec,
): string | null {
  const wanted = tagsFor(spec);
  const voice = spec.voice ?? 'active';
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
      // Mood-agnostic past-disambiguation: if the spec didn't request 'past'
      // but the Kaikki form has it, skip. This auto-handles indicative perfect
      // vs pluperfect (perfect doesn't want past, pluperfect does), and is
      // correct for conditional perfect (which wants past, so it's not skipped).
      if (!wanted.has('past') && ftags.has('past')) continue;
      // Same shape for `perfect`: a form tagged `perfect` is a compound tense
      // (perfect/pluperfect/future-perfect/conditional-perfect). If the spec
      // asks for a non-perfect tense (e.g., indicative.future MP), skip the
      // compound form so we don't compare `do të jemi bërë` (future perfect)
      // against engine's `do të bëhemi` (future simple MP).
      if (!wanted.has('perfect') && ftags.has('perfect')) continue;
      const raw = f.form;
      if (raw === '-' || raw === 'u —') return null;
      // Voice filter — Kaikki has no explicit MP tag, so we differentiate
      // by surface morphology. Skip forms that don't match the requested voice.
      if (!formMatchesVoice(raw, voice, spec)) continue;
      // Strip Kaikki's "(variant)" parenthetical — those are dialectal/older
      // alternates (often Gheg, e.g., "marrkësh (marrkej)") that we don't
      // produce. The standard form before the parens is what we compare.
      const stripped = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
      return stripped;
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

const FINITE_TENSE_KEYS: Array<{ mood: Mood; tense: Tense; voice?: 'middle-passive' }> = [
  // Active — every mood/tense the engine produces
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
  { mood: 'admirative', tense: 'imperfect' },
  { mood: 'admirative', tense: 'perfect' },
  { mood: 'admirative', tense: 'pluperfect' },
  { mood: 'optative', tense: 'present' },
  // Middle-passive — full coverage so Husić-direct (and any voice-disambiguable
  // Kaikki entry) can compare against engine output.
  { mood: 'indicative', tense: 'present', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'imperfect', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'aorist', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'perfect', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'pluperfect', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'future', voice: 'middle-passive' },
  { mood: 'subjunctive', tense: 'present', voice: 'middle-passive' },
  { mood: 'subjunctive', tense: 'imperfect', voice: 'middle-passive' },
  { mood: 'subjunctive', tense: 'perfect', voice: 'middle-passive' },
  { mood: 'subjunctive', tense: 'pluperfect', voice: 'middle-passive' },
  { mood: 'conditional', tense: 'present', voice: 'middle-passive' },
  { mood: 'conditional', tense: 'perfect', voice: 'middle-passive' },
  { mood: 'optative', tense: 'present', voice: 'middle-passive' },
  { mood: 'admirative', tense: 'present', voice: 'middle-passive' },
  { mood: 'admirative', tense: 'imperfect', voice: 'middle-passive' },
  { mood: 'admirative', tense: 'perfect', voice: 'middle-passive' },
  { mood: 'admirative', tense: 'pluperfect', voice: 'middle-passive' },
];

interface CellOutcome {
  spec: CellSpec;
  engineForm: string | null;
  kaikkiForm: string | null;
  husicForm?: string | null;
  /** Which source produced the matching form, if status === 'match'.
   * 'f' = flag-suppressed: the engine refused the cell due to an editorial
   * voice flag (noMiddlePassive / middlePassiveThirdPersonOnly), which
   * outranks mechanically-generated source-cache rows. */
  matchSource?: 'k' | 'h' | 'h*' | 'f';
  /** True when matched against a Husić-derived record (cross-resolved from
   * the alphabetical glossary's class-pattern lookup, not directly tabulated). */
  husicDerived?: boolean;
  status: 'match' | 'mismatch' | 'missing-kaikki' | 'engine-error';
  engineError?: string;
}

interface HusicForm extends KaikkiForm {
  derived?: boolean;
}

function loadHusicForms(verbId: string): HusicForm[] | null {
  const path = join(HUSIC_CACHE_DIR, `${verbId}.jsonl`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  const forms: HusicForm[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as HusicForm;
      if (obj.form && Array.isArray(obj.tags)) forms.push(obj);
    } catch {
      // skip malformed line
    }
  }
  return forms;
}

function findHusicFormWithProvenance(forms: HusicForm[], spec: CellSpec): { form: string | null; derived: boolean } {
  // Reuse findKaikkiForm's matching logic but also surface the derived flag.
  // We do a manual scan to track which record matched.
  const wanted = tagsFor(spec);
  const voice = spec.voice ?? 'active';
  for (const f of forms) {
    const ftags = new Set(f.tags);
    let matches = true;
    for (const t of wanted) {
      if (!ftags.has(t)) { matches = false; break; }
    }
    if (!matches) continue;
    const conflictingMoods = ['indicative', 'subjunctive', 'conditional', 'admirative', 'optative', 'imperative'];
    const wantMood = [...wanted].find((t) => conflictingMoods.includes(t));
    const fMood = [...ftags].find((t) => conflictingMoods.includes(t));
    if (wantMood && fMood && wantMood !== fMood) continue;
    if (spec.mood === 'indicative' && spec.tense === 'present' && ftags.has('future')) continue;
    if (!wanted.has('past') && ftags.has('past')) continue;
    if (!wanted.has('perfect') && ftags.has('perfect')) continue;
    const raw = f.form;
    if (raw === '-' || raw === 'u —') return { form: null, derived: !!f.derived };
    if (!formMatchesVoice(raw, voice, spec)) continue;
    const stripped = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return { form: stripped, derived: !!f.derived };
  }
  return { form: null, derived: false };
}


function probeCell(
  verbId: string,
  spec: CellSpec,
  kaikki: KaikkiForm[],
  husic: HusicForm[] | null,
  flags: VerbEntry['flags'],
): CellOutcome {
  const opts: ConjugateOptions = {
    mood: spec.mood,
    tense: spec.tense,
    voice: spec.voice ?? 'active',
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
  // Consult Husić as fallback when Kaikki has no entry. Track derived flag.
  const husicLookup = kaikkiForm === null && husic !== null
    ? findHusicFormWithProvenance(husic, spec)
    : { form: null as string | null, derived: false };
  const husicForm = husicLookup.form;
  const husicDerived = husicLookup.derived;

  let status: CellOutcome['status'];
  let matchSource: CellOutcome['matchSource'];
  if (engineError === 'unsupported') {
    const voice = spec.voice ?? 'active';
    const flagSuppressed =
      voice === 'middle-passive' &&
      (flags?.noMiddlePassive === true ||
        (flags?.middlePassiveThirdPersonOnly === true && spec.person !== 3));
    if (flagSuppressed) {
      // Editorial voice flags are explicit lexical decisions
      // (suppress-mp-for-intransitives doctrine); they outrank
      // mechanically-generated source-cache paradigm rows.
      status = 'match';
      matchSource = 'f';
    } else if (kaikkiForm === null && husicForm === null) status = 'match';
    else status = 'mismatch';
  } else if (engineError) {
    status = 'engine-error';
  } else if (kaikkiForm !== null) {
    status = engineForm === kaikkiForm ? 'match' : 'mismatch';
    if (status === 'match') matchSource = 'k';
  } else if (husicForm !== null) {
    status = engineForm === husicForm ? 'match' : 'mismatch';
    if (status === 'match') matchSource = husicDerived ? 'h*' : 'h';
  } else {
    status = 'missing-kaikki';
  }

  const outcome: CellOutcome = {
    spec,
    engineForm,
    kaikkiForm,
    status,
  };
  if (husicForm !== null) outcome.husicForm = husicForm;
  if (matchSource !== undefined) outcome.matchSource = matchSource;
  if (husicDerived) outcome.husicDerived = true;
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
  const husic = loadHusicForms(entry.id);
  const outcomes: CellOutcome[] = [];

  for (const tense of FINITE_TENSE_KEYS) {
    for (const pn of PERSON_NUMBERS) {
      outcomes.push(probeCell(entry.id, { ...tense, ...pn }, kaikki, husic, entry.flags));
    }
  }

  // Imperative — only 2sg/2pl, both voices
  outcomes.push(probeCell(entry.id, { mood: 'imperative', tense: 'present', person: 2, number: 'singular' }, kaikki, husic, entry.flags));
  outcomes.push(probeCell(entry.id, { mood: 'imperative', tense: 'present', person: 2, number: 'plural' }, kaikki, husic, entry.flags));
  outcomes.push(probeCell(entry.id, { mood: 'imperative', tense: 'present', person: 2, number: 'singular', voice: 'middle-passive' }, kaikki, husic, entry.flags));
  outcomes.push(probeCell(entry.id, { mood: 'imperative', tense: 'present', person: 2, number: 'plural', voice: 'middle-passive' }, kaikki, husic, entry.flags));

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
  let totalMatchesK = 0;
  let totalMatchesH = 0;
  let totalMatchesHDerived = 0;
  let totalMatchesF = 0;
  let totalFlagSuppressedWithSource = 0;
  let totalMismatches = 0;
  let totalMissing = 0;
  let totalErrors = 0;
  const verbsWithoutKaikki: string[] = [];
  const verbsWithoutHusic: string[] = [];
  const mismatchesByVerb: Map<string, CellOutcome[]> = new Map();

  for (const entry of filtered) {
    const result = await verifyVerb(entry, opts);
    if (!result.fetched) {
      verbsWithoutKaikki.push(entry.id);
      console.log(`  ${entry.id.padEnd(10)} no Kaikki entry — skipping`);
      continue;
    }
    if (!existsSync(join(HUSIC_CACHE_DIR, `${entry.id}.jsonl`))) {
      verbsWithoutHusic.push(entry.id);
    }
    let v_matches = 0, v_mismatches = 0, v_missing = 0, v_errors = 0;
    let v_matchK = 0, v_matchH = 0;
    const localMismatches: CellOutcome[] = [];
    for (const o of result.outcomes) {
      if (o.status === 'match') {
        v_matches++;
        if (o.matchSource === 'k') v_matchK++;
        else if (o.matchSource === 'h') v_matchH++;
        else if (o.matchSource === 'h*') totalMatchesHDerived++;
        else if (o.matchSource === 'f') {
          totalMatchesF++;
          if (o.husicForm != null || o.kaikkiForm !== null) {
            totalFlagSuppressedWithSource++;
          }
        }
      }
      else if (o.status === 'mismatch') {
        v_mismatches++;
        localMismatches.push(o);
      } else if (o.status === 'missing-kaikki') v_missing++;
      else if (o.status === 'engine-error') v_errors++;
    }
    totalMatches += v_matches;
    totalMatchesK += v_matchK;
    totalMatchesH += v_matchH;
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
  if (totalMatchesH > 0 || totalMatchesHDerived > 0) {
    const husicParts: string[] = [];
    if (totalMatchesH > 0) husicParts.push(`${totalMatchesH} via Husić-direct`);
    if (totalMatchesHDerived > 0) husicParts.push(`${totalMatchesHDerived} via Husić-derived`);
    console.log(`  matches:    ${totalMatches} (${totalMatchesK} via Kaikki + ${husicParts.join(' + ')})`);
  } else {
    console.log(`  matches:    ${totalMatches}`);
  }
  if (totalMatchesF > 0) {
    console.log(
      `  flag-suppressed: ${totalMatchesF} voice-flag refusals accepted as editorial decisions` +
        ` (${totalFlagSuppressedWithSource} had mechanical source-cache rows)`,
    );
  }
  console.log(`  mismatches: ${totalMismatches}`);
  console.log(`  missing:    ${totalMissing}  (no source has ground truth for that cell)`);
  console.log(`  errors:     ${totalErrors}`);
  if (verbsWithoutKaikki.length) {
    console.log(`  no Kaikki entry: ${verbsWithoutKaikki.join(', ')}`);
  }
  const husicConsulted = filtered.length - verbsWithoutKaikki.length - verbsWithoutHusic.length;
  if (husicConsulted === 0 && totalMatchesH === 0) {
    console.log(`  Husić cache empty — see packages/engine/docs/husic-format.md to acquire source`);
  } else if (verbsWithoutHusic.length > 0) {
    console.log(`  Husić cache partial: ${verbsWithoutHusic.length} of ${filtered.length} verbs missing Husić data`);
  }
  console.log();
  if (totalMismatches > 0 && !opts.verbose) {
    const verbsWithMismatch = Array.from(mismatchesByVerb.keys());
    console.log(`Run with --verbose to see mismatches for: ${verbsWithMismatch.join(', ')}`);
  }

  // --check gates a full-corpus run against the recorded baseline so a
  // pre-push hook (or a human) can fail on regression. Only meaningful for
  // the whole corpus, not a single --verb run.
  if (opts.check && !opts.onlyVerb) {
    const regressions: string[] = [];
    if (totalMatches < BASELINE_MIN_MATCHES) {
      regressions.push(
        `matches ${totalMatches} < baseline ${BASELINE_MIN_MATCHES}`,
      );
    }
    if (totalMismatches > BASELINE_MAX_MISMATCHES) {
      regressions.push(
        `mismatches ${totalMismatches} > baseline ${BASELINE_MAX_MISMATCHES}`,
      );
    }
    if (regressions.length > 0) {
      console.error(`\n✗ verify-engine --check FAILED: ${regressions.join('; ')}`);
      console.error(
        '  If this is an intended baseline change, update BASELINE_* in this ' +
          'script and packages/engine/docs/sources.md in the same commit.',
      );
      process.exitCode = 1;
    } else {
      console.log(
        `✓ verify-engine --check OK (matches ≥ ${BASELINE_MIN_MATCHES}, ` +
          `mismatches ≤ ${BASELINE_MAX_MISMATCHES}).`,
      );
    }
  }
}

void main();
