'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import '@/lib/corpus-client';
import { formatConllu, formatIgtTable } from '@/lib/igt';

interface Props {
  verbId: string;
  lemma: string;
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DownloadActions({ verbId, lemma }: Props) {
  const [open, setOpen] = useState(false);

  function downloadIgt() {
    const content = formatIgtTable(verbId);
    downloadBlob(`${lemma}.txt`, content, 'text/plain');
    setOpen(false);
  }

  function downloadConllu() {
    const content = formatConllu(verbId);
    downloadBlob(`${lemma}.conllu`, content, 'text/plain');
    setOpen(false);
  }

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
        Download ▾
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 z-10 mt-1 min-w-[14rem] overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={downloadIgt}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-stone-50"
          >
            <span className="font-medium">IGT (.txt)</span>
            <span className="block text-xs text-stone-500">
              Leipzig-style interlinear glossing
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={downloadConllu}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-stone-50"
          >
            <span className="font-medium">CoNLL-U (.conllu)</span>
            <span className="block text-xs text-stone-500">
              Universal Dependencies format
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
