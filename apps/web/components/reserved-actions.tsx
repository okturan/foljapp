import { DownloadActions } from '@/components/download-actions';
import { Button } from '@/components/ui/button';

const ACTIONS = [
  { label: 'Practice', tooltip: 'Coming soon — see roadmap for practice-mode' },
  { label: 'Frequency: —', tooltip: 'Coming soon — see roadmap for frequency-data' },
];

interface Props {
  verbId: string;
  lemma: string;
}

export function ReservedActions({ verbId, lemma }: Props) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-stone-200 py-6">
      <DownloadActions verbId={verbId} lemma={lemma} />
      {ACTIONS.map((a) => (
        <Button
          key={a.label}
          variant="outline"
          size="sm"
          disabled
          title={a.tooltip}
          aria-label={`${a.label} (disabled — ${a.tooltip})`}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
