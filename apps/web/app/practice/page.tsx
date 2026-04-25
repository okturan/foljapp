import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Practice — foljapp',
  description:
    'Quiz yourself on Albanian verb conjugation. Random verbs, random cells, instant scoring against the canonical engine.',
};

export default function PracticePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Practice</h1>
      <p className="mt-4 text-lg text-stone-600">
        Quiz yourself on conjugating Albanian verbs. A session asks you 10
        random cells. The engine scores your answer against the canonical form.
      </p>

      <section className="mt-10 rounded-md border border-stone-200 bg-stone-50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          What you&apos;ll see
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          <li>
            ➝ A prompt like:{' '}
            <span className="font-mono">
              Conjugate punoj (to work) in admirative present 1sg
            </span>
          </li>
          <li>➝ A text input — type the form you think is correct</li>
          <li>➝ Instant feedback with the canonical answer if you missed</li>
          <li>➝ A summary at the end with the cells you missed</li>
        </ul>
      </section>

      <section className="mt-8 text-sm text-stone-500">
        <h3 className="font-semibold uppercase tracking-wider">Scope (v1)</h3>
        <p className="mt-2">
          Active voice, affirmative, declarative. All six moods, every supported
          tense across the corpus. Imperative restricted to 2nd person (the only
          person Albanian imperative supports).
        </p>
      </section>

      <div className="mt-12">
        <Button asChild size="lg">
          <Link href="/practice/quiz">Start a session</Link>
        </Button>
      </div>
    </main>
  );
}
