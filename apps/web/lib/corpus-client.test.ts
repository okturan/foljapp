/**
 * Sanity test for the client-side corpus loader: every entry in
 * data/verbs/index.json is reachable as a client entry. Catches drift
 * between the bundled corpus file and the index manifest.
 */

import { describe, expect, it } from 'vitest';

import indexData from '../../../data/verbs/index.json';

import { findClientEntry } from './corpus-client';

interface IndexEntry {
  id: string;
  lemma: string;
}

describe('corpus-client bundle', () => {
  it('resolves every lemma listed in the index', () => {
    const idx = indexData as IndexEntry[];
    const missing: string[] = [];
    for (const { lemma } of idx) {
      if (!findClientEntry(lemma)) missing.push(lemma);
    }
    expect(missing).toEqual([]);
  });

  it('contains the dhemb regression case', () => {
    expect(findClientEntry('dhemb')).toBeDefined();
  });
});
