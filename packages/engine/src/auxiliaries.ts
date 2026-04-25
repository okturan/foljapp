/**
 * Auxiliary verb paradigms — kam (to have) and jam (to be).
 *
 * Sources: Husić §1 (auxiliary verbs), cross-checked against
 * timarkh/uniparser-grammar-albanian and Wikipedia Albanian morphology.
 *
 * These tables are the recursive bottom of the engine: every compound
 * tense in every other verb resolves through one of these auxiliaries.
 */

import type { CellLabel } from './types.js';

export type AuxiliaryId = 'kam' | 'jam';

export type AuxiliaryTenseKey =
  | 'indicative.present'
  | 'indicative.imperfect'
  | 'indicative.aorist'
  | 'indicative.future'
  | 'subjunctive.present'
  | 'subjunctive.imperfect'
  | 'admirative.present'
  | 'admirative.imperfect'
  | 'optative.present'
  | 'imperative.present';

export type AuxiliaryTable = {
  [K in AuxiliaryTenseKey]?: Partial<Record<CellLabel, string>>;
};

/** kam (to have) — Husić paradigm "Auxiliary 1". */
export const kam: AuxiliaryTable = {
  'indicative.present': {
    '1sg': 'kam',
    '2sg': 'ke',
    '3sg': 'ka',
    '1pl': 'kemi',
    '2pl': 'keni',
    '3pl': 'kanë',
  },
  'indicative.imperfect': {
    '1sg': 'kisha',
    '2sg': 'kishe',
    '3sg': 'kishte',
    '1pl': 'kishim',
    '2pl': 'kishit',
    '3pl': 'kishin',
  },
  'indicative.aorist': {
    '1sg': 'pata',
    '2sg': 'pate',
    '3sg': 'pati',
    '1pl': 'patëm',
    '2pl': 'patët',
    '3pl': 'patën',
  },
  'subjunctive.present': {
    '1sg': 'kem',
    '2sg': 'kesh',
    '3sg': 'ketë',
    '1pl': 'kemi',
    '2pl': 'keni',
    '3pl': 'kenë',
  },
  'subjunctive.imperfect': {
    '1sg': 'kisha',
    '2sg': 'kishe',
    '3sg': 'kishte',
    '1pl': 'kishim',
    '2pl': 'kishit',
    '3pl': 'kishin',
  },
  'admirative.present': {
    '1sg': 'paskam',
    '2sg': 'paske',
    '3sg': 'paska',
    '1pl': 'paskemi',
    '2pl': 'paskeni',
    '3pl': 'paskan',
  },
  'admirative.imperfect': {
    '1sg': 'paskësha',
    '2sg': 'paskëshe',
    '3sg': 'paskësh',
    '1pl': 'paskëshim',
    '2pl': 'paskëshit',
    '3pl': 'paskëshin',
  },
  'optative.present': {
    '1sg': 'paça',
    '2sg': 'paç',
    '3sg': 'pastë',
    '1pl': 'paçim',
    '2pl': 'paçi',
    '3pl': 'paçin',
  },
  'imperative.present': {
    '2sg': 'ki',
    '2pl': 'kini',
  },
};

/** jam (to be) — Husić paradigm "Auxiliary 2", fully suppletive. */
export const jam: AuxiliaryTable = {
  'indicative.present': {
    '1sg': 'jam',
    '2sg': 'je',
    '3sg': 'është',
    '1pl': 'jemi',
    '2pl': 'jeni',
    '3pl': 'janë',
  },
  'indicative.imperfect': {
    '1sg': 'isha',
    '2sg': 'ishe',
    '3sg': 'ishte',
    '1pl': 'ishim',
    '2pl': 'ishit',
    '3pl': 'ishin',
  },
  'indicative.aorist': {
    '1sg': 'qeshë',
    '2sg': 'qe',
    '3sg': 'qe',
    '1pl': 'qemë',
    '2pl': 'qetë',
    '3pl': 'qenë',
  },
  'subjunctive.present': {
    '1sg': 'jem',
    '2sg': 'jesh',
    '3sg': 'jetë',
    '1pl': 'jemi',
    '2pl': 'jeni',
    '3pl': 'jenë',
  },
  'subjunctive.imperfect': {
    '1sg': 'isha',
    '2sg': 'ishe',
    '3sg': 'ishte',
    '1pl': 'ishim',
    '2pl': 'ishit',
    '3pl': 'ishin',
  },
  'admirative.present': {
    '1sg': 'qenkam',
    '2sg': 'qenke',
    '3sg': 'qenka',
    '1pl': 'qenkemi',
    '2pl': 'qenkeni',
    '3pl': 'qenkan',
  },
  'admirative.imperfect': {
    '1sg': 'qenkësha',
    '2sg': 'qenkëshe',
    '3sg': 'qenkësh',
    '1pl': 'qenkëshim',
    '2pl': 'qenkëshit',
    '3pl': 'qenkëshin',
  },
  'optative.present': {
    '1sg': 'qofsha',
    '2sg': 'qofsh',
    '3sg': 'qoftë',
    '1pl': 'qofshim',
    '2pl': 'qofshit',
    '3pl': 'qofshin',
  },
  'imperative.present': {
    '2sg': 'ji',
    '2pl': 'jini',
  },
};

export const auxiliaries: Record<AuxiliaryId, AuxiliaryTable> = {
  kam,
  jam,
};

/** kam's participle, used to build doubly-compound tenses. */
export const KAM_PARTICIPLE = 'pasur';

/** jam's participle. */
export const JAM_PARTICIPLE = 'qenë';

export function auxiliaryParticiple(aux: AuxiliaryId): string {
  return aux === 'kam' ? KAM_PARTICIPLE : JAM_PARTICIPLE;
}

export function auxiliaryForm(
  aux: AuxiliaryId,
  tenseKey: AuxiliaryTenseKey,
  cell: CellLabel,
): string | undefined {
  return auxiliaries[aux][tenseKey]?.[cell];
}
