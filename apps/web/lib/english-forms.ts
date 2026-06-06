/**
 * English principal-parts derivation for the english-gloss capability.
 *
 * Resolution order per design D3:
 *   1. verb.englishForms (per-verb override; partial allowed)
 *   2. data/english-irregulars.json registry (matched by base)
 *   3. Auto-derivation rules from translationEn:
 *      a. strip "to " prefix
 *      b. pick first sense (split on " / ")
 *      c. apply regular English orthography (e→ed, y→ied, CVC→Cced;
 *         e→ing, CVC→Cing)
 */

import type { EnglishForms, VerbEntry } from '@foljapp/engine';

import irregularsData from '../../../data/english-irregulars.json' with { type: 'json' };

interface IrregularEntry {
  base: string;
  past: string;
  participle: string;
  gerund: string;
  source: string;
}

export interface ResolvedEnglishForms {
  base: string;
  past: string;
  participle: string;
  gerund: string;
}

const IRREGULARS: ReadonlyMap<string, IrregularEntry> = new Map(
  (irregularsData as IrregularEntry[]).map((e) => [e.base, e]),
);

/**
 * Pick the first English sense from a (possibly multi-sense) translationEn.
 * Strips a leading "to " infinitive marker. Multi-sense lemmas are split
 * on " / " (the convention used in the corpus).
 */
export function pickFirstSense(translationEn: string): string {
  const first = translationEn.split(' / ')[0]?.trim() ?? translationEn.trim();
  return first.startsWith('to ') ? first.slice(3) : first;
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
// Consonants that should NOT be doubled before -ed/-ing even in CVC environments
// (`w`, `x`, `y` are non-doublers per CGEL §C.5.3).
const NO_DOUBLE = new Set(['w', 'x', 'y']);

function isVowel(c: string): boolean {
  return VOWELS.has(c.toLowerCase());
}

/**
 * Detect a stressed final CVC syllable: a single consonant followed by
 * a single vowel followed by a single consonant, where doubling applies.
 * For our gloss purposes we treat all monosyllabic bases as stressed-final
 * (CGEL §C.5.3 — the doubling rule); polysyllabic bases conservatively
 * skip doubling, since stress detection without lexicon access is unreliable.
 */
function isFinalCVC(word: string): boolean {
  if (word.length < 3) return false;
  const last = word[word.length - 1]!;
  const prev = word[word.length - 2]!;
  const prevPrev = word[word.length - 3]!;
  if (NO_DOUBLE.has(last.toLowerCase())) return false;
  if (isVowel(last) || !isVowel(prev) || isVowel(prevPrev)) return false;
  // Only apply doubling to monosyllabic bases (single vowel cluster).
  // Polysyllabic stressed-final words are rare in our corpus targets.
  const vowelClusters = (word.match(/[aeiou]+/gi) ?? []).length;
  return vowelClusters === 1;
}

/**
 * Derive past tense (and -ed participle) form per regular English orthography.
 *
 * Rules (CGEL §C.5):
 *   - ends in 'e': append 'd'           (love → loved)
 *   - ends in consonant + 'y': y→ied    (try → tried)
 *   - ends in vowel + 'y': just append 'ed'  (play → played)
 *   - final stressed CVC: double last C  (stop → stopped)
 *   - otherwise: append 'ed'
 */
export function derivePast(base: string): string {
  if (base.length === 0) return base;
  const last = base[base.length - 1]!;
  if (last === 'e') return base + 'd';
  if (last === 'y') {
    const prev = base[base.length - 2];
    if (prev !== undefined && !isVowel(prev)) {
      return base.slice(0, -1) + 'ied';
    }
    return base + 'ed';
  }
  if (isFinalCVC(base)) {
    return base + last + 'ed';
  }
  return base + 'ed';
}

/**
 * Derive present participle / gerund per regular English orthography.
 *
 * Rules:
 *   - ends in 'e' (silent): drop 'e' before -ing  (love → loving)
 *   - exception: 'ee' or 'oe' or 'ye' keep e      (see → seeing)
 *   - ends in 'ie': ie→y before -ing             (lie → lying)
 *   - final stressed CVC: double last C           (stop → stopping)
 *   - otherwise: append 'ing'
 */
export function deriveGerund(base: string): string {
  if (base.length === 0) return base;
  const last = base[base.length - 1]!;
  const prev = base[base.length - 2];
  if (last === 'e' && prev !== undefined && (prev === 'i')) {
    // -ie → -y + ing
    return base.slice(0, -2) + 'ying';
  }
  if (last === 'e' && prev !== undefined && !['e', 'o', 'y'].includes(prev)) {
    return base.slice(0, -1) + 'ing';
  }
  if (isFinalCVC(base)) {
    return base + last + 'ing';
  }
  return base + 'ing';
}

/**
 * Resolve the verb's English principal parts using the priority chain:
 * per-verb override → irregulars registry → auto-derive.
 *
 * Partial overrides are honored: any field omitted from `englishForms`
 * falls through to the registry / auto-derived value for THAT field.
 */
export function getEnglishForms(verb: VerbEntry): ResolvedEnglishForms {
  const overrides: EnglishForms | undefined = verb.englishForms;

  // Determine the working `base`: override wins, else first-sense pick.
  const base =
    overrides?.base ?? pickFirstSense(verb.translationEn);

  // If the working base matches a registry entry, use that as the
  // foundation (overrides still win field-by-field).
  const registry = IRREGULARS.get(base);

  if (registry) {
    return {
      base,
      past: overrides?.past ?? registry.past,
      participle: overrides?.participle ?? registry.participle,
      gerund: overrides?.gerund ?? registry.gerund,
    };
  }

  // Auto-derivation. Compound bases (containing a space) derive from the
  // first word — "look for" → past "looked for", gerund "looking for" —
  // since English phrasal verbs inflect the lexical head only.
  if (base.includes(' ')) {
    const [head, ...tail] = base.split(' ');
    const rest = tail.join(' ');
    const tailRest = rest ? ' ' + rest : '';
    const headRegistry = IRREGULARS.get(head!);
    if (headRegistry) {
      return {
        base,
        past: overrides?.past ?? headRegistry.past + tailRest,
        participle: overrides?.participle ?? headRegistry.participle + tailRest,
        gerund: overrides?.gerund ?? headRegistry.gerund + tailRest,
      };
    }
    return {
      base,
      past: overrides?.past ?? derivePast(head!) + tailRest,
      participle: overrides?.participle ?? derivePast(head!) + tailRest,
      gerund: overrides?.gerund ?? deriveGerund(head!) + tailRest,
    };
  }

  return {
    base,
    past: overrides?.past ?? derivePast(base),
    participle: overrides?.participle ?? derivePast(base),
    gerund: overrides?.gerund ?? deriveGerund(base),
  };
}
