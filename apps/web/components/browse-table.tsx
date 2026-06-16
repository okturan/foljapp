'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { CorpusIndexEntry } from '@/lib/corpus-index';
import {
  getFrequency,
  tierRank,
  type FrequencyTier,
} from '@/lib/frequency';
import { cn } from '@/lib/utils';
import { verbHref } from '@/lib/verb-route';

interface Props {
  entries: CorpusIndexEntry[];
}

type ClassFilter = 'all' | 1 | 2 | 3;
type AuxFilter = 'all' | 'kam' | 'jam';
type SortKey = 'lemma' | 'translationEn' | 'class' | 'auxiliary' | 'frequency';

export function BrowseTable({ entries }: Props) {
  const [classFilter, setClassFilter] = useState<ClassFilter>('all');
  const [auxFilter, setAuxFilter] = useState<AuxFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('lemma');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const list = entries.filter((e) => {
      if (classFilter !== 'all' && e.class !== classFilter) return false;
      if (auxFilter !== 'all' && e.auxiliary !== auxFilter) return false;
      return true;
    });
    list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === 'frequency') {
        av = tierRank(
          (getFrequency(a.id)?.tier ?? 'rare') as FrequencyTier,
        );
        bv = tierRank(
          (getFrequency(b.id)?.tier ?? 'rare') as FrequencyTier,
        );
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [entries, classFilter, auxFilter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 pb-4">
        <label className="text-sm text-stone-600">
          Class
          <select
            value={String(classFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setClassFilter(v === 'all' ? 'all' : (Number(v) as 1 | 2 | 3));
            }}
            className="ml-2 rounded-md border border-stone-200 bg-white px-2 py-1 text-sm"
          >
            <option value="all">all</option>
            <option value="1">Zgjedhimi 1</option>
            <option value="2">Zgjedhimi 2</option>
            <option value="3">Zgjedhimi 3</option>
          </select>
        </label>
        <label className="text-sm text-stone-600">
          Auxiliary
          <select
            value={auxFilter}
            onChange={(e) => setAuxFilter(e.target.value as AuxFilter)}
            className="ml-2 rounded-md border border-stone-200 bg-white px-2 py-1 text-sm"
          >
            <option value="all">all</option>
            <option value="kam">kam</option>
            <option value="jam">jam</option>
          </select>
        </label>
        <span className="ml-auto text-xs text-stone-500">
          {filtered.length} of {entries.length} verbs
        </span>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
            {(
              ['lemma', 'translationEn', 'class', 'auxiliary', 'frequency'] as const
            ).map((key) => (
              <th
                key={key}
                scope="col"
                className="cursor-pointer py-2 pr-4 hover:text-stone-700"
                onClick={() => toggleSort(key)}
              >
                {key === 'translationEn' ? 'translation' : key}
                {sortKey === key ? (
                  <span
                    className={cn(
                      'ml-1',
                      sortAsc ? '' : 'rotate-180 inline-block',
                    )}
                  >
                    ↑
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => {
            const f = getFrequency(e.id);
            return (
              <tr
                key={e.id}
                className="border-b border-stone-100 hover:bg-stone-50"
              >
                <td className="py-3 pr-4">
                  <Link
                    href={verbHref(e)}
                    className="font-mono font-medium text-stone-900 underline-offset-2 hover:underline"
                  >
                    {e.lemma}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-stone-600">{e.translationEn}</td>
                <td className="py-3 pr-4 text-stone-700">
                  Zgjedhimi {e.class}
                </td>
                <td className="py-3 pr-4 font-mono text-stone-700">
                  {e.auxiliary}
                </td>
                <td className="py-3 pr-4 text-stone-700">
                  {f ? f.tier : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
