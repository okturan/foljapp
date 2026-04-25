import { redirect } from 'next/navigation';

import { corpusIndex } from '@/lib/corpus-index';

/**
 * Pick a verb deterministically from the build-time epoch so the page
 * is statically renderable. Each deploy picks a fresh verb.
 */
function pickRandomLemma(): string {
  const epoch = process.env.SOURCE_DATE_EPOCH
    ? Number(process.env.SOURCE_DATE_EPOCH)
    : Math.floor(Date.now() / 1000);
  const index = epoch % corpusIndex.length;
  const entry = corpusIndex[index] ?? corpusIndex[0];
  if (!entry) {
    throw new Error('corpus index is empty');
  }
  return entry.lemma;
}

const TARGET_LEMMA = pickRandomLemma();

export default function RandomPage(): never {
  redirect(`/verb/${encodeURIComponent(TARGET_LEMMA)}`);
}
