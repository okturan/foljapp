## Why

After `improve-playground-option-grid` cleaned up the WITHIN-group layout (Mood and Tense now use 2/3-col grids of equal-width pills), the AMONG-groups layout is still a single vertical stack. Voice, Polarity, Modality, Person, and Number — each a 2- or 3-option group — occupy their own row apiece, producing a tall column of mostly-empty horizontal space.

User's screenshot shows the result: ~5 rows of label-plus-pills consuming roughly 600px of vertical real estate for ~15 binary/ternary choices. On any viewport ≥640px there's room to share rows.

The previous change's design D6 explicitly rejected nested grids ("keep one group per row"). That decision is being reversed: at wider viewports we pack the compact groups onto shared rows.

## What Changes

- **Wrap** the five compact groups (Voice, Polarity, Modality, Person, Number) in a parent CSS Grid inside `apps/web/components/playground.tsx`.
- **Column count for the parent grid:**
  - **<640px (mobile)** → 1 column (each group on its own row, today's layout).
  - **≥640px (`sm`)** → 2 columns.
  - **≥1024px (`lg`)** → 3 columns.
- **Mood, Tense, and Form (non-finite) stay full-width.** They have 4–10 options and benefit from the within-group 2/3-col grid established by the prior change. Packing them next to short groups would be visually noisy.
- **Vertical spacing**: inner fieldsets keep their `mt-6` margin — that already provides row separation when stacked. Combined with a `gap-x-6` column gap and `gap-y-0` row gap, the grid degrades cleanly to the existing single-column stack on mobile.
- **Supersedes design D6** of `improve-playground-option-grid`. The previous justification ("nested grids add complexity") is outweighed by the vertical-density gain users actually see.

## Capabilities

The change extends `interactive-playground` with one additional layout requirement. No spec-deltas to other capabilities.

## Impact

- **Code** — `apps/web/components/playground.tsx` (one new wrapper element around the existing fragment).
- **Tests** — one new e2e in `apps/web/e2e/playground-control-density.spec.ts` asserting the parent-grid layout at three viewport sizes.
- **No data, API, or engine changes.**
- **Audience tier** — All audiences benefit. Researchers and learners scanning the controls see a shorter, denser panel.

## Non-Goals

- **No reordering of options** within Voice, Polarity, Modality, Person, Number.
- **No semantic regrouping** (e.g., not labeling Person+Number as a combined "Subject" control). Each fieldset keeps its own `<legend>`.
- **No animation** between viewport breakpoints.
- **No change to the within-group layout** for Mood, Tense, Form — they continue to use the 2/3-col grid from `improve-playground-option-grid`.
- **No JS-driven repacking.** Pure CSS Grid + Tailwind responsive utilities.

## Sequence

```
PREREQ → improve-playground-option-grid (within-group layout)
PREREQ → fix-playground-full-corpus     (engine wiring)
THIS   → improve-playground-control-density
```
