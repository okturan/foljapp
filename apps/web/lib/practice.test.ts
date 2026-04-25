/**
 * Practice question generation tests.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { VerbEntry } from '@foljapp/engine';
import { configure } from '@foljapp/engine';
import { beforeAll, describe, expect, it } from 'vitest';

import { generateQuestions } from './practice';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBS_DIR = join(__dirname, '..', '..', '..', 'data', 'verbs');

beforeAll(() => {
  const files = readdirSync(VERBS_DIR).filter(
    (f) =>
      f.endsWith('.json') &&
      f !== 'index.json' &&
      f !== 'version.json' &&
      f !== 'frequency.json',
  );
  const corpus = files.map((f) =>
    JSON.parse(readFileSync(join(VERBS_DIR, f), 'utf8')),
  );
  configure(corpus as VerbEntry[], '0.1.0');
});

describe('generateQuestions', () => {
  it('produces 10 questions by default', () => {
    const qs = generateQuestions();
    expect(qs).toHaveLength(10);
  });

  it('respects the count option', () => {
    const qs = generateQuestions({ count: 5 });
    expect(qs).toHaveLength(5);
  });

  it('is deterministic when seeded', () => {
    const a = generateQuestions({ seed: 42, count: 8 });
    const b = generateQuestions({ seed: 42, count: 8 });
    expect(a).toEqual(b);
  });

  it('different seeds produce different question sequences', () => {
    const a = generateQuestions({ seed: 1, count: 8 });
    const b = generateQuestions({ seed: 999, count: 8 });
    expect(a).not.toEqual(b);
  });

  it('every generated question has an expectedForm that matches the engine output', async () => {
    const { conjugate } = await import('@foljapp/engine');
    const qs = generateQuestions({ count: 30 });
    for (const q of qs) {
      const result = conjugate(q.verbId, q.options);
      expect(result.form).toBe(q.expectedForm);
    }
  });

  it('focus=punoj restricts to punoj cells', () => {
    const qs = generateQuestions({ seed: 7, count: 8, focus: 'punoj' });
    for (const q of qs) {
      expect(q.lemma).toBe('punoj');
    }
  });

  it('focus to an unknown lemma falls back to the full pool', () => {
    const qs = generateQuestions({ seed: 1, count: 8, focus: 'notarealverb' });
    expect(qs).toHaveLength(8);
    // Some questions should reference real corpus verbs
    const lemmas = new Set(qs.map((q) => q.lemma));
    expect(lemmas.size).toBeGreaterThan(0);
  });

  it('imperative questions only ask 2nd-person cells', () => {
    const qs = generateQuestions({ count: 100 });
    for (const q of qs) {
      if (q.options.mood === 'imperative') {
        expect(q.options.person).toBe(2);
      }
    }
  });

  it('every question is active voice / affirmative / declarative', () => {
    const qs = generateQuestions({ count: 50 });
    for (const q of qs) {
      expect(q.options.voice).toBe('active');
      expect(q.options.polarity).toBe('affirmative');
      expect(q.options.modality).toBe('declarative');
    }
  });
});
