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

export const them: VerbEntry = {
  id: 'them',
  lemma: 'them',
  translationEn: 'to say',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'them', aorist: 'thash', participle: 'thënë' },
  sources: [{ source: 'husic', reference: 'Irregular — them' }],
  flags: { isSuppletive: true, irregularAorist: true },
  dialect: 'tosk',
  notes: 'Suppletive MP indicative present/imperfect use the thu- stem.',
  cellOverrides: {
    'indicative.present.middle-passive': {
      '1sg': 'thuhem',
      '2sg': 'thuhesh',
      '3sg': 'thuhet',
      '1pl': 'thuhemi',
      '2pl': 'thuheni',
      '3pl': 'thuhen',
    },
    'indicative.imperfect.middle-passive': {
      '1sg': 'thuhesha',
      '2sg': 'thuheshe',
      '3sg': 'thuhej',
      '1pl': 'thuheshim',
      '2pl': 'thuheshit',
      '3pl': 'thuheshin',
    },
  },
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

/** flas — three-stem-alternation Class 2C verb. Only the cells used by
 * admirative imperfect/pluperfect tests need correct forms; other tenses
 * still rely on cellOverrides in production but are not exercised here. */
export const flas: VerbEntry = {
  id: 'flas',
  lemma: 'flas',
  translationEn: 'to speak',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'flas', aorist: 'fol', participle: 'folur' },
  sources: [{ source: 'husic', reference: '2C' }],
  flags: { irregularAorist: true },
  dialect: 'tosk',
};

export const fixtures: VerbEntry[] = [
  punoj,
  hap,
  pi,
  jam,
  jap,
  shoh,
  them,
  pjek,
  djeg,
  laj,
  flas,
];
