/**
 * Class 3 (Zgjedhimi 3) — verbs whose 1sg present ends in a vowel.
 *
 * Examples: pi (to drink), di (to know), fle (to sleep), ha (to eat),
 * vë (to put). Often have monosyllabic stems with rich phonological
 * effects at boundaries.
 *
 * Husić paradigm reference: §3A.
 */

import type { ClassParadigm } from './types.js';

export const class3: ClassParadigm = {
  classId: 3,
  husicReference: '3A',

  presentActive: {
    '1sg': { stem: 'present', ending: '' },
    '2sg': { stem: 'present', ending: '' },
    '3sg': { stem: 'present', ending: '' },
    '1pl': { stem: 'present', ending: 'më' },
    '2pl': { stem: 'present', ending: 'ni' },
    '3pl': { stem: 'present', ending: 'në' },
  },

  imperfectActive: {
    '1sg': { stem: 'present', ending: 'ja' },
    '2sg': { stem: 'present', ending: 'je' },
    '3sg': { stem: 'present', ending: 'nte' },
    '1pl': { stem: 'present', ending: 'nim' },
    '2pl': { stem: 'present', ending: 'nit' },
    '3pl': { stem: 'present', ending: 'nin' },
  },

  aoristActive: {
    '1sg': { stem: 'aorist', ending: 'va' },
    '2sg': { stem: 'aorist', ending: 've' },
    '3sg': { stem: 'aorist', ending: 'u' },
    '1pl': { stem: 'aorist', ending: 'më' },
    '2pl': { stem: 'aorist', ending: 'të' },
    '3pl': { stem: 'aorist', ending: 'në' },
  },

  subjunctivePresentActive: {
    '1sg': { stem: 'present', ending: '' },
    '2sg': { stem: 'present', ending: 'sh' },
    '3sg': { stem: 'present', ending: 'jë' },
    '1pl': { stem: 'present', ending: 'më' },
    '2pl': { stem: 'present', ending: 'ni' },
    '3pl': { stem: 'present', ending: 'në' },
  },

  /** Class 3 participles often end in -rë; drop final 'rë' (2 chars). */
  admirativePresentActive: {
    '1sg': { stem: 'participle', trim: 2, ending: 'kam' },
    '2sg': { stem: 'participle', trim: 2, ending: 'ke' },
    '3sg': { stem: 'participle', trim: 2, ending: 'ka' },
    '1pl': { stem: 'participle', trim: 2, ending: 'kemi' },
    '2pl': { stem: 'participle', trim: 2, ending: 'keni' },
    '3pl': { stem: 'participle', trim: 2, ending: 'kan' },
  },

  admirativeImperfectActive: {
    '1sg': { stem: 'participle', trim: 2, ending: 'kësha' },
    '2sg': { stem: 'participle', trim: 2, ending: 'këshe' },
    '3sg': { stem: 'participle', trim: 2, ending: 'kësh' },
    '1pl': { stem: 'participle', trim: 2, ending: 'këshim' },
    '2pl': { stem: 'participle', trim: 2, ending: 'këshit' },
    '3pl': { stem: 'participle', trim: 2, ending: 'këshin' },
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

  /** Vowel-final stem; h-glide. */
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
