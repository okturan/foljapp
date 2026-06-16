/**
 * Build-time corpus index loader.
 *
 * Imports `data/verbs/index.json` directly so the data ships with the
 * page bundle. Works in Server and Client Components alike.
 */

import indexData from '../../../data/verbs/index.json';

import { decodeVerbSlug } from './verb-route';

export interface CorpusIndexEntry {
  id: string;
  lemma: string;
  translationEn: string;
  class: 1 | 2 | 3;
  auxiliary: 'kam' | 'jam';
}

export const corpusIndex = indexData as CorpusIndexEntry[];

export function findIndexByLemma(lemma: string): CorpusIndexEntry | undefined {
  return corpusIndex.find((e) => e.lemma === lemma);
}

export function findIndexBySlug(slug: string): CorpusIndexEntry | undefined {
  const decoded = decodeVerbSlug(slug);
  return corpusIndex.find((e) => e.id === decoded || e.lemma === decoded);
}
