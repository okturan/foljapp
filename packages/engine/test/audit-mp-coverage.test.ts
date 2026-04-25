/**
 * Standing regression gate: every MP cell engine.table() produces SHALL be
 * voice-marked (u-prefix, jam-aux, or dedicated MP endings). This catches
 * the buildSimpleCell-ignores-voice bug class for any future builder.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, table } from '../src/conjugate.js';

import { fixtures, punoj, flas, shoh, pjek } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

const JAM_PARADIGM_PREFIXES = [
  // Admirative
  'qenkam', 'qenke', 'qenka', 'qenkemi', 'qenkeni', 'qenkan',
  'qenkësha', 'qenkëshe', 'qenkësh', 'qenkëshim', 'qenkëshit', 'qenkëshin',
  // Indicative present + imperfect
  'jam', 'je', 'është', 'jemi', 'jeni', 'janë',
  'isha', 'ishe', 'ishte', 'ishim', 'ishit', 'ishin',
  // Subjunctive present (jemi/jeni overlap with indicative present)
  'jem', 'jesh', 'jetë', 'jenë',
  // Optative present
  'qofsha', 'qofsh', 'qoftë', 'qofshim', 'qofshit', 'qofshin',
  // Aorist
  'qe', 'qeshë', 'qemë', 'qetë', 'qenë',
];

const MP_ENDINGS = [
  // Class 1 / 3 (h-glide)
  'hem', 'hesh', 'het', 'hemi', 'heni', 'hen',
  'hesha', 'heshe', 'hej', 'heshim', 'heshit', 'heshin',
  // Class 2 (no h-glide)
  'em', 'esh', 'et', 'emi', 'eni', 'en',
  'esha', 'eshe', 'ej', 'eshim', 'eshit', 'eshin',
];

function isVoiceMarked(form: string): boolean {
  // Pattern 1: simple MP — u-prefix.
  if (form.startsWith('u ')) return true;
  // Pattern 2: compound MP — any word in the form is a jam-paradigm form
  // (covers `do të jem punuar`, `të jem punuar`, `qenkam folur`, etc.).
  const words = form.split(' ');
  if (words.some((w) => JAM_PARADIGM_PREFIXES.includes(w))) return true;
  // Pattern 3: dedicated MP endings — the *last* word of the form must
  // end in an MP ending (handles `do të punohem`, `të punohesha`, plus
  // simple `punohem`).
  const lastWord = words[words.length - 1]!;
  for (const ending of MP_ENDINGS) {
    if (lastWord.endsWith(ending) && lastWord.length > ending.length) return true;
  }
  return false;
}

interface CellLocation {
  verb: string;
  mood: string;
  tense: string;
  cell: string;
  form: string;
}

function collectMpCells(verbId: string): CellLocation[] {
  const t = table(verbId);
  const out: CellLocation[] = [];
  const moods = ['indicative', 'subjunctive', 'conditional', 'admirative', 'optative', 'imperative'] as const;
  for (const mood of moods) {
    const moodTable = t[mood] as Record<string, Record<string, { form: string } | undefined>>;
    for (const [tense, row] of Object.entries(moodTable)) {
      for (const [key, cell] of Object.entries(row)) {
        if (key.endsWith('.middle-passive') && cell !== undefined) {
          out.push({ verb: verbId, mood, tense, cell: key.replace('.middle-passive', ''), form: cell.form });
        }
      }
    }
  }
  return out;
}

describe('audit: every MP cell is voice-marked (catches buildSimpleCell-ignores-voice bug class)', () => {
  for (const verb of [punoj, flas, shoh, pjek]) {
    it(`${verb.id}: every MP cell across all moods is voice-marked`, () => {
      const cells = collectMpCells(verb.id);
      expect(cells.length).toBeGreaterThan(0);

      const failing: CellLocation[] = [];
      for (const c of cells) {
        if (!isVoiceMarked(c.form)) {
          failing.push(c);
        }
      }

      if (failing.length > 0) {
        const lines = failing.map(
          (c) =>
            `  ${c.verb} ${c.mood}/${c.tense}/${c.cell}.middle-passive  →  "${c.form}"  (no voice marker; possible silent-active bug)`,
        );
        throw new Error(
          `${failing.length} MP cell(s) missing voice marker:\n${lines.join('\n')}\nSee design D2 of complete-mp-voice-arc.`,
        );
      }
    });
  }
});
