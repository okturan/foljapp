'use client';

import type { TraceStep } from '@foljapp/engine';

interface Props {
  steps: TraceStep[];
}

export function DerivationPanel({ steps }: Props) {
  if (!steps || steps.length === 0) return null;
  return (
    <details className="mt-6 rounded-md border border-stone-200 bg-stone-50">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-stone-700">
        How is this built?
      </summary>
      <ol className="list-decimal space-y-2 px-8 py-4 text-sm text-stone-700">
        {steps.map((step, i) => (
          <li key={i}>
            <span className="font-mono text-xs uppercase tracking-wider text-stone-400">
              {step.kind}
            </span>
            <p className="mt-0.5">{step.summary}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
