## Why

The verb-page's conjugation tables get truncated on the right because the page wrapper is constrained to `max-w-3xl` (768px) but the tables need ~1010px to fit a TENSE label column plus six person/number columns without truncating compound forms like `kooperohesha`, `kemi kooperuar`, `paskëshim folur`. On any viewport where the browser is wider than 768px (i.e., desktop), the table sits centered with empty space on either side AND gets clipped — users must scroll horizontally inside the table to see the 3PL column.

User's screenshot of `/verb/kooperoj` shows exactly this: 1SG–2PL columns visible, 3PL clipped to a sliver (`koo|`).

Why max-w-3xl was originally chosen: the verb-page also contains text-heavy elements (header, IPA, sources, citations footer) where reading-line length below 80ch is the comfort target. That tradeoff has been over-applied — the table dominates visually and shouldn't share the same width budget as the prose.

## What Changes

- **Widen the verb-page container at desktop breakpoints.** `apps/web/app/verb/[lemma]/page.tsx` `<main>` wrapper goes from `max-w-3xl` to `max-w-3xl lg:max-w-5xl xl:max-w-6xl`. Mobile/tablet keep the narrow reading column; desktop opens up to 1024–1152px so the conjugation tables fit unscrolled.
- **Compress conjugation-table cells.** In `apps/web/components/conjugation-table.tsx`:
  - Cell padding drops from `py-3 px-3` to `py-2.5 px-2`. Saves ~24px across six cells.
  - The TENSE label column tightens via `pr-2` (was `pr-4`).
  - Cell text uses `whitespace-nowrap` for single-word forms; multi-word compound forms (kam kooperuar) stay wrappable so they don't force horizontal overflow on narrow viewports.
- **DecomposedForm font sizing**: change the wrapper `<span className="font-mono text-base">` to `text-inherit` so it picks up its surrounding context. Conjugation table cells (`text-sm` ancestor) render at 14px instead of 16px — about 12% width savings without sacrificing legibility. Playground (`text-3xl` wrapper) and non-finite forms are unaffected.
- **Sticky TENSE column on overflow.** When the table still overflows (very narrow viewports), the first column sticks to the left edge with a subtle background so users keep their bearings while horizontally scrolling.

## Capabilities

The change extends `reference-pages`. One new requirement covers the width-and-readability invariant. No engine, data, or other capability touched.

## Impact

- **Code** — `apps/web/app/verb/[lemma]/page.tsx` (one className change), `apps/web/components/conjugation-table.tsx` (padding + sticky-col), `apps/web/components/decomposed-form.tsx` (one className change).
- **Tests** — one new e2e in `apps/web/e2e/verb-page-table-width.spec.ts` asserting all 6 cell columns are within the visible viewport at lg+ widths.
- **No data, API, engine changes.**
- **Audience tier** — All audiences benefit. Researchers and learners get the full table at a glance instead of horizontal scrolling.

## Non-Goals

- **No restructuring of the conjugation table** into a different layout (e.g., card-per-cell on mobile). The existing tabular structure stays.
- **No change to the playground's result panel.** DecomposedForm change is context-aware and leaves playground sizing intact.
- **No reduction of the verb-page header / IPA / sources panel widths.** Only the conjugation table width is the problem.
- **No change to how the engine produces forms** — only how they're laid out.
- **No JS-driven resize logic.** Pure Tailwind responsive classes.

## Sequence

```
PREREQ → improve-playground-control-density (separate UI concern)
THIS   → improve-conjugation-table-width
NEXT   → could-add-mobile-card-table-fallback  (alternative layout for very narrow phones; deferred)
```
