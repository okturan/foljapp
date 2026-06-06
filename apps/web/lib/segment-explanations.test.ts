/**
 * Coverage test: every (role, particleName) pair the engine produces
 * for the seed corpus has a defined explanation.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DecompositionSegment } from '@foljapp/engine';
import { configure, listVerbs, table, VERSION } from '@foljapp/engine';
import { describe, expect, it, beforeAll } from 'vitest';

import { explain } from './segment-explanations';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBS_DIR = join(__dirname, '..', '..', '..', 'data', 'verbs');

beforeAll(() => {
  const files = readdirSync(VERBS_DIR).filter(
    (f) =>
      f.endsWith('.json') &&
      f !== 'index.json' &&
      f !== 'version.json' &&
      f !== 'frequency.json' &&
          f !== '_corpus.client.json',
  );
  const corpus = files.map((f) =>
    JSON.parse(readFileSync(join(VERBS_DIR, f), 'utf8')),
  );
  configure(corpus, '0.1.0');
});

describe('segment-explanations covers every (role, particle) emitted by the engine', () => {
  it('every emitted segment receives a non-empty explanation', () => {
    const verbs = listVerbs();
    const seen = new Map<string, number>();
    const missing: string[] = [];

    for (const verb of verbs) {
      const t = table(verb.id);
      const allCells: DecompositionSegment[][] = [];
      const collect = (mood: Record<string, Record<string, { decomposition: DecompositionSegment[] }>>) => {
        for (const tense of Object.values(mood)) {
          for (const cell of Object.values(tense)) {
            if (cell?.decomposition) allCells.push(cell.decomposition);
          }
        }
      };
      collect(t.indicative as never);
      collect(t.subjunctive as never);
      collect(t.conditional as never);
      collect(t.admirative as never);
      collect(t.optative as never);
      collect(t.imperative as never);
      for (const form of Object.values(t.nonFinite)) {
        if (form.decomposition) allCells.push(form.decomposition);
      }

      for (const cell of allCells) {
        for (const seg of cell) {
          const key = `${seg.role}:${seg.meta?.particleName ?? '-'}`;
          seen.set(key, (seen.get(key) ?? 0) + 1);
          const text = explain(seg);
          if (!text || text.length < 3) missing.push(`${verb.id} ${key}`);
        }
      }
    }

    expect(missing).toEqual([]);
    expect(seen.size).toBeGreaterThan(0);
  });
});

describe('engine VERSION is exported', () => {
  it('explanation tests run against current engine', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });
});
