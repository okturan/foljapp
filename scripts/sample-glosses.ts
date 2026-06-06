/**
 * Sample-and-print 50 random English glosses across the corpus, with
 * Albanian forms alongside, for spot-checking the english-gloss capability.
 *
 * Picks a diversity set (suppletives, be-compounds, irregular-English bases,
 * multi-sense, phonological-mutation) plus pure random sampling to fill out
 * to 50 cells covering varied mood/tense/voice/polarity/modality.
 *
 * Run: `npx tsx scripts/sample-glosses.ts`
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  configure,
  conjugate,
  UnsupportedCellError,
  type ConjugateOptions,
  type Mood,
  type NonFiniteForm,
  type Tense,
  type VerbEntry,
} from '@foljapp/engine';

import { englishGloss } from '../apps/web/lib/english-gloss';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const VERBS_DIR = join(REPO_ROOT, 'data', 'verbs');

function loadCorpus(): VerbEntry[] {
  const files = readdirSync(VERBS_DIR).filter(
    (f) =>
      f.endsWith('.json') &&
      f !== 'index.json' &&
      f !== 'version.json' &&
      f !== 'frequency.json' &&
      f !== '_corpus.client.json',
  );
  return files.map(
    (f) => JSON.parse(readFileSync(join(VERBS_DIR, f), 'utf8')) as VerbEntry,
  );
}

const corpus = loadCorpus();
configure(corpus, '0.0.0');

const findLemma = (l: string): VerbEntry => {
  const e = corpus.find((c) => c.lemma === l);
  if (!e) throw new Error(`Missing corpus verb ${l}`);
  return e;
};

const INDICATIVE_TENSES: Tense[] = [
  'present',
  'imperfect',
  'aorist',
  'perfect',
  'pluperfect',
  'future',
  'future-perfect',
  'future-in-past',
];
const SUBJUNCTIVE_TENSES: Tense[] = ['present', 'imperfect', 'perfect', 'pluperfect'];
const CONDITIONAL_TENSES: Tense[] = ['present', 'perfect'];
const ADMIRATIVE_TENSES: Tense[] = ['present', 'imperfect', 'perfect', 'pluperfect'];
const OPTATIVE_TENSES: Tense[] = ['present', 'perfect'];
const NON_FINITE: NonFiniteForm[] = ['participle', 'infinitive', 'gerund', 'privative', 'temporal'];

interface Sample {
  verb: VerbEntry;
  opts: ConjugateOptions;
  category: string;
}

function randomChoice<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!;
}

function buildRandomCell(verb: VerbEntry, label: string): Sample {
  const moodPick = randomChoice([
    'indicative',
    'subjunctive',
    'conditional',
    'admirative',
    'optative',
    'imperative',
    'non-finite',
  ] as const);
  const opts: ConjugateOptions = { mood: moodPick as Mood };
  if (moodPick === 'non-finite') {
    opts.form = randomChoice(NON_FINITE);
  } else if (moodPick === 'imperative') {
    opts.tense = 'present';
    opts.voice = 'active';
    opts.person = 2;
    opts.number = randomChoice(['singular', 'plural'] as const);
    opts.polarity = randomChoice(['affirmative', 'negative'] as const);
    opts.modality = 'declarative';
  } else {
    const tenses =
      moodPick === 'indicative'
        ? INDICATIVE_TENSES
        : moodPick === 'subjunctive'
          ? SUBJUNCTIVE_TENSES
          : moodPick === 'conditional'
            ? CONDITIONAL_TENSES
            : moodPick === 'admirative'
              ? ADMIRATIVE_TENSES
              : OPTATIVE_TENSES;
    opts.tense = randomChoice(tenses);
    opts.voice = randomChoice(['active', 'middle-passive'] as const);
    opts.person = randomChoice([1, 2, 3] as const);
    opts.number = randomChoice(['singular', 'plural'] as const);
    opts.polarity = randomChoice(['affirmative', 'negative'] as const);
    opts.modality = randomChoice(['declarative', 'interrogative'] as const);
  }
  return { verb, opts, category: label };
}

const samples: Sample[] = [];

// 1. Suppletives — 6
for (const lemma of ['jam', 'jap', 'shoh', 'vij', 'them']) {
  samples.push(buildRandomCell(findLemma(lemma), 'suppletive'));
}
samples.push({
  verb: findLemma('jam'),
  opts: {
    mood: 'indicative',
    tense: 'present',
    voice: 'active',
    person: 3,
    number: 'singular',
    polarity: 'negative',
    modality: 'interrogative',
  },
  category: 'suppletive (jam neg interrog)',
});

// 2. Be-compounds — 4
for (const lemma of ['lind', 'mund']) {
  samples.push(buildRandomCell(findLemma(lemma), 'be-compound'));
  samples.push(buildRandomCell(findLemma(lemma), 'be-compound'));
}

// 3. Irregular-English-base verbs — 8
for (const lemma of ['ha', 'pi', 'fle', 'shkruaj', 'gjej', 'mendoj', 'kuptoj', 'shkoj']) {
  if (corpus.some((c) => c.lemma === lemma)) {
    samples.push(buildRandomCell(findLemma(lemma), 'irregular-english'));
  }
}

// 4. Multi-sense — 6
for (const lemma of ['dua', 'kërkoj', 'mësoj', 'tregoj', 'qëndroj', 'pjek']) {
  if (corpus.some((c) => c.lemma === lemma)) {
    samples.push(buildRandomCell(findLemma(lemma), 'multi-sense'));
  }
}

// 5. Phonological mutation — 2
for (const lemma of ['djeg', 'pjek']) {
  samples.push(buildRandomCell(findLemma(lemma), 'mutating'));
}

// 6. Defective — 2
for (const lemma of ['duhet', 'mund']) {
  samples.push(buildRandomCell(findLemma(lemma), 'defective'));
}

// 7. Phrasal verb (look for) — 2
for (const lemma of ['kërkoj']) {
  samples.push(buildRandomCell(findLemma(lemma), 'phrasal'));
  samples.push(buildRandomCell(findLemma(lemma), 'phrasal'));
}

// 8. Pure random — fill to 50
while (samples.length < 50) {
  const verb = randomChoice(corpus);
  samples.push(buildRandomCell(verb, 'random'));
}

// Print results
console.log('# Gloss samples (n=' + samples.length + ')\n');
console.log(
  '| # | category | verb | translationEn | cell | Albanian | English gloss |',
);
console.log(
  '|---|---|---|---|---|---|---|',
);
let idx = 1;
for (const s of samples) {
  let albanian = '—';
  try {
    albanian = conjugate(s.verb.id, s.opts).form;
  } catch (e) {
    if (e instanceof UnsupportedCellError) albanian = '(unsupported)';
    else albanian = `(error: ${(e as Error).message.slice(0, 40)})`;
  }
  let gloss = '';
  try {
    gloss = englishGloss(s.verb, s.opts);
  } catch (e) {
    gloss = `(error: ${(e as Error).message.slice(0, 40)})`;
  }
  const cellSig =
    s.opts.mood === 'non-finite'
      ? `non-finite.${s.opts.form}`
      : `${s.opts.mood}.${s.opts.tense ?? '?'}.${s.opts.voice ?? 'active'}.${s.opts.person ?? '?'}${s.opts.number?.[0] ?? '?'}.${s.opts.polarity ?? 'affirmative'}.${s.opts.modality ?? 'declarative'}`;
  console.log(
    `| ${idx} | ${s.category} | ${s.verb.lemma} | ${s.verb.translationEn} | ${cellSig} | ${albanian} | ${gloss} |`,
  );
  idx++;
}
