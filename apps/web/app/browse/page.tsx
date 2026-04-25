import type { Metadata } from 'next';

import { BrowseTable } from '@/components/browse-table';
import { corpusIndex } from '@/lib/corpus-index';

export const metadata: Metadata = {
  title: 'Browse — foljapp',
  description: `Browse all ${corpusIndex.length} Albanian verbs in the foljapp corpus, filterable by conjugation class and auxiliary.`,
};

export default function BrowsePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Browse</h1>
      <p className="mt-2 text-stone-600">
        All {corpusIndex.length} verbs in the corpus. Click a column to sort,
        use the filters to narrow.
      </p>
      <div className="mt-8">
        <BrowseTable entries={corpusIndex} />
      </div>
    </main>
  );
}
