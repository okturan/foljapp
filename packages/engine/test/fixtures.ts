/**
 * Inline verb fixtures used across engine tests.
 * Mirrors the entries committed at /data/verbs/*.json so engine tests
 * stay independent of the file system.
 */

import type { VerbEntry } from '../src/types.js';

export const punoj: VerbEntry = {
  id: 'punoj',
  lemma: 'punoj',
  translationEn: 'to work',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'puno', aorist: 'punua', participle: 'punuar' },
  sources: [{ source: 'husic', reference: '1A' }],
  dialect: 'tosk',
};

export const hap: VerbEntry = {
  id: 'hap',
  lemma: 'hap',
  translationEn: 'to open',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'hap', aorist: 'hap', participle: 'hapur' },
  sources: [{ source: 'husic', reference: '2A' }],
  dialect: 'tosk',
};

export const pi: VerbEntry = {
  id: 'pi',
  lemma: 'pi',
  translationEn: 'to drink',
  class: 3,
  auxiliary: 'kam',
  principalParts: { present: 'pi', aorist: 'pi', participle: 'pirë' },
  sources: [{ source: 'husic', reference: '3A' }],
  dialect: 'tosk',
};

export const jam: VerbEntry = {
  id: 'jam',
  lemma: 'jam',
  translationEn: 'to be',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'jam', aorist: 'qe', participle: 'qenë' },
  sources: [{ source: 'husic', reference: 'Auxiliary 2' }],
  flags: { isSuppletive: true, irregularAorist: true },
  dialect: 'tosk',
};

export const jap: VerbEntry = {
  id: 'jap',
  lemma: 'jap',
  translationEn: 'to give',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'jap', aorist: 'dhash', participle: 'dhënë' },
  sources: [{ source: 'husic', reference: 'Irregular — jap' }],
  flags: { isSuppletive: true, irregularAorist: true },
  dialect: 'tosk',
};

export const shoh: VerbEntry = {
  id: 'shoh',
  lemma: 'shoh',
  translationEn: 'to see',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'shoh', aorist: 'pa', participle: 'parë' },
  sources: [{ source: 'husic', reference: 'Irregular — shoh' }],
  flags: { isSuppletive: true, irregularAorist: true },
  dialect: 'tosk',
};

export const pjek: VerbEntry = {
  id: 'pjek',
  lemma: 'pjek',
  translationEn: 'to bake',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'pjek', aorist: 'poq', participle: 'pjekur' },
  sources: [{ source: 'husic', reference: '2B' }],
  flags: { hasMutation: true, irregularAorist: true },
  dialect: 'tosk',
};

export const djeg: VerbEntry = {
  id: 'djeg',
  lemma: 'djeg',
  translationEn: 'to burn',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'djeg', aorist: 'dogj', participle: 'djegur' },
  sources: [{ source: 'husic', reference: '2B' }],
  flags: { hasMutation: true, irregularAorist: true },
  dialect: 'tosk',
};

export const laj: VerbEntry = {
  id: 'laj',
  lemma: 'laj',
  translationEn: 'to wash',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'la', aorist: 'la', participle: 'larë' },
  sources: [{ source: 'husic', reference: '1B' }],
  dialect: 'tosk',
};

export const fixtures: VerbEntry[] = [
  punoj,
  hap,
  pi,
  jam,
  jap,
  shoh,
  pjek,
  djeg,
  laj,
];
