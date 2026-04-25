import type { VerbEntry } from '@foljapp/engine';
import Link from 'next/link';

import { CiteButton } from '@/components/cite-button';
import { DownloadActions } from '@/components/download-actions';
import { Button } from '@/components/ui/button';

interface Props {
  entry: VerbEntry;
}

export function ReservedActions({ entry }: Props) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-stone-200 py-6">
      <DownloadActions verbId={entry.id} lemma={entry.lemma} />
      <Button asChild variant="outline" size="sm">
        <Link href={`/practice/quiz?focus=${encodeURIComponent(entry.lemma)}`}>
          Practice
        </Link>
      </Button>
      <CiteButton entry={entry} />
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Coming soon — see roadmap for frequency-data"
        aria-label="Frequency (disabled — coming soon)"
      >
        Frequency: —
      </Button>
    </div>
  );
}
