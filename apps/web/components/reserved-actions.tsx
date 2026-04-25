import { Button } from '@/components/ui/button';

const ACTIONS = [
  { label: 'Practice', tooltip: 'Coming soon — see roadmap for practice-mode' },
  { label: 'Playground', tooltip: 'Coming soon — see roadmap for interactive-playground' },
  { label: 'Export IGT', tooltip: 'Coming soon — see roadmap for igt-export' },
  { label: 'Frequency: —', tooltip: 'Coming soon — see roadmap for frequency-data' },
];

export function ReservedActions() {
  return (
    <div className="flex flex-wrap gap-3 border-b border-stone-200 py-6">
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
