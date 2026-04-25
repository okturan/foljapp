/**
 * Class 1 (Zgjedhimi 1) — verbs whose 1sg present ends in -j.
 *
 * Examples: punoj, laj, lexoj, hap (no, hap is class 2), bëj, mësoj.
 *
 * Husić paradigm reference: §1A (regular -j verbs), with sub-types §1B/§1C
 * for stem-vowel variations.
 */

import type { ClassParadigm } from './types.js';

export const class1: ClassParadigm = {
  classId: 1,
  husicReference: '1A',

  presentActive: {
    '1sg': { stem: 'present', ending: 'j' },
    '2sg': { stem: 'present', ending: 'n' },
    '3sg': { stem: 'present', ending: 'n' },
    '1pl': { stem: 'present', ending: 'jmë' },
    '2pl': { stem: 'present', ending: 'ni' },
    '3pl': { stem: 'present', ending: 'jnë' },
  },

  imperfectActive: {
    '1sg': { stem: 'present', ending: 'ja' },
    '2sg': { stem: 'present', ending: 'je' },
    '3sg': { stem: 'present', ending: 'nte' },
    '1pl': { stem: 'present', ending: 'nim' },
    '2pl': { stem: 'present', ending: 'nit' },
    '3pl': { stem: 'present', ending: 'nin' },
  },

  /** punoj → punova/punove/punoi (uses present stem) — punuam/punuat/punuan (uses aorist stem). */
  aoristActive: {
    '1sg': { stem: 'present', ending: 'va' },
    '2sg': { stem: 'present', ending: 've' },
    '3sg': { stem: 'present', ending: 'i' },
    '1pl': { stem: 'aorist', ending: 'm' },
    '2pl': { stem: 'aorist', ending: 't' },
    '3pl': { stem: 'aorist', ending: 'n' },
  },

  subjunctivePresentActive: {
    '1sg': { stem: 'present', ending: 'j' },
    '2sg': { stem: 'present', ending: 'sh' },
    '3sg': { stem: 'present', ending: 'jë' },
    '1pl': { stem: 'present', ending: 'jmë' },
    '2pl': { stem: 'present', ending: 'ni' },
    '3pl': { stem: 'present', ending: 'jnë' },
  },

  /** Admirative stem = participle with final 'r' dropped (punuar → punua). */
  admirativePresentActive: {
    '1sg': { stem: 'participle', trim: 1, ending: 'kam' },
    '2sg': { stem: 'participle', trim: 1, ending: 'ke' },
    '3sg': { stem: 'participle', trim: 1, ending: 'ka' },
    '1pl': { stem: 'participle', trim: 1, ending: 'kemi' },
    '2pl': { stem: 'participle', trim: 1, ending: 'keni' },
    '3pl': { stem: 'participle', trim: 1, ending: 'kan' },
  },

  optativePresentActive: {
    '1sg': { stem: 'present', ending: 'fsha' },
    '2sg': { stem: 'present', ending: 'fsh' },
    '3sg': { stem: 'present', ending: 'ftë' },
    '1pl': { stem: 'present', ending: 'fshim' },
    '2pl': { stem: 'present', ending: 'fshi' },
    '3pl': { stem: 'present', ending: 'fshin' },
  },

  imperativeActive: {
    '2sg': { stem: 'present', ending: '' },
    '2pl': { stem: 'present', ending: 'ni' },
  },

  /** Class 1 stems are vowel-final, so middle-passive needs an h-glide. */
  middlePassivePresent: {
    '1sg': { stem: 'present', ending: 'hem' },
    '2sg': { stem: 'present', ending: 'hesh' },
    '3sg': { stem: 'present', ending: 'het' },
    '1pl': { stem: 'present', ending: 'hemi' },
    '2pl': { stem: 'present', ending: 'heni' },
    '3pl': { stem: 'present', ending: 'hen' },
  },

  middlePassiveImperfect: {
    '1sg': { stem: 'present', ending: 'hesha' },
    '2sg': { stem: 'present', ending: 'heshe' },
    '3sg': { stem: 'present', ending: 'hej' },
    '1pl': { stem: 'present', ending: 'heshim' },
    '2pl': { stem: 'present', ending: 'heshit' },
    '3pl': { stem: 'present', ending: 'heshin' },
  },
};
