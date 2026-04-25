import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Quiz } from '@/components/quiz';

export const metadata: Metadata = {
  title: 'Quiz — foljapp',
  description: 'Conjugation practice session.',
};

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-6 py-12">
          <p className="text-stone-400">loading…</p>
        </main>
      }
    >
      <Quiz />
    </Suspense>
  );
}
