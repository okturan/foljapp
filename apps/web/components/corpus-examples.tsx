'use client';

import type { ConjugateOptions } from '@foljapp/engine';
import { generatedSearchTarget, normalizeSearchKey } from '@foljapp/engine';
import { useEffect, useMemo, useState } from 'react';

import {
  fetchStaticVerbExamples,
  lookupStaticExamples,
  parallelExamplesAsApi,
  type ApiExample,
} from '@/lib/static-examples';

interface Props {
  form: string | null;
  options: ConjugateOptions;
  /** Corpus entry id, used to locate the prebuilt example asset. */
  verbId: string;
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
  /** True when the payload came from the prebuilt static assets. */
  prebuilt?: boolean;
}

const EXAMPLE_LIMIT = 8;

// Every cell is boxed to the same height, so the table's height is a plain
// function of its row count — which is what lets the source filters swap
// rows for spacers without the pane around them changing size.
// A hard box rather than a max: rows must be equal, not merely bounded.
const CELL_BOX = 'h-[4.88rem] overflow-hidden';
// Pure inline content can additionally take the ellipsis affordance.
const CELL_BOX_CLAMPED = `${CELL_BOX} line-clamp-4`;

async function staticFallbackResponse(
  verbId: string,
  form: string,
  options: ConjugateOptions,
  signal: AbortSignal,
): Promise<ApiResponse | null> {
  const file = await fetchStaticVerbExamples(verbId, signal);
  if (!file) return null;

  const target = generatedSearchTarget(form, options);
  const lookupKey = target?.targetKey ?? normalizeSearchKey(form);
  const examples = lookupStaticExamples(
    file,
    lookupKey,
    target?.signature ?? null,
    EXAMPLE_LIMIT,
  );
  const remaining = Math.max(EXAMPLE_LIMIT - examples.length, 0);
  if (remaining > 0) {
    examples.push(...parallelExamplesAsApi(form, remaining));
  }

  return {
    lookupForm: lookupKey || null,
    target: target
      ? {
          signature: target.signature,
          ancQuery: target.ancQuery,
          ancTags: target.ancTags,
          cellLabel: target.cellLabel,
        }
      : null,
    local: { available: false, path: '', bytes: 0, error: null },
    examples,
    prebuilt: true,
  };
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

export function CorpusExamples({ form, options, verbId }: Props) {
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

    async function load(): Promise<void> {
      let payload: ApiResponse | null = null;
      let apiError: Error | null = null;
      try {
        const response = await fetch(examplesUrl(form as string, options), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`examples API returned ${response.status}`);
        }
        payload = (await response.json()) as ApiResponse;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        apiError = err as Error;
      }

      // The deployed site has no examples API, and dev without the local DB
      // returns an empty local set; both fall back to the prebuilt assets.
      const needsStatic =
        !payload ||
        (!payload.local.available &&
          !payload.examples.some((example) => example.sourceType === 'local'));
      if (needsStatic) {
        const fallback = await staticFallbackResponse(
          verbId,
          form as string,
          options,
          controller.signal,
        );
        if (fallback) payload = fallback;
      }

      // A stale request whose fetch resolved before its abort fired would
      // otherwise overwrite a newer request's data; drop it here.
      if (controller.signal.aborted) return;
      if (!payload) throw apiError ?? new Error('examples unavailable');
      setData(payload);
    }

    load()
      .catch((err: Error) => {
        if (!controller.signal.aborted && err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [form, lookupForm, options, verbId]);

  // Rendered even without a lookup form (unsupported cell): an examples
  // section that unmounts drags the whole pane up and down.
  const examples = lookupForm ? (data?.examples ?? []) : [];
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

  // The filters remove rows from view without removing their height: the
  // shortfall against the unfiltered set is made up with hidden spacer rows,
  // so the table is exactly as tall under Local as under All.
  const spacerCount = Math.max(
    examples.length - Math.max(visibleExamples.length, 1),
    0,
  );
  const showLoadingLine = loading && !data;

  return (
    <section
      data-testid="examples"
      aria-busy={loading}
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
          <div className="flex min-h-4 flex-wrap items-start justify-between gap-3">
            <p className="text-xs text-stone-500">
              Indexed form:{' '}
              <span className="font-mono text-stone-700">
                {data?.lookupForm ?? lookupForm ?? '—'}
              </span>
            </p>
            <p className="text-xs text-stone-500">
              {data?.target ? (
                <>
                  Tags:{' '}
                  <span className="font-mono text-stone-700">
                    {data.target.ancQuery}
                  </span>
                </>
              ) : null}
            </p>
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
                    className={`inline-block min-w-3 text-right tabular-nums ${
                      active ? 'text-stone-300' : 'text-stone-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            {data?.prebuilt ? (
              <span className="text-xs text-stone-400">prebuilt examples</span>
            ) : data?.local.available ? (
              <span className="text-xs text-stone-400">
                local DB {formatBytes(data.local.bytes)}
              </span>
            ) : (
              <span className="text-xs text-stone-400">local DB not built</span>
            )}
          </div>

          <div data-testid="examples-body" className="mt-3">
            {showLoadingLine ? (
              <p className="text-sm text-stone-500">Loading examples…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : data?.local.error ? (
              <p className="text-sm text-red-600">{data.local.error}</p>
            ) : examples.length > 0 ? (
              <div
                className={`overflow-x-auto transition-opacity ${
                  loading ? 'opacity-60' : 'opacity-100'
                }`}
              >
                {/* Fixed layout: declared column widths, so a long corpus
                    name can never squeeze the Albanian column down to one
                    word per line. */}
                {/* The floor must stay under the result pane's own inner
                    width (~23rem at lg), or the table's min-content pushes
                    the pane wider and — before the grid tracks were pinned
                    with minmax(0, …) — stole that width from the controls.
                    Keep it below that so all three columns stay visible at
                    lg and the scroll container only engages on mobile. */}
                <table className="w-full min-w-[21rem] table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[44%]" />
                    <col className="w-[30%]" />
                  </colgroup>
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
                        <td className="py-3 pr-4 align-top">
                          <div className={CELL_BOX}>
                            {example.url ? (
                              <a
                                href={example.url}
                                className="line-clamp-2 font-medium text-stone-700 underline underline-offset-2 hover:text-stone-950"
                              >
                                {example.corpus}
                              </a>
                            ) : (
                              <span className="line-clamp-2 font-medium text-stone-700">
                                {example.corpus}
                              </span>
                            )}
                            <div className="mt-0.5 truncate text-[0.68rem] text-stone-400">
                              {example.sourceType === 'local'
                                ? example.matchKind.replace(/_/g, ' ')
                                : 'translated pair'}
                            </div>
                            <div className="mt-0.5 truncate text-[0.68rem] text-stone-400">
                              {example.domain ?? ' '}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-top leading-relaxed">
                          <div className={CELL_BOX_CLAMPED}>
                            {highlightMatch(
                              example.sentence,
                              data?.lookupForm ?? lookupForm,
                            )}
                          </div>
                        </td>
                        <td className="py-3 align-top leading-relaxed text-stone-500">
                          <div
                            className={
                              example.translation ? CELL_BOX_CLAMPED : CELL_BOX
                            }
                          >
                            {example.translation ? (
                              example.translation
                            ) : (
                              <>
                                {example.title ? (
                                  <p className="line-clamp-2">
                                    {example.title}
                                  </p>
                                ) : null}
                                <p>
                                  {example.genre ??
                                    example.quality ??
                                    'local corpus'}
                                </p>
                                {example.flags.length > 0 ? (
                                  <p className="truncate font-mono text-[0.68rem] text-stone-400">
                                    {example.flags.join(', ')}
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visibleExamples.length === 0 ? (
                      <tr data-testid="examples-filter-empty">
                        <td colSpan={3} className="py-3">
                          <div className={CELL_BOX}>
                            <p className="text-stone-500">
                              No {sourceFilter} examples for this form.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    {Array.from({ length: spacerCount }).map((_, i) => (
                      // Chrome paints a table row's border even under
                      // visibility:hidden, so the divider is made transparent
                      // rather than removed — dropping it would cost the row
                      // its 1px and shrink the table after all.
                      <tr
                        aria-hidden="true"
                        className="invisible"
                        style={{ borderTopColor: 'transparent' }}
                        key={i}
                      >
                        <td className="py-3">
                          <div className={CELL_BOX} />
                        </td>
                        <td />
                        <td />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p
                data-testid="examples-empty-state"
                className="text-sm text-stone-500"
              >
                {lookupForm ? (
                  <>
                    No sentence examples indexed for{' '}
                    <span className="font-mono text-stone-700">
                      {data?.lookupForm ?? lookupForm}
                    </span>{' '}
                    yet.
                  </>
                ) : (
                  'No form to look up for this selection.'
                )}
              </p>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
