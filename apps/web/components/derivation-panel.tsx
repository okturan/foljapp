'use client';

import type { TraceStep } from '@foljapp/engine';

interface Props {
  steps: TraceStep[];
}

export function DerivationPanel({ steps }: Props) {
  // Always rendered, even with no steps: an appearing/disappearing panel
  // shifts everything below it on every parameter change.
  const hasSteps = steps !== undefined && steps !== null && steps.length > 0;
  return (
    <details
      data-testid="derivation-panel"
      className="mt-6 rounded-md border border-stone-200 bg-stone-50"
    >
      <summary
        className={`px-4 py-3 text-sm font-medium select-none ${
          hasSteps
            ? 'cursor-pointer text-stone-700'
            : 'cursor-default text-stone-400'
        }`}
      >
        How is this built?
      </summary>
      {hasSteps ? (
        <ol className="list-decimal space-y-2 px-8 py-4 text-sm text-stone-700">
          {steps.map((step, i) => (
            <li key={i}>
              <span className="font-mono text-xs tracking-wider text-stone-400 uppercase">
                {step.kind}
              </span>
              <p className="mt-0.5">{step.summary}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 pb-4 text-sm text-stone-500">
          No derivation steps for this form.
        </p>
      )}
    </details>
  );
}
