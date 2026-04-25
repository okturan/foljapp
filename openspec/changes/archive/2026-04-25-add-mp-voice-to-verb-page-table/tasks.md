## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/reference-pages/spec.md
- [x] 1.2 Re-read `apps/web/components/conjugation-table.tsx` and confirm `row[\`${c.key}.active\`]` is the only voice access
- [x] 1.3 Confirm `engine.table()` already populates `.middle-passive` keys via fillFinite (line ~947 in conjugate.ts)

## 2. Render MP rows in ConjugationTable

- [x] 2.1 In the `tenseKeys.map(...)` loop, for each tense compute `hasMp` = whether any of the 6 cells has a `${c.key}.middle-passive` entry in the row
- [x] 2.2 If `hasMp`, emit a second `<tr>` after the active row whose label cell contains the tense name plus a small `MP` badge (`<span className="ml-2 text-[10px] uppercase tracking-wider text-stone-400">MP</span>`)
- [x] 2.3 Each MP cell SHALL use anchor ID `${moodKey}-${tense}-${c.key}-mp` and render via `<DecomposedForm segments={result.decomposition} />`
- [x] 2.4 If a particular cell of an MP row has no entry, render the dash placeholder (consistent with active behavior)

## 3. E2E coverage

- [x] 3.1 Update `apps/web/e2e/verb-page.spec.ts` `flas` test to assert the MP cells: `#admirative-imperfect-3sg-mp` contains `u folkësh`; `#admirative-perfect-1sg-mp` contains `qenkam` and `folur`
- [x] 3.2 Add an assertion that `/verb/punoj` shows MP indicative imperfect 1sg `punohesha` somewhere
- [x] 3.3 Update the JS-disabled test to assert `qenkam` (jam-aux MP perfect) appears in the parsed HTML for `/verb/flas`

## 4. Validation and archive

- [x] 4.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 4.2 `openspec validate add-mp-voice-to-verb-page-table --strict` — zero errors
- [x] 4.3 Archive
