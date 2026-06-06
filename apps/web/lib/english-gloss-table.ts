/**
 * Compute English glosses for every cell of a verb's full conjugation
 * table, plus non-finite forms. Used by the verb-page (tooltip surface)
 * and the JSON API (englishGloss field per cell).
 */

import type {
  ConjugateOptions,
  Mood,
  NonFiniteForm,
  Voice,
  VerbEntry,
  VerbTable,
} from '@foljapp/engine';

import { englishGloss } from './english-gloss';

export interface GlossTable {
  /** Keyed by `${mood}.${tense}.${cellLabel}.${voice}`, e.g., "indicative.perfect.1sg.active". */
  cells: Record<string, string>;
  /** Keyed by NonFiniteForm. */
  nonFinite: Record<string, string>;
}

/** Tenses to enumerate per mood, mirroring the engine's `table()` output. */
const MOOD_TENSES: Record<
  Exclude<Mood, 'non-finite' | 'imperative'>,
  readonly string[]
> = {
  indicative: [
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
  ],
  subjunctive: ['present', 'imperfect', 'perfect', 'pluperfect'],
  conditional: ['present', 'perfect'],
  admirative: ['present', 'imperfect', 'perfect', 'pluperfect'],
  optative: ['present', 'perfect'],
};

const PERSON_NUMBERS = [
  { person: 1 as const, number: 'singular' as const, label: '1sg' },
  { person: 2 as const, number: 'singular' as const, label: '2sg' },
  { person: 3 as const, number: 'singular' as const, label: '3sg' },
  { person: 1 as const, number: 'plural' as const, label: '1pl' },
  { person: 2 as const, number: 'plural' as const, label: '2pl' },
  { person: 3 as const, number: 'plural' as const, label: '3pl' },
];

const NON_FINITE_FORMS: readonly NonFiniteForm[] = [
  'participle',
  'infinitive',
  'gerund',
  'privative',
  'temporal',
];

/**
 * Compute glosses for every cell that the engine's `table()` populates.
 * Skips cells that are not present in the table (engine returned no
 * result — e.g., MP imperative for verbs without an override).
 */
export function buildGlossTable(verb: VerbEntry, table: VerbTable): GlossTable {
  const cells: Record<string, string> = {};
  const nonFinite: Record<string, string> = {};

  const finiteMoods: Array<Exclude<Mood, 'non-finite' | 'imperative'>> = [
    'indicative',
    'subjunctive',
    'conditional',
    'admirative',
    'optative',
  ];

  for (const mood of finiteMoods) {
    const moodTable = table[mood];
    for (const tense of MOOD_TENSES[mood]) {
      const tenseTable = (moodTable as Record<string, Record<string, unknown>>)[
        tense
      ];
      if (!tenseTable) continue;
      for (const voice of ['active', 'middle-passive'] as const) {
        for (const pn of PERSON_NUMBERS) {
          const cellKey = `${pn.label}.${voice}`;
          if (tenseTable[cellKey] === undefined) continue;
          const opts: ConjugateOptions = {
            mood,
            tense: tense as never,
            voice: voice satisfies Voice,
            person: pn.person,
            number: pn.number,
            polarity: 'affirmative',
            modality: 'declarative',
          };
          cells[`${mood}.${tense}.${cellKey}`] = englishGloss(verb, opts);
        }
      }
    }
  }

  // Imperative: only 2sg and 2pl, both voices
  const impTense = 'present';
  const impTable = (
    table.imperative as unknown as Record<string, Record<string, unknown>>
  )[impTense];
  if (impTable) {
    for (const voice of ['active', 'middle-passive'] as const) {
      for (const number of ['singular', 'plural'] as const) {
        const label = number === 'singular' ? '2sg' : '2pl';
        const cellKey = `${label}.${voice}`;
        if (impTable[cellKey] === undefined) continue;
        const opts: ConjugateOptions = {
          mood: 'imperative',
          tense: 'present',
          voice: voice satisfies Voice,
          person: 2,
          number,
          polarity: 'affirmative',
          modality: 'declarative',
        };
        cells[`imperative.${impTense}.${cellKey}`] = englishGloss(verb, opts);
      }
    }
  }

  for (const form of NON_FINITE_FORMS) {
    if (table.nonFinite[form] === undefined) continue;
    nonFinite[form] = englishGloss(verb, { mood: 'non-finite', form });
  }

  return { cells, nonFinite };
}

/**
 * Filter glosses for a single mood, returning the inner-table shape that
 * `ConjugationTable.glosses` accepts (keyed by `${tense}.${cellLabel}.${voice}`).
 */
export function glossesForMood(
  glossTable: GlossTable,
  mood: Mood,
): Record<string, string> {
  const prefix = `${mood}.`;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(glossTable.cells)) {
    if (key.startsWith(prefix)) {
      out[key.slice(prefix.length)] = value;
    }
  }
  return out;
}
