/**
 * Leipzig-style interlinear glossing (IGT) and CoNLL-U formatters.
 *
 * Both produced from `engine.table()` output. Pure functions, no I/O.
 */

import type {
  ConjugationResult,
  DecompositionSegment,
  Mood,
  Tense,
  VerbEntry,
  VerbTable,
} from '@foljapp/engine';
import { conjugate, listVerbs, table, VERSION } from '@foljapp/engine';

const PARTICLE_GLOSS: Record<string, string> = {
  të: 'SBJV',
  do: 'FUT',
  duke: 'GERUND',
  pa: 'PRIV',
  'me-të-prefix': 'TEMP',
  për: 'INF',
  u: 'MID.PASS',
  nuk: 'NEG',
  s: 'NEG',
  mos: 'NEG',
  a: 'INT',
};

const TENSE_TAG: Record<string, string> = {
  present: 'PRS',
  imperfect: 'IPFV',
  aorist: 'AOR',
  perfect: 'PRF',
  pluperfect: 'PLPRF',
  'past-anterior': 'PRF.ANT',
  future: 'FUT',
  'future-perfect': 'FUT.PRF',
  'future-in-past': 'FUT.PST',
  'future-perfect-in-past': 'FUT.PRF.PST',
};

function glossSegment(seg: DecompositionSegment): string {
  switch (seg.role) {
    case 'particle': {
      const name = seg.meta?.particleName;
      if (name && PARTICLE_GLOSS[name]) return PARTICLE_GLOSS[name];
      return 'PRT';
    }
    case 'auxiliary':
      return 'AUX';
    case 'stem':
      return 'STEM';
    case 'voice-marker':
      return 'MID.PASS';
    case 'ending': {
      const parts: string[] = [];
      if (seg.meta?.person) parts.push(`${seg.meta.person}`);
      if (seg.meta?.number) parts.push(seg.meta.number === 'singular' ? 'SG' : 'PL');
      if (seg.meta?.tense) parts.push(TENSE_TAG[seg.meta.tense] ?? seg.meta.tense.toUpperCase());
      return parts.length > 0 ? parts.join('.') : 'INFL';
    }
  }
}

function padCols(rows: string[][]): string[] {
  if (rows.length === 0) return [];
  const cols = Math.max(...rows.map((r) => r.length));
  const widths: number[] = new Array(cols).fill(0);
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      widths[i] = Math.max(widths[i] ?? 0, row[i]!.length);
    }
  }
  return rows.map((row) =>
    row.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join('  ').trimEnd(),
  );
}

interface CellSpec {
  mood: Mood;
  tense?: Tense;
  person?: 1 | 2 | 3;
  number?: 'singular' | 'plural';
}

function cellHeader(spec: CellSpec): string {
  const parts: string[] = [spec.mood];
  if (spec.tense) parts.push(spec.tense);
  if (spec.person && spec.number) {
    parts.push(`${spec.person}${spec.number === 'singular' ? 'sg' : 'pl'}`);
  }
  return parts.join(' ');
}

function formatBlock(
  result: ConjugationResult,
  spec: CellSpec,
  translationEn: string,
): string {
  const segments = result.decomposition;
  const surfaceCells = segments.map((s) => s.surface);
  const glossCells = segments.map(glossSegment);
  const lines = padCols([surfaceCells, glossCells]);
  const header = `# ${cellHeader(spec)}`;
  const free = `"${translationEn}"`;
  return [header, ...lines, free].join('\n');
}

export function formatIgt(verbId: string, options: CellSpec & {
  voice?: 'active' | 'middle-passive';
  polarity?: 'affirmative' | 'negative';
  modality?: 'declarative' | 'interrogative';
}): string {
  const result = conjugate(verbId, {
    mood: options.mood,
    voice: options.voice ?? 'active',
    polarity: options.polarity ?? 'affirmative',
    modality: options.modality ?? 'declarative',
    ...(options.tense ? { tense: options.tense } : {}),
    ...(options.person ? { person: options.person } : {}),
    ...(options.number ? { number: options.number } : {}),
  });
  // We need translation — fetch corpus entry
  const entry = lookupVerb(verbId);
  return formatBlock(result, options, entry?.translationEn ?? verbId);
}

function lookupVerb(verbId: string): VerbEntry | undefined {
  return listVerbs().find((v) => v.id === verbId);
}

interface FullTableSpec {
  spec: CellSpec;
  result: ConjugationResult;
}

function enumerateTable(t: VerbTable): FullTableSpec[] {
  const out: FullTableSpec[] = [];
  const finiteMoods = ['indicative', 'subjunctive', 'conditional', 'admirative', 'optative'] as const;
  for (const mood of finiteMoods) {
    const moodTable = t[mood] as Record<string, Record<string, ConjugationResult | undefined>>;
    for (const tense of Object.keys(moodTable)) {
      const tenseCells = moodTable[tense]!;
      for (const key of Object.keys(tenseCells)) {
        const result = tenseCells[key];
        if (!result) continue;
        const [cellLabel, voice] = key.split('.');
        if (voice !== 'active') continue; // active only for v0.1.x
        const [pStr, nStr] = [cellLabel!.charAt(0), cellLabel!.slice(1)];
        out.push({
          spec: {
            mood,
            tense: tense as Tense,
            person: Number(pStr) as 1 | 2 | 3,
            number: nStr === 'sg' ? 'singular' : 'plural',
          },
          result,
        });
      }
    }
  }
  // Imperative
  const impCells = (t.imperative.present as Record<string, ConjugationResult | undefined>) ?? {};
  for (const key of Object.keys(impCells)) {
    const result = impCells[key];
    if (!result) continue;
    const [cellLabel, voice] = key.split('.');
    if (voice !== 'active') continue;
    const [pStr, nStr] = [cellLabel!.charAt(0), cellLabel!.slice(1)];
    out.push({
      spec: {
        mood: 'imperative',
        tense: 'present',
        person: Number(pStr) as 1 | 2 | 3,
        number: nStr === 'sg' ? 'singular' : 'plural',
      },
      result,
    });
  }
  return out;
}

export function formatIgtTable(verbId: string): string {
  const t = table(verbId);
  const entry = lookupVerb(verbId);
  if (!entry) return `# unknown verb ${verbId}`;

  const header = [
    `# foljapp IGT export`,
    `# verb: ${entry.lemma}`,
    `# translation: ${entry.translationEn}`,
    `# class: ${entry.class}`,
    `# auxiliary: ${entry.auxiliary}`,
    `# engine: ${VERSION}`,
    `# corpus: ${t.corpusVersion}`,
    '',
  ];

  const blocks = enumerateTable(t).map(({ spec, result }) =>
    formatBlock(result, spec, entry.translationEn),
  );

  return [...header, ...blocks].join('\n\n');
}

const MOOD_FEAT: Record<string, string> = {
  indicative: 'Mood=Ind',
  subjunctive: 'Mood=Sub',
  conditional: 'Mood=Cnd',
  admirative: 'Mood=Adm',
  optative: 'Mood=Opt',
  imperative: 'Mood=Imp',
};

const TENSE_FEAT: Record<string, string> = {
  present: 'Tense=Pres',
  imperfect: 'Tense=Imp',
  aorist: 'Tense=Past|Aspect=Perf',
  perfect: 'Tense=Pres|Aspect=Perf',
  pluperfect: 'Tense=Past|Aspect=Perf',
  'past-anterior': 'Tense=Pqp|Aspect=Perf',
  future: 'Tense=Fut',
  'future-perfect': 'Tense=Fut|Aspect=Perf',
  'future-in-past': 'Tense=Fut|Aspect=Imp',
  'future-perfect-in-past': 'Tense=Fut|Aspect=Perf',
};

function featsFor(spec: CellSpec): string {
  const feats: string[] = ['VerbForm=Fin'];
  feats.push(MOOD_FEAT[spec.mood] ?? `Mood=${spec.mood}`);
  if (spec.tense) feats.push(TENSE_FEAT[spec.tense] ?? `Tense=${spec.tense}`);
  if (spec.person) feats.push(`Person=${spec.person}`);
  if (spec.number) feats.push(`Number=${spec.number === 'singular' ? 'Sing' : 'Plur'}`);
  feats.push('Voice=Act');
  feats.push('Polarity=Pos');
  return feats.join('|');
}

export function formatConllu(verbId: string): string {
  const t = table(verbId);
  const entry = lookupVerb(verbId);
  if (!entry) return `# unknown verb ${verbId}\n`;

  const lines: string[] = [
    `# sent_id = ${entry.id}`,
    `# text = ${entry.lemma}`,
    `# foljapp_translation = ${entry.translationEn}`,
    `# foljapp_class = ${entry.class}`,
    `# foljapp_auxiliary = ${entry.auxiliary}`,
    `# foljapp_engine = ${VERSION}`,
    `# foljapp_corpus = ${t.corpusVersion}`,
  ];

  const enumerated = enumerateTable(t);
  enumerated.forEach(({ spec, result }, i) => {
    const id = i + 1;
    const form = result.form;
    const lemma = entry.lemma;
    const upos = 'VERB';
    const xpos = '_';
    const feats = featsFor(spec);
    const head = '_';
    const deprel = '_';
    const deps = '_';
    const cellLabelText = spec.person && spec.number
      ? `${spec.mood}-${spec.tense ?? 'present'}-${spec.person}${spec.number === 'singular' ? 'sg' : 'pl'}`
      : `${spec.mood}-${spec.tense ?? 'present'}`;
    const misc = `Cell=${cellLabelText}`;
    lines.push([id, form, lemma, upos, xpos, feats, head, deprel, deps, misc].join('\t'));
  });

  lines.push(''); // CoNLL-U sentences end with a blank line
  return lines.join('\n');
}
