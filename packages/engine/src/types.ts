/**
 * Type system for the Albanian conjugation engine.
 *
 * Linguistic terminology follows Husić (2002) and the Universal
 * Dependencies Albanian feature inventory.
 */

export type Mood =
  | 'indicative'
  | 'subjunctive'
  | 'conditional'
  | 'admirative'
  | 'optative'
  | 'imperative'
  | 'non-finite';

export type IndicativeTense =
  | 'present'
  | 'imperfect'
  | 'aorist'
  | 'perfect'
  | 'pluperfect'
  | 'past-anterior'
  | 'future'
  | 'future-perfect'
  | 'future-in-past'
  | 'future-perfect-in-past';

export type SubjunctiveTense =
  | 'present'
  | 'imperfect'
  | 'perfect'
  | 'pluperfect';

export type ConditionalTense = 'present' | 'perfect';

export type AdmirativeTense =
  | 'present'
  | 'imperfect'
  | 'perfect'
  | 'pluperfect';

export type OptativeTense = 'present' | 'perfect';

export type ImperativeTense = 'present';

export type Tense =
  | IndicativeTense
  | SubjunctiveTense
  | ConditionalTense
  | AdmirativeTense
  | OptativeTense
  | ImperativeTense;

export type NonFiniteForm =
  | 'participle'
  | 'infinitive'
  | 'gerund'
  | 'privative'
  | 'temporal';

export type Voice = 'active' | 'middle-passive';

export type Polarity = 'affirmative' | 'negative';

export type Modality = 'declarative' | 'interrogative';

export type Person = 1 | 2 | 3;

export type GrammaticalNumber = 'singular' | 'plural';

export type CellKey =
  | {
      mood: Exclude<Mood, 'non-finite'>;
      tense: Tense;
      voice: Voice;
      person: Person;
      number: GrammaticalNumber;
    }
  | {
      mood: 'non-finite';
      form: NonFiniteForm;
    };

export interface ConjugateOptions {
  mood: Mood;
  tense?: Tense;
  voice?: Voice;
  person?: Person;
  number?: GrammaticalNumber;
  polarity?: Polarity;
  modality?: Modality;
  form?: NonFiniteForm;
  colloquial?: boolean;
}

export type MorphologicalRole =
  | 'particle'
  | 'auxiliary'
  | 'stem'
  | 'ending'
  | 'voice-marker';

export interface SegmentMeta {
  particleName?: string;
  person?: Person;
  number?: GrammaticalNumber;
  tense?: Tense;
  mood?: Mood;
}

export interface DecompositionSegment {
  surface: string;
  role: MorphologicalRole;
  meta?: SegmentMeta;
}

export interface ConjugationResult {
  form: string;
  decomposition: DecompositionSegment[];
  options: ConjugateOptions;
  unsupported: boolean;
  interrogative: boolean;
  engineVersion: string;
  corpusVersion: string;
}

export interface VerbEntrySource {
  source: 'uniparser' | 'kaikki' | 'husic' | 'manual';
  reference: string;
}

export interface VerbEntryFlags {
  isSuppletive?: boolean;
  hasMutation?: boolean;
  irregularAorist?: boolean;
}

export interface VerbEntry {
  id: string;
  lemma: string;
  translationEn: string;
  class: 1 | 2 | 3;
  auxiliary: 'kam' | 'jam';
  principalParts: {
    present: string;
    aorist: string;
    participle: string;
  };
  sources: VerbEntrySource[];
  flags?: VerbEntryFlags;
  dialect?: 'tosk' | 'geg';
  notes?: string;
}

export interface MoodTable {
  [tense: string]: TenseCells;
}

export interface TenseCells {
  '1sg'?: ConjugationResult;
  '2sg'?: ConjugationResult;
  '3sg'?: ConjugationResult;
  '1pl'?: ConjugationResult;
  '2pl'?: ConjugationResult;
  '3pl'?: ConjugationResult;
}

export interface VerbTable {
  verbId: string;
  lemma: string;
  indicative: Record<IndicativeTense, TenseCells>;
  subjunctive: Record<SubjunctiveTense, TenseCells>;
  conditional: Record<ConditionalTense, TenseCells>;
  admirative: Record<AdmirativeTense, TenseCells>;
  optative: Record<OptativeTense, TenseCells>;
  imperative: Record<ImperativeTense, TenseCells>;
  nonFinite: Record<NonFiniteForm, ConjugationResult>;
  engineVersion: string;
  corpusVersion: string;
}

export type CellLabel =
  | '1sg'
  | '2sg'
  | '3sg'
  | '1pl'
  | '2pl'
  | '3pl';

export function cellLabel(person: Person, number: GrammaticalNumber): CellLabel {
  return `${person}${number === 'singular' ? 'sg' : 'pl'}` as CellLabel;
}
