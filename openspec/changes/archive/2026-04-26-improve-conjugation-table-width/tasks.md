## 1. Pre-flight

- [x] 1.1 Read `proposal.md`, `design.md`, `specs/reference-pages/spec.md` (delta + base).
- [x] 1.2 Inspect `apps/web/app/verb/[lemma]/page.tsx`, `apps/web/components/conjugation-table.tsx`, and `apps/web/components/decomposed-form.tsx` to confirm current class names.

## 2. Container widening

- [x] 2.1 In `apps/web/app/verb/[lemma]/page.tsx`, change the `<main>` wrapper className from `mx-auto max-w-3xl px-6 py-10` to `mx-auto max-w-3xl lg:max-w-5xl xl:max-w-6xl px-6 py-10`.

## 3. Cell compression

- [x] 3.1 In `apps/web/components/conjugation-table.tsx`, change cell `<td>` padding from `py-3 px-3` to `py-2.5 px-2` (active and MP rows; both 6-cell and 2-cell layouts).
- [x] 3.2 Change the TENSE row-label `<th>` padding from `py-3 pr-4` to `py-2.5 pr-2` and add `whitespace-nowrap` so long labels (e.g., `future-perfect-in-past`) keep on one line.
- [x] 3.3 Change the TENSE column header `<th>` padding from `py-2 pr-4` to `py-2 pr-2`.

## 4. DecomposedForm font sizing

- [x] 4.1 In `apps/web/components/decomposed-form.tsx`, change the outer `<span>` className from `font-mono text-base` to `font-mono text-inherit`. Verify in the playground (text-3xl wrapper) and non-finite-forms (default body text-base) that DecomposedForm still renders at the expected size.

## 5. Sticky TENSE column

- [x] 5.1 In `apps/web/components/conjugation-table.tsx`, on the TENSE-column header `<th>` and on each row's label `<th>`, add `sticky left-0 z-10 bg-white border-r border-stone-100`.
- [x] 5.2 For MP rows (whose `<tr>` has `bg-stone-50/50`), the sticky `<th>` background needs to match the row tint — use `bg-stone-50/95` (or another sufficiently-opaque match) so sliding cells aren't visible behind it.
- [x] 5.3 Confirm the inner table wrapper retains `overflow-x-auto` — sticky positioning requires a positioned ancestor and a scrolling overflow.

## 6. Test coverage

- [x] 6.1 Add `apps/web/e2e/verb-page-table-width.spec.ts`:
  - At viewport 1280px, navigate to `/verb/kooperoj`. Assert `#indicative-present-3pl`'s bounding `right` ≤ `window.innerWidth`.
  - At viewport 1024px, same assertion.
  - At viewport 375px, assert the TENSE-column `<th>`'s computed `position` is `sticky` and `left` is `0px`.

## 7. Validation and archive

- [x] 7.1 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green.
- [x] 7.2 `openspec validate improve-conjugation-table-width --strict` — zero errors.
- [x] 7.3 Manual sanity at viewport widths 375, 768, 1024, 1280: visit `/verb/kooperoj` and `/verb/punoj`. Confirm at lg+ all 6 person/number columns are fully visible without scrolling. At 375px, confirm sticky TENSE column.
- [x] 7.4 Verify the playground's result panel (which uses DecomposedForm) renders at the expected text-3xl size — no regression from the inherit change.
- [x] 7.5 Archive.
