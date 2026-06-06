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
  /**
   * Cell-by-cell English glosses. Keyed by `${tense}.${cellLabel}.${voice}`,
   * e.g., "perfect.1sg.active". Surfaced via the cell's title attribute and
   * an sr-only span so the gloss is reachable on hover/focus and by AT.
   */
  glosses?: Record<string, string>;
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

export function ConjugationTable({ title, moodKey, tenses, order, imperativeOnly = false, glosses }: Props) {
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
                className="sticky left-0 z-10 bg-white py-2 pr-2 text-left text-xs font-medium uppercase tracking-wider text-stone-500 border-r border-stone-100"
              >
                tense
              </th>
              {cells.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="py-2 px-2 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenseKeys.flatMap((tense) => {
              const row = tenses[tense] ?? {};
              const hasMp = cells.some(
                (c) => row[`${c.key}.middle-passive`] !== undefined,
              );
              const activeRow = (
                <tr key={`${tense}-active`} className="border-b border-stone-100">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white py-2.5 pr-2 text-left text-xs uppercase text-stone-500 whitespace-nowrap border-r border-stone-100"
                  >
                    {readableTense(tense)}
                  </th>
                  {cells.map((c) => {
                    const result = row[`${c.key}.active`];
                    const cellId = `${moodKey}-${tense}-${c.key}`;
                    const gloss = glosses?.[`${tense}.${c.key}.active`];
                    if (result) {
                      return (
                        <td
                          key={c.key}
                          id={cellId}
                          className="py-2.5 px-2 align-top scroll-mt-20"
                          title={gloss ? `English: "${gloss}"` : undefined}
                        >
                          <DecomposedForm segments={result.decomposition} />
                          {gloss ? (
                            <span
                              data-testid={`gloss-${cellId}`}
                              className="sr-only"
                            >
                              English: &ldquo;{gloss}&rdquo;
                            </span>
                          ) : null}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={c.key}
                        id={cellId}
                        className="py-2.5 px-2 align-top text-stone-300 scroll-mt-20"
                        aria-label="unsupported cell"
                      >
                        —
                      </td>
                    );
                  })}
                </tr>
              );
              if (!hasMp) return [activeRow];
              const mpRow = (
                <tr key={`${tense}-mp`} className="border-b border-stone-100 bg-stone-50/50">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-stone-50 py-2.5 pr-2 text-left text-xs uppercase text-stone-500 whitespace-nowrap border-r border-stone-100"
                  >
                    {readableTense(tense)}
                    <span
                      aria-label="middle-passive voice"
                      className="ml-2 rounded bg-stone-200 px-1 py-0.5 text-[10px] uppercase tracking-wider text-stone-600"
                    >
                      MP
                    </span>
                  </th>
                  {cells.map((c) => {
                    const result = row[`${c.key}.middle-passive`];
                    const cellId = `${moodKey}-${tense}-${c.key}-mp`;
                    const gloss = glosses?.[`${tense}.${c.key}.middle-passive`];
                    if (result) {
                      return (
                        <td
                          key={c.key}
                          id={cellId}
                          className="py-2.5 px-2 align-top scroll-mt-20"
                          title={gloss ? `English: "${gloss}"` : undefined}
                        >
                          <DecomposedForm segments={result.decomposition} />
                          {gloss ? (
                            <span
                              data-testid={`gloss-${cellId}`}
                              className="sr-only"
                            >
                              English: &ldquo;{gloss}&rdquo;
                            </span>
                          ) : null}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={c.key}
                        id={cellId}
                        className="py-2.5 px-2 align-top text-stone-300 scroll-mt-20"
                        aria-label="unsupported cell"
                      >
                        —
                      </td>
                    );
                  })}
                </tr>
              );
              return [activeRow, mpRow];
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
