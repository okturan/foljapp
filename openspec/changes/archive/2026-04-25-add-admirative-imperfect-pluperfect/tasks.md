## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/conjugation-engine/spec.md; confirm the scope is unchanged
- [x] 1.2 Re-read `packages/engine/src/conjugate.ts:465–497` (the `buildAdmirative` function) and `packages/engine/src/auxiliaries.ts` to ground the implementation against the current code
- [x] 1.3 Re-confirm Kaikki coverage for at least one verb per class plus all 5 suppletives; document the verified surface forms in a scratch note (used during implementation, deleted before commit)

## 2. Auxiliary table additions

- [x] 2.1 Extend the `AuxiliaryTenseKey` union in `packages/engine/src/auxiliaries.ts` to include `'admirative.imperfect'`
- [x] 2.2 Add `admirative.imperfect` block to the `kam` auxiliary (`paskësha, paskëshe, paskësh, paskëshim, paskëshit, paskëshin`)
- [x] 2.3 Add `admirative.imperfect` block to the `jam` auxiliary (`qenkësha, qenkëshe, qenkësh, qenkëshim, qenkëshit, qenkëshin`)

## 3. Paradigm rule additions

- [x] 3.1 Add `admirativeImperfectActive` to the paradigm tense union (`packages/engine/src/conjugate.ts` line ~86) and the corresponding label-mapping switch (line ~218)
- [x] 3.2 Add `admirativeImperfectActive` rule to `class-1` paradigm (`packages/engine/src/paradigms/class-1.ts`) — `stem: 'participle'`, endings `-kësha/-këshe/-kësh/-këshim/-këshit/-këshin`
- [x] 3.3 Add `admirativeImperfectActive` rule to `class-2` paradigm (same shape)
- [x] 3.4 Add `admirativeImperfectActive` rule to `class-3` paradigm (same shape)
- [x] 3.5 Widen the `effectiveTrim` branch at `conjugate.ts:154–157` to cover `admirativeImperfectActive` (so it uses `admirativeTrim()` like admirative present does)

## 4. Replace UnsupportedCellError throws

- [x] 4.1 Replace the `imperfect` case in `buildAdmirative` (conjugate.ts:490) with a real builder that dispatches to `buildSimpleCell(entry, 'admirativeImperfectActive', person, number)` for active voice, and continues to throw `UnsupportedCellError` for middle-passive voice
- [x] 4.2 Replace the `pluperfect` case (conjugate.ts:491) with a real builder that composes `buildAuxiliaryCell(aux, 'admirative.imperfect', ...) + ' ' + participle` for active voice, with proper `auxiliary` + `stem` decomposition; continue to throw for middle-passive

## 5. Suppletive verifications and overrides

- [x] 5.1 Run the engine for each suppletive (`jam`, `jap`, `shoh`, `vij`, `them`) at admirative imperfect 1sg–3pl; compare against Kaikki
- [x] 5.2 For any suppletive whose rule-derived form does not match Kaikki, add an entry to the `suppletion.ts` table covering admirative imperfect (mirror the existing admirative-present override pattern)
- [x] 5.3 Confirm `shoh` produces `pakësha…pakëshin` (suppletive root `pa-`)
- [x] 5.4 Confirm `jam` produces `qenkësha…qenkëshin` via the `jam` auxiliary table itself (when used as a lexical verb), not the lexical paradigm

## 6. Pluperfect composition for suppletives and jam-aux

- [x] 6.1 Verify pluperfect for `jam` returns `paskësha qenë` (kam-aux compound on jam's participle)
- [x] 6.2 Verify pluperfect for `vij` returns `paskësha ardhur` (vij is kam-aux per its corpus entry; matches Kaikki)
- [x] 6.3 Verify pluperfect for `shoh` returns `paskësha parë`

## 7. verify-engine extension

- [x] 7.1 Add `{ mood: 'admirative', tense: 'imperfect' }` and `{ mood: 'admirative', tense: 'pluperfect' }` to the `CellSpec[]` list in `scripts/verify-engine.ts`
- [x] 7.2 Run `npx tsx scripts/verify-engine.ts` and confirm zero mismatches; if mismatches surface, fix paradigm or add `cellOverrides` to the offending verb's corpus entry, then re-run until clean
- [x] 7.3 Capture the new total cell count and 100% match-rate in a comment on the script (or in commit message)

## 8. Engine unit tests

- [x] 8.1 Add vitest scenarios in `packages/engine/test/admirative-imperfect.test.ts` covering: punoj all six cells, flas all six cells, pjek 1sg, jam 1sg, shoh 1sg, djeg 1sg
- [x] 8.2 Add vitest scenarios in `packages/engine/test/admirative-pluperfect.test.ts` covering: punoj all six cells, flas 1sg, jam 1sg (`paskësha qenë`), pjek 1sg, vij 1sg
- [x] 8.3 Add a vitest assertion that middle-passive admirative imperfect throws `UnsupportedCellError` for `flas` 1sg
- [x] 8.4 Add a vitest assertion that middle-passive admirative pluperfect throws `UnsupportedCellError` for `flas` 1sg
- [x] 8.5 Add a decomposition assertion: pluperfect 1sg of `punoj` decomposes into one `auxiliary` segment (`paskësha`) and one `stem` segment (`punuar`)

## 9. Web E2E coverage

- [x] 9.1 Update or add an E2E test (`apps/web/e2e/verb-page.spec.ts` or new file) asserting that `/verb/flas` renders `folkësha` somewhere on the page (admirative imperfect 1sg)
- [x] 9.2 Add an E2E test asserting that `/verb/flas` renders `paskësha folur` somewhere on the page (admirative pluperfect 1sg)
- [x] 9.3 Confirm no existing verb-page or playground test breaks (the previously-empty admirative imperfect/pluperfect cells will now contain content; tests that asserted "empty" or relied on dash placeholders need updating if any exist)

## 10. Documentation

- [x] 10.1 Update `packages/engine/docs/sources.md` — remove the deferral note for admirative imperfect/pluperfect; bump the recorded match-rate baseline to the new total
- [x] 10.2 Update the inline comment near the top of `buildAdmirative` if any references the deferral

## 11. Validation and handoff

- [x] 11.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green
- [x] 11.2 Update spec scenarios if implementation surfaced any clarifications (e.g., a suppletive whose form differs from what Kaikki shows)
- [x] 11.3 `openspec validate add-admirative-imperfect-pluperfect --strict` — zero errors
- [x] 11.4 Final manual smoke: load `/verb/flas` and `/verb/punoj` in the dev server, visually confirm admirative imperfect/pluperfect rows are populated
