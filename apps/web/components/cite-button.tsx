'use client';

import type { VerbEntry } from '@foljapp/engine';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  apaForVerb,
  bibtexForVerb,
  plainForVerb,
} from '@/lib/bibliography';
import { verbHref } from '@/lib/verb-route';

interface Props {
  entry: VerbEntry;
}

export function CiteButton({ entry }: Props) {
  const [open, setOpen] = useState(false);
  // Build URL at click-time so it matches the deploy domain. Fall back to
  // a relative URL during SSR / first paint.
  const href = verbHref(entry);
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}${href}`
      : href;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Cite ▾
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 z-10 mt-1 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-stone-200 bg-white p-4 shadow-lg"
        >
          <CiteBlock label="BibTeX" content={bibtexForVerb(entry, url)} />
          <CiteBlock label="APA" content={apaForVerb(entry, url)} />
          <CiteBlock label="Plain text" content={plainForVerb(entry, url)} />
        </div>
      ) : null}
    </div>
  );
}

function CiteBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-md bg-stone-50 p-3 text-xs text-stone-800">
        {content}
      </pre>
    </div>
  );
}
