/**
 * Pure-data lookup mapping a DecompositionSegment's metadata to a
 * one-line English explanation. Used by both the static `title`
 * attribute and the JS-enhanced shadcn Tooltip on every verb page.
 */

import type { DecompositionSegment, MorphologicalRole } from '@foljapp/engine';

const PARTICLE_EXPLANATIONS: Record<string, string> = {
  do: 'do — future / conditional marker',
  të: 'të — subjunctive marker',
  mos: 'mos — negation in imperative or subjunctive',
  nuk: 'nuk — negation (default)',
  s: "s' — colloquial negation",
  a: 'a — interrogative particle',
  duke: 'duke — gerund marker (përcjellore)',
  pa: 'pa — privative marker (mohore)',
  'me-të-prefix': 'me — temporal marker (kohore, with të)',
  për: 'për — infinitive marker (paskajore, with të)',
  u: 'u — middle-passive marker (aorist)',
};

const AUXILIARY_TENSE_LABEL: Record<string, string> = {
  present: 'present indicative',
  imperfect: 'imperfect indicative',
  aorist: 'aorist',
  perfect: 'perfect',
  pluperfect: 'pluperfect',
  future: 'future',
};

function isKamForm(surface: string): boolean {
  return /^(kam|ke|ka|kemi|keni|kanë|kisha|kishe|kishte|kishim|kishit|kishin|pata|pate|pati|patëm|patët|patën|kem|kesh|ketë|kenë)$/.test(
    surface,
  );
}

function isJamForm(surface: string): boolean {
  return /^(jam|je|është|jemi|jeni|janë|isha|ishe|ishte|ishim|ishit|ishin|qeshë|qe|qemë|qetë|qenë|jem|jesh|jetë|jenë)$/.test(
    surface,
  );
}

function explainAuxiliary(segment: DecompositionSegment): string {
  const surface = segment.surface;
  const verb = isKamForm(surface)
    ? 'kam (to have)'
    : isJamForm(surface)
      ? 'jam (to be)'
      : 'auxiliary verb';
  const tense = segment.meta?.tense
    ? (AUXILIARY_TENSE_LABEL[segment.meta.tense] ?? segment.meta.tense)
    : null;
  return tense ? `${surface} — ${verb}, ${tense}` : `${surface} — ${verb}`;
}

function explainEnding(segment: DecompositionSegment): string {
  const surface = segment.surface;
  const tense = segment.meta?.tense;
  const person = segment.meta?.person;
  const number = segment.meta?.number;
  if (tense && person && number) {
    const cell = `${person}${number === 'singular' ? 'sg' : 'pl'}`;
    return `-${surface} — ${tense} ${cell} ending`;
  }
  return `-${surface} — inflectional ending`;
}

const ROLE_FALLBACK: Record<MorphologicalRole, string> = {
  particle: 'particle',
  auxiliary: 'auxiliary verb',
  stem: 'verb stem',
  ending: 'inflectional ending',
  'voice-marker': 'voice marker',
};

export function explain(segment: DecompositionSegment): string {
  switch (segment.role) {
    case 'particle': {
      const name = segment.meta?.particleName;
      if (name && PARTICLE_EXPLANATIONS[name]) {
        return PARTICLE_EXPLANATIONS[name];
      }
      return `${segment.surface} — ${ROLE_FALLBACK.particle}`;
    }
    case 'auxiliary':
      return explainAuxiliary(segment);
    case 'stem':
      return `${segment.surface} — verb stem`;
    case 'ending':
      return explainEnding(segment);
    case 'voice-marker':
      return PARTICLE_EXPLANATIONS[segment.meta?.particleName ?? 'u'] ??
        `${segment.surface} — voice marker`;
  }
}
