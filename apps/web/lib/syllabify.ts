/**
 * Albanian syllabifier.
 *
 * Splits a word into syllables using a maximum-onset parser over Albanian
 * phonotactics. Digraphs (`dh, gj, ll, nj, rr, sh, th, xh, zh`) are atomic
 * graphemes and are never split across syllable boundaries.
 *
 * Sources: Newmark (1982) §2.3; Wikipedia *Albanian phonology* §2.2.
 */

const DIGRAPHS = ['dh', 'gj', 'll', 'nj', 'rr', 'sh', 'th', 'xh', 'zh'];
const VOWEL_LETTERS = new Set(['a', 'e', 'ë', 'i', 'o', 'u', 'y']);

export interface Syllable {
  /** Atomic graphemes (digraphs treated as one) in source order. */
  graphemes: string[];
  /** Concatenated surface spelling — `onset + nucleus + coda`. */
  surface: string;
  /** Consonants preceding the nucleus (concatenated). */
  onset: string;
  /** The vowel grapheme (single letter). */
  nucleus: string;
  /** Consonants after the nucleus belonging to this syllable. */
  coda: string;
}

function tokenize(word: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < word.length) {
    let matched = false;
    for (const d of DIGRAPHS) {
      if (word.startsWith(d, i)) {
        tokens.push(d);
        i += d.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(word.charAt(i));
      i++;
    }
  }
  return tokens;
}

function isVowel(grapheme: string): boolean {
  return grapheme.length === 1 && VOWEL_LETTERS.has(grapheme);
}

/**
 * Returns true if the consonant-grapheme cluster is a permissible Albanian
 * onset. Single graphemes are always permissible. Multi-grapheme onsets
 * are restricted: stop+liquid (`pl, pr, bl, br, tr, dr, kr, kl, gr, gl`),
 * fricative+liquid (`fl, fr, vl, vr`), `s`-clusters (`sl, sr, sm, sn, sp,
 * st, sk`), and `sh`-clusters (`sht, shk, shp, shtr, shkr`).
 *
 * The grapheme list is consulted as raw graphemes (digraphs are units,
 * so `sh` here is the digraph `sh`, not s+h).
 */
function permissibleOnset(graphemes: string[]): boolean {
  if (graphemes.length === 0) return true;
  if (graphemes.length === 1) return true;
  if (graphemes.length === 2) {
    const [a, b] = graphemes as [string, string];
    if (/^[pbtdkgfv]$/.test(a) && /^[lr]$/.test(b)) return true;
    if (a === 's' && /^[plmnrtkv]$/.test(b)) return true;
    if (a === 'sh' && /^[ptkr]$/.test(b)) return true;
    return false;
  }
  if (graphemes.length === 3) {
    // Allow `s` or `sh` + stop + liquid.
    const [a, b, c] = graphemes as [string, string, string];
    if ((a === 's' || a === 'sh') && /^[ptk]$/.test(b) && /^[lr]$/.test(c)) {
      return true;
    }
    return false;
  }
  return false;
}

/**
 * Split an Albanian word into syllables. Empty input returns [].
 */
export function syllabify(word: string): Syllable[] {
  const lower = word.toLowerCase();
  const tokens = tokenize(lower);
  const syllables: Syllable[] = [];
  let i = 0;

  while (i < tokens.length) {
    const onset: string[] = [];
    const nucleus: string[] = [];
    const coda: string[] = [];

    // Consonants up to (but not including) the next vowel become onset.
    while (i < tokens.length && !isVowel(tokens[i]!)) {
      onset.push(tokens[i]!);
      i++;
    }

    // One vowel becomes nucleus.
    if (i < tokens.length && isVowel(tokens[i]!)) {
      nucleus.push(tokens[i]!);
      i++;
    }

    // Edge case: trailing consonants after the last vowel — extend the previous
    // syllable's coda with the leftover consonants and exit.
    if (nucleus.length === 0) {
      if (syllables.length > 0 && onset.length > 0) {
        const last = syllables[syllables.length - 1]!;
        last.coda += onset.join('');
        last.surface += onset.join('');
        last.graphemes.push(...onset);
      }
      break;
    }

    // Look ahead at consonants between this nucleus and the next vowel.
    const peek: string[] = [];
    let j = i;
    while (j < tokens.length && !isVowel(tokens[j]!)) {
      peek.push(tokens[j]!);
      j++;
    }
    const hasNextVowel = j < tokens.length;

    if (!hasNextVowel) {
      // End of word: all peek consonants become this coda.
      coda.push(...peek);
      i = j;
    } else {
      // Maximum-onset: give as many consonants to the next syllable's onset
      // as form a permissible cluster. Remainder stays as this coda.
      let onsetSize = peek.length;
      while (onsetSize > 0 && !permissibleOnset(peek.slice(peek.length - onsetSize))) {
        onsetSize--;
      }
      const numToCoda = peek.length - onsetSize;
      coda.push(...peek.slice(0, numToCoda));
      i += numToCoda;
    }

    syllables.push({
      graphemes: [...onset, ...nucleus, ...coda],
      surface: onset.join('') + nucleus.join('') + coda.join(''),
      onset: onset.join(''),
      nucleus: nucleus[0] ?? '',
      coda: coda.join(''),
    });
  }

  return syllables;
}
