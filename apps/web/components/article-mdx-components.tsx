/**
 * MDX components callable inline from grammar articles.
 */

import {
  conjugate,
  type ConjugateOptions,
  type Mood,
  type Tense,
} from '@foljapp/engine';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { DecomposedForm } from '@/components/decomposed-form';
import { findEntryByLemma } from '@/lib/corpus';
import { verbHref } from '@/lib/verb-route';

import '@/lib/corpus'; // ensures the engine is configured at import time

interface ExampleProps {
  verbId: string;
  mood: Mood;
  tense?: Tense;
  person?: 1 | 2 | 3;
  number?: 'singular' | 'plural';
  voice?: 'active' | 'middle-passive';
}

function buildExampleResult({
  verbId,
  mood,
  tense,
  person,
  number,
  voice,
}: ExampleProps) {
  const opts: ConjugateOptions = {
    mood,
    voice: voice ?? 'active',
    polarity: 'affirmative',
    modality: 'declarative',
  };
  if (tense) opts.tense = tense;
  if (person) opts.person = person;
  if (number) opts.number = number;
  return conjugate(verbId, opts);
}

export function Example(props: ExampleProps) {
  const result = buildExampleResult(props);
  return (
    <span className="article-example-token">
      <DecomposedForm segments={result.decomposition} />
    </span>
  );
}

export function ExampleBlock(props: ExampleProps) {
  const result = buildExampleResult(props);
  return (
    <div className="article-example-block">
      <DecomposedForm segments={result.decomposition} />
    </div>
  );
}

export function VerbLink({ lemma }: { lemma: string }) {
  const entry = findEntryByLemma(lemma);
  return (
    <Link
      href={entry ? verbHref(entry) : `/verb/${encodeURIComponent(lemma)}`}
      className="font-mono text-stone-900 underline-offset-2 hover:underline"
    >
      {lemma}
      {entry ? <span className="text-stone-500"> ({entry.translationEn})</span> : null}
    </Link>
  );
}

const MOOD_NAMES: Record<string, { en: string; sq: string }> = {
  indicative: { en: 'Indicative', sq: 'Dëftore' },
  subjunctive: { en: 'Subjunctive', sq: 'Lidhore' },
  conditional: { en: 'Conditional', sq: 'Kushtore' },
  admirative: { en: 'Admirative', sq: 'Habitore' },
  optative: { en: 'Optative', sq: 'Dëshirore' },
  imperative: { en: 'Imperative', sq: 'Urdhërore' },
};

export function MoodBadge({ name }: { name: string }) {
  const m = MOOD_NAMES[name];
  if (!m) return <span className="font-mono text-stone-700">{name}</span>;
  return (
    <span className="rounded-full border border-stone-200 px-2 py-0.5 text-xs">
      <span className="font-medium text-stone-900">{m.en}</span>
      <span className="text-stone-400"> · </span>
      <span className="italic text-stone-600">{m.sq}</span>
    </span>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <aside className="article-source-note">{children}</aside>;
}

export const articleMdxComponents = {
  Example,
  ExampleBlock,
  VerbLink,
  MoodBadge,
  SourceNote,
};
