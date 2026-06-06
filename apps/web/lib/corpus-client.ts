/**
 * Client-side corpus loader. Reuses the build-time bundled corpus
 * and configures the engine in the browser bundle. Used by Client
 * Components that need to call `conjugate()` (e.g., the playground).
 *
 * Server-side rendering uses `lib/corpus.ts` instead, which reads
 * per-verb files via `node:fs`. Both code paths consume the same
 * source-of-truth — the per-verb files under `data/verbs/<lemma>.json`.
 */

import {
  ensureBundledCorpusConfigured,
  findBundledEntryByLemma,
} from './corpus-bundle';

export function ensureClientConfigured(): void {
  ensureBundledCorpusConfigured();
}

// Configure eagerly on module load so any consumer sees a ready engine.
ensureClientConfigured();

export function findClientEntry(lemma: string) {
  return findBundledEntryByLemma(lemma);
}
