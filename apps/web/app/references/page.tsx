import { VERSION } from '@foljapp/engine';
import type { Metadata } from 'next';

import {
  BIBLIOGRAPHY,
  bibtexForEngine,
  bibtexForSource,
  type Source,
} from '@/lib/bibliography';
import { corpusVersion } from '@/lib/corpus';

export const metadata: Metadata = {
  title: 'References — foljapp',
  description:
    'Authoritative sources foljapp draws on, with BibTeX entries for citation.',
};

function authorPlain(s: Source): string {
  return s.authors.join(', ');
}

function plainEntry(s: Source): string {
  const parts: string[] = [
    `${authorPlain(s)} (${s.year}).`,
    `${s.title}.`,
  ];
  if (s.publisher) parts.push(s.publisher + '.');
  if (s.journal) parts.push(s.journal + '.');
  if (s.booktitle) parts.push(s.booktitle + '.');
  if (s.url) parts.push(s.url);
  return parts.join(' ');
}

export default function ReferencesPage() {
  const engineCite = bibtexForEngine(VERSION, corpusVersion.version);
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">References</h1>
      <p className="mt-2 text-stone-600">
        Authoritative sources foljapp draws on. Every paradigm rule, every
        suppletive form, every cellOverride traces back to one of these. Each
        entry includes a BibTeX block you can copy directly.
      </p>

      <ul className="mt-10 space-y-8 list-none p-0">
        {BIBLIOGRAPHY.map((s) => (
          <li key={s.id} className="border-b border-stone-100 pb-6">
            <p className="text-stone-800">{plainEntry(s)}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs uppercase tracking-wider text-stone-500">
                BibTeX
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-stone-50 p-4 text-xs text-stone-800">
                {bibtexForSource(s)}
              </pre>
            </details>
          </li>
        ))}
      </ul>

      <section className="mt-16 border-t border-stone-200 pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Cite foljapp</h2>
        <p className="mt-2 text-stone-600">
          If you use foljapp in academic work, please cite the engine and
          corpus version you used. The current version is{' '}
          <span className="font-mono">
            engine-{VERSION} corpus-{corpusVersion.version}
          </span>
          .
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-stone-50 p-4 text-xs text-stone-800">
          {engineCite}
        </pre>
      </section>
    </main>
  );
}
