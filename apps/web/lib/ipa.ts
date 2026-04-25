/**
 * Albanian → IPA transcription. Phonemic, not phonetic.
 *
 * Sources: Wikipedia Albanian phonology; Newmark, Hubbard, Prifti
 * "Standard Albanian: A Reference Grammar for Students."
 *
 * Stress is not marked in this version (deferred to add-stress-marking).
 */

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
const DIGRAPHS = DIGRAPH_ENTRIES.map(([d]) => d);

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

function toIpaWord(word: string): string {
  const lower = word.toLowerCase();
  let out = '';
  let i = 0;
  while (i < lower.length) {
    let matchedDigraph: string | null = null;
    for (const d of DIGRAPHS) {
      if (lower.startsWith(d, i)) {
        matchedDigraph = d;
        break;
      }
    }
    if (matchedDigraph) {
      out += DIGRAPH_MAP.get(matchedDigraph)!;
      i += matchedDigraph.length;
    } else {
      const ch = lower.charAt(i);
      out += SINGLE_MAP[ch] ?? ch;
      i++;
    }
  }
  return out;
}

/** Albanian text → IPA. Multi-word input is transcribed word-by-word. */
export function toIpa(text: string): string {
  return text.split(/\s+/).filter(Boolean).map(toIpaWord).join(' ');
}

/** Convenience wrapper that puts the result inside slashes. */
export function toIpaBracketed(text: string): string {
  return `/${toIpa(text)}/`;
}
