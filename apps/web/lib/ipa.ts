/**
 * Albanian → IPA transcription. Phonemic, with primary-stress marking.
 *
 * Sources: Wikipedia Albanian phonology; Newmark, Hubbard, Prifti
 * "Standard Albanian: A Reference Grammar for Students."
 */

import stressOverrides from '../../../data/stress-overrides.json' with { type: 'json' };

import { placeStress, type StressOverride } from './stress';
import { syllabify, type Syllable } from './syllabify';

const DIGRAPH_ENTRIES: Array<[string, string]> = [
  ['dh', 'ð'],
  ['gj', 'ɟ'],
  ['ll', 'ɫ'],
  ['nj', 'ɲ'],
  ['rr', 'r'],
  ['sh', 'ʃ'],
  ['th', 'θ'],
  ['xh', 'dʒ'],
  ['zh', 'ʒ'],
];

const DIGRAPH_MAP = new Map(DIGRAPH_ENTRIES);

const SINGLE_MAP: Record<string, string> = {
  a: 'a',
  b: 'b',
  c: 'ts',
  ç: 'tʃ',
  d: 'd',
  e: 'ɛ',
  ë: 'ə',
  f: 'f',
  g: 'ɡ',
  h: 'h',
  i: 'i',
  j: 'j',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'ɔ',
  p: 'p',
  q: 'c',
  r: 'ɾ',
  s: 's',
  t: 't',
  u: 'u',
  v: 'v',
  x: 'dz',
  y: 'y',
  z: 'z',
};

function graphemeToIpa(g: string): string {
  if (DIGRAPH_MAP.has(g)) return DIGRAPH_MAP.get(g)!;
  return SINGLE_MAP[g] ?? g;
}

function syllableIpa(syll: Syllable): string {
  return syll.graphemes.map(graphemeToIpa).join('');
}

interface StressOverrideEntry {
  form: string;
  stressedSyllableIndex: number;
  source: string;
}

const STRESS_OVERRIDES: Map<string, number> = (() => {
  const map = new Map<string, number>();
  for (const entry of stressOverrides as StressOverrideEntry[]) {
    map.set(entry.form.toLowerCase(), entry.stressedSyllableIndex);
  }
  return map;
})();

export interface ToIpaOptions {
  /** Per-call overrides; consulted before the registry. */
  overrides?: StressOverrideEntry[];
}

function toIpaWordPerGrapheme(word: string): string {
  // Fallback for vowel-less inputs (e.g., a bare `ç` or punctuation): emit
  // per-grapheme IPA without syllable structure or stress.
  let out = '';
  let i = 0;
  while (i < word.length) {
    let matched = false;
    for (const [d] of DIGRAPH_ENTRIES) {
      if (word.startsWith(d, i)) {
        out += DIGRAPH_MAP.get(d)!;
        i += d.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = word.charAt(i);
      out += SINGLE_MAP[ch] ?? ch;
      i++;
    }
  }
  return out;
}

function toIpaWord(word: string, callOverrides?: Map<string, number>): string {
  const lower = word.toLowerCase();
  const syllables = syllabify(lower);
  if (syllables.length === 0) {
    // No vowel — fall back to per-grapheme IPA.
    return toIpaWordPerGrapheme(lower);
  }

  let stressOverride: StressOverride | undefined;
  const callIdx = callOverrides?.get(lower);
  if (callIdx !== undefined) {
    stressOverride = { stressedSyllableIndex: callIdx };
  } else {
    const regIdx = STRESS_OVERRIDES.get(lower);
    if (regIdx !== undefined) {
      stressOverride = { stressedSyllableIndex: regIdx };
    }
  }

  const stressedIdx = placeStress(syllables, stressOverride);

  let out = '';
  for (let i = 0; i < syllables.length; i++) {
    if (i === stressedIdx) out += 'ˈ';
    out += syllableIpa(syllables[i]!);
  }
  return out;
}

/** Albanian text → IPA with primary-stress marks. Multi-word input is
 * transcribed word-by-word; each word stresses independently. */
export function toIpa(text: string, options?: ToIpaOptions): string {
  const callMap = options?.overrides
    ? new Map(options.overrides.map((e) => [e.form.toLowerCase(), e.stressedSyllableIndex]))
    : undefined;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => toIpaWord(w, callMap))
    .join(' ');
}

/** Convenience wrapper that puts the result inside slashes. */
export function toIpaBracketed(text: string, options?: ToIpaOptions): string {
  return `/${toIpa(text, options)}/`;
}
