import type { VerbEntry } from '../types.js';

import { class1 } from './class-1.js';
import { class2 } from './class-2.js';
import { class3 } from './class-3.js';
import type { ClassParadigm, CellRule } from './types.js';

export const paradigms = {
  1: class1,
  2: class2,
  3: class3,
} as const;

export function paradigmFor(entry: VerbEntry): ClassParadigm {
  return paradigms[entry.class];
}

export function applyCellRule(entry: VerbEntry, rule: CellRule): string {
  const stem = entry.principalParts[rule.stem];
  const trimmed = rule.trim ? stem.slice(0, stem.length - rule.trim) : stem;
  return trimmed + rule.ending;
}

export type { ClassParadigm, CellRule } from './types.js';
