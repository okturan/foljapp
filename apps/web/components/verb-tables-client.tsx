'use client';

import dynamic from 'next/dynamic';

const VerbTablesInner = dynamic(
  () => import('@/components/verb-tables-inner').then((m) => m.VerbTablesInner),
  {
    ssr: false,
    loading: () => (
      <section className="mt-12 border-t border-stone-200 pt-8 text-sm text-stone-500">
        Loading conjugation tables...
      </section>
    ),
  },
);

interface Props {
  lemma: string;
}

export function VerbTablesClient({ lemma }: Props) {
  return <VerbTablesInner lemma={lemma} />;
}
