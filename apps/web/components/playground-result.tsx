'use client';

import type { TraceStep } from '@foljapp/engine';
import Link from 'next/link';
import { useState } from 'react';

import { DecomposedForm } from '@/components/decomposed-form';
import { DerivationPanel } from '@/components/derivation-panel';
import { toIpaBracketed } from '@/lib/ipa';

interface Props {
  /** Engine output, or null when unsupported / errored. */
  result: { decomposition: import('@foljapp/engine').DecompositionSegment[]; form: string } | null;
  traceSteps: TraceStep[];
  unsupported: boolean;
  errorMsg: string | null;
  /** Verb lemma — used by the "See full table" link. */
  verb: string;
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
  unsupported,
  errorMsg,
  verb,
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
      <p className="text-xs uppercase tracking-wider text-stone-400">Form</p>
      {result ? (
        <>
          <div className="mt-2 text-3xl">
            <DecomposedForm segments={result.decomposition} />
          </div>
          <p className="mt-1 font-mono text-sm text-stone-500">
            {toIpaBracketed(result.form)}
          </p>
          {gloss ? (
            <p
              data-testid="english-gloss"
              className="mt-1 text-sm italic text-stone-500"
            >
              &ldquo;{gloss}&rdquo;
            </p>
          ) : null}
          <DerivationPanel steps={traceSteps} />
        </>
      ) : unsupported ? (
        <p className="mt-2 text-stone-400 italic">
          unsupported cell — engine reports this combination is not part of
          standard Albanian
        </p>
      ) : errorMsg ? (
        <p className="mt-2 text-red-600">{errorMsg}</p>
      ) : null}

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
          href={`/verb/${encodeURIComponent(verb)}`}
          className="text-stone-600 underline underline-offset-2 hover:text-stone-900"
        >
          See full table → /verb/{verb}
        </Link>
      </div>
    </>
  );
}
