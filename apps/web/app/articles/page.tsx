import type { Metadata } from 'next';
import Link from 'next/link';

import { getArticles } from '@/lib/articles';

const CATEGORY_LABELS: Record<string, string> = {
  mood: 'Mood',
  tense: 'Tense',
  classes: 'Verb classes',
  phonology: 'Phonology',
  meta: 'Meta',
};

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export const metadata: Metadata = {
  title: 'Articles — foljapp',
  description:
    'Long-form articles on Albanian verb morphology — moods, tenses, classes, and phonology.',
};

export default function ArticlesIndex() {
  const articles = getArticles();
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
      <p className="mt-2 text-stone-600">
        Long-form pieces that explain Albanian morphology in prose. The
        reference layer answers <em>what is the form?</em> — articles
        answer <em>why does it exist?</em>
      </p>

      <ul className="mt-10 divide-y divide-stone-100 border-y border-stone-200 list-none p-0">
        {articles.map((a) => (
          <li key={a.slug} className="py-5">
            <div className="flex items-baseline justify-between gap-4">
              <Link
                href={`/articles/${a.slug}`}
                className="text-xl font-semibold text-stone-900 underline-offset-2 hover:underline"
              >
                {a.title}
              </Link>
              <span className="text-xs text-stone-400">{formatDate(a.updatedAt)}</span>
            </div>
            <p className="mt-2 text-stone-600">{a.summary}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-stone-400">
              {CATEGORY_LABELS[a.category] ?? a.category}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
