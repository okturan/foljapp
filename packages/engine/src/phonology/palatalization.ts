/**
 * Albanian palatalization rules: k→q, g→gj, ll→j.
 *
 * In the v0.1.0 corpus, mutating verbs (pjek, djeg) carry their
 * already-mutated aorist stem in `principalParts.aorist`, so the
 * engine does not need to mutate at runtime for those cases.
 *
 * This module remains as a safety net for any verb that supplies an
 * unmutated stem and a mutation-triggering suffix at the boundary.
 *
 * Source: Husić phonology notes; Wikipedia Albanian phonology.
 */

const FRONT_VOWELS = /^[eiëë]/i;

export function palatalizeBoundary(stem: string, suffix: string): string {
  if (!suffix.length || !FRONT_VOWELS.test(suffix)) {
    return stem;
  }

  if (stem.endsWith('k')) {
    return stem.slice(0, -1) + 'q';
  }
  if (stem.endsWith('g')) {
    return stem.slice(0, -1) + 'gj';
  }
  if (stem.endsWith('ll')) {
    return stem.slice(0, -2) + 'j';
  }
  return stem;
}
