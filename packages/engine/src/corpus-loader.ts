/**
 * Module-level corpus state. Consumers call `configure(corpus)` once
 * at startup; subsequent `conjugate()` calls read through this loader.
 */

import { CorpusIntegrityError } from './errors.js';
import type { VerbEntry } from './types.js';

let registry = new Map<string, VerbEntry>();
let corpusVersion = '0.0.0';

export function configure(
  corpus: VerbEntry[],
  version: string = '0.1.0',
): void {
  const next = new Map<string, VerbEntry>();
  for (const entry of corpus) {
    if (next.has(entry.id)) {
      throw new CorpusIntegrityError(
        entry.id,
        'duplicate id in configured corpus',
      );
    }
    next.set(entry.id, entry);
  }
  registry = next;
  corpusVersion = version;
}

export function lookupEntry(verbId: string): VerbEntry | undefined {
  return registry.get(verbId);
}

export function getCorpusVersion(): string {
  return corpusVersion;
}

export function getAllEntries(): VerbEntry[] {
  return Array.from(registry.values());
}
