## 1. Pre-flight

- [x] 1.1 Read `proposal.md`, `design.md`, and `specs/interactive-playground/spec.md` (delta + base).
- [x] 1.2 Confirm in `apps/web/components/playground.tsx` that Voice / Polarity / Modality / Person / Number are five sequential `RadioGroup` calls inside a `{config.mood !== 'non-finite' ? (<>...</>) : null}` fragment.

## 2. Implementation

- [x] 2.1 Replace the fragment around the five compact RadioGroup calls with `<div data-testid="compact-group-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">…</div>`.
- [x] 2.2 Confirm Mood, Tense, and Form RadioGroup calls remain OUTSIDE the new wrapper.
- [x] 2.3 Run `npm run typecheck` — expect zero errors.

## 3. Test coverage

- [x] 3.1 Add `apps/web/e2e/playground-control-density.spec.ts` covering:
  - Viewport 375 → wrapper has `display: grid` and 1 column track.
  - Viewport 768 → wrapper has 2 column tracks.
  - Viewport 1280 → wrapper has 3 column tracks.
  - At every viewport, Mood and Tense `[data-testid^="option-group-"]` containers are NOT descendants of the compact-group wrapper (they sit above it as siblings).
- [x] 3.2 Verify the existing `playground-option-grid.spec.ts` still passes (within-group layout unaffected).

## 4. Validation and archive

- [x] 4.1 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green.
- [x] 4.2 `openspec validate improve-playground-control-density --strict` — zero errors.
- [x] 4.3 Manual sanity at viewport widths 375, 768, 1024, 1280: confirm Voice/Polarity/Modality/Person/Number pack as 1/2/3/3 columns respectively. Confirm Mood/Tense remain full-width.
- [x] 4.4 Archive.
