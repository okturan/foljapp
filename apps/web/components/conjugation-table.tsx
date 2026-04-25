import type { ConjugationResult } from '@foljapp/engine';

import { DecomposedForm } from '@/components/decomposed-form';

interface Props {
  /** Mood label in English + Albanian, e.g., "Indicative (Dëftore)". */
  title: string;
  /** Mood key for cell anchor IDs, e.g., "indicative". */
  moodKey: string;
  /** Map of tense names → tense cell objects from engine.table(). */
  tenses: Record<string, Record<string, ConjugationResult | undefined>>;
  /** Optional ordered list of tense keys to render */
  order?: string[];
  /** When true, render only 2sg/2pl columns (imperative) */
  imperativeOnly?: boolean;
}

const FULL_CELLS: Array<{ key: string; header: string }> = [
  { key: '1sg', header: '1sg' },
  { key: '2sg', header: '2sg' },
  { key: '3sg', header: '3sg' },
  { key: '1pl', header: '1pl' },
  { key: '2pl', header: '2pl' },
  { key: '3pl', header: '3pl' },
];

const IMPERATIVE_CELLS: Array<{ key: string; header: string }> = [
  { key: '2sg', header: '2sg' },
  { key: '2pl', header: '2pl' },
];

function readableTense(tense: string): string {
  return tense.replace(/-/g, ' ');
}

export function ConjugationTable({ title, moodKey, tenses, order, imperativeOnly = false }: Props) {
  const cells = imperativeOnly ? IMPERATIVE_CELLS : FULL_CELLS;
  const tenseKeys = order ?? Object.keys(tenses);

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold tracking-tight text-stone-900">
        {title}
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200">
              <th
                scope="col"
                className="py-2 pr-4 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
              >
                tense
              </th>
              {cells.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="py-2 px-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenseKeys.map((tense) => {
              const row = tenses[tense] ?? {};
              return (
                <tr key={tense} className="border-b border-stone-100">
                  <th
                    scope="row"
                    className="py-3 pr-4 text-left text-xs uppercase text-stone-500"
                  >
                    {readableTense(tense)}
                  </th>
                  {cells.map((c) => {
                    const result = row[`${c.key}.active`];
                    const cellId = `${moodKey}-${tense}-${c.key}`;
                    if (result) {
                      return (
                        <td
                          key={c.key}
                          id={cellId}
                          className="py-3 px-3 align-top scroll-mt-20"
                        >
                          <DecomposedForm segments={result.decomposition} />
                        </td>
                      );
                    }
                    return (
                      <td
                        key={c.key}
                        id={cellId}
                        className="py-3 px-3 align-top text-stone-300 scroll-mt-20"
                        aria-label="unsupported cell"
                      >
                        —
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
