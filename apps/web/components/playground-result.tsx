'use client';

import type { ConjugateOptions, TraceStep } from '@foljapp/engine';
import Link from 'next/link';
import { useState } from 'react';

import { CorpusExamples } from '@/components/corpus-examples';
import { DecomposedForm } from '@/components/decomposed-form';
import { DerivationPanel } from '@/components/derivation-panel';
import { toIpaBracketed } from '@/lib/ipa';

interface Props {
  /** Engine output, or null when unsupported / errored. */
  result: {
    decomposition: import('@foljapp/engine').DecompositionSegment[];
    form: string;
  } | null;
  traceSteps: TraceStep[];
  options: ConjugateOptions;
  unsupported: boolean;
  errorMsg: string | null;
  /** Canonical URL slug for the verb. */
  verbSlug: string;
  /** English compositional gloss for the current cell, or null when unavailable. */
  gloss: string | null;
}

/**
 * Renders the result section of the playground: the conjugated form with
 * role-coded decomposition, IPA transcription, derivation panel, and the
 * Copy link / See full table actions. Used in both desktop two-pane and
 * mobile sticky-band layouts; styling differences are owned by the
 * surrounding container.
 */
export function PlaygroundResult({
  result,
  traceSteps,
  options,
  unsupported,
  errorMsg,
  verbSlug,
  gloss,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <p className="text-xs tracking-wider text-stone-400 uppercase">Form</p>
      {/* The headline block keeps its height whether or not a gloss exists,
          whether the form wraps to a second line, and whether the engine
          produced a form at all — everything below it stays put. */}
      <div className="mt-2 min-h-28">
        {result ? (
          <>
            <div className="text-3xl">
              <DecomposedForm segments={result.decomposition} />
            </div>
            <p className="mt-1 font-mono text-sm text-stone-500">
              {toIpaBracketed(result.form)}
            </p>
            <p
              data-testid="english-gloss"
              className="mt-1 min-h-5 text-sm text-stone-500 italic"
            >
              {gloss ? <>&ldquo;{gloss}&rdquo;</> : null}
            </p>
          </>
        ) : unsupported ? (
          <p className="text-stone-400 italic">
            unsupported cell — engine reports this combination is not part of
            standard Albanian
          </p>
        ) : errorMsg ? (
          <p className="text-red-600">{errorMsg}</p>
        ) : null}
      </div>

      <DerivationPanel steps={traceSteps} />
      <CorpusExamples
        form={result ? result.form : null}
        options={options}
        verbId={verbSlug}
      />

      <div className="mt-6 flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={copyLink}
          aria-label="Copy link"
          className="rounded-md border border-stone-200 bg-white px-3 py-1.5 hover:bg-stone-50"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <Link
          href={`/verb/${encodeURIComponent(verbSlug)}`}
          className="text-stone-600 underline underline-offset-2 hover:text-stone-900"
        >
          See full table → /verb/{verbSlug}
        </Link>
      </div>
    </>
  );
}
