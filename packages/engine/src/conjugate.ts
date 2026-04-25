/**
 * Conjugation orchestrator. Single entry point: `conjugate(verbId, options)`.
 */

import {
  auxiliaryForm,
  type AuxiliaryId,
  type AuxiliaryTenseKey,
} from './auxiliaries.js';
import { buildSegment } from './compose/decomposition.js';
import { selectNegation, shouldNegate } from './compose/particle.js';
import {
  configure as configureCorpus,
  getAllEntries,
  getCorpusVersion,
  lookupEntry,
} from './corpus-loader.js';
import {
  CorpusIntegrityError,
  InvalidOptionsError,
  UnknownVerbError,
  UnsupportedCellError,
} from './errors.js';
import { applyCellRule, paradigmFor } from './paradigms/index.js';
import { normalize } from './phonology/normalize.js';
import {
  isSuppletive,
  suppletiveForm,
  suppletiveParticiple,
  type SuppletiveTenseKey,
} from './suppletion.js';
import type {
  AdmirativeTense,
  CellKey,
  CellLabel,
  ConditionalTense,
  ConjugateOptions,
  ConjugationResult,
  DecompositionSegment,
  GrammaticalNumber,
  IndicativeTense,
  Mood,
  NonFiniteForm,
  OptativeTense,
  Person,
  SubjunctiveTense,
  VerbEntry,
  VerbTable,
} from './types.js';
import { cellLabel } from './types.js';
import { VERSION } from './version.js';

export { configureCorpus as configure };

interface ResolvedCell {
  surface: string;
  segments: DecompositionSegment[];
  unsupported?: boolean;
}

const ALL_CELLS_PERSON_NUMBER: Array<{
  person: Person;
  number: GrammaticalNumber;
  label: CellLabel;
}> = [
  { person: 1, number: 'singular', label: '1sg' },
  { person: 2, number: 'singular', label: '2sg' },
  { person: 3, number: 'singular', label: '3sg' },
  { person: 1, number: 'plural', label: '1pl' },
  { person: 2, number: 'plural', label: '2pl' },
  { person: 3, number: 'plural', label: '3pl' },
];

function getParticiple(entry: VerbEntry): string {
  if (isSuppletive(entry.id) && entry.flags?.isSuppletive) {
    return suppletiveParticiple(entry.id);
  }
  return entry.principalParts.participle;
}

function buildSimpleCell(
  entry: VerbEntry,
  tenseKey:
    | 'presentActive'
    | 'imperfectActive'
    | 'aoristActive'
    | 'subjunctivePresentActive'
    | 'admirativePresentActive'
    | 'optativePresentActive'
    | 'middlePassivePresent'
    | 'middlePassiveImperfect',
  person: Person,
  number: GrammaticalNumber,
): ResolvedCell {
  const paradigm = paradigmFor(entry);
  const cell = cellLabel(person, number);

  if (isSuppletive(entry.id) && entry.flags?.isSuppletive) {
    const suppKey = suppletiveTenseKeyFor(tenseKey);
    if (suppKey) {
      const supp = suppletiveForm(entry.id, suppKey, cell);
      if (supp !== undefined) {
        return {
          surface: supp,
          segments: [
            buildSegment({
              surface: supp,
              role: 'stem',
              person,
              number,
            }),
          ],
        };
      }
    }
  }

  const rule = paradigm[tenseKey][cell];
  const stem = entry.principalParts[rule.stem];
  const trimmed = rule.trim ? stem.slice(0, stem.length - rule.trim) : stem;
  const surface = applyCellRule(entry, rule);

  const segments: DecompositionSegment[] = [];
  if (trimmed) {
    segments.push(
      buildSegment({ surface: trimmed, role: 'stem', person, number }),
    );
  }
  if (rule.ending) {
    segments.push(
      buildSegment({ surface: rule.ending, role: 'ending', person, number }),
    );
  }
  return { surface, segments };
}

function suppletiveTenseKeyFor(
  paradigmKey:
    | 'presentActive'
    | 'imperfectActive'
    | 'aoristActive'
    | 'subjunctivePresentActive'
    | 'admirativePresentActive'
    | 'optativePresentActive'
    | 'middlePassivePresent'
    | 'middlePassiveImperfect',
): SuppletiveTenseKey | null {
  switch (paradigmKey) {
    case 'presentActive':
      return 'indicative.present';
    case 'imperfectActive':
      return 'indicative.imperfect';
    case 'aoristActive':
      return 'indicative.aorist';
    case 'subjunctivePresentActive':
      return 'subjunctive.present';
    case 'admirativePresentActive':
      return 'admirative.present';
    case 'optativePresentActive':
      return 'optative.present';
    default:
      return null;
  }
}

function buildAuxiliaryCell(
  aux: AuxiliaryId,
  tenseKey: AuxiliaryTenseKey,
  person: Person,
  number: GrammaticalNumber,
): string {
  const cell = cellLabel(person, number);
  const form = auxiliaryForm(aux, tenseKey, cell);
  if (form === undefined) {
    throw new CorpusIntegrityError(
      aux,
      `auxiliary missing cell ${cell} for ${tenseKey}`,
    );
  }
  return form;
}

function buildIndicative(
  entry: VerbEntry,
  tense: IndicativeTense,
  person: Person,
  number: GrammaticalNumber,
  voice: 'active' | 'middle-passive',
): ResolvedCell {
  const aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary;
  const participle = getParticiple(entry);

  switch (tense) {
    case 'present':
      return voice === 'active'
        ? buildSimpleCell(entry, 'presentActive', person, number)
        : buildSimpleCell(entry, 'middlePassivePresent', person, number);

    case 'imperfect':
      return voice === 'active'
        ? buildSimpleCell(entry, 'imperfectActive', person, number)
        : buildSimpleCell(entry, 'middlePassiveImperfect', person, number);

    case 'aorist':
      if (voice === 'active') {
        return buildSimpleCell(entry, 'aoristActive', person, number);
      }
      // Middle-passive aorist: prepend "u" particle to active aorist form
      const activeAorist = buildSimpleCell(
        entry,
        'aoristActive',
        person,
        number,
      );
      return {
        surface: `u ${activeAorist.surface}`,
        segments: [
          buildSegment({
            surface: 'u',
            role: 'voice-marker',
            particleName: 'u',
          }),
          ...activeAorist.segments,
        ],
      };

    case 'perfect':
      return buildCompoundCell(aux, 'indicative.present', participle, person, number);

    case 'pluperfect':
      return buildCompoundCell(aux, 'indicative.imperfect', participle, person, number);

    case 'past-anterior':
      return buildCompoundCell(aux, 'indicative.aorist', participle, person, number);

    case 'future': {
      // do + të + present subjunctive (active)
      const subj = buildSimpleCell(
        entry,
        'subjunctivePresentActive',
        person,
        number,
      );
      return {
        surface: `do të ${subj.surface}`,
        segments: [
          buildSegment({ surface: 'do', role: 'particle', particleName: 'do' }),
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          ...subj.segments,
        ],
      };
    }

    case 'future-perfect': {
      // do + të + subjunctive present of aux + participle
      const auxForm = buildAuxiliaryCell(aux, 'subjunctive.present', person, number);
      return {
        surface: `do të ${auxForm} ${participle}`,
        segments: [
          buildSegment({ surface: 'do', role: 'particle', particleName: 'do' }),
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };
    }

    case 'future-in-past': {
      // do + të + imperfect indicative
      const imp = buildSimpleCell(entry, 'imperfectActive', person, number);
      return {
        surface: `do të ${imp.surface}`,
        segments: [
          buildSegment({ surface: 'do', role: 'particle', particleName: 'do' }),
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          ...imp.segments,
        ],
      };
    }

    case 'future-perfect-in-past': {
      // do + të + imperfect of aux + participle
      const auxForm = buildAuxiliaryCell(aux, 'indicative.imperfect', person, number);
      return {
        surface: `do të ${auxForm} ${participle}`,
        segments: [
          buildSegment({ surface: 'do', role: 'particle', particleName: 'do' }),
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };
    }
  }
}

function buildCompoundCell(
  aux: AuxiliaryId,
  auxTenseKey: AuxiliaryTenseKey,
  participle: string,
  person: Person,
  number: GrammaticalNumber,
): ResolvedCell {
  const auxForm = buildAuxiliaryCell(aux, auxTenseKey, person, number);
  return {
    surface: `${auxForm} ${participle}`,
    segments: [
      buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
      buildSegment({ surface: participle, role: 'stem' }),
    ],
  };
}

function buildSubjunctive(
  entry: VerbEntry,
  tense: SubjunctiveTense,
  person: Person,
  number: GrammaticalNumber,
  voice: 'active' | 'middle-passive',
): ResolvedCell {
  const aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary;
  const participle = getParticiple(entry);

  switch (tense) {
    case 'present': {
      const inner =
        voice === 'active'
          ? buildSimpleCell(entry, 'subjunctivePresentActive', person, number)
          : buildSimpleCell(entry, 'middlePassivePresent', person, number);
      return prependParticle(inner, 'të');
    }
    case 'imperfect': {
      const inner =
        voice === 'active'
          ? buildSimpleCell(entry, 'imperfectActive', person, number)
          : buildSimpleCell(entry, 'middlePassiveImperfect', person, number);
      return prependParticle(inner, 'të');
    }
    case 'perfect': {
      const auxForm = buildAuxiliaryCell(aux, 'subjunctive.present', person, number);
      return {
        surface: `të ${auxForm} ${participle}`,
        segments: [
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };
    }
    case 'pluperfect': {
      const auxForm = buildAuxiliaryCell(aux, 'subjunctive.imperfect', person, number);
      return {
        surface: `të ${auxForm} ${participle}`,
        segments: [
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };
    }
  }
}

function buildConditional(
  entry: VerbEntry,
  tense: ConditionalTense,
  person: Person,
  number: GrammaticalNumber,
  voice: 'active' | 'middle-passive',
): ResolvedCell {
  const aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary;
  const participle = getParticiple(entry);

  switch (tense) {
    case 'present': {
      const inner =
        voice === 'active'
          ? buildSimpleCell(entry, 'imperfectActive', person, number)
          : buildSimpleCell(entry, 'middlePassiveImperfect', person, number);
      return {
        surface: `do të ${inner.surface}`,
        segments: [
          buildSegment({ surface: 'do', role: 'particle', particleName: 'do' }),
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          ...inner.segments,
        ],
      };
    }
    case 'perfect': {
      const auxForm = buildAuxiliaryCell(aux, 'subjunctive.imperfect', person, number);
      return {
        surface: `do të ${auxForm} ${participle}`,
        segments: [
          buildSegment({ surface: 'do', role: 'particle', particleName: 'do' }),
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };
    }
  }
}

function buildAdmirative(
  entry: VerbEntry,
  tense: AdmirativeTense,
  person: Person,
  number: GrammaticalNumber,
  voice: 'active' | 'middle-passive',
): ResolvedCell {
  const aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary;
  const participle = getParticiple(entry);

  switch (tense) {
    case 'present':
      return buildSimpleCell(entry, 'admirativePresentActive', person, number);

    case 'perfect': {
      const auxForm = buildAuxiliaryCell(aux, 'admirative.present', person, number);
      return {
        surface: `${auxForm} ${participle}`,
        segments: [
          buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };
    }

    case 'imperfect':
    case 'pluperfect':
      throw new UnsupportedCellError(
        `${tense}/admirative`,
        'admirative imperfect/pluperfect not implemented in v0.1.0; see packages/engine/docs/sources.md',
      );
  }
}

function buildOptative(
  entry: VerbEntry,
  tense: OptativeTense,
  person: Person,
  number: GrammaticalNumber,
  voice: 'active' | 'middle-passive',
): ResolvedCell {
  const aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary;
  const participle = getParticiple(entry);

  switch (tense) {
    case 'present':
      return buildSimpleCell(entry, 'optativePresentActive', person, number);

    case 'perfect': {
      const auxForm = buildAuxiliaryCell(aux, 'optative.present', person, number);
      return {
        surface: `${auxForm} ${participle}`,
        segments: [
          buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };
    }
  }
}

function buildImperative(
  entry: VerbEntry,
  person: Person,
  number: GrammaticalNumber,
): ResolvedCell {
  if (person !== 2) {
    throw new UnsupportedCellError(
      `${person}${number === 'singular' ? 'sg' : 'pl'}/imperative`,
      'imperative is restricted to 2nd person',
    );
  }

  const cell = number === 'singular' ? '2sg' : '2pl';

  if (isSuppletive(entry.id) && entry.flags?.isSuppletive) {
    const supp = suppletiveForm(entry.id, 'imperative.present', cell);
    if (supp) {
      return {
        surface: supp,
        segments: [buildSegment({ surface: supp, role: 'stem' })],
      };
    }
  }

  const paradigm = paradigmFor(entry);
  const rule = paradigm.imperativeActive[cell];
  const stem = entry.principalParts[rule.stem];
  const trimmed = rule.trim ? stem.slice(0, stem.length - rule.trim) : stem;
  const surface = trimmed + rule.ending;

  const segments: DecompositionSegment[] = [];
  if (trimmed) {
    segments.push(buildSegment({ surface: trimmed, role: 'stem' }));
  }
  if (rule.ending) {
    segments.push(buildSegment({ surface: rule.ending, role: 'ending' }));
  }
  return { surface, segments };
}

function buildNonFinite(
  entry: VerbEntry,
  form: NonFiniteForm,
): ResolvedCell {
  const participle = getParticiple(entry);

  switch (form) {
    case 'participle':
      return {
        surface: participle,
        segments: [buildSegment({ surface: participle, role: 'stem' })],
      };

    case 'infinitive':
      return {
        surface: `për të ${participle}`,
        segments: [
          buildSegment({ surface: 'për', role: 'particle', particleName: 'për' }),
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };

    case 'gerund':
      return {
        surface: `duke ${participle}`,
        segments: [
          buildSegment({ surface: 'duke', role: 'particle', particleName: 'duke' }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };

    case 'privative':
      return {
        surface: `pa ${participle}`,
        segments: [
          buildSegment({ surface: 'pa', role: 'particle', particleName: 'pa' }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };

    case 'temporal':
      return {
        surface: `me të ${participle}`,
        segments: [
          buildSegment({ surface: 'me', role: 'particle', particleName: 'me-të-prefix' }),
          buildSegment({ surface: 'të', role: 'particle', particleName: 'të' }),
          buildSegment({ surface: participle, role: 'stem' }),
        ],
      };
  }
}

function prependParticle(
  cell: ResolvedCell,
  particle: 'të' | 'mos' | 'nuk' | "s'" | 'a',
): ResolvedCell {
  return {
    surface: `${particle} ${cell.surface}`,
    segments: [
      buildSegment({
        surface: particle,
        role: 'particle',
        particleName: particle === "s'" ? 's' : particle,
      }),
      ...cell.segments,
    ],
  };
}

function applyNegationAndModality(
  cell: ResolvedCell,
  options: ConjugateOptions,
): ResolvedCell {
  let result = cell;

  if (shouldNegate(options.polarity)) {
    const neg = selectNegation(options.mood, options.colloquial ?? false);
    result = {
      surface: `${neg.surface} ${result.surface}`,
      segments: [
        buildSegment({
          surface: neg.surface,
          role: 'particle',
          particleName: neg.name,
        }),
        ...result.segments,
      ],
    };
  }

  if (options.modality === 'interrogative') {
    result = {
      surface: `a ${result.surface}`,
      segments: [
        buildSegment({ surface: 'a', role: 'particle', particleName: 'a' }),
        ...result.segments,
      ],
    };
  }

  return result;
}

function validateOptions(options: ConjugateOptions): void {
  if (!options || typeof options !== 'object') {
    throw new InvalidOptionsError('options must be an object');
  }
  if (!options.mood) {
    throw new InvalidOptionsError('options.mood is required');
  }
  if (options.mood === 'imperative') {
    if (options.tense && options.tense !== 'present') {
      throw new InvalidOptionsError(
        `imperative does not support tense "${options.tense}"; only "present"`,
      );
    }
  }
  if (options.mood === 'non-finite') {
    if (!options.form) {
      throw new InvalidOptionsError(
        'non-finite mood requires options.form (participle | infinitive | gerund | privative | temporal)',
      );
    }
  } else {
    if (options.person === undefined && options.mood !== 'imperative') {
      throw new InvalidOptionsError('options.person is required for finite moods');
    }
    if (options.number === undefined && options.mood !== 'imperative') {
      throw new InvalidOptionsError('options.number is required for finite moods');
    }
  }
}

export function conjugate(
  verbId: string,
  options: ConjugateOptions,
): ConjugationResult {
  validateOptions(options);

  const entry = lookupEntry(verbId);
  if (!entry) {
    throw new UnknownVerbError(verbId);
  }

  const voice = options.voice ?? 'active';
  const person = (options.person ?? 2) as Person;
  const number = options.number ?? 'singular';

  let cell: ResolvedCell;
  switch (options.mood) {
    case 'indicative': {
      const tense = (options.tense ?? 'present') as IndicativeTense;
      cell = buildIndicative(entry, tense, person, number, voice);
      break;
    }
    case 'subjunctive': {
      const tense = (options.tense ?? 'present') as SubjunctiveTense;
      cell = buildSubjunctive(entry, tense, person, number, voice);
      break;
    }
    case 'conditional': {
      const tense = (options.tense ?? 'present') as ConditionalTense;
      cell = buildConditional(entry, tense, person, number, voice);
      break;
    }
    case 'admirative': {
      const tense = (options.tense ?? 'present') as AdmirativeTense;
      cell = buildAdmirative(entry, tense, person, number, voice);
      break;
    }
    case 'optative': {
      const tense = (options.tense ?? 'present') as OptativeTense;
      cell = buildOptative(entry, tense, person, number, voice);
      break;
    }
    case 'imperative':
      cell = buildImperative(entry, person, number);
      break;
    case 'non-finite':
      cell = buildNonFinite(entry, options.form!);
      break;
    default:
      throw new InvalidOptionsError(`unknown mood: ${options.mood}`);
  }

  if (options.mood !== 'non-finite') {
    cell = applyNegationAndModality(cell, options);
  }

  const finalSurface = normalize(cell.surface);

  return {
    form: finalSurface,
    decomposition: cell.segments,
    options,
    unsupported: cell.unsupported ?? false,
    interrogative: options.modality === 'interrogative',
    engineVersion: VERSION,
    corpusVersion: getCorpusVersion(),
  };
}

export function participle(verbId: string): string {
  const entry = lookupEntry(verbId);
  if (!entry) throw new UnknownVerbError(verbId);
  return getParticiple(entry);
}

const INDICATIVE_TENSES: IndicativeTense[] = [
  'present',
  'imperfect',
  'aorist',
  'perfect',
  'pluperfect',
  'past-anterior',
  'future',
  'future-perfect',
  'future-in-past',
  'future-perfect-in-past',
];
const SUBJUNCTIVE_TENSES: SubjunctiveTense[] = [
  'present',
  'imperfect',
  'perfect',
  'pluperfect',
];
const CONDITIONAL_TENSES: ConditionalTense[] = ['present', 'perfect'];
const ADMIRATIVE_TENSES: AdmirativeTense[] = [
  'present',
  'imperfect',
  'perfect',
  'pluperfect',
];
const OPTATIVE_TENSES: OptativeTense[] = ['present', 'perfect'];
const NON_FINITE_FORMS: NonFiniteForm[] = [
  'participle',
  'infinitive',
  'gerund',
  'privative',
  'temporal',
];

export function allCells(): CellKey[] {
  const cells: CellKey[] = [];

  const finiteMoods: Array<{
    mood: Exclude<Mood, 'non-finite' | 'imperative'>;
    tenses: readonly string[];
  }> = [
    { mood: 'indicative', tenses: INDICATIVE_TENSES },
    { mood: 'subjunctive', tenses: SUBJUNCTIVE_TENSES },
    { mood: 'conditional', tenses: CONDITIONAL_TENSES },
    { mood: 'admirative', tenses: ADMIRATIVE_TENSES },
    { mood: 'optative', tenses: OPTATIVE_TENSES },
  ];

  for (const { mood, tenses } of finiteMoods) {
    for (const tense of tenses) {
      for (const voice of ['active', 'middle-passive'] as const) {
        for (const pn of ALL_CELLS_PERSON_NUMBER) {
          cells.push({
            mood,
            tense: tense as never,
            voice,
            person: pn.person,
            number: pn.number,
          });
        }
      }
    }
  }

  // Imperative — only 2sg/2pl
  for (const voice of ['active', 'middle-passive'] as const) {
    cells.push({ mood: 'imperative', tense: 'present', voice, person: 2, number: 'singular' });
    cells.push({ mood: 'imperative', tense: 'present', voice, person: 2, number: 'plural' });
  }

  for (const form of NON_FINITE_FORMS) {
    cells.push({ mood: 'non-finite', form });
  }

  return cells;
}

function tryConjugate(
  verbId: string,
  options: ConjugateOptions,
): ConjugationResult | null {
  try {
    return conjugate(verbId, options);
  } catch (err) {
    if (err instanceof UnsupportedCellError) {
      return null;
    }
    throw err;
  }
}

export function table(verbId: string): VerbTable {
  const entry = lookupEntry(verbId);
  if (!entry) throw new UnknownVerbError(verbId);

  const indicative: VerbTable['indicative'] = {} as VerbTable['indicative'];
  const subjunctive: VerbTable['subjunctive'] = {} as VerbTable['subjunctive'];
  const conditional: VerbTable['conditional'] = {} as VerbTable['conditional'];
  const admirative: VerbTable['admirative'] = {} as VerbTable['admirative'];
  const optative: VerbTable['optative'] = {} as VerbTable['optative'];
  const imperative: VerbTable['imperative'] = {} as VerbTable['imperative'];
  const nonFinite: VerbTable['nonFinite'] = {} as VerbTable['nonFinite'];

  const fillFinite = <T extends string>(
    moodTable: Record<string, Record<string, ConjugationResult | undefined>>,
    mood: Mood,
    tenses: readonly T[],
  ) => {
    for (const tense of tenses) {
      moodTable[tense] = {};
      for (const voice of ['active', 'middle-passive'] as const) {
        for (const pn of ALL_CELLS_PERSON_NUMBER) {
          const result = tryConjugate(verbId, {
            mood,
            tense: tense as never,
            voice,
            person: pn.person,
            number: pn.number,
            polarity: 'affirmative',
            modality: 'declarative',
          });
          if (result) {
            const key = `${pn.label}.${voice}` as const;
            moodTable[tense]![key] = result;
          }
        }
      }
    }
  };

  fillFinite(indicative as never, 'indicative', INDICATIVE_TENSES);
  fillFinite(subjunctive as never, 'subjunctive', SUBJUNCTIVE_TENSES);
  fillFinite(conditional as never, 'conditional', CONDITIONAL_TENSES);
  fillFinite(admirative as never, 'admirative', ADMIRATIVE_TENSES);
  fillFinite(optative as never, 'optative', OPTATIVE_TENSES);

  // Imperative — only 2sg, 2pl
  imperative.present = {} as never;
  for (const voice of ['active', 'middle-passive'] as const) {
    for (const number of ['singular', 'plural'] as const) {
      const r = tryConjugate(verbId, {
        mood: 'imperative',
        voice,
        person: 2,
        number,
        polarity: 'affirmative',
        modality: 'declarative',
      });
      if (r) {
        const label = number === 'singular' ? '2sg' : '2pl';
        const key = `${label}.${voice}` as const;
        (imperative.present as Record<string, ConjugationResult>)[key] = r;
      }
    }
  }

  for (const form of NON_FINITE_FORMS) {
    nonFinite[form] = conjugate(verbId, { mood: 'non-finite', form });
  }

  return {
    verbId,
    lemma: entry.lemma,
    indicative,
    subjunctive,
    conditional,
    admirative,
    optative,
    imperative,
    nonFinite,
    engineVersion: VERSION,
    corpusVersion: getCorpusVersion(),
  };
}

export function listVerbs(): VerbEntry[] {
  return getAllEntries();
}

export { joinDecomposition } from './compose/decomposition.js';
