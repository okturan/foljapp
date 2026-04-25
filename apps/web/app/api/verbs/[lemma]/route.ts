import { table, VERSION } from '@foljapp/engine';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  citationFor,
  type ApiErrorResponse,
  type ApiVerbDetailResponse,
} from '@/lib/api-shapes';
import { corpusVersion, findEntryByLemma } from '@/lib/corpus';
import { allLemmas } from '@/lib/corpus';
import { formatConllu, formatIgtTable } from '@/lib/igt';
import { toIpa } from '@/lib/ipa';

// Not force-static: the route honors ?format=... which varies per request.
// Static prerendering for the JSON default still happens via generateStaticParams.
export function generateStaticParams(): Array<{ lemma: string }> {
  return allLemmas().map((lemma) => ({ lemma }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lemma: string }> },
) {
  const { lemma: rawLemma } = await params;
  const lemma = decodeURIComponent(rawLemma);
  const entry = findEntryByLemma(lemma);

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

  const body: ApiVerbDetailResponse = {
    engineVersion: VERSION,
    corpusVersion: corpusVersion.version,
    cite: citationFor(`/api/verbs/${entry.lemma}`),
    entry,
    table: table(entry.id),
    ipa: {
      lemma: toIpa(entry.lemma),
      principalParts: {
        present: toIpa(entry.principalParts.present),
        aorist: toIpa(entry.principalParts.aorist),
        participle: toIpa(entry.principalParts.participle),
      },
    },
  };
  return NextResponse.json(body);
}
