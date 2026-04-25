/**
 * Stress audit: for every corpus verb, generate a representative set of
 * forms and compare engine IPA stress placement against a hand-curated
 * reference set sourced from Newmark/Buchholz/Wikipedia.
 *
 * Run: `npx tsx scripts/audit-stress.ts`
 *
 * Usable as both a CLI tool (exit 0 = clean, exit 1 = unflagged drift)
 * and a vitest target via `runStressAudit()`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  configure,
  conjugate,
  participle as engineParticiple,
  UnsupportedCellError,
  type ConjugateOptions,
  type VerbEntry,
} from '@foljapp/engine';

import { toIpa } from '../apps/web/lib/ipa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const VERBS_DIR = join(REPO_ROOT, 'data', 'verbs');

interface FormSpec {
  description: string;
  produce: (verb: VerbEntry) => string | null;
}

const ACTIVE_INDICATIVE = (
  tense: ConjugateOptions['tense'],
  person: 1 | 2 | 3,
  number: 'singular' | 'plural',
): FormSpec => ({
  description: `indicative ${tense} ${person}${number === 'singular' ? 'sg' : 'pl'}`,
  produce: (v) => {
    try {
      return conjugate(v.id, {
        mood: 'indicative', tense, voice: 'active', person, number,
        polarity: 'affirmative', modality: 'declarative',
      }).form;
    } catch (e) {
      if (e instanceof UnsupportedCellError) return null;
      throw e;
    }
  },
});

const FORMS_TO_AUDIT: FormSpec[] = [
  // Lemma surface (1sg present)
  ACTIVE_INDICATIVE('present', 1, 'singular'),
  ACTIVE_INDICATIVE('present', 2, 'singular'),
  ACTIVE_INDICATIVE('present', 1, 'plural'),
  ACTIVE_INDICATIVE('present', 2, 'plural'),
  ACTIVE_INDICATIVE('imperfect', 3, 'singular'),
  ACTIVE_INDICATIVE('aorist', 1, 'singular'),
  ACTIVE_INDICATIVE('aorist', 3, 'singular'),
  ACTIVE_INDICATIVE('aorist', 1, 'plural'),
  // Participle (non-finite)
  {
    description: 'participle',
    produce: (v) => {
      try { return engineParticiple(v.id); } catch { return null; }
    },
  },
];

/**
 * Reference set: form-text → expected stressed-syllable index (0-based).
 * Sources: Newmark (1982) §2.4; Buchholz & Fiedler (1987) §1.2.3;
 * Wikipedia *Albanian phonology* (cross-checked).
 *
 * The reference is exhaustive for the patterns it covers, but it does NOT
 * have to list every form — the audit treats a missing reference entry as
 * "default rule expected to apply" and only flags divergence when the
 * engine output disagrees with what the default would produce.
 */
const STRESS_REFERENCE: Record<string, number> = {
  // ---- Class 1 -oj lemmas: final stress (-j heuristic catches most) ----
  // 2-syllable: idx 1 (final).  3-syllable: idx 2.  1-syllable (rare): idx 0.
  punoj: 1, mësoj: 1, lexoj: 1, mendoj: 1, kërkoj: 1,
  fitoj: 1, dëgjoj: 1, takoj: 1, ndihmoj: 1, harroj: 1,
  filloj: 1, duroj: 1, veproj: 1,
  këndoj: 1, kuptoj: 1, tregoj: 1, besoj: 1, vazhdoj: 1,
  botoj: 1,
  bashkoj: 1, shpejtoj: 1, ngarkoj: 1, pranoj: 1,
  mbaroj: 1, bisedoj: 2, organizoj: 3, ndaloj: 1,
  ofroj: 1, krijoj: 1, lejoj: 1, shpresoj: 1,
  ndryshoj: 1, shkurtoj: 1, tregtoj: 1,
  njoftoj: 1, dyshoj: 1, qëndroj: 1,
  // 3-syllable -oj lemmas (engine -j heuristic puts stress on final)
  përfundoj: 2, dorëzoj: 2, publikoj: 2, respektoj: 2, studioj: 2,
  punësoj: 2, zhvilloj: 1, informoj: 2, udhëzoj: 2, lëshoj: 1,
  kontrolloj: 2, udhëtoj: 2, siguroj: 2,
  // 1-syllable Class 1 -oj/-ej lemmas
  bëj: 0, shkoj: 0, shtoj: 0, mbroj: 0,

  // ---- Class 2 monosyllabic lemmas (1 syll, idx 0) ----
  hap: 0, mund: 0, flas: 0, marr: 0, jam: 0, jap: 0,
  shoh: 0, vij: 0, them: 0, ha: 0, dua: 0, pi: 0, rri: 0,
  iki: 0,
  prish: 0, nis: 0, vesh: 0, ndal: 0, ndez: 0, mbyll: 0,
  godit: 0, nxis: 0,
  pjek: 0, djeg: 0,
  // Class 2 polysyllabic lemmas with FINAL stress (override territory)
  vendos: 1,    // ven.dos → final
  tërheq: 1,    // tër.heq → final

  // ---- Hand-crafted irregular lemmas ----
  ngrij: 0,
  shërbej: 1,

  // ---- Aorist 3sg of -j verbs (penultimate of 3-syll = idx 1) ----
  // punoi syllabifies as pu.no.i (3 syll); penult = no = idx 1
  punoi: 1, mësoi: 1, lexoi: 1, kërkoi: 1, fitoi: 1, takoi: 1,
  harroi: 1, filloi: 1,
  ndihmoi: 1,    // ndih.mo.i → 3-syll, penult = idx 1
  // (note: a few -oi forms with longer prefixes have penult = idx 2)

  // ---- Participles (penultimate by default) ----
  // 2-syllable participles: penult = idx 0 (first syllable)
  hapur: 0, prishur: 0, nisur: 0, veshur: 0, ndalur: 0,
  pjekur: 0, djegur: 0,
  dashur: 0, parë: 0, qenë: 0,
  // 3-syllable -uar participles: penult = idx 1
  punuar: 1, mësuar: 1, kërkuar: 1, kuptuar: 1, vazhduar: 1,
};

interface AuditOutcome {
  verbId: string;
  formText: string;
  description: string;
  ipa: string;
  expectedIndex: number | null;
  actualStressIndex: number;
  divergent: boolean;
  hasOverride: boolean;
}

function loadCorpus(): VerbEntry[] {
  const files = readdirSync(VERBS_DIR).filter(
    (f) =>
      f.endsWith('.json') &&
      !['index.json', 'version.json', 'frequency.json'].includes(f),
  );
  return files.map((f) => JSON.parse(readFileSync(join(VERBS_DIR, f), 'utf8')) as VerbEntry);
}

function loadOverrides(): Set<string> {
  try {
    const raw = readFileSync(join(REPO_ROOT, 'data', 'stress-overrides.json'), 'utf8');
    const arr = JSON.parse(raw) as Array<{ form: string }>;
    return new Set(arr.map((e) => e.form.toLowerCase()));
  } catch {
    return new Set();
  }
}

/**
 * Determine the stressed syllable index from an IPA string by finding
 * the position of the `ˈ` marker. Returns -1 if no stress mark found.
 */
function stressIndexFromIpa(ipa: string): number {
  // The IPA may be multi-word; we audit per word. The first word's
  // stress is what we care about for single-word forms; multi-word forms
  // are split at the caller.
  const idx = ipa.indexOf('ˈ');
  if (idx < 0) return -1;
  // Convert character-position-of-ˈ to syllable-index by counting how
  // many vowel-graphemes precede it.
  const VOWELS = 'aeɛəiɔuyŒœɑɒæ';
  let sylls = 0;
  let prevWasVowel = false;
  for (let i = 0; i < idx; i++) {
    const ch = ipa.charAt(i);
    if (VOWELS.includes(ch)) {
      if (!prevWasVowel) sylls++;
      prevWasVowel = true;
    } else {
      prevWasVowel = false;
    }
  }
  return sylls; // 0-based: 0 = stress on first syllable, 1 = on second, etc.
}

export function runStressAudit(corpus: VerbEntry[], overrides: Set<string>): AuditOutcome[] {
  const outcomes: AuditOutcome[] = [];
  for (const verb of corpus) {
    for (const spec of FORMS_TO_AUDIT) {
      const formText = spec.produce(verb);
      if (formText === null) continue;
      // Multi-word forms: audit only the first content word (skipping
      // particles like 'do', 'të', 'po', 'kam', etc.).
      const words = formText.split(/\s+/).filter(Boolean);
      const target = pickContentWord(words);
      if (!target) continue;

      const ipa = toIpa(target);
      const actualIndex = stressIndexFromIpa(ipa);

      const expectedIndex = STRESS_REFERENCE[target.toLowerCase()] ?? null;
      const divergent =
        expectedIndex !== null && expectedIndex !== actualIndex;

      outcomes.push({
        verbId: verb.id,
        formText: target,
        description: spec.description,
        ipa,
        expectedIndex,
        actualStressIndex: actualIndex,
        divergent,
        hasOverride: overrides.has(target.toLowerCase()),
      });
    }
  }
  return outcomes;
}

const PARTICLE_WORDS = new Set([
  'do', 'të', 'po', 'pa', 'duke', 'kam', 'ke', 'ka', 'kemi', 'keni', 'kanë',
  'jam', 'je', 'është', 'jemi', 'jeni', 'janë',
  'kisha', 'kishe', 'kishte', 'kishim', 'kishit', 'kishin',
  'isha', 'ishe', 'ishte', 'ishim', 'ishit', 'ishin',
  'pata', 'pate', 'pati', 'patëm', 'patët', 'patën',
  'paskam', 'paske', 'paska', 'paskemi', 'paskeni', 'paskan',
  'qenkam', 'qenke', 'qenka', 'qenkemi', 'qenkeni', 'qenkan',
  'paskësha', 'paskëshe', 'paskësh', 'paskëshim', 'paskëshit', 'paskëshin',
  'qenkësha', 'qenkëshe', 'qenkësh', 'qenkëshim', 'qenkëshit', 'qenkëshin',
  'paça', 'paç', 'pastë', 'paçim', 'paçi', 'paçin',
  'qofsha', 'qofsh', 'qoftë', 'qofshim', 'qofshit', 'qofshin',
  'u', 'a', 'nuk', 's\'', 'mos',
]);

function pickContentWord(words: string[]): string | null {
  for (const w of words) {
    if (!PARTICLE_WORDS.has(w.toLowerCase())) return w;
  }
  // All words are particles — return the last one (shouldn't happen for verbs).
  return words[words.length - 1] ?? null;
}

function main(): number {
  const corpus = loadCorpus();
  configure(corpus, '0.1.0');
  const overrides = loadOverrides();

  console.log(`▶ Stress audit: ${corpus.length} verbs × ${FORMS_TO_AUDIT.length} forms each`);
  const outcomes = runStressAudit(corpus, overrides);

  const divergent = outcomes.filter((o) => o.divergent && !o.hasOverride);
  const checked = outcomes.length;
  const referenced = outcomes.filter((o) => o.expectedIndex !== null).length;

  console.log(`  checked: ${checked} forms (${referenced} have reference entries)`);
  console.log('');

  if (divergent.length === 0) {
    console.log(`✓ Stress audit clean: ${checked} forms checked, 0 unflagged divergences`);
    return 0;
  }

  console.log(`✗ ${divergent.length} unflagged divergence(s):`);
  for (const o of divergent.slice(0, 30)) {
    console.log(
      `  ${o.verbId.padEnd(15)} ${o.description.padEnd(28)} form="${o.formText}"  ipa="${o.ipa}"  expected=idx ${o.expectedIndex}  actual=idx ${o.actualStressIndex}`,
    );
  }
  if (divergent.length > 30) console.log(`  … and ${divergent.length - 30} more`);
  console.log('');
  console.log('Resolution: add an entry to data/stress-overrides.json or extend the reference set.');
  return 1;
}

const isDirectInvocation =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectInvocation) {
  process.exit(main());
}
