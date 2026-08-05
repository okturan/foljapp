# Tasks

## 1. Controls skeleton

- [x] 1.1 Render the Tense group unconditionally over the union of all mood
      tenses; disable values outside the selected mood (all under
      `non-finite`, all but `present` under `imperative`).
- [x] 1.2 Render the Form group unconditionally; disable all 5 pills under
      finite moods.
- [x] 1.3 Render the compact grid unconditionally; disable Voice, Polarity,
      Modality, Person and Number under `non-finite`.
- [x] 1.4 Give disabled-by-mood pills the "not available for this mood"
      title, distinct from the feasibility title.
- [x] 1.5 Reserve the verb metadata line's height when no corpus entry
      matches.
- [x] 1.6 Memoise the `ConjugateOptions` object so a parent re-render does
      not re-trigger the examples effect.

## 2. Result pane slots

- [x] 2.1 Reserve a fixed minimum height for the form / IPA / gloss stack.
- [x] 2.2 Render the derivation panel for every selection, with an
      explanatory body when there are no trace steps.
- [x] 2.3 Render the examples section whenever a lookup form exists,
      including for unsupported cells and in-flight requests.

## 3. Examples table stability

- [x] 3.1 Keep previously-loaded rows on screen during a refetch; mark the
      region `aria-busy` and show the standalone loading line only on first
      load.
- [x] 3.2 Switch the table to `table-fixed` with a `<colgroup>` and a
      minimum width inside the horizontal scroll container.
- [x] 3.3 Clamp sentence and context cells to a uniform row height.
- [x] 3.4 Reserve the unfiltered result set's height for the table region
      so All / Local / Translated switching does not resize the pane.
- [x] 3.5 Give the filter counts tabular figures and a reserved width.

## 4. Tests and validation

- [x] 4.1 Replace the superseded "Tense collapses to flex" E2E case with
      its stability counterpart in `playground-option-grid.spec.ts`.
- [x] 4.2 Add `playground-stability.spec.ts`: group positions unchanged
      across all seven moods; examples region height unchanged across
      source filters.
- [x] 4.3 `npm run typecheck`, `npm run lint`, unit tests, playground E2E.
- [x] 4.4 `openspec validate stabilize-playground-layout --strict`.

## 5. Two-pane isolation (follow-up)

- [x] 5.1 Pin the two-pane grid tracks with `minmax(0, …)` and add
      `min-w-0` to both panes, in `playground.tsx` and in the matching
      Suspense fallback in `app/playground/page.tsx`.
- [x] 5.2 Lower the examples table's minimum width below the result pane's
      inner width at `lg` so all three columns stay visible and the scroll
      container engages only on mobile.
- [x] 5.3 Add `playground-pane-isolation.spec.ts` asserting full geometry
      (`x`, `width`, `height`) of every control group across voice
      toggles, the longest form, and all seven moods — the existing
      stability spec asserted `y` only, which is why horizontal coupling
      went unnoticed.
- [x] 5.4 Re-run typecheck, lint, unit tests and the full E2E suite.
