import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Playground } from '@/components/playground';

export const metadata: Metadata = {
  title: 'Playground — foljapp',
  description:
    'Pick any Albanian verb and any combination of mood, tense, voice, polarity, person, number — see the conjugated form live.',
};

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        // Same shell as the resolved page: a narrower fallback would lay the
        // controls out at a different width and re-wrap them on hydration.
        <main className="mx-auto max-w-6xl px-6 py-6 lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:items-start lg:gap-12 lg:py-10">
          <div aria-hidden="true" className="min-w-0 lg:order-2" />
          <div className="min-w-0 lg:order-1">
            <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
            <p className="mt-2 text-stone-400">loading…</p>
          </div>
        </main>
      }
    >
      <Playground />
    </Suspense>
  );
}
