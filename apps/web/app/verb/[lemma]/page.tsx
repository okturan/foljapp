import { table, VERSION } from '@foljapp/engine';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CitationsFooter } from '@/components/citations-footer';
import { ConjugationTable } from '@/components/conjugation-table';
import { NonFiniteForms } from '@/components/non-finite-forms';
import { ReservedActions } from '@/components/reserved-actions';
import { VerbHeader } from '@/components/verb-header';
import { allLemmas, corpusVersion, findEntryByLemma } from '@/lib/corpus';

interface RouteParams {
  lemma: string;
}

export function generateStaticParams(): RouteParams[] {
  return allLemmas().map((lemma) => ({ lemma }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { lemma: rawLemma } = await params;
  const lemma = decodeURIComponent(rawLemma);
  const entry = findEntryByLemma(lemma);

  if (!entry) {
    return {
      title: `${lemma} — not found — foljapp`,
    };
  }

  const description = `${entry.lemma} — ${entry.translationEn}. Zgjedhimi ${entry.class}, auxiliary ${entry.auxiliary}. Full conjugation table.`;
  const title = `${entry.lemma} — ${entry.translationEn} — foljapp`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description, card: 'summary' },
  };
}

const INDICATIVE_TENSES = [
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

const SUBJUNCTIVE_TENSES = ['present', 'imperfect', 'perfect', 'pluperfect'];
const CONDITIONAL_TENSES = ['present', 'perfect'];
const ADMIRATIVE_TENSES = ['present', 'imperfect', 'perfect', 'pluperfect'];
const OPTATIVE_TENSES = ['present', 'perfect'];

export default async function VerbPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { lemma: rawLemma } = await params;
  const lemma = decodeURIComponent(rawLemma);
  const entry = findEntryByLemma(lemma);

  if (!entry) {
    notFound();
  }

  const t = table(entry.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-stone-700">
              foljapp
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>verb</li>
          <li aria-hidden="true">›</li>
          <li className="font-mono text-stone-700">{entry.lemma}</li>
        </ol>
      </nav>

      <VerbHeader entry={entry} />
      <ReservedActions />

      <ConjugationTable
        title="Indicative (Dëftore)"
        tenses={t.indicative as never}
        order={INDICATIVE_TENSES}
      />
      <ConjugationTable
        title="Subjunctive (Lidhore)"
        tenses={t.subjunctive as never}
        order={SUBJUNCTIVE_TENSES}
      />
      <ConjugationTable
        title="Conditional (Kushtore)"
        tenses={t.conditional as never}
        order={CONDITIONAL_TENSES}
      />
      <ConjugationTable
        title="Admirative (Habitore)"
        tenses={t.admirative as never}
        order={ADMIRATIVE_TENSES}
      />
      <ConjugationTable
        title="Optative (Dëshirore)"
        tenses={t.optative as never}
        order={OPTATIVE_TENSES}
      />
      <ConjugationTable
        title="Imperative (Urdhërore)"
        tenses={t.imperative as never}
        order={['present']}
        imperativeOnly
      />

      <NonFiniteForms forms={t.nonFinite as never} />

      <CitationsFooter
        sources={entry.sources}
        engineVersion={VERSION}
        corpusVersion={corpusVersion.version}
        notes={entry.notes}
      />
    </main>
  );
}
