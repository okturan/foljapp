/**
 * Compositional English gloss for Albanian verb cells.
 *
 * Strategy (design.md D1):
 *   Albanian's fusional morphology rules out morpheme-mirror translation.
 *   Each (mood, tense, voice, polarity, modality, person, number) tuple
 *   has a canonical English shape. We compose at the cell level: pick a
 *   base template by (mood, tense), apply voice/polarity/modality
 *   transforms, render with a person/number-agreed pronoun + auxes.
 *
 * Quality bar: grammatically constructible, not idiomatic. See design D10
 * for documented limitations (admirative awkwardness, English subjunctive
 * decay, MP-vs-reflexive ambiguity, etc.).
 */

import type {
  ConjugateOptions,
  GrammaticalNumber,
  Mood,
  Person,
  VerbEntry,
} from '@foljapp/engine';

import { getEnglishForms, type ResolvedEnglishForms } from './english-forms';

type VerbForm = 'base' | 'past' | 'participle' | 'gerund';

interface BaseTemplate {
  /** Sentence-initial phrase that does NOT participate in inversion: "(that)", "to", "without", "upon". */
  prefix?: string;
  /** Adverb that follows the subject: "apparently". */
  adverb?: string;
  /** Auxiliary string (possibly multi-word, possibly slash-form): "" | "have/has" | "will" | "will have" | etc. */
  aux: string;
  /** The verb-form slot to fill. */
  verbForm: VerbForm;
  /** Suppress subject pronoun (imperative, non-finite). */
  noPronoun?: boolean;
  /** Trailing punctuation. */
  suffix?: string;
  /**
   * Optative-style fossilized inversion ("may I work"): renders the first
   * aux before the subject even in declarative mode. Distinct from
   * interrogative inversion (no trailing "?").
   */
  invert?: boolean;
}

const TEMPLATES: Record<string, BaseTemplate> = {
  'indicative.present': { aux: '', verbForm: 'base' },
  'indicative.imperfect': { aux: 'was/were', verbForm: 'gerund' },
  'indicative.aorist': { aux: '', verbForm: 'past' },
  'indicative.perfect': { aux: 'have/has', verbForm: 'participle' },
  'indicative.pluperfect': { aux: 'had', verbForm: 'participle' },
  'indicative.past-anterior': { aux: 'had', verbForm: 'participle' },
  'indicative.future': { aux: 'will', verbForm: 'base' },
  'indicative.future-perfect': { aux: 'will have', verbForm: 'participle' },
  'indicative.future-in-past': {
    aux: 'was/were going to',
    verbForm: 'base',
  },
  'indicative.future-perfect-in-past': {
    aux: 'would have',
    verbForm: 'participle',
  },
  'subjunctive.present': { prefix: '(that)', aux: '', verbForm: 'base' },
  'subjunctive.imperfect': {
    prefix: '(that)',
    aux: 'was/were',
    verbForm: 'gerund',
  },
  'subjunctive.perfect': {
    prefix: '(that)',
    aux: 'have/has',
    verbForm: 'participle',
  },
  'subjunctive.pluperfect': {
    prefix: '(that)',
    aux: 'had',
    verbForm: 'participle',
  },
  'conditional.present': { aux: 'would', verbForm: 'base' },
  'conditional.perfect': { aux: 'would have', verbForm: 'participle' },
  'admirative.present': { adverb: 'apparently', aux: '', verbForm: 'base' },
  'admirative.imperfect': {
    adverb: 'apparently',
    aux: 'was/were',
    verbForm: 'gerund',
  },
  'admirative.perfect': {
    adverb: 'apparently',
    aux: 'have/has',
    verbForm: 'participle',
  },
  'admirative.pluperfect': {
    adverb: 'apparently',
    aux: 'had',
    verbForm: 'participle',
  },
  'optative.present': { aux: 'may', verbForm: 'base', invert: true },
  'optative.perfect': {
    aux: 'may have',
    verbForm: 'participle',
    invert: true,
  },
  'imperative.present': {
    aux: '',
    verbForm: 'base',
    noPronoun: true,
    suffix: '!',
  },
  'non-finite.participle': {
    aux: '',
    verbForm: 'participle',
    noPronoun: true,
  },
  'non-finite.infinitive': {
    prefix: 'to',
    aux: '',
    verbForm: 'base',
    noPronoun: true,
  },
  'non-finite.gerund': { aux: '', verbForm: 'gerund', noPronoun: true },
  'non-finite.privative': {
    prefix: 'without',
    aux: '',
    verbForm: 'gerund',
    noPronoun: true,
  },
  'non-finite.temporal': {
    prefix: 'upon',
    aux: '',
    verbForm: 'gerund',
    noPronoun: true,
  },
};

const FALLBACK_TEMPLATE: BaseTemplate = { aux: '', verbForm: 'base' };

export function pronoun(person: Person, number: GrammaticalNumber): string {
  if (number === 'singular') {
    if (person === 1) return 'I';
    if (person === 2) return 'you';
    return 's/he';
  }
  if (person === 1) return 'we';
  if (person === 2) return 'you';
  return 'they';
}

/** Be-form for the copula in simple tenses (no modal aux). */
export function beForm(
  person: Person,
  number: GrammaticalNumber,
  tense: 'present' | 'past',
): string {
  const is1sg = person === 1 && number === 'singular';
  const is3sg = person === 3 && number === 'singular';
  if (tense === 'present') {
    if (is1sg) return 'am';
    if (is3sg) return 'is';
    return 'are';
  }
  if (is1sg || is3sg) return 'was';
  return 'were';
}

/** Resolve a single slash-form to the agreed surface (was/were → was/were). */
function resolveSlash(
  word: string,
  person: Person,
  number: GrammaticalNumber,
): string {
  const is1sg = person === 1 && number === 'singular';
  const is3sg = person === 3 && number === 'singular';
  switch (word) {
    case 'was/were':
      return is1sg || is3sg ? 'was' : 'were';
    case 'have/has':
      return is3sg ? 'has' : 'have';
    case 'am/are/is':
      return is1sg ? 'am' : is3sg ? 'is' : 'are';
    case 'do/does':
      return is3sg ? 'does' : 'do';
    default:
      return word;
  }
}

/**
 * Resolve a multi-word aux string by replacing each slash-form word
 * with its person/number-agreed surface.
 *
 * "was/were going to" → "was going to" (1sg)
 * "have/has been"     → "have been"   (1sg)
 * "apparently was/were" → "apparently was" (1sg)  (not currently used; adverb separated)
 */
export function auxForm(
  aux: string,
  person: Person,
  number: GrammaticalNumber,
): string {
  if (aux === '') return '';
  return aux
    .split(' ')
    .map((w) => (w.includes('/') ? resolveSlash(w, person, number) : w))
    .join(' ');
}

/**
 * Voice transform (design D4): active → middle-passive (English passive).
 * Inserts a be-form into the aux chain and changes verbForm to participle.
 *
 * The mood matters for the simple-base case: imperative MP uses "be"
 * ("be washed!"), indicative MP uses "am/are/is" ("I am worked").
 */
export function applyVoiceTransform(
  template: BaseTemplate,
  mood: Mood,
): BaseTemplate {
  const { aux, verbForm } = template;

  // Simple base, no aux → present passive
  if (aux === '' && verbForm === 'base') {
    if (mood === 'imperative') {
      return { ...template, aux: 'be', verbForm: 'participle' };
    }
    return { ...template, aux: 'am/are/is', verbForm: 'participle' };
  }

  // Simple past → past passive
  if (aux === '' && verbForm === 'past') {
    return { ...template, aux: 'was/were', verbForm: 'participle' };
  }

  // Bare gerund (rare in templates but defensive)
  if (aux === '' && verbForm === 'gerund') {
    return { ...template, aux: 'am/are/is being', verbForm: 'participle' };
  }

  // Bare participle (non-finite participle): keep as-is — passive participle
  // is the same form ("worked" = both active past-participle and passive)
  if (aux === '' && verbForm === 'participle') {
    return template;
  }

  // Aux present: insert "be"-family form between aux chain and main verb.
  // The form depends on the verb-form slot:
  if (verbForm === 'base') {
    // modal + base → modal + be + participle (will be → "will be worked")
    return { ...template, aux: aux + ' be', verbForm: 'participle' };
  }
  if (verbForm === 'gerund') {
    // was/were + gerund → was/were being + participle ("I was being worked")
    return { ...template, aux: aux + ' being', verbForm: 'participle' };
  }
  if (verbForm === 'participle') {
    // perfect tenses: have/has/had/will-have/would-have + participle
    // → have/has/had/will-have/would-have been + participle
    return { ...template, aux: aux + ' been', verbForm: 'participle' };
  }
  if (verbForm === 'past') {
    // unusual; defensive
    return { ...template, aux: aux + ' been', verbForm: 'participle' };
  }
  return template;
}

interface RenderState {
  prefix: string;
  adverb: string;
  aux: string;
  verbForm: VerbForm;
  noPronoun: boolean;
  suffix: string;
  invert: boolean;
}

function templateToState(t: BaseTemplate): RenderState {
  return {
    prefix: t.prefix ?? '',
    adverb: t.adverb ?? '',
    aux: t.aux,
    verbForm: t.verbForm,
    noPronoun: t.noPronoun ?? false,
    suffix: t.suffix ?? '',
    invert: t.invert ?? false,
  };
}

/**
 * Detect whether the verb's English base is a copula or copula-compound
 * (jam→"be", lind→"be born", mund→"be able"). For these we virtualize
 * the be-form as the aux in simple tenses, so negation/interrogative
 * compose naturally ("I am not born", "was I able?") instead of
 * triggering wrong do-support ("I do not be born").
 */
interface BeVirtualization {
  isCopula: boolean;
  tail: string; // "" for jam, " born" for lind, " able" for mund
}

function detectBeCopula(forms: ResolvedEnglishForms): BeVirtualization {
  if (forms.base === 'be') return { isCopula: true, tail: '' };
  if (forms.base.startsWith('be ')) {
    return { isCopula: true, tail: forms.base.slice(2) };
  }
  return { isCopula: false, tail: '' };
}

/**
 * Pick the verb word for the given form, applying the be-copula
 * special case for compound auxes (e.g., perfect "have been"): forms.gerund
 * and forms.participle already encode the right tail ("being born",
 * "been born"). For simple tenses (handled before we reach here via
 * be-virtualization), the verbWord is the tail or empty.
 */
function selectVerbWord(
  forms: ResolvedEnglishForms,
  verbForm: VerbForm,
): string {
  return forms[verbForm];
}

export type EnglishGlossOptions = ConjugateOptions;

/**
 * Build the English gloss for a (verb, options) pair.
 *
 * The function is pure and deterministic. Returns a non-empty string
 * for every supported cell the engine can produce.
 */
export function englishGloss(
  verb: VerbEntry,
  options: EnglishGlossOptions,
): string {
  const forms = getEnglishForms(verb);
  const mood: Mood = options.mood;

  const key =
    mood === 'non-finite'
      ? `non-finite.${options.form ?? 'participle'}`
      : `${mood}.${options.tense ?? 'present'}`;

  const tpl = TEMPLATES[key] ?? FALLBACK_TEMPLATE;

  const voice = options.voice ?? 'active';
  const polarity = options.polarity ?? 'affirmative';
  const modality = options.modality ?? 'declarative';
  const person = options.person ?? 1;
  const number = options.number ?? 'singular';

  // Be-compound verbs (jam→"be", lind→"be born", mund→"be able") are
  // already passive-shaped in English — there's no further passive form
  // to derive. Albanian's MP voice for these verbs collapses to the active
  // gloss in English (a documented quality limitation per design D10).
  const beForCheck = detectBeCopula(forms);
  const effectiveVoice =
    beForCheck.isCopula && voice === 'middle-passive' ? 'active' : voice;

  const transformed =
    effectiveVoice === 'middle-passive' ? applyVoiceTransform(tpl, mood) : tpl;
  const state = templateToState(transformed);

  let aux = state.aux;
  let verbForm = state.verbForm;
  const isNonFinite = mood === 'non-finite';

  // Be-copula virtualization for simple tenses. When the verb is "to be"
  // (jam) or a be-compound (lind→"be born", mund→"be able") AND the slot
  // is a simple tense (no template aux, base or past form), substitute
  // the agreed be-form into the aux slot and put the tail (or empty)
  // into verbWord. This makes negation/interrogative compose naturally.
  //
  // Imperative is excluded: English imperative uses bare "be" ("be quiet!",
  // "be born!"), not the agreed form ("are quiet!" is wrong). Imperative
  // mood goes through the normal forms.base path which already gives "be"
  // / "be born" / "be able".
  const be = beForCheck;
  let virtualVerbWord: string | null = null;
  let auxPreResolved = false;

  if (
    be.isCopula &&
    aux === '' &&
    (verbForm === 'base' || verbForm === 'past') &&
    !isNonFinite &&
    mood !== 'imperative'
  ) {
    const beTense: 'present' | 'past' = verbForm === 'past' ? 'past' : 'present';
    aux = beForm(person, number, beTense);
    virtualVerbWord = be.tail.trimStart(); // "" for jam, "born", "able"
    auxPreResolved = true;
  }

  // Imperative + negative: prepend "do not", no subject.
  if (mood === 'imperative' && polarity === 'negative') {
    const auxResolved = auxPreResolved ? aux : auxForm(aux, person, number);
    const verbWord =
      virtualVerbWord !== null
        ? virtualVerbWord
        : selectVerbWord(forms, verbForm);
    const parts: string[] = ['do', 'not'];
    if (auxResolved) parts.push(auxResolved);
    if (verbWord) parts.push(verbWord);
    let result = parts.join(' ');
    if (state.prefix) result = `${state.prefix} ${result}`;
    return result + state.suffix;
  }

  // Determine do-support need (only when no real or virtual aux exists).
  const needsAuxForOp =
    polarity === 'negative' || modality === 'interrogative';
  const useDoSupport = needsAuxForOp && aux === '' && !isNonFinite;

  if (useDoSupport) {
    if (verbForm === 'past') {
      aux = 'did';
      verbForm = 'base';
    } else {
      aux = 'do/does';
    }
  }

  const auxResolved = auxPreResolved ? aux : auxForm(aux, person, number);

  let verbWord: string;
  if (useDoSupport) {
    verbWord = forms.base; // do-support always takes bare base
  } else if (virtualVerbWord !== null) {
    verbWord = virtualVerbWord;
  } else {
    verbWord = selectVerbWord(forms, verbForm);
  }

  const subject = state.noPronoun ? '' : pronoun(person, number);
  const adverb = state.adverb;
  const prefix = state.prefix;
  const suffix = state.suffix;

  const auxParts = auxResolved === '' ? [] : auxResolved.split(' ');

  // Inverted forms: optative declarative (state.invert) OR interrogative
  // with at least one aux. Interrogative without aux falls through to
  // do-support (already added above) so auxParts has content.
  const invert =
    (state.invert && modality !== 'interrogative') ||
    modality === 'interrogative';

  if (invert && auxParts.length > 0) {
    const out: string[] = [];
    if (prefix) out.push(prefix);
    out.push(auxParts[0]!); // first aux at front (lowercase per spec)
    if (subject) out.push(subject);
    if (adverb) out.push(adverb);
    if (polarity === 'negative') out.push('not');
    if (auxParts.length > 1) out.push(...auxParts.slice(1));
    if (verbWord) out.push(verbWord);
    let result = out.join(' ');
    if (modality === 'interrogative') result += '?';
    else if (suffix) result += suffix;
    return result;
  }

  // Standard declarative: prefix subject [adv] aux1 [not] [restAux] verb suffix
  const out: string[] = [];
  if (prefix) out.push(prefix);
  if (subject) out.push(subject);
  if (adverb) out.push(adverb);
  if (auxParts.length > 0) {
    out.push(auxParts[0]!);
    if (polarity === 'negative') out.push('not');
    if (auxParts.length > 1) out.push(...auxParts.slice(1));
  }
  if (verbWord) out.push(verbWord);
  return out.join(' ') + suffix;
}
