'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function NotFound() {
  const params = useParams<{ lemma: string }>();
  const lemma = params?.lemma ? decodeURIComponent(params.lemma) : '';

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">
        Verb not found
      </h1>
      <p className="mt-4 text-stone-600">
        No corpus entry exists for{' '}
        <span className="font-mono font-medium text-stone-900">
          {lemma || '(unknown)'}
        </span>
        .
      </p>
      <p className="mt-8">
        <Link
          href="/"
          className="text-stone-700 underline underline-offset-2 hover:text-stone-900"
        >
          ← back to foljapp
        </Link>
      </p>
    </main>
  );
}
