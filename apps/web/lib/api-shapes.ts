/**
 * Response types for /api endpoints. Stable contracts.
 */

import type { VerbEntry, VerbTable } from '@foljapp/engine';

import type { CorpusIndexEntry } from './corpus-index';

export interface ApiVerbListResponse {
  engineVersion: string;
  corpusVersion: string;
  cite: string;
  verbs: CorpusIndexEntry[];
}

/**
 * English compositional glosses for the verb's full table. The `cells`
 * map is keyed by `${mood}.${tense}.${cellLabel}.${voice}`, e.g.,
 * "indicative.perfect.1sg.active". The `nonFinite` map is keyed by
 * NonFiniteForm.
 */
export interface ApiEnglishGlosses {
  cells: Record<string, string>;
  nonFinite: Record<string, string>;
}

export interface ApiVerbDetailResponse {
  engineVersion: string;
  corpusVersion: string;
  cite: string;
  entry: VerbEntry;
  table: VerbTable;
  /** Compositional English glosses keyed alongside table cells. */
  englishGlosses: ApiEnglishGlosses;
  ipa: {
    lemma: string;
    principalParts: {
      present: string;
      aorist: string;
      participle: string;
    };
  };
}

export interface ApiErrorResponse {
  error: string;
  lemma?: string;
}

export function citationFor(path: string): string {
  return `foljapp ${path}`;
}
