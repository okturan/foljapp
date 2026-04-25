/**
 * Practice mode — question generation.
 *
 * Enumerates every (verbId, options) tuple that the engine can
 * conjugate cleanly under v1's constraints (active + affirmative +
 * declarative). Sampling is deterministic when seeded.
 */

import {
  conjugate,
  listVerbs,
  type ConjugateOptions,
  type Mood,
  type Tense,
  UnsupportedCellError,
} from '@foljapp/engine';

import '@/lib/corpus-client';

const PERSONS: Array<1 | 2 | 3> = [1, 2, 3];
const NUMBERS: Array<'singular' | 'plural'> = ['singular', 'plural'];

const MOOD_TENSES: Record<
  Exclude<Mood, 'non-finite' | 'imperative'>,
  Tense[]
> = {
  indicative: [
    'present',
    'imperfect',
    'aorist',
    'perfect',
    'pluperfect',
    'future',
    'future-perfect',
  ],
  subjunctive: ['present', 'imperfect', 'perfect', 'pluperfect'],
  conditional: ['present', 'perfect'],
  admirative: ['present', 'perfect'],
  optative: ['present'],
};

export interface Question {
  verbId: string;
  lemma: string;
  translationEn: string;
  options: ConjugateOptions;
  prompt: string;
  expectedForm: string;
}

interface RawCandidate {
  verbId: string;
  lemma: string;
  translationEn: string;
  options: ConjugateOptions;
  expectedForm: string;
}

let CACHED_CANDIDATES: RawCandidate[] | null = null;

function buildPrompt(
  lemma: string,
  translationEn: string,
  options: ConjugateOptions,
): string {
  const cell =
    options.person && options.number
      ? `${options.person}${options.number === 'singular' ? 'sg' : 'pl'}`
      : '';
  const moodTense = options.tense
    ? `${options.mood} ${options.tense}`
    : options.mood;
  return `Conjugate ${lemma} (${translationEn}) in ${moodTense}${cell ? ' ' + cell : ''}`;
}

function tryCell(
  verbId: string,
  options: ConjugateOptions,
): string | null {
  try {
    return conjugate(verbId, options).form;
  } catch (e) {
    if (e instanceof UnsupportedCellError) return null;
    throw e;
  }
}

function enumerateCandidates(): RawCandidate[] {
  const candidates: RawCandidate[] = [];
  for (const verb of listVerbs()) {
    // Finite moods: indicative, subjunctive, conditional, admirative, optative
    for (const mood of Object.keys(MOOD_TENSES) as Array<
      keyof typeof MOOD_TENSES
    >) {
      for (const tense of MOOD_TENSES[mood]) {
        for (const person of PERSONS) {
          for (const number of NUMBERS) {
            const options: ConjugateOptions = {
              mood,
              tense,
              voice: 'active',
              polarity: 'affirmative',
              modality: 'declarative',
              person,
              number,
            };
            const form = tryCell(verb.id, options);
            if (form !== null) {
              candidates.push({
                verbId: verb.id,
                lemma: verb.lemma,
                translationEn: verb.translationEn,
                options,
                expectedForm: form,
              });
            }
          }
        }
      }
    }
    // Imperative — only 2sg, 2pl
    for (const number of NUMBERS) {
      const options: ConjugateOptions = {
        mood: 'imperative',
        voice: 'active',
        polarity: 'affirmative',
        modality: 'declarative',
        person: 2,
        number,
      };
      const form = tryCell(verb.id, options);
      if (form !== null) {
        candidates.push({
          verbId: verb.id,
          lemma: verb.lemma,
          translationEn: verb.translationEn,
          options,
          expectedForm: form,
        });
      }
    }
  }
  return candidates;
}

function getCandidates(): RawCandidate[] {
  if (!CACHED_CANDIDATES) CACHED_CANDIDATES = enumerateCandidates();
  return CACHED_CANDIDATES;
}

/** Tiny linear-congruential PRNG — deterministic when seeded. */
function makeRng(seed: number | undefined): () => number {
  if (seed === undefined) return Math.random;
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface GenerateQuestionsOptions {
  seed?: number;
  count?: number;
  focus?: string;
}

export function generateQuestions(opts: GenerateQuestionsOptions = {}): Question[] {
  const { seed, count = 10, focus } = opts;
  const all = getCandidates();
  const pool = focus
    ? all.filter((c) => c.lemma === focus || c.verbId === focus)
    : all;
  const source = pool.length > 0 ? pool : all;
  const rng = makeRng(seed);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * source.length);
    const c = source[idx]!;
    questions.push({
      verbId: c.verbId,
      lemma: c.lemma,
      translationEn: c.translationEn,
      options: c.options,
      prompt: buildPrompt(c.lemma, c.translationEn, c.options),
      expectedForm: c.expectedForm,
    });
  }
  return questions;
}
