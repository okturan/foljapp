import type { VerbEntry } from '@foljapp/engine';
import Link from 'next/link';

import { CiteButton } from '@/components/cite-button';
import { DownloadActions } from '@/components/download-actions';
import { Button } from '@/components/ui/button';
import { getFrequency, TIER_DESCRIPTIONS } from '@/lib/frequency';

interface Props {
  entry: VerbEntry;
}

export function ReservedActions({ entry }: Props) {
  const frequency = getFrequency(entry.id);
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-stone-200 py-6">
      <DownloadActions verbId={entry.id} lemma={entry.lemma} />
      <Button asChild variant="outline" size="sm">
        <Link href={`/practice/quiz?focus=${encodeURIComponent(entry.lemma)}`}>
          Practice
        </Link>
      </Button>
      <CiteButton entry={entry} />
      {frequency ? (
        <Button
          variant="outline"
          size="sm"
          title={TIER_DESCRIPTIONS[frequency.tier]}
          aria-label={`Frequency: ${frequency.tier} — ${TIER_DESCRIPTIONS[frequency.tier]}`}
        >
          Frequency: {frequency.tier}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled
          title="No frequency data for this verb"
          aria-label="Frequency unavailable"
        >
          Frequency: —
        </Button>
      )}
    </div>
  );
}
