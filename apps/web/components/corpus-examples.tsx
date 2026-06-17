'use client';

import type { ConjugateOptions } from '@foljapp/engine';
import { normalizeSearchKey } from '@foljapp/engine';
import { useEffect, useMemo, useState } from 'react';

interface Props {
  form: string | null;
  options: ConjugateOptions;
}

interface ApiExample {
  id: string;
  sourceType: 'local' | 'parallel';
  resourceId: string;
  corpus: string;
  title: string | null;
  url: string | null;
  domain: string | null;
  genre: string | null;
  quality: string | null;
  sentence: string;
  translation: string | null;
  matchKind: string;
  score: number;
  flags: string[];
  cellLabel: string | null;
  ancQuery: string | null;
}

interface ApiResponse {
  lookupForm: string | null;
  target: {
    signature: string;
    ancQuery: string;
    ancTags: string[];
    cellLabel: string;
  } | null;
  local: {
    available: boolean;
    path: string;
    bytes: number;
    error: string | null;
  };
  examples: ApiExample[];
}

type SourceFilter = 'all' | 'local' | 'translated';

function examplesUrl(form: string, options: ConjugateOptions): string {
  const params = new URLSearchParams();
  params.set('surface', form);
  params.set('mood', options.mood);
  if (options.tense) params.set('tense', options.tense);
  if (options.voice) params.set('voice', options.voice);
  if (options.person) params.set('person', String(options.person));
  if (options.number) params.set('number', options.number);
  if (options.polarity) params.set('polarity', options.polarity);
  if (options.modality) params.set('modality', options.modality);
  if (options.form) params.set('nonFiniteForm', options.form);
  params.set('limit', '8');
  return `/api/examples?${params.toString()}`;
}

function highlightMatch(sentence: string, lookupForm: string | null) {
  if (!lookupForm) return sentence;
  const needle = lookupForm.toLocaleLowerCase('sq-AL');
  const haystack = sentence.toLocaleLowerCase('sq-AL');
  const index = haystack.indexOf(needle);
  if (index === -1) return sentence;
  const end = index + lookupForm.length;
  return (
    <>
      {sentence.slice(0, index)}
      <mark className="rounded-sm bg-amber-100 px-0.5 text-stone-950">
        {sentence.slice(index, end)}
      </mark>
      {sentence.slice(end)}
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function CorpusExamples({ form, options }: Props) {
  const lookupForm = useMemo(
    () => (form ? normalizeSearchKey(form) : null),
    [form],
  );
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  useEffect(() => {
    if (!form || !lookupForm) {
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(examplesUrl(form, options), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`examples API returned ${response.status}`);
        }
        return (await response.json()) as ApiResponse;
      })
      .then((payload) => {
        setData(payload);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [form, lookupForm, options]);

  if (!lookupForm) return null;

  const examples = data?.examples ?? [];
  const visibleExamples = examples.filter((example) => {
    if (sourceFilter === 'local') return example.sourceType === 'local';
    if (sourceFilter === 'translated') {
      return example.sourceType === 'parallel';
    }
    return true;
  });
  const localCount = examples.filter((e) => e.sourceType === 'local').length;
  const translatedCount = examples.filter(
    (e) => e.sourceType === 'parallel',
  ).length;

  return (
    <section
      data-testid="opus-examples"
      className="mt-6 border-t border-stone-200 pt-5"
    >
      <details className="group" open>
        <summary
          data-testid="examples-summary"
          className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs tracking-wider text-stone-400 uppercase select-none marker:hidden"
        >
          <span>Examples</span>
          <span
            aria-hidden="true"
            className="text-base leading-none text-stone-400 transition-transform group-open:rotate-180"
          >
            ↓
          </span>
        </summary>

        <div className="mt-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-xs text-stone-500">
              Indexed form:{' '}
              <span className="font-mono text-stone-700">
                {data?.lookupForm ?? lookupForm}
              </span>
            </p>
            {data?.target ? (
              <p className="text-xs text-stone-500">
                Tags:{' '}
                <span className="font-mono text-stone-700">
                  {data.target.ancQuery}
                </span>
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(['all', 'local', 'translated'] as const).map((filter) => {
              const active = sourceFilter === filter;
              const count =
                filter === 'all'
                  ? examples.length
                  : filter === 'local'
                    ? localCount
                    : translatedCount;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSourceFilter(filter)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {filter === 'all'
                    ? 'All'
                    : filter === 'local'
                      ? 'Local'
                      : 'Translated'}{' '}
                  <span
                    className={active ? 'text-stone-300' : 'text-stone-400'}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            {data?.local.available ? (
              <span className="text-xs text-stone-400">
                local DB {formatBytes(data.local.bytes)}
              </span>
            ) : (
              <span className="text-xs text-stone-400">local DB not built</span>
            )}
          </div>

          {loading ? (
            <p className="mt-3 text-sm text-stone-500">Loading examples…</p>
          ) : error ? (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          ) : data?.local.error ? (
            <p className="mt-3 text-sm text-red-600">{data.local.error}</p>
          ) : visibleExamples.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-stone-200 text-[0.68rem] tracking-wide text-stone-400 uppercase">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      Source
                    </th>
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      Albanian
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      Context
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {visibleExamples.map((example) => (
                    <tr key={example.id}>
                      <td className="py-3 pr-4 align-top whitespace-nowrap">
                        {example.url ? (
                          <a
                            href={example.url}
                            className="font-medium text-stone-700 underline underline-offset-2 hover:text-stone-950"
                          >
                            {example.corpus}
                          </a>
                        ) : (
                          <span className="font-medium text-stone-700">
                            {example.corpus}
                          </span>
                        )}
                        <div className="mt-0.5 text-[0.68rem] text-stone-400">
                          {example.sourceType === 'local'
                            ? example.matchKind.replace(/_/g, ' ')
                            : 'translated pair'}
                        </div>
                        {example.domain ? (
                          <div className="mt-0.5 max-w-36 truncate text-[0.68rem] text-stone-400">
                            {example.domain}
                          </div>
                        ) : null}
                      </td>
                      <td className="max-w-[18rem] py-3 pr-4 align-top leading-relaxed">
                        {highlightMatch(
                          example.sentence,
                          data?.lookupForm ?? lookupForm,
                        )}
                      </td>
                      <td className="max-w-[18rem] py-3 align-top leading-relaxed text-stone-500">
                        {example.translation ? (
                          example.translation
                        ) : (
                          <div className="space-y-1">
                            {example.title ? (
                              <p className="line-clamp-2">{example.title}</p>
                            ) : null}
                            <p>
                              {example.genre ??
                                example.quality ??
                                'local corpus'}
                            </p>
                            {example.flags.length > 0 ? (
                              <p className="font-mono text-[0.68rem] text-stone-400">
                                {example.flags.join(', ')}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p
              data-testid="opus-empty-state"
              className="mt-3 text-sm text-stone-500"
            >
              No sentence examples indexed for{' '}
              <span className="font-mono text-stone-700">
                {data?.lookupForm ?? lookupForm}
              </span>{' '}
              yet.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
