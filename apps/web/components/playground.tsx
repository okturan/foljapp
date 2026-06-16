'use client';

import {
  conjugate,
  table as engineTable,
  trace,
  UnsupportedCellError,
  type ConjugateOptions,
  type Mood,
  type NonFiniteForm,
  type Tense,
  type TraceStep,
} from '@foljapp/engine';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import { PlaygroundResult } from '@/components/playground-result';
import { VerbPicker } from '@/components/verb-picker';
import { findClientEntry } from '@/lib/corpus-client';
import { findIndexBySlug } from '@/lib/corpus-index';
import { englishGloss } from '@/lib/english-gloss';

const MOODS: Mood[] = [
  'indicative',
  'subjunctive',
  'conditional',
  'admirative',
  'optative',
  'imperative',
  'non-finite',
];

const MOOD_TENSES: Record<Exclude<Mood, 'non-finite' | 'imperative'>, Tense[]> = {
  indicative: [
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
  ],
  subjunctive: ['present', 'imperfect', 'perfect', 'pluperfect'],
  conditional: ['present', 'perfect'],
  admirative: ['present', 'imperfect', 'perfect', 'pluperfect'],
  optative: ['present', 'perfect'],
};

const NON_FINITE_FORMS: NonFiniteForm[] = [
  'participle',
  'infinitive',
  'gerund',
  'privative',
  'temporal',
];

const PERSONS = [1, 2, 3] as const;
const NUMBERS = ['singular', 'plural'] as const;

interface Config {
  verb: string;
  mood: Mood;
  tense?: Tense;
  voice: 'active' | 'middle-passive';
  person: 1 | 2 | 3;
  number: 'singular' | 'plural';
  polarity: 'affirmative' | 'negative';
  modality: 'declarative' | 'interrogative';
  form?: NonFiniteForm;
}

const DEFAULTS: Config = {
  verb: 'punoj',
  mood: 'indicative',
  tense: 'present',
  voice: 'active',
  person: 1,
  number: 'singular',
  polarity: 'affirmative',
  modality: 'declarative',
};

function readParams(params: URLSearchParams): Config {
  const mood = (params.get('mood') ?? DEFAULTS.mood) as Mood;
  const config: Config = {
    verb: params.get('verb') ?? DEFAULTS.verb,
    mood,
    voice: (params.get('voice') ?? DEFAULTS.voice) as 'active' | 'middle-passive',
    person: (Number(params.get('person')) || DEFAULTS.person) as 1 | 2 | 3,
    number: (params.get('number') ?? DEFAULTS.number) as 'singular' | 'plural',
    polarity: (params.get('polarity') ?? DEFAULTS.polarity) as 'affirmative' | 'negative',
    modality: (params.get('modality') ?? DEFAULTS.modality) as 'declarative' | 'interrogative',
  };
  const tense = params.get('tense');
  if (tense) config.tense = tense as Tense;
  else if (mood !== 'non-finite' && mood !== 'imperative') config.tense = 'present';
  const form = params.get('form');
  if (form) config.form = form as NonFiniteForm;
  else if (mood === 'non-finite') config.form = 'participle';
  return config;
}

function configToParams(config: Config): URLSearchParams {
  const p = new URLSearchParams();
  p.set('verb', config.verb);
  p.set('mood', config.mood);
  if (config.tense) p.set('tense', config.tense);
  p.set('voice', config.voice);
  p.set('person', String(config.person));
  p.set('number', config.number);
  p.set('polarity', config.polarity);
  p.set('modality', config.modality);
  if (config.form) p.set('form', config.form);
  return p;
}

export function Playground() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const config = useMemo<Config>(() => readParams(searchParams ?? new URLSearchParams()), [searchParams]);

  // Write defaults to URL on first mount so the link is always shareable
  useEffect(() => {
    if (!searchParams || searchParams.toString().length === 0) {
      router.replace(`/playground?${configToParams(DEFAULTS).toString()}`, {
        scroll: false,
      });
    }
  }, [searchParams, router]);

  const update = useCallback(
    (patch: Partial<Config>) => {
      const next = { ...config, ...patch };
      // When mood changes, reset tense / form / person constraints.
      if (patch.mood) {
        if (patch.mood === 'non-finite') {
          next.form = next.form ?? 'participle';
          delete next.tense;
        } else if (patch.mood === 'imperative') {
          next.tense = 'present';
          if (next.person !== 2) next.person = 2;
          delete next.form;
        } else {
          const allowed = MOOD_TENSES[patch.mood];
          if (!next.tense || !allowed.includes(next.tense)) {
            next.tense = allowed[0];
          }
          delete next.form;
        }
      }
      router.replace(`/playground?${configToParams(next).toString()}`, { scroll: false });
    },
    [config, router],
  );

  const tenseOptions =
    config.mood === 'non-finite' || config.mood === 'imperative'
      ? null
      : MOOD_TENSES[config.mood];

  const opts: ConjugateOptions = {
    mood: config.mood,
    voice: config.voice,
    polarity: config.polarity,
    modality: config.modality,
  };
  if (config.tense) opts.tense = config.tense;
  if (config.mood !== 'non-finite') {
    opts.person = config.person;
    opts.number = config.number;
  }
  if (config.form) opts.form = config.form;

  // The engine indexes entries by `id`, while the picker and query string may
  // carry either the display lemma or the id slug. Resolve before calling it.
  const indexEntry = findIndexBySlug(config.verb);
  const clientEntry = findClientEntry(config.verb);
  const verbId = clientEntry?.id ?? config.verb;

  // Per-verb feasibility map derived from engine.table(verbId). Used to
  // grey out controls whose selection would yield UnsupportedCellError.
  // See grey-unsupported-controls/design.md D1.
  const feasibility = useMemo(() => {
    type FiniteMood = Exclude<Mood, 'non-finite'>;
    const moods = new Set<Mood>();
    const byMood = new Map<
      FiniteMood,
      { tenses: Set<Tense>; cells: Set<string> }
    >();
    const nonFinite = new Set<NonFiniteForm>();
    try {
      const t = engineTable(verbId);
      for (const mood of [
        'indicative',
        'subjunctive',
        'conditional',
        'admirative',
        'optative',
        'imperative',
      ] as const) {
        const moodTable = t[mood] as Record<string, Record<string, unknown>>;
        if (!moodTable) continue;
        const tenses = new Set<Tense>();
        const cells = new Set<string>();
        for (const [tense, tenseCells] of Object.entries(moodTable)) {
          if (!tenseCells || Object.keys(tenseCells).length === 0) continue;
          tenses.add(tense as Tense);
          for (const cellKey of Object.keys(tenseCells)) {
            cells.add(`${tense}.${cellKey}`);
          }
        }
        if (tenses.size > 0) {
          moods.add(mood);
          byMood.set(mood, { tenses, cells });
        }
      }
      for (const form of [
        'participle',
        'infinitive',
        'gerund',
        'privative',
        'temporal',
      ] as const) {
        if (t.nonFinite[form]) nonFinite.add(form);
      }
      if (nonFinite.size > 0) moods.add('non-finite');
    } catch {
      // Unknown verb (mid-edit) — leave feasibility empty.
    }
    return { moods, byMood, nonFinite };
  }, [verbId]);

  function cellExists(
    mood: Exclude<Mood, 'non-finite'>,
    tense: Tense,
    voice: 'active' | 'middle-passive',
    person: 1 | 2 | 3,
    number: 'singular' | 'plural',
  ): boolean {
    const m = feasibility.byMood.get(mood);
    if (!m) return false;
    const label = `${person}${number === 'singular' ? 'sg' : 'pl'}`;
    return m.cells.has(`${tense}.${label}.${voice}`);
  }

  function voiceHasAny(
    mood: Exclude<Mood, 'non-finite'>,
    tense: Tense,
    voice: 'active' | 'middle-passive',
  ): boolean {
    const m = feasibility.byMood.get(mood);
    if (!m) return false;
    for (const cell of m.cells) {
      if (cell.startsWith(`${tense}.`) && cell.endsWith(`.${voice}`)) {
        return true;
      }
    }
    return false;
  }

  let result: ReturnType<typeof conjugate> | null = null;
  let traceSteps: TraceStep[] = [];
  let unsupported = false;
  let errorMsg: string | null = null;
  try {
    result = conjugate(verbId, opts);
    try {
      traceSteps = trace(verbId, opts);
    } catch {
      traceSteps = [];
    }
  } catch (err) {
    if (err instanceof UnsupportedCellError) {
      unsupported = true;
    } else {
      errorMsg = (err as Error).message;
    }
  }
  const gloss =
    clientEntry && result && !unsupported
      ? englishGloss(clientEntry, opts)
      : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-6 lg:py-10 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-12 lg:items-start">
      <aside
        aria-label="Conjugated form"
        className="
          sticky top-0 z-10 -mx-6 mb-6 px-6 py-4
          bg-stone-50/95 backdrop-blur border-b border-stone-200

          lg:order-2 lg:top-8 lg:self-start lg:z-0
          lg:mx-0 lg:mb-0 lg:px-6 lg:py-6
          lg:bg-white lg:border lg:border-stone-200 lg:rounded-lg lg:backdrop-blur-none
        "
      >
        <PlaygroundResult
          result={result}
          traceSteps={traceSteps}
          unsupported={unsupported}
          errorMsg={errorMsg}
          verbSlug={clientEntry?.id ?? config.verb}
          gloss={gloss}
        />
      </aside>

      <div className="lg:order-1">
        <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
        <p className="mt-2 text-stone-600">
          Pick a verb and any combination of grammatical parameters. The engine
          recomputes live.
        </p>

        <div className="mt-8">
          <label className="text-sm text-stone-500">Verb</label>
          <div className="mt-1">
            <VerbPicker value={config.verb} onSelect={(lemma) => update({ verb: lemma })} />
          </div>
          {indexEntry ? (
            <p className="mt-2 text-xs text-stone-400">
              {indexEntry.translationEn} · Zgjedhimi {indexEntry.class} · auxiliary {indexEntry.auxiliary}
            </p>
          ) : null}
        </div>

        <RadioGroup
          label="Mood"
          name="mood"
          options={MOODS.map((m) => ({
            value: m,
            label: m,
            disabled: !feasibility.moods.has(m),
          }))}
          value={config.mood}
          onChange={(v) => update({ mood: v as Mood })}
        />

        {tenseOptions ? (
          <RadioGroup
            label="Tense"
            name="tense"
            options={tenseOptions.map((t) => ({
              value: t,
              label: t.replace(/-/g, ' '),
              disabled:
                config.mood !== 'non-finite' &&
                !feasibility.byMood.get(config.mood)?.tenses.has(t),
            }))}
            value={config.tense ?? tenseOptions[0]!}
            onChange={(v) => update({ tense: v as Tense })}
          />
        ) : null}

        {config.mood === 'non-finite' ? (
          <RadioGroup
            label="Form"
            name="form"
            options={NON_FINITE_FORMS.map((f) => ({
              value: f,
              label: f,
              disabled: !feasibility.nonFinite.has(f),
            }))}
            value={config.form ?? 'participle'}
            onChange={(v) => update({ form: v as NonFiniteForm })}
          />
        ) : null}

        {config.mood !== 'non-finite' ? (
          <div
            data-testid="compact-group-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6"
          >
            <RadioGroup
              label="Voice"
              name="voice"
              options={(['active', 'middle-passive'] as const).map((v) => ({
                value: v,
                label: v,
                disabled: !voiceHasAny(
                  config.mood as Exclude<Mood, 'non-finite'>,
                  (config.tense ?? 'present') as Tense,
                  v,
                ),
              }))}
              value={config.voice}
              onChange={(v) => update({ voice: v as 'active' | 'middle-passive' })}
            />
            <RadioGroup
              label="Polarity"
              name="polarity"
              options={[
                { value: 'affirmative', label: 'affirmative' },
                { value: 'negative', label: 'negative' },
              ]}
              value={config.polarity}
              onChange={(v) =>
                update({ polarity: v as 'affirmative' | 'negative' })
              }
            />
            <RadioGroup
              label="Modality"
              name="modality"
              options={[
                { value: 'declarative', label: 'declarative' },
                { value: 'interrogative', label: 'interrogative' },
              ]}
              value={config.modality}
              onChange={(v) =>
                update({ modality: v as 'declarative' | 'interrogative' })
              }
            />
            <RadioGroup
              label="Person"
              name="person"
              options={PERSONS.map((p) => ({
                value: String(p),
                label: String(p),
                disabled: !cellExists(
                  config.mood as Exclude<Mood, 'non-finite'>,
                  (config.tense ?? 'present') as Tense,
                  config.voice,
                  p,
                  config.number,
                ),
              }))}
              value={String(config.person)}
              onChange={(v) => update({ person: Number(v) as 1 | 2 | 3 })}
            />
            <RadioGroup
              label="Number"
              name="number"
              options={NUMBERS.map((n) => ({
                value: n,
                label: n === 'singular' ? 'sg' : 'pl',
                disabled: !cellExists(
                  config.mood as Exclude<Mood, 'non-finite'>,
                  (config.tense ?? 'present') as Tense,
                  config.voice,
                  config.person,
                  n,
                ),
              }))}
              value={config.number}
              onChange={(v) => update({ number: v as 'singular' | 'plural' })}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

interface RadioGroupProps {
  label: string;
  name: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value: string;
  onChange: (value: string) => void;
}

function RadioGroup({ label, name, options, value, onChange }: RadioGroupProps) {
  // Density rule per design D1 of improve-playground-option-grid:
  //   ≤3 options → flex single-row natural-width pills
  //   ≥4 options → CSS Grid 2 cols / 3 cols at lg, equal-width cells
  const isGrid = options.length >= 4;
  const containerClass = isGrid
    ? 'mt-2 grid grid-cols-2 lg:grid-cols-3 gap-2'
    : 'mt-2 flex flex-wrap gap-2';
  return (
    <fieldset className="mt-6">
      <legend className="text-sm text-stone-500">{label}</legend>
      <div className={containerClass} data-testid={`option-group-${name}`}>
        {options.map((opt) => {
          const checked = opt.value === value;
          const disabled = opt.disabled === true;
          let stateClasses: string;
          if (disabled) {
            stateClasses =
              'cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300';
          } else if (checked) {
            stateClasses =
              'cursor-pointer border-stone-900 bg-stone-900 text-stone-50 focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-stone-900';
          } else {
            stateClasses =
              'cursor-pointer border-stone-200 bg-white text-stone-700 hover:bg-stone-50 focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-stone-900';
          }
          return (
            <label
              key={opt.value}
              title={
                disabled ? 'not a standard form for this verb' : undefined
              }
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                isGrid ? 'text-center' : ''
              } ${stateClasses}`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
