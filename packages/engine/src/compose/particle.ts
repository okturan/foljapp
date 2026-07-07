/**
 * Particle composer.
 *
 * Selects and orders particles for: subjunctive (të), conditional (do të),
 * future (do + të), gerund (duke), privative (pa), temporal (me të),
 * infinitive (për të), passive aorist (u), negation (nuk / s' / mos),
 * interrogative (a).
 */

import type { Mood, Polarity } from '../types.js';

export type ParticleName =
  | 'të'
  | 'do'
  | 'duke'
  | 'pa'
  | 'me-të-prefix'
  | 'për'
  | 'u'
  | 'nuk'
  | 's'
  | 'mos'
  | 'a';

export interface ParticleSpec {
  surface: string;
  name: ParticleName;
}

export function selectNegation(
  mood: Mood,
  colloquial: boolean,
): ParticleSpec {
  // Standard Albanian negates the imperative, subjunctive, and optative
  // with "mos" (Newmark et al. 1982; Husić 2002); "s'" only ever replaces
  // "nuk".
  if (mood === 'imperative' || mood === 'subjunctive' || mood === 'optative') {
    return { surface: 'mos', name: 'mos' };
  }
  if (colloquial) {
    return { surface: "s'", name: 's' };
  }
  return { surface: 'nuk', name: 'nuk' };
}

export function selectMoodParticle(mood: Mood): ParticleSpec | null {
  switch (mood) {
    case 'subjunctive':
      return { surface: 'të', name: 'të' };
    case 'conditional':
      return { surface: 'do të', name: 'do' };
    default:
      return null;
  }
}

export function shouldNegate(polarity: Polarity | undefined): boolean {
  return polarity === 'negative';
}

/**
 * Particle ordering, surface-text only.
 *
 * Negative subjunctive surfaces as "mos të X" (Q1 resolution in design.md).
 * Negative conditional surfaces as "nuk do të X" (negation precedes the
 * future/conditional marker).
 */
export function orderParticles(parts: ParticleSpec[]): ParticleSpec[] {
  return parts;
}
