import type {
  CellKey,
  CellLabel,
  ConjugateOptions,
  Mood,
  NonFiniteForm,
  Tense,
} from './types.js';
import { cellLabel } from './types.js';

export interface AncTagQuery {
  tags: string[];
  label: string;
  note?: string;
}

export interface GeneratedSearchTarget {
  targetKey: string;
  displayForm: string;
  tokens: string[];
  signature: string;
  ancTags: string[];
  ancQuery: string;
  cellLabel: string;
}

const MOOD_TAGS: Partial<Record<Mood, string>> = {
  indicative: 'ind',
  subjunctive: 'sbjv',
  admirative: 'adm',
  optative: 'opt',
  imperative: 'imp',
};

const SIMPLE_TENSE_TAGS: Partial<Record<Tense, string>> = {
  present: 'pres',
  imperfect: 'ipf',
  aorist: 'aor',
};

const NON_FINITE_TAGS: Record<NonFiniteForm, string[]> = {
  participle: ['V', 'ptcp'],
  infinitive: ['V', 'ptcp'],
  gerund: ['V', 'ptcp'],
  privative: ['V', 'ptcp'],
  temporal: ['V', 'ptcp'],
};

export function normalizeSearchToken(token: string): string {
  return token.normalize('NFC').toLocaleLowerCase('sq-AL').trim();
}

export function searchTokens(text: string): string[] {
  return (text.match(/\p{L}+/gu) ?? [])
    .map(normalizeSearchToken)
    .filter(Boolean);
}

export function normalizeSearchKey(text: string): string {
  return searchTokens(text).join(' ');
}

export function cellSignature(options: ConjugateOptions): string {
  if (options.mood === 'non-finite') {
    return `non-finite.${options.form ?? 'participle'}`;
  }

  const tense = options.tense ?? 'present';
  const voice = options.voice ?? 'active';
  const person = options.person ?? 3;
  const number = options.number ?? 'singular';
  const polarity = options.polarity ?? 'affirmative';
  const modality = options.modality ?? 'declarative';
  const label = cellLabel(person, number);
  return `${options.mood}.${tense}.${label}.${voice}.${polarity}.${modality}`;
}

export function cellSignatureFromCell(cell: CellKey): string {
  if (cell.mood === 'non-finite') return `non-finite.${cell.form}`;
  return `${cell.mood}.${cell.tense}.${cellLabel(cell.person, cell.number)}.${cell.voice}.affirmative.declarative`;
}

export function cellDisplayLabel(options: ConjugateOptions): string {
  if (options.mood === 'non-finite') {
    return `non-finite ${options.form ?? 'participle'}`;
  }

  const tense = options.tense ?? 'present';
  const voice = options.voice ?? 'active';
  const person = options.person ?? 3;
  const number = options.number ?? 'singular';
  const label = cellLabel(person, number);
  return `${options.mood} ${tense} ${label} ${voice}`;
}

function simpleFiniteTags(options: ConjugateOptions): string[] | null {
  if (options.mood === 'non-finite') return null;

  const tags = ['V'];
  const moodTag = MOOD_TAGS[options.mood];
  if (moodTag) tags.push(moodTag);

  const tenseTag = SIMPLE_TENSE_TAGS[options.tense ?? 'present'];
  if (tenseTag) tags.push(tenseTag);

  if (options.person) tags.push(String(options.person));
  if (options.number) tags.push(options.number === 'singular' ? 'sg' : 'pl');

  const voice = options.voice ?? 'active';
  tags.push(voice === 'middle-passive' ? 'pass' : 'act');
  return tags;
}

export function ancTagQueryForOptions(options: ConjugateOptions): AncTagQuery {
  if (options.mood === 'non-finite') {
    const form = options.form ?? 'participle';
    const tags = NON_FINITE_TAGS[form];
    return {
      tags,
      label: tags.join(' '),
      note:
        form === 'participle'
          ? undefined
          : `${form} is analytic in foljapp; the lexical verb is searched as a participle.`,
    };
  }

  const simpleTags = simpleFiniteTags(options);
  const tense = options.tense ?? 'present';
  const analyticTenses = new Set<Tense>([
    'perfect',
    'pluperfect',
    'past-anterior',
    'future',
    'future-perfect',
    'future-in-past',
    'future-perfect-in-past',
  ]);

  if (!analyticTenses.has(tense) && options.mood !== 'conditional') {
    const tags = simpleTags ?? ['V'];
    return { tags, label: tags.join(' ') };
  }

  const tags = ['V', 'ptcp'];
  const note =
    options.mood === 'conditional' || tense.startsWith('future')
      ? 'Analytic cell; exact phrase search is more reliable than a single-token grammar query.'
      : 'Compound tense; the lexical verb is searched as a participle.';
  return { tags, label: tags.join(' '), note };
}

export function generatedSearchTarget(
  displayForm: string,
  options: ConjugateOptions,
): GeneratedSearchTarget | null {
  const tokens = searchTokens(displayForm);
  if (tokens.length === 0) return null;

  const anc = ancTagQueryForOptions(options);
  return {
    targetKey: tokens.join(' '),
    displayForm,
    tokens,
    signature: cellSignature(options),
    ancTags: anc.tags,
    ancQuery: anc.label,
    cellLabel: cellDisplayLabel(options),
  };
}

export function cellLabelFromSignature(signature: string): CellLabel | null {
  const match = signature.match(/\.(1|2|3)(sg|pl)\./);
  return match ? (`${match[1]}${match[2]}` as CellLabel) : null;
}
