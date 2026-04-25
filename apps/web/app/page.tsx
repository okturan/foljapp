import Link from 'next/link';

import { SearchInput } from '@/components/search-input';
import { corpusIndex } from '@/lib/corpus-index';

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-mono text-5xl font-bold tracking-tight">foljapp</h1>
      <p className="mt-2 text-lg text-stone-600">
        Albanian verbal system reference
      </p>

      <div className="mt-10">
        <SearchInput />
      </div>

      <p className="mt-6 text-sm text-stone-500">
        →{' '}
        <Link href="/browse" className="underline underline-offset-2 hover:text-stone-700">
          Browse all {corpusIndex.length} verbs
        </Link>
      </p>
      <p className="mt-2 text-sm text-stone-500">
        →{' '}
        <Link href="/articles" className="underline underline-offset-2 hover:text-stone-700">
          Read articles on Albanian morphology
        </Link>
      </p>
    </main>
  );
}
