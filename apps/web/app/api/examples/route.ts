import {
  generatedSearchTarget,
  normalizeSearchKey,
  type ConjugateOptions,
  type Mood,
  type NonFiniteForm,
  type Tense,
} from '@foljapp/engine';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { parallelExamplesAsApi } from '@/lib/static-examples';

// Edge-only so Cloudflare Pages can serve the route. Retained-corpus
// examples come from the prebuilt /examples/<verbId>.json assets, which
// the Examples panel loads client-side whenever this route reports the
// local database unavailable (always, since the SQLite shell-out was
// removed with the edge-examples-api change).
export const runtime = 'edge';

function parseOptions(url: URL): ConjugateOptions | null {
  const mood = url.searchParams.get('mood') as Mood | null;
  if (!mood) return null;

  if (mood === 'non-finite') {
    return {
      mood,
      form: (url.searchParams.get('nonFiniteForm') ??
        'participle') as NonFiniteForm,
    };
  }

  const personRaw = Number(url.searchParams.get('person') ?? '0');
  const number = url.searchParams.get('number');
  if (![1, 2, 3].includes(personRaw)) return null;
  if (number !== 'singular' && number !== 'plural') return null;

  return {
    mood,
    tense: (url.searchParams.get('tense') ?? 'present') as Tense,
    voice:
      (url.searchParams.get('voice') as ConjugateOptions['voice'] | null) ??
      'active',
    person: personRaw as 1 | 2 | 3,
    number,
    polarity:
      (url.searchParams.get('polarity') as
        | ConjugateOptions['polarity']
        | null) ?? 'affirmative',
    modality:
      (url.searchParams.get('modality') as
        | ConjugateOptions['modality']
        | null) ?? 'declarative',
  };
}

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const surface =
    url.searchParams.get('surface') ?? url.searchParams.get('form') ?? '';
  const targetKey = normalizeSearchKey(surface);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '8') || 8, 20);
  const options = parseOptions(url);
  const generatedTarget =
    surface && options ? generatedSearchTarget(surface, options) : null;
  const lookupKey = generatedTarget?.targetKey ?? targetKey;

  return NextResponse.json({
    lookupForm: lookupKey || null,
    target: generatedTarget
      ? {
          signature: generatedTarget.signature,
          ancQuery: generatedTarget.ancQuery,
          ancTags: generatedTarget.ancTags,
          cellLabel: generatedTarget.cellLabel,
        }
      : null,
    local: {
      available: false,
      path: '',
      bytes: 0,
      error: null,
    },
    examples: surface ? parallelExamplesAsApi(surface, limit) : [],
  });
}
