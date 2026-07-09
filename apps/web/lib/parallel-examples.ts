import parallelExamplesData from '../../../data/opus/examples.json';

export interface ParallelExample {
  corpus: string;
  version: string;
  sentenceNumber: number;
  sq: string;
  en: string;
  opusUrl: string;
}

interface CorpusMetadata {
  corpus: string;
  version: string;
  preprocessing: string;
  sentencePairs: number;
  sourceLanguage: string;
  targetLanguage: string;
  opusUrl: string;
  downloadUrl: string;
}

interface ParallelExamplesData {
  generatedAt: string;
  source: 'OPUS';
  sourceUrl: string;
  apiUrl: string;
  languagePair: { source: 'sq'; target: 'en' };
  formFilter: string[] | null;
  corpora: CorpusMetadata[];
  examples: Record<string, ParallelExample[]>;
}

export interface ParallelExampleLookup {
  lookupForm: string | null;
  examples: ParallelExample[];
}

const data = parallelExamplesData as ParallelExamplesData;

const SKIP_TOKENS = new Set([
  'dhe',
  'jam',
  'je',
  'jemi',
  'jeni',
  'janë',
  'kam',
  'ke',
  'kemi',
  'keni',
  'kanë',
  'mos',
  'nuk',
  'për',
  'të',
]);

export const parallelExamplesMetadata = {
  generatedAt: data.generatedAt,
  sourceUrl: data.sourceUrl,
  apiUrl: data.apiUrl,
  corpora: data.corpora,
};

export function normalizeParallelToken(token: string): string {
  return token.normalize('NFC').toLocaleLowerCase('sq-AL').trim();
}

function tokensForLookup(form: string): string[] {
  return (form.match(/\p{L}+/gu) ?? []).map(normalizeParallelToken);
}

function formKeyForLookup(form: string): string | null {
  return tokensForLookup(form).join(' ') || null;
}

export function lookupParallelExamples(
  form: string | null | undefined,
): ParallelExampleLookup {
  if (!form) return { lookupForm: null, examples: [] };

  const normalized = formKeyForLookup(form);
  if (!normalized) return { lookupForm: null, examples: [] };

  const exact = data.examples[normalized];
  if (exact) return { lookupForm: normalized, examples: exact };

  const tokens = tokensForLookup(form);
  if (tokens.length > 1) {
    return { lookupForm: normalized, examples: [] };
  }

  const indexedToken = tokens.find((token) => data.examples[token]);
  if (indexedToken) {
    return {
      lookupForm: indexedToken,
      examples: data.examples[indexedToken] ?? [],
    };
  }

  const fallback =
    tokens.find((token) => !SKIP_TOKENS.has(token)) ?? tokens[0] ?? null;
  return { lookupForm: fallback, examples: [] };
}
