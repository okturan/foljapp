/**
 * Vowel collisions at stem-suffix boundaries.
 *
 * Standard Albanian rule: when a stem-final vowel meets a suffix-initial
 * identical vowel, collapse to one. Dissimilar pairs typically retain hiatus
 * unless documented otherwise.
 *
 * v0.1.0 implements only the identical-vowel collapse case.
 */

const VOWELS = new Set(['a', 'e', 'ë', 'i', 'o', 'u', 'y']);

export function resolveVowelCollision(stem: string, suffix: string): string {
  if (!stem.length || !suffix.length) return stem + suffix;

  const last = stem.charAt(stem.length - 1).toLowerCase();
  const next = suffix.charAt(0).toLowerCase();

  if (VOWELS.has(last) && last === next) {
    return stem + suffix.slice(1);
  }
  return stem + suffix;
}
