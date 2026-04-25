/**
 * Response types for /api endpoints. Stable contracts.
 */

import type { VerbEntry, VerbTable } from '@foljapp/engine';

import type { CorpusIndexEntry } from './corpus-index';
import type { FrequencyEntry } from './frequency';

export interface ApiVerbListResponse {
  engineVersion: string;
  corpusVersion: string;
  cite: string;
  verbs: CorpusIndexEntry[];
}

export interface ApiVerbDetailResponse {
  engineVersion: string;
  corpusVersion: string;
  cite: string;
  entry: VerbEntry;
  table: VerbTable;
  ipa: {
    lemma: string;
    principalParts: {
      present: string;
      aorist: string;
      participle: string;
    };
  };
  frequency: FrequencyEntry | null;
}

export interface ApiErrorResponse {
  error: string;
  lemma?: string;
}

export function citationFor(path: string): string {
  return `foljapp ${path}`;
}
