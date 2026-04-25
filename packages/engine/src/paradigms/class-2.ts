/**
 * Class 2 (Zgjedhimi 2) — verbs whose 1sg present ends in a consonant.
 *
 * Examples: hap, mbyll, pjek (with k→q mutation), djeg (with g→gj mutation),
 * marr (with stem suppletion in aorist).
 *
 * Husić paradigm reference: §2A (regular consonant-final), §2B (mutating).
 */

import type { ClassParadigm } from './types.js';

export const class2: ClassParadigm = {
  classId: 2,
  husicReference: '2A',

  presentActive: {
    '1sg': { stem: 'present', ending: '' },
    '2sg': { stem: 'present', ending: '' },
    '3sg': { stem: 'present', ending: '' },
    '1pl': { stem: 'present', ending: 'im' },
    '2pl': { stem: 'present', ending: 'ni' },
    '3pl': { stem: 'present', ending: 'in' },
  },

  imperfectActive: {
    '1sg': { stem: 'present', ending: 'ja' },
    '2sg': { stem: 'present', ending: 'je' },
    '3sg': { stem: 'present', ending: 'te' },
    '1pl': { stem: 'present', ending: 'nim' },
    '2pl': { stem: 'present', ending: 'nit' },
    '3pl': { stem: 'present', ending: 'nin' },
  },

  /**
   * Aorist uses the aorist stem across all 6 cells. For mutating verbs
   * (pjek → poq, djeg → dogj) the corpus entry's aorist stem is the
   * already-mutated form; the engine concatenates without further phonology.
   */
  aoristActive: {
    '1sg': { stem: 'aorist', ending: 'a' },
    '2sg': { stem: 'aorist', ending: 'e' },
    '3sg': { stem: 'aorist', ending: 'i' },
    '1pl': { stem: 'aorist', ending: 'ëm' },
    '2pl': { stem: 'aorist', ending: 'ët' },
    '3pl': { stem: 'aorist', ending: 'ën' },
  },

  subjunctivePresentActive: {
    '1sg': { stem: 'present', ending: '' },
    '2sg': { stem: 'present', ending: 'ësh' },
    '3sg': { stem: 'present', ending: 'ë' },
    '1pl': { stem: 'present', ending: 'im' },
    '2pl': { stem: 'present', ending: 'ni' },
    '3pl': { stem: 'present', ending: 'in' },
  },

  /** Participle for class 2 ends in -ur; admirative drops final 'r'. */
  admirativePresentActive: {
    '1sg': { stem: 'participle', trim: 1, ending: 'kam' },
    '2sg': { stem: 'participle', trim: 1, ending: 'ke' },
    '3sg': { stem: 'participle', trim: 1, ending: 'ka' },
    '1pl': { stem: 'participle', trim: 1, ending: 'kemi' },
    '2pl': { stem: 'participle', trim: 1, ending: 'keni' },
    '3pl': { stem: 'participle', trim: 1, ending: 'kan' },
  },

  optativePresentActive: {
    '1sg': { stem: 'present', ending: 'sha' },
    '2sg': { stem: 'present', ending: 'sh' },
    '3sg': { stem: 'present', ending: 'të' },
    '1pl': { stem: 'present', ending: 'shim' },
    '2pl': { stem: 'present', ending: 'shi' },
    '3pl': { stem: 'present', ending: 'shin' },
  },

  imperativeActive: {
    '2sg': { stem: 'present', ending: '' },
    '2pl': { stem: 'present', ending: 'ni' },
  },

  /** Consonant-final stem; no h-glide needed. */
  middlePassivePresent: {
    '1sg': { stem: 'present', ending: 'em' },
    '2sg': { stem: 'present', ending: 'esh' },
    '3sg': { stem: 'present', ending: 'et' },
    '1pl': { stem: 'present', ending: 'emi' },
    '2pl': { stem: 'present', ending: 'eni' },
    '3pl': { stem: 'present', ending: 'en' },
  },

  middlePassiveImperfect: {
    '1sg': { stem: 'present', ending: 'esha' },
    '2sg': { stem: 'present', ending: 'eshe' },
    '3sg': { stem: 'present', ending: 'ej' },
    '1pl': { stem: 'present', ending: 'eshim' },
    '2pl': { stem: 'present', ending: 'eshit' },
    '3pl': { stem: 'present', ending: 'eshin' },
  },
};
