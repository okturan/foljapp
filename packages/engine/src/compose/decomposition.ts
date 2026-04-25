/**
 * Build the typed decomposition array from intermediate parts.
 *
 * Decomposition contract: concatenating segment surfaces in order,
 * separated by single spaces where the original form contains spaces,
 * exactly reproduces the surface form.
 */

import type {
  DecompositionSegment,
  GrammaticalNumber,
  MorphologicalRole,
  Person,
  Tense,
} from '../types.js';

export interface SegmentInput {
  surface: string;
  role: MorphologicalRole;
  particleName?: string;
  person?: Person;
  number?: GrammaticalNumber;
  tense?: Tense;
}

export function buildSegment(input: SegmentInput): DecompositionSegment {
  const { surface, role, particleName, person, number, tense } = input;
  const meta: DecompositionSegment['meta'] = {};
  if (particleName !== undefined) meta.particleName = particleName;
  if (person !== undefined) meta.person = person;
  if (number !== undefined) meta.number = number;
  if (tense !== undefined) meta.tense = tense;

  const segment: DecompositionSegment = { surface, role };
  if (Object.keys(meta).length > 0) {
    segment.meta = meta;
  }
  return segment;
}

/**
 * Roles that surface as standalone words and require space separation
 * from any neighboring segment.
 */
const WORD_ROLES = new Set(['particle', 'auxiliary', 'voice-marker']);

export function joinDecomposition(segments: DecompositionSegment[]): string {
  let out = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const prev = segments[i - 1];
    const needsSpace =
      prev !== undefined &&
      (WORD_ROLES.has(prev.role) || WORD_ROLES.has(seg.role));
    if (needsSpace && out.length > 0) {
      out += ' ';
    }
    out += seg.surface;
  }
  return out;
}
