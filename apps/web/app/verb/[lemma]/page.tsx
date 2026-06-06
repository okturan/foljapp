import { VERSION } from '@foljapp/engine';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CitationsFooter } from '@/components/citations-footer';
import { ReservedActions } from '@/components/reserved-actions';
import { VerbHeader } from '@/components/verb-header';
import { VerbTablesClient } from '@/components/verb-tables-client';
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

  return (
    <main className="mx-auto max-w-3xl lg:max-w-5xl xl:max-w-6xl px-6 py-10">
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
      <ReservedActions entry={entry} />

      <VerbTablesClient lemma={entry.lemma} />

      <CitationsFooter
        sources={entry.sources}
        engineVersion={VERSION}
        corpusVersion={corpusVersion.version}
        notes={entry.notes}
      />
    </main>
  );
}
