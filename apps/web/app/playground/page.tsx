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
        <main className="mx-auto max-w-3xl px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
          <p className="mt-2 text-stone-400">loading…</p>
        </main>
      }
    >
      <Playground />
    </Suspense>
  );
}
