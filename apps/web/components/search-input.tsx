'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { corpusIndex, type CorpusIndexEntry } from '@/lib/corpus-index';

const MAX_SUGGESTIONS = 8;

function matches(entry: CorpusIndexEntry, query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  return (
    entry.lemma.toLowerCase().includes(q) ||
    entry.translationEn.toLowerCase().includes(q)
  );
}

export function SearchInput() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!query) return [] as CorpusIndexEntry[];
    return corpusIndex
      .filter((e) => matches(e, query))
      .slice(0, MAX_SUGGESTIONS);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('click', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="search a verb…"
        aria-label="Search verbs by lemma or English translation"
        autoComplete="off"
        className="w-full rounded-md border border-stone-200 bg-white px-4 py-3 text-base shadow-sm focus:border-stone-400 focus:outline-none"
      />
      {open && suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-2 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={s.id} role="option" aria-selected={false}>
              <Link
                href={`/verb/${encodeURIComponent(s.lemma)}`}
                className="flex items-baseline gap-3 px-4 py-2 text-sm hover:bg-stone-50"
              >
                <span className="font-mono font-medium text-stone-900">
                  {s.lemma}
                </span>
                <span className="text-stone-500">{s.translationEn}</span>
                <span className="ml-auto text-xs text-stone-400">
                  Zg {s.class} · {s.auxiliary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
