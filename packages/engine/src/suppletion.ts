/**
 * Hardcoded suppletive paradigms.
 *
 * Five Albanian verbs whose roots vary across tenses to such a degree
 * that no paradigm engine can derive them: jam, jap, shoh, vij, them.
 *
 * The engine consults this table BEFORE the paradigm machinery for any
 * verbId in `SUPPLETIVE_IDS`. Forms here are authoritative.
 *
 * Sources: Husić §§ Auxiliary verbs + irregular verb tables.
 * v0.1.0 cells outside the spec scenarios should be reviewed against
 * Husić before promotion to v1.0.
 */

import { jam as jamAux } from './auxiliaries.js';
import type { CellLabel } from './types.js';

export type SuppletiveId = 'jam' | 'jap' | 'shoh' | 'vij' | 'them';

export const SUPPLETIVE_IDS: ReadonlySet<SuppletiveId> = new Set([
  'jam',
  'jap',
  'shoh',
  'vij',
  'them',
]);

export type SuppletiveTenseKey =
  | 'indicative.present'
  | 'indicative.imperfect'
  | 'indicative.aorist'
  | 'subjunctive.present'
  | 'subjunctive.imperfect'
  | 'admirative.present'
  | 'optative.present'
  | 'imperative.present';

export type SuppletiveTable = {
  participle: string;
  /** The aorist stem that compound tenses' middle-passive forms use. */
  aoristStem: string;
  cells: Partial<Record<SuppletiveTenseKey, Partial<Record<CellLabel, string>>>>;
};

/** jam — reuses the auxiliary table. */
const jamSuppletive: SuppletiveTable = {
  participle: 'qenë',
  aoristStem: 'qe',
  cells: {
    'indicative.present': jamAux['indicative.present'],
    'indicative.imperfect': jamAux['indicative.imperfect'],
    'indicative.aorist': jamAux['indicative.aorist'],
    'subjunctive.present': jamAux['subjunctive.present'],
    'subjunctive.imperfect': jamAux['subjunctive.imperfect'],
    'admirative.present': jamAux['admirative.present'],
    'optative.present': jamAux['optative.present'],
    'imperative.present': jamAux['imperative.present'],
  },
};

/** jap (to give) — Husić irregular table. */
const japSuppletive: SuppletiveTable = {
  participle: 'dhënë',
  aoristStem: 'dhash',
  cells: {
    'indicative.present': {
      '1sg': 'jap',
      '2sg': 'jep',
      '3sg': 'jep',
      '1pl': 'japim',
      '2pl': 'jepni',
      '3pl': 'japin',
    },
    'indicative.imperfect': {
      '1sg': 'jepja',
      '2sg': 'jepje',
      '3sg': 'jepte',
      '1pl': 'jepnim',
      '2pl': 'jepnit',
      '3pl': 'jepnin',
    },
    'indicative.aorist': {
      '1sg': 'dhashë',
      '2sg': 'dhe',
      '3sg': 'dha',
      '1pl': 'dhamë',
      '2pl': 'dhatë',
      '3pl': 'dhanë',
    },
    'subjunctive.present': {
      '1sg': 'jap',
      '2sg': 'japësh',
      '3sg': 'japë',
      '1pl': 'japim',
      '2pl': 'jepni',
      '3pl': 'japin',
    },
    'subjunctive.imperfect': {
      '1sg': 'jepja',
      '2sg': 'jepje',
      '3sg': 'jepte',
      '1pl': 'jepnim',
      '2pl': 'jepnit',
      '3pl': 'jepnin',
    },
    'admirative.present': {
      '1sg': 'dhënkam',
      '2sg': 'dhënke',
      '3sg': 'dhënka',
      '1pl': 'dhënkemi',
      '2pl': 'dhënkeni',
      '3pl': 'dhënkan',
    },
    'optative.present': {
      '1sg': 'dhënça',
      '2sg': 'dhënç',
      '3sg': 'dhëntë',
      '1pl': 'dhënçim',
      '2pl': 'dhënçi',
      '3pl': 'dhënçin',
    },
    'imperative.present': {
      '2sg': 'jep',
      '2pl': 'jepni',
    },
  },
};

/** shoh (to see) — Husić irregular table. */
const shohSuppletive: SuppletiveTable = {
  participle: 'parë',
  aoristStem: 'pa',
  cells: {
    'indicative.present': {
      '1sg': 'shoh',
      '2sg': 'sheh',
      '3sg': 'sheh',
      '1pl': 'shohim',
      '2pl': 'shihni',
      '3pl': 'shohin',
    },
    'indicative.imperfect': {
      '1sg': 'shihja',
      '2sg': 'shihje',
      '3sg': 'shihte',
      '1pl': 'shihnim',
      '2pl': 'shihnit',
      '3pl': 'shihnin',
    },
    'indicative.aorist': {
      '1sg': 'pashë',
      '2sg': 'pe',
      '3sg': 'pa',
      '1pl': 'pamë',
      '2pl': 'patë',
      '3pl': 'panë',
    },
    'subjunctive.present': {
      '1sg': 'shoh',
      '2sg': 'shohësh',
      '3sg': 'shohë',
      '1pl': 'shohim',
      '2pl': 'shihni',
      '3pl': 'shohin',
    },
    'subjunctive.imperfect': {
      '1sg': 'shihja',
      '2sg': 'shihje',
      '3sg': 'shihte',
      '1pl': 'shihnim',
      '2pl': 'shihnit',
      '3pl': 'shihnin',
    },
    'admirative.present': {
      '1sg': 'parkam',
      '2sg': 'parke',
      '3sg': 'parka',
      '1pl': 'parkemi',
      '2pl': 'parkeni',
      '3pl': 'parkan',
    },
    'optative.present': {
      '1sg': 'pafsha',
      '2sg': 'pafsh',
      '3sg': 'paftë',
      '1pl': 'pafshim',
      '2pl': 'pafshi',
      '3pl': 'pafshin',
    },
    'imperative.present': {
      '2sg': 'shih',
      '2pl': 'shihni',
    },
  },
};

/** vij (to come) — Husić irregular table. */
const vijSuppletive: SuppletiveTable = {
  participle: 'ardhur',
  aoristStem: 'erdh',
  cells: {
    'indicative.present': {
      '1sg': 'vij',
      '2sg': 'vjen',
      '3sg': 'vjen',
      '1pl': 'vijmë',
      '2pl': 'vini',
      '3pl': 'vijnë',
    },
    'indicative.imperfect': {
      '1sg': 'vija',
      '2sg': 'vije',
      '3sg': 'vinte',
      '1pl': 'vinim',
      '2pl': 'vinit',
      '3pl': 'vinin',
    },
    'indicative.aorist': {
      '1sg': 'erdha',
      '2sg': 'erdhe',
      '3sg': 'erdhi',
      '1pl': 'erdhëm',
      '2pl': 'erdhët',
      '3pl': 'erdhën',
    },
    'subjunctive.present': {
      '1sg': 'vij',
      '2sg': 'vish',
      '3sg': 'vijë',
      '1pl': 'vijmë',
      '2pl': 'vini',
      '3pl': 'vijnë',
    },
    'subjunctive.imperfect': {
      '1sg': 'vija',
      '2sg': 'vije',
      '3sg': 'vinte',
      '1pl': 'vinim',
      '2pl': 'vinit',
      '3pl': 'vinin',
    },
    'admirative.present': {
      '1sg': 'ardhkam',
      '2sg': 'ardhke',
      '3sg': 'ardhka',
      '1pl': 'ardhkemi',
      '2pl': 'ardhkeni',
      '3pl': 'ardhkan',
    },
    'optative.present': {
      '1sg': 'ardhsha',
      '2sg': 'ardhsh',
      '3sg': 'ardhtë',
      '1pl': 'ardhshim',
      '2pl': 'ardhshi',
      '3pl': 'ardhshin',
    },
    'imperative.present': {
      '2sg': 'eja',
      '2pl': 'ejani',
    },
  },
};

/** them (to say) — Husić irregular table. */
const themSuppletive: SuppletiveTable = {
  participle: 'thënë',
  aoristStem: 'thash',
  cells: {
    'indicative.present': {
      '1sg': 'them',
      '2sg': 'thua',
      '3sg': 'thotë',
      '1pl': 'themi',
      '2pl': 'thoni',
      '3pl': 'thonë',
    },
    'indicative.imperfect': {
      '1sg': 'thosha',
      '2sg': 'thoshe',
      '3sg': 'thoshte',
      '1pl': 'thoshim',
      '2pl': 'thoshit',
      '3pl': 'thoshin',
    },
    'indicative.aorist': {
      '1sg': 'thashë',
      '2sg': 'the',
      '3sg': 'tha',
      '1pl': 'thamë',
      '2pl': 'thatë',
      '3pl': 'thanë',
    },
    'subjunctive.present': {
      '1sg': 'them',
      '2sg': 'thuash',
      '3sg': 'thotë',
      '1pl': 'themi',
      '2pl': 'thoni',
      '3pl': 'thonë',
    },
    'subjunctive.imperfect': {
      '1sg': 'thosha',
      '2sg': 'thoshe',
      '3sg': 'thoshte',
      '1pl': 'thoshim',
      '2pl': 'thoshit',
      '3pl': 'thoshin',
    },
    'admirative.present': {
      '1sg': 'thënkam',
      '2sg': 'thënke',
      '3sg': 'thënka',
      '1pl': 'thënkemi',
      '2pl': 'thënkeni',
      '3pl': 'thënkan',
    },
    'optative.present': {
      '1sg': 'thënça',
      '2sg': 'thënç',
      '3sg': 'thëntë',
      '1pl': 'thënçim',
      '2pl': 'thënçi',
      '3pl': 'thënçin',
    },
    'imperative.present': {
      '2sg': 'thuaj',
      '2pl': 'thoni',
    },
  },
};

export const suppletionTable: Record<SuppletiveId, SuppletiveTable> = {
  jam: jamSuppletive,
  jap: japSuppletive,
  shoh: shohSuppletive,
  vij: vijSuppletive,
  them: themSuppletive,
};

export function isSuppletive(verbId: string): verbId is SuppletiveId {
  return SUPPLETIVE_IDS.has(verbId as SuppletiveId);
}

export function suppletiveForm(
  verbId: SuppletiveId,
  tenseKey: SuppletiveTenseKey,
  cell: CellLabel,
): string | undefined {
  return suppletionTable[verbId].cells[tenseKey]?.[cell];
}

export function suppletiveParticiple(verbId: SuppletiveId): string {
  return suppletionTable[verbId].participle;
}
