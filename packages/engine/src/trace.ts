/**
 * Construction trace — describes how a form is built. Re-derived
 * post-hoc from the corpus + paradigm + suppletion data; the
 * orchestrator (conjugate.ts) is not instrumented.
 */

import { auxiliaryForm, type AuxiliaryTenseKey } from './auxiliaries.js';
import { conjugate } from './conjugate.js';
import { lookupEntry } from './corpus-loader.js';
import { UnknownVerbError } from './errors.js';
import { paradigmFor } from './paradigms/index.js';
import {
  isSuppletive,
  suppletiveForm,
  type SuppletiveTenseKey,
} from './suppletion.js';
import type { ConjugateOptions, Mood, TraceStep } from './types.js';
import { cellLabel } from './types.js';

function compoundAuxiliaryTenseKey(
  mood: Mood,
  tense: string | undefined,
): AuxiliaryTenseKey | null {
  if (mood === 'indicative') {
    if (tense === 'perfect') return 'indicative.present';
    if (tense === 'pluperfect') return 'indicative.imperfect';
    if (tense === 'past-anterior') return 'indicative.aorist';
    if (tense === 'future-perfect') return 'subjunctive.present';
    if (tense === 'future-perfect-in-past') return 'indicative.imperfect';
  }
  if (mood === 'subjunctive') {
    if (tense === 'perfect') return 'subjunctive.present';
    if (tense === 'pluperfect') return 'subjunctive.imperfect';
  }
  if (mood === 'conditional' && tense === 'perfect') return 'subjunctive.imperfect';
  if (mood === 'admirative' && tense === 'perfect') return 'admirative.present';
  if (mood === 'optative' && tense === 'perfect') return 'optative.present';
  return null;
}

function paradigmTenseKey(
  mood: Mood,
  tense: string | undefined,
):
  | 'presentActive'
  | 'imperfectActive'
  | 'aoristActive'
  | 'subjunctivePresentActive'
  | 'admirativePresentActive'
  | 'optativePresentActive'
  | null {
  if (mood === 'indicative' && tense === 'present') return 'presentActive';
  if (mood === 'indicative' && tense === 'imperfect') return 'imperfectActive';
  if (mood === 'indicative' && tense === 'aorist') return 'aoristActive';
  if (mood === 'subjunctive' && tense === 'present') return 'subjunctivePresentActive';
  if (mood === 'subjunctive' && tense === 'imperfect') return 'imperfectActive';
  if (mood === 'admirative' && tense === 'present') return 'admirativePresentActive';
  if (mood === 'optative' && tense === 'present') return 'optativePresentActive';
  return null;
}

function suppletiveTenseKey(
  mood: Mood,
  tense: string | undefined,
): SuppletiveTenseKey | null {
  if (mood === 'indicative' && tense === 'present') return 'indicative.present';
  if (mood === 'indicative' && tense === 'imperfect') return 'indicative.imperfect';
  if (mood === 'indicative' && tense === 'aorist') return 'indicative.aorist';
  if (mood === 'subjunctive' && tense === 'present') return 'subjunctive.present';
  if (mood === 'subjunctive' && tense === 'imperfect') return 'indicative.imperfect';
  if (mood === 'admirative' && tense === 'present') return 'admirative.present';
  if (mood === 'optative' && tense === 'present') return 'optative.present';
  if (mood === 'imperative') return 'imperative.present';
  return null;
}

function moodParticle(mood: Mood, tense: string | undefined): string | null {
  if (mood === 'subjunctive') return 'të';
  if (mood === 'conditional') return 'do të';
  if (mood === 'indicative' && tense?.startsWith('future')) return 'do të';
  return null;
}

export function trace(verbId: string, options: ConjugateOptions): TraceStep[] {
  // Validate via conjugate so we throw the same errors for the same input.
  const result = conjugate(verbId, options);

  const entry = lookupEntry(verbId);
  if (!entry) {
    // conjugate would have thrown; defensive fallback.
    throw new UnknownVerbError(verbId);
  }

  const steps: TraceStep[] = [];

  // 1. Corpus lookup
  steps.push({
    kind: 'corpus-lookup',
    verbId: entry.id,
    lemma: entry.lemma,
    class: entry.class,
    auxiliary: entry.auxiliary,
    summary: `Looked up ${entry.lemma} (${entry.translationEn}): Class ${entry.class}, auxiliary ${entry.auxiliary}, principal parts present=${entry.principalParts.present} aorist=${entry.principalParts.aorist} participle=${entry.principalParts.participle}.`,
  });

  // 2. Cell override?
  if (
    options.mood !== 'non-finite' &&
    (options.voice ?? 'active') === 'active' &&
    (options.polarity ?? 'affirmative') === 'affirmative' &&
    (options.modality ?? 'declarative') === 'declarative' &&
    options.person !== undefined &&
    options.number !== undefined
  ) {
    const overrideKey = `${options.mood}.${options.tense ?? 'present'}`;
    const cell = cellLabel(options.person, options.number);
    const override = entry.cellOverrides?.[overrideKey]?.[cell];
    if (override !== undefined) {
      steps.push({
        kind: 'cell-override',
        key: overrideKey,
        cell,
        result: override,
        summary: `Applied corpus cellOverride for ${overrideKey} ${cell}: "${override}".`,
      });
      steps.push({
        kind: 'final',
        form: result.form,
        summary: `Final: ${result.form}`,
      });
      return steps;
    }
  }

  // 3. Suppletive lookup?
  const suppKey = suppletiveTenseKey(options.mood, options.tense);
  if (
    isSuppletive(verbId) &&
    entry.flags?.isSuppletive &&
    suppKey &&
    options.person !== undefined &&
    options.number !== undefined
  ) {
    const cell = cellLabel(options.person, options.number);
    const supp = suppletiveForm(verbId, suppKey, cell);
    if (supp !== undefined) {
      steps.push({
        kind: 'suppletive-lookup',
        verbId,
        cell,
        result: supp,
        summary: `${verbId} is suppletive; read ${suppKey} ${cell} = "${supp}" from the hardcoded table.`,
      });
    }
  }

  // 4. Paradigm rule (for the simple cell at the heart of this form)
  const pKey = paradigmTenseKey(options.mood, options.tense);
  if (
    pKey &&
    options.person !== undefined &&
    options.number !== undefined &&
    !(isSuppletive(verbId) && entry.flags?.isSuppletive)
  ) {
    try {
      const paradigm = paradigmFor(entry);
      const cell = cellLabel(options.person, options.number);
      const rule = paradigm[pKey][cell];
      const stem = entry.principalParts[rule.stem];
      const trimmed = rule.trim ? stem.slice(0, stem.length - rule.trim) : stem;
      const built = trimmed + rule.ending;
      steps.push({
        kind: 'paradigm-rule',
        stem: trimmed,
        ending: rule.ending,
        result: built,
        summary: `Class ${entry.class} ${pKey} ${cell}: stem "${trimmed}" + ending "${rule.ending}" = "${built}".`,
      });
    } catch {
      // best-effort; trace shouldn't fail
    }
  }

  // 5. Compound-tense recursion?
  const auxKey = compoundAuxiliaryTenseKey(options.mood, options.tense);
  if (
    auxKey &&
    options.person !== undefined &&
    options.number !== undefined
  ) {
    const aux = (options.voice ?? 'active') === 'middle-passive' ? 'jam' : entry.auxiliary;
    const cell = cellLabel(options.person, options.number);
    const auxResult = auxiliaryForm(aux, auxKey, cell);
    if (auxResult) {
      steps.push({
        kind: 'auxiliary-recursion',
        auxiliary: aux,
        tenseKey: auxKey,
        cell,
        result: auxResult,
        summary: `Compound: recurse into ${aux} ${auxKey} ${cell} = "${auxResult}", then concatenate the participle.`,
      });
    }
  }

  // 6. Mood particle?
  const moodPart = moodParticle(options.mood, options.tense);
  if (moodPart) {
    steps.push({
      kind: 'particle-prepend',
      particle: moodPart,
      reason: `${options.mood}${options.tense ? `/${options.tense}` : ''} marker`,
      summary: `Prepend "${moodPart}" — the ${options.mood}${options.tense?.startsWith('future') ? ' future' : ''} marker.`,
    });
  }

  // 7. Voice marker?
  if (
    options.mood === 'indicative' &&
    options.tense === 'aorist' &&
    options.voice === 'middle-passive'
  ) {
    steps.push({
      kind: 'particle-prepend',
      particle: 'u',
      reason: 'middle-passive aorist marker',
      summary: 'Prepend "u" — middle-passive marker for the aorist tense.',
    });
  }

  // 8. Negation?
  if (options.polarity === 'negative') {
    const neg =
      options.mood === 'imperative' || options.mood === 'subjunctive'
        ? 'mos'
        : options.colloquial
          ? "s'"
          : 'nuk';
    steps.push({
      kind: 'particle-prepend',
      particle: neg,
      reason: 'negation',
      summary: `Prepend "${neg}" — ${options.mood} negation.`,
    });
  }

  // 9. Interrogative?
  if (options.modality === 'interrogative') {
    steps.push({
      kind: 'particle-prepend',
      particle: 'a',
      reason: 'interrogative marker',
      summary: 'Prepend "a" — interrogative marker.',
    });
  }

  // 10. Final
  steps.push({
    kind: 'final',
    form: result.form,
    summary: `Final: ${result.form}`,
  });

  return steps;
}
