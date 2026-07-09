/**
 * Audit: english-gloss output is non-empty for every cell of every
 * corpus verb across the full grid (mood × tense × voice × person ×
 * number × polarity × modality, plus non-finite forms). Mirrors task
 * 14.1 of the add-english-gloss change.
 *
 * Catches:
 *   - Missing template for a (mood, tense) pair
 *   - Auto-derivation regressions that produce empty strings
 *   - Per-verb override drift (e.g., schema accepting a missing base)
 *   - Be-copula virtualization gaps
 */

import type {
  AdmirativeTense,
  ConditionalTense,
  ConjugateOptions,
  IndicativeTense,
  Mood,
  NonFiniteForm,
  OptativeTense,
  SubjunctiveTense,
} from '@foljapp/engine';
import { describe, expect, it } from 'vitest';

import { corpus } from './corpus';
import { englishGloss } from './english-gloss';

const INDICATIVE_TENSES: IndicativeTense[] = [
  'present',
  'imperfect',
  'aorist',
  'perfect',
  'pluperfect',
  'past-anterior',
  'future',
  'future-perfect',
  'future-in-past',
  'future-perfect-in-past',
];
const SUBJUNCTIVE_TENSES: SubjunctiveTense[] = [
  'present',
  'imperfect',
  'perfect',
  'pluperfect',
];
const CONDITIONAL_TENSES: ConditionalTense[] = ['present', 'perfect'];
const ADMIRATIVE_TENSES: AdmirativeTense[] = [
  'present',
  'imperfect',
  'perfect',
  'pluperfect',
];
const OPTATIVE_TENSES: OptativeTense[] = ['present', 'perfect'];
const NON_FINITE: NonFiniteForm[] = [
  'participle',
  'infinitive',
  'gerund',
  'privative',
  'temporal',
];

const PERSON_NUMBERS = [
  { person: 1 as const, number: 'singular' as const },
  { person: 2 as const, number: 'singular' as const },
  { person: 3 as const, number: 'singular' as const },
  { person: 1 as const, number: 'plural' as const },
  { person: 2 as const, number: 'plural' as const },
  { person: 3 as const, number: 'plural' as const },
];

const MOOD_TENSES: Array<{ mood: Exclude<Mood, 'non-finite' | 'imperative'>; tenses: readonly string[] }> = [
  { mood: 'indicative', tenses: INDICATIVE_TENSES },
  { mood: 'subjunctive', tenses: SUBJUNCTIVE_TENSES },
  { mood: 'conditional', tenses: CONDITIONAL_TENSES },
  { mood: 'admirative', tenses: ADMIRATIVE_TENSES },
  { mood: 'optative', tenses: OPTATIVE_TENSES },
];

describe('english-gloss audit — every cell yields a non-empty string', () => {
  it('finite cells across all moods × tenses × voices × p/n × polarity × modality', () => {
    const failures: string[] = [];
    let totalCalls = 0;
    for (const verb of corpus) {
      for (const { mood, tenses } of MOOD_TENSES) {
        for (const tense of tenses) {
          for (const voice of ['active', 'middle-passive'] as const) {
            for (const pn of PERSON_NUMBERS) {
              for (const polarity of ['affirmative', 'negative'] as const) {
                for (const modality of [
                  'declarative',
                  'interrogative',
                ] as const) {
                  totalCalls++;
                  const opts: ConjugateOptions = {
                    mood,
                    tense: tense as never,
                    voice,
                    person: pn.person,
                    number: pn.number,
                    polarity,
                    modality,
                  };
                  let gloss: string;
                  try {
                    gloss = englishGloss(verb, opts);
                  } catch (e) {
                    failures.push(
                      `${verb.lemma} ${mood}.${tense}.${voice}.${pn.person}${pn.number[0]}.${polarity}.${modality} — threw: ${(e as Error).message}`,
                    );
                    continue;
                  }
                  if (typeof gloss !== 'string' || gloss.trim() === '') {
                    failures.push(
                      `${verb.lemma} ${mood}.${tense}.${voice}.${pn.person}${pn.number[0]}.${polarity}.${modality} — empty gloss: "${gloss}"`,
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
    if (failures.length > 0) {
      throw new Error(
        `english-gloss audit: ${failures.length} empty/throwing cells out of ${totalCalls}\n` +
          failures.slice(0, 25).join('\n') +
          (failures.length > 25 ? `\n... +${failures.length - 25} more` : ''),
      );
    }
    // Sanity: corpus verbs * 5 moods * (avg ~4 tenses) * 2 voices * 6 p/n * 2 pol * 2 mod
    expect(totalCalls).toBeGreaterThan(50_000);
  });

  it('imperative cells (2sg, 2pl, both voices, both polarities)', () => {
    const failures: string[] = [];
    for (const verb of corpus) {
      for (const voice of ['active', 'middle-passive'] as const) {
        for (const number of ['singular', 'plural'] as const) {
          for (const polarity of ['affirmative', 'negative'] as const) {
            const opts: ConjugateOptions = {
              mood: 'imperative',
              tense: 'present',
              voice,
              person: 2,
              number,
              polarity,
              modality: 'declarative',
            };
            const gloss = englishGloss(verb, opts);
            if (typeof gloss !== 'string' || gloss.trim() === '') {
              failures.push(
                `${verb.lemma} imperative.${number}.${voice}.${polarity} — empty`,
              );
            }
          }
        }
      }
    }
    if (failures.length > 0) {
      throw new Error(
        `imperative audit: ${failures.length} empty cells\n` +
          failures.slice(0, 20).join('\n'),
      );
    }
  });

  it('non-finite forms', () => {
    const failures: string[] = [];
    for (const verb of corpus) {
      for (const form of NON_FINITE) {
        const gloss = englishGloss(verb, { mood: 'non-finite', form });
        if (typeof gloss !== 'string' || gloss.trim() === '') {
          failures.push(`${verb.lemma} non-finite.${form} — empty`);
        }
      }
    }
    if (failures.length > 0) {
      throw new Error(
        `non-finite audit: ${failures.length} empty cells\n` +
          failures.slice(0, 20).join('\n'),
      );
    }
  });
});
