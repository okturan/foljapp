'use client';

import { lookupOpusExamples, opusExamplesMetadata } from '@/lib/opus-examples';

interface Props {
  form: string | null;
}

export function CorpusExamples({ form }: Props) {
  const lookup = lookupOpusExamples(form);
  if (!lookup.lookupForm) return null;

  return (
    <section
      data-testid="opus-examples"
      className="mt-6 border-t border-stone-200 pt-5"
    >
      <details className="group" open>
        <summary
          data-testid="examples-summary"
          className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs tracking-wider text-stone-400 uppercase select-none marker:hidden"
        >
          <span>Examples</span>
          <span
            aria-hidden="true"
            className="text-base leading-none text-stone-400 transition-transform group-open:rotate-180"
          >
            ↓
          </span>
        </summary>

        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs text-stone-500">
              Indexed form:{' '}
              <span className="font-mono text-stone-700">
                {lookup.lookupForm}
              </span>
            </p>
            <a
              href={opusExamplesMetadata.sourceUrl}
              className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-900"
            >
              source
            </a>
          </div>

          {lookup.examples.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-stone-200 text-[0.68rem] tracking-wide text-stone-400 uppercase">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      Corpus
                    </th>
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      Albanian
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      English
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {lookup.examples.map((example) => (
                    <tr key={`${example.corpus}-${example.sentenceNumber}`}>
                      <td className="py-3 pr-4 align-top whitespace-nowrap">
                        <a
                          href={example.opusUrl}
                          className="font-medium text-stone-700 underline underline-offset-2 hover:text-stone-950"
                        >
                          {example.corpus}
                        </a>
                        <div className="mt-0.5 text-[0.68rem] text-stone-400">
                          {example.version} · #{example.sentenceNumber}
                        </div>
                      </td>
                      <td className="max-w-[18rem] py-3 pr-4 align-top leading-relaxed">
                        {example.sq}
                      </td>
                      <td className="max-w-[18rem] py-3 align-top leading-relaxed text-stone-500">
                        {example.en}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p
              data-testid="opus-empty-state"
              className="mt-3 text-sm text-stone-500"
            >
              No sentence examples indexed for{' '}
              <span className="font-mono text-stone-700">
                {lookup.lookupForm}
              </span>{' '}
              yet.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
