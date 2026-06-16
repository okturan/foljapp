import opusExamplesData from '../../../data/opus/examples.json';

export interface OpusExample {
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

interface OpusExamplesData {
  generatedAt: string;
  source: 'OPUS';
  sourceUrl: string;
  apiUrl: string;
  languagePair: { source: 'sq'; target: 'en' };
  formFilter: string[] | null;
  corpora: CorpusMetadata[];
  examples: Record<string, OpusExample[]>;
}

export interface OpusExampleLookup {
  lookupForm: string | null;
  examples: OpusExample[];
}

const data = opusExamplesData as OpusExamplesData;

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

export const opusExamplesMetadata = {
  generatedAt: data.generatedAt,
  sourceUrl: data.sourceUrl,
  apiUrl: data.apiUrl,
  corpora: data.corpora,
};

export function normalizeOpusToken(token: string): string {
  return token.normalize('NFC').toLocaleLowerCase('sq-AL').trim();
}

function tokensForLookup(form: string): string[] {
  return (form.match(/\p{L}+/gu) ?? []).map(normalizeOpusToken);
}

export function lookupOpusExamples(
  form: string | null | undefined,
): OpusExampleLookup {
  if (!form) return { lookupForm: null, examples: [] };

  const normalized = normalizeOpusToken(form);
  const exact = data.examples[normalized];
  if (exact) return { lookupForm: normalized, examples: exact };

  const tokens = tokensForLookup(form);
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
