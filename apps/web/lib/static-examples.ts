/**
 * Client-side reader for the precomputed per-verb example assets emitted by
 * scripts/build-static-examples.ts into public/examples/. Used by the
 * Examples panel when the live /api/examples route is unavailable (deployed
 * site) or has no local database behind it.
 */

import { lookupParallelExamples } from '@/lib/parallel-examples';

export interface ApiExample {
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

// [sigIdx, corpusIdx, domainIdx, kindIdx, genreIdx, qualityIdx, score, url, sentence]
// Dictionary indexes of -1 mean "absent".
export type StaticExampleTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  string,
  string,
];

export interface StaticVerbExamples {
  v: 1;
  verbId: string;
  generatedAt: string;
  sigs: string[];
  corpora: string[];
  domains: string[];
  kinds: string[];
  genres: string[];
  qualities: string[];
  targets: Record<string, StaticExampleTuple[]>;
}

export async function fetchStaticVerbExamples(
  verbId: string,
  signal?: AbortSignal,
): Promise<StaticVerbExamples | null> {
  try {
    const response = await fetch(
      `/examples/${encodeURIComponent(verbId)}.json`,
      { signal },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as StaticVerbExamples;
    return payload.v === 1 ? payload : null;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    return null;
  }
}

function dictValue(values: string[], index: number): string | null {
  return index >= 0 ? (values[index] ?? null) : null;
}

export function lookupStaticExamples(
  file: StaticVerbExamples,
  targetKey: string,
  signature: string | null,
  limit: number,
): ApiExample[] {
  const rows = file.targets[targetKey] ?? [];
  const bySignature = signature
    ? rows.filter((tuple) => file.sigs[tuple[0]] === signature)
    : rows;
  // Same fallback the API uses: a signature-restricted miss widens to every
  // retained example for the target key.
  const chosen = bySignature.length > 0 ? bySignature : rows;

  return chosen.slice(0, limit).map((tuple, index) => ({
    id: `static-${file.verbId}-${targetKey}-${index}`,
    sourceType: 'local' as const,
    resourceId: 'static-examples',
    corpus: file.corpora[tuple[1]] ?? 'local corpus',
    title: null,
    url: tuple[7] || null,
    domain: dictValue(file.domains, tuple[2]),
    genre: dictValue(file.genres, tuple[4]),
    quality: dictValue(file.qualities, tuple[5]),
    sentence: tuple[8],
    translation: null,
    matchKind: file.kinds[tuple[3]] ?? 'exact',
    score: tuple[6],
    flags: [],
    cellLabel: null,
    ancQuery: null,
  }));
}

export function parallelExamplesAsApi(
  form: string,
  limit: number,
): ApiExample[] {
  const lookup = lookupParallelExamples(form);
  return lookup.examples.slice(0, limit).map((example, index) => ({
    id: `parallel-${example.corpus}-${example.sentenceNumber}-${index}`,
    sourceType: 'parallel' as const,
    resourceId: 'opus-en-sq-moses-latest',
    corpus: example.corpus,
    title: null,
    url: example.opusUrl,
    domain: 'opus.nlpl.eu',
    genre: null,
    quality: null,
    sentence: example.sq,
    translation: example.en,
    matchKind: 'parallel_sentence',
    score: 55,
    flags: [],
    cellLabel: null,
    ancQuery: null,
  }));
}
