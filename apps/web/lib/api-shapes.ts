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

export interface ApiVerbDetailResponse {
  engineVersion: string;
  corpusVersion: string;
  cite: string;
  entry: VerbEntry;
  table: VerbTable;
}

export interface ApiErrorResponse {
  error: string;
  lemma?: string;
}

export function citationFor(path: string): string {
  return `foljapp ${path}`;
}
