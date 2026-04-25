import type { VerbEntrySource } from '@foljapp/engine';

interface Props {
  sources: VerbEntrySource[];
  engineVersion: string;
  corpusVersion: string;
  notes?: string | undefined;
}

const SOURCE_LABELS: Record<VerbEntrySource['source'], string> = {
  husic: 'Husić, Albanian Verb Dictionary and Manual',
  uniparser: 'timarkh/uniparser-grammar-albanian',
  kaikki: 'Kaikki — Wiktionary',
  manual: 'Manual entry',
};

function isUrl(reference: string): boolean {
  return reference.startsWith('http://') || reference.startsWith('https://');
}

export function CitationsFooter({
  sources,
  engineVersion,
  corpusVersion,
  notes,
}: Props) {
  return (
    <footer className="mt-16 border-t border-stone-200 pt-6 text-xs text-stone-500">
      <h2 className="text-sm font-semibold text-stone-700">Sources</h2>
      <ul className="mt-3 space-y-1">
        {sources.map((s, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-2">
            <span className="font-medium text-stone-600">
              {SOURCE_LABELS[s.source]}
            </span>
            <span className="text-stone-400">·</span>
            {isUrl(s.reference) ? (
              <a
                href={s.reference}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-500 underline underline-offset-2 hover:text-stone-700"
              >
                {s.reference}
              </a>
            ) : (
              <span className="font-mono text-stone-600">{s.reference}</span>
            )}
          </li>
        ))}
      </ul>
      {notes ? (
        <p className="mt-4 text-stone-500 italic">Notes: {notes}</p>
      ) : null}
      <p className="mt-4 font-mono text-stone-400">
        engine: {engineVersion} · corpus: {corpusVersion}
      </p>
    </footer>
  );
}
