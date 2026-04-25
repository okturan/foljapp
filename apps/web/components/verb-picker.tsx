'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { corpusIndex, type CorpusIndexEntry } from '@/lib/corpus-index';

const MAX_SUGGESTIONS = 8;

interface Props {
  value: string;
  onSelect: (lemma: string) => void;
  placeholder?: string;
}

export function VerbPicker({ value, onSelect, placeholder = 'pick a verb…' }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const suggestions = useMemo(() => {
    if (!query) return corpusIndex.slice(0, MAX_SUGGESTIONS);
    const q = query.toLowerCase();
    return corpusIndex
      .filter(
        (e: CorpusIndexEntry) =>
          e.lemma.toLowerCase().includes(q) ||
          e.translationEn.toLowerCase().includes(q),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
        placeholder={placeholder}
        aria-label="Pick a verb"
        autoComplete="off"
        className="w-full rounded-md border border-stone-200 bg-white px-4 py-2 font-mono text-base shadow-sm focus:border-stone-400 focus:outline-none"
      />
      {open && suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-auto rounded-md border border-stone-200 bg-white shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={s.id} role="option" aria-selected={s.lemma === value}>
              <button
                type="button"
                className="flex w-full items-baseline gap-3 px-4 py-2 text-left text-sm hover:bg-stone-50"
                onClick={() => {
                  onSelect(s.lemma);
                  setQuery(s.lemma);
                  setOpen(false);
                }}
              >
                <span className="font-mono font-medium text-stone-900">{s.lemma}</span>
                <span className="text-stone-500">{s.translationEn}</span>
                <span className="ml-auto text-xs text-stone-400">
                  Zg {s.class} · {s.auxiliary}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
