/**
 * Albanian primary-stress placement.
 *
 * Default rule: penultimate syllable for polysyllables, the only syllable
 * for monosyllables. One patterned exception is encoded inline: words whose
 * last syllable has coda `j` and a vowel nucleus take final stress (covers
 * Class 1 -j-verb lemmas and most -j-ending derivations). All other
 * exceptions go in `data/stress-overrides.json`.
 *
 * Sources: Newmark (1982) §2.4; Buchholz & Fiedler (1987) §1.2.3;
 * Paçarizi (2008) "Word stress in Albanian."
 */

import type { Syllable } from './syllabify';

export interface StressOverride {
  /** 0-based index of the stressed syllable, or -1 to disable stress. */
  stressedSyllableIndex: number;
}

const VOWEL_LETTERS = new Set(['a', 'e', 'ë', 'i', 'o', 'u', 'y']);

export function placeStress(
  syllables: Syllable[],
  override?: StressOverride,
): number {
  if (syllables.length === 0) return -1;
  if (override?.stressedSyllableIndex !== undefined) {
    const idx = override.stressedSyllableIndex;
    if (idx >= 0 && idx < syllables.length) return idx;
  }

  if (syllables.length === 1) return 0;

  // Heuristic: words ending with coda='j' and a vowel nucleus take final
  // stress (covers Class 1 -j-verb lemmas like `punoj`, derivations like
  // `punohej`, etc.).
  const last = syllables[syllables.length - 1]!;
  if (last.coda === 'j' && last.nucleus.length === 1 && VOWEL_LETTERS.has(last.nucleus)) {
    return syllables.length - 1;
  }

  // Default: penultimate.
  return syllables.length - 2;
}
