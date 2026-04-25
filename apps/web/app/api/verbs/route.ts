import { VERSION } from '@foljapp/engine';
import { NextResponse } from 'next/server';

import { citationFor, type ApiVerbListResponse } from '@/lib/api-shapes';
import { corpusVersion } from '@/lib/corpus';
import { corpusIndex } from '@/lib/corpus-index';

export const dynamic = 'force-static';

export function GET() {
  const sorted = [...corpusIndex].sort((a, b) => a.id.localeCompare(b.id));
  const body: ApiVerbListResponse = {
    engineVersion: VERSION,
    corpusVersion: corpusVersion.version,
    cite: citationFor('/api/verbs'),
    verbs: sorted,
  };
  return NextResponse.json(body);
}
