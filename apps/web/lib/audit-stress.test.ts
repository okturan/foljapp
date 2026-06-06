/**
 * CI gate: re-runs scripts/audit-stress.ts in-process and fails the
 * suite if any unflagged stress divergence appears.
 *
 * The audit reference is the source of truth; new corpus verbs that
 * diverge from the default rule + heuristic must either be added to the
 * reference (when matching expected stress) or get a registry entry
 * (when expected stress disagrees with engine output).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  configure,
  type VerbEntry,
} from '@foljapp/engine';
import { describe, expect, it, beforeAll } from 'vitest';

import { runStressAudit } from '../../../scripts/audit-stress';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBS_DIR = resolve(__dirname, '..', '..', '..', 'data', 'verbs');
const OVERRIDES_PATH = resolve(__dirname, '..', '..', '..', 'data', 'stress-overrides.json');

let corpus: VerbEntry[];
let overrides: Set<string>;

beforeAll(() => {
  const files = readdirSync(VERBS_DIR).filter(
    (f) => f.endsWith('.json') &&
      !['index.json', 'version.json', 'frequency.json', '_corpus.client.json'].includes(f),
  );
  corpus = files.map((f) => JSON.parse(readFileSync(join(VERBS_DIR, f), 'utf8')) as VerbEntry);
  configure(corpus, '0.1.0');
  const arr = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8')) as Array<{ form: string }>;
  overrides = new Set(arr.map((e) => e.form.toLowerCase()));
});

describe('stress audit', () => {
  it('every referenced form matches engine output (registry covers documented divergences)', () => {
    const outcomes = runStressAudit(corpus, overrides);
    const divergent = outcomes.filter((o) => o.divergent && !o.hasOverride);
    if (divergent.length > 0) {
      const sample = divergent.slice(0, 10).map((o) =>
        `  ${o.verbId} ${o.description}: form="${o.formText}" ipa="${o.ipa}" expected_idx=${o.expectedIndex} actual_idx=${o.actualStressIndex}`,
      ).join('\n');
      throw new Error(
        `${divergent.length} unflagged stress divergence(s):\n${sample}\n` +
        `Add entries to data/stress-overrides.json or update the reference set in scripts/audit-stress.ts.`,
      );
    }
    expect(divergent).toHaveLength(0);
  });
});
