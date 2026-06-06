## 1. Pre-flight

- [x] 1.1 Read `proposal.md`, `design.md`, and `specs/interactive-playground/spec.md` (delta + base).
- [x] 1.2 Inspect the current `RadioGroup` helper in `apps/web/components/playground.tsx` to confirm the API and call sites.

## 2. RadioGroup refactor

- [x] 2.1 In `apps/web/components/playground.tsx`, change `RadioGroup`'s inner wrapper to compute layout class based on `options.length`:
  - `<= 3` → `flex flex-wrap gap-2` (current behavior).
  - `>= 4` → `grid grid-cols-2 lg:grid-cols-3 gap-2`.
- [x] 2.2 Add `text-center` to the pill label when in grid mode so labels align in equal-width cells.
- [x] 2.3 Confirm the pill's existing classes (`rounded-md border px-3 py-1.5 text-sm transition-colors`, active/hover variants) remain unchanged.
- [x] 2.4 Add `focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-stone-900` to the `<label>` so the visible pill reflects keyboard focus on the hidden radio.

## 3. Visual verification

- [x] 3.1 `npm run dev`; visit `/playground` and check Mood at viewport widths 360, 768, 1024, 1280:
  - 360/768: 2-column grid (4 rows for Mood).
  - 1024+: 3-column grid (3 rows for Mood).
- [x] 3.2 Switch Mood to `indicative`; confirm Tense (10 options) becomes 2/3-col grid at the same breakpoints.
- [x] 3.3 Switch Mood to `conditional`; confirm Tense (2 options) reverts to flex single-row.
- [x] 3.4 Verify Voice / Polarity / Modality / Person / Number stay flex single-row at all viewports.
- [x] 3.5 Tab through the playground; confirm the focus ring appears on the focused pill.

## 4. Test coverage

- [x] 4.1 Add a Playwright e2e in `apps/web/e2e/playground-layout.spec.ts` (or a new `playground-option-grid.spec.ts`) covering:
  - At 768px viewport, Mood pills' computed `display` is `grid` and `grid-template-columns` resolves to 2 tracks.
  - At 1280px viewport, Mood pills resolve to 3 tracks.
  - At any width, Voice pills' parent has `display: flex` (not grid).
  - Switching Mood to `conditional` flips the Tense container's `display` from `grid` to `flex`.
- [x] 4.2 Add a snapshot or measurement assertion that two Mood pills in the same row have equal `getBoundingClientRect().width` (within 1px).

## 5. Validation and archive

- [x] 5.1 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green.
- [x] 5.2 `openspec validate improve-playground-option-grid --strict` — zero errors.
- [x] 5.3 Manual sanity: visit `/playground?verb=punoj&mood=indicative&tense=future-perfect-in-past&voice=middle-passive&person=3&number=plural&polarity=negative&modality=interrogative` (a worst-case URL) and confirm every group renders cleanly at 360, 768, 1280 viewports.
- [x] 5.4 Archive.
