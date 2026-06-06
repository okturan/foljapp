import { table, VERSION } from '@foljapp/engine';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  citationFor,
  type ApiErrorResponse,
  type ApiVerbDetailResponse,
} from '@/lib/api-shapes';
import {
  bundledCorpusVersion,
  findBundledEntryByLemma,
} from '@/lib/corpus-bundle';
import { buildGlossTable } from '@/lib/english-gloss-table';
import { getFrequency } from '@/lib/frequency';
import { formatConllu, formatIgtTable } from '@/lib/igt';
import { toIpa } from '@/lib/ipa';

export const runtime = 'edge';

// Not force-static: the route honors ?format=... which varies per request.
// It runs at the edge so Cloudflare Pages can serve the full API surface.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lemma: string }> },
) {
  const { lemma: rawLemma } = await params;
  const lemma = decodeURIComponent(rawLemma);
  const entry = findBundledEntryByLemma(lemma);

  if (!entry) {
    const body: ApiErrorResponse = { error: 'unknown verb', lemma };
    return NextResponse.json(body, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') ?? 'json';

  if (format === 'igt') {
    return new NextResponse(formatIgtTable(entry.id), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  if (format === 'conllu') {
    return new NextResponse(formatConllu(entry.id), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const verbTable = table(entry.id);
  const glossTable = buildGlossTable(entry, verbTable);

  const body: ApiVerbDetailResponse = {
    engineVersion: VERSION,
    corpusVersion: bundledCorpusVersion.version,
    cite: citationFor(`/api/verbs/${entry.lemma}`),
    entry,
    table: verbTable,
    englishGlosses: glossTable,
    ipa: {
      lemma: toIpa(entry.lemma),
      principalParts: {
        present: toIpa(entry.principalParts.present),
        aorist: toIpa(entry.principalParts.aorist),
        participle: toIpa(entry.principalParts.participle),
      },
    },
    frequency: getFrequency(entry.id) ?? null,
  };
  return NextResponse.json(body);
}
