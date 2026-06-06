## Why

The playground's option groups currently use a single `flex-wrap` row per group with natural-width pills. Long groups produce ragged orphan rows — the screenshot shows Mood with 6 pills on row 1 and `non-finite` alone on row 2; Indicative tense at 10 options wraps similarly. Cell widths are uneven (a 22-character `future-perfect-in-past` next to a 1-character `1`), right edges don't align, and visual rhythm is poor.

The user request: "dynamically sized and populated rows and good divisions and display discipline. not too crowded — like 2 options in a row maybe or 3 on really wide screens."

A predictable column grid replaces the ad-hoc wrap behavior with explicit, capped rows.

## What Changes

- **Refactor** the `RadioGroup` helper inside `apps/web/components/playground.tsx` to switch between two layouts based on option count:
  - **≤3 options** (Voice, Polarity, Modality, Person, Number, Tense.conditional/optative): keep `flex flex-wrap gap-2` — they already fit on a single line and don't benefit from a grid.
  - **≥4 options** (Mood at 7, Form at 5, Tense.indicative at 10, Tense.subjunctive/admirative at 4): use CSS Grid `grid-cols-2 lg:grid-cols-3` with equal-width `1fr` cells.
- **Add** centered text alignment on grid cells so labels of varying lengths produce visually balanced rows.
- **Add** `focus-visible` ring styling on the labels so keyboard-focused options expose a visible focus indicator (currently missing — the hidden radio is focused but no styling reflects it).
- **No structural changes** to the option set, ordering, or `URLSearchParams` shape.

## Capabilities

The change extends the existing `interactive-playground` capability with one new requirement (option-group layout discipline). No other capabilities touched.

## Impact

- **Code** — `apps/web/components/playground.tsx` (`RadioGroup` and the option arrays it consumes — no new files).
- **No engine, data, or API changes.**
- **No URL or routing changes** — the playground state model is unchanged.
- **Audience tier** — All tiers benefit from the cleaner visual rhythm. Learners scanning options see predictable rows; researchers comparing parameters get aligned cells.

## Non-Goals

- **No JS-driven layout.** Pure Tailwind/CSS Grid; no resize observers, no client-side measurement.
- **No global redesign of pill styling** (border, padding, font, active-state colors) — only the layout container changes.
- **No grouping of related parameters** into combined controls (e.g., Polarity+Modality merging) — a separate concern.
- **No reordering of groups or options.**
- **No animations** between layout breakpoints.
- **No arrow-key navigation** within radio groups (already absent; out of scope here, could be a follow-up).
- **No container queries.** Tailwind container-query support exists but viewport breakpoints are simpler and sufficient.

## Sequence

```
PREREQ → add-conjugation-engine            (engine output the playground exercises)
PREREQ → add-english-gloss                 (gloss display ride-along, unaffected)
THIS   → improve-playground-option-grid
NEXT   → could-add-arrow-key-radio-nav     (separate accessibility concern)
```
