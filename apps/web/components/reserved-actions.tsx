import Link from 'next/link';

import { DownloadActions } from '@/components/download-actions';
import { Button } from '@/components/ui/button';

interface Props {
  verbId: string;
  lemma: string;
}

export function ReservedActions({ verbId, lemma }: Props) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-stone-200 py-6">
      <DownloadActions verbId={verbId} lemma={lemma} />
      <Button asChild variant="outline" size="sm">
        <Link href={`/practice/quiz?focus=${encodeURIComponent(lemma)}`}>
          Practice
        </Link>
      </Button>
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
