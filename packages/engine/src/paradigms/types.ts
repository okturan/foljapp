/**
 * Paradigm rule shapes shared across class-1, class-2, class-3.
 */

import type { CellLabel } from '../types.js';

export type StemKey = 'present' | 'aorist' | 'participle';

export interface CellRule {
  /** Which principal part to use as the stem */
  stem: StemKey;
  /** Number of trailing characters to drop from the stem */
  trim?: number;
  /** What to append to the (possibly trimmed) stem */
  ending: string;
}

export type SixCells = Record<CellLabel, CellRule>;

export interface ClassParadigm {
  classId: 1 | 2 | 3;
  /** Husić paradigm number for human auditing */
  husicReference: string;
  presentActive: SixCells;
  imperfectActive: SixCells;
  aoristActive: SixCells;
  /** "të" particle is added by the composer, not stored in endings */
  subjunctivePresentActive: SixCells;
  /** Built off the participle stem (admirativeTrim policy applied dynamically) */
  admirativePresentActive: SixCells;
  /** Built off the participle stem (admirativeTrim policy applied dynamically). Endings are kësha-family. */
  admirativeImperfectActive: SixCells;
  optativePresentActive: SixCells;
  imperativeActive: {
    '2sg': CellRule;
    '2pl': CellRule;
  };
  middlePassivePresent: SixCells;
  middlePassiveImperfect: SixCells;
}
