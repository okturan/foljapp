## 1. Pre-flight

- [x] 1.1 Confirm `add-admirative-imperfect-pluperfect` has landed (jam admirative imperfect must be in `auxiliaries.ts`)
- [x] 1.2 Re-read proposal.md, design.md, and specs/conjugation-engine/spec.md
- [x] 1.3 Re-read the current `buildAdmirative` in `packages/engine/src/conjugate.ts` post-merge of the active-coverage change

## 2. u-particle helper

- [x] 2.1 Add a `prependUParticle(cell: ResolvedCell): ResolvedCell` helper near the other compose helpers in `packages/engine/src/conjugate.ts`
- [x] 2.2 The helper SHALL prepend `'u'` to surface and inject a `particle` segment with `particleName: 'u'` and `voice: 'middle-passive'` at index 0 of segments

## 3. Voice-aware admirative builders

- [x] 3.1 Modify `buildAdmirative` `present` case: dispatch to `buildSimpleCell(...)`, then conditionally `prependUParticle` for MP voice
- [x] 3.2 Modify `buildAdmirative` `imperfect` case: same shape — buildSimpleCell + conditional u-prefix for MP
- [x] 3.3 Remove the MP-throw branches from `pluperfect` (perfect was already not-throwing). Both compound cases run the existing auxForm + participle composition with `aux = 'jam'` for MP voice

## 4. verify-engine support for "u —" no-ground-truth

- [x] 4.1 In `scripts/verify-engine.ts:probeCell`, detect `kaikkiForm === 'u —'` (literal) and treat it as `kaikkiForm = null`
- [x] 4.2 Confirm the script's match-rate counters exclude these cells (same path as cells Kaikki lacks an entry for)
- [x] 4.3 Extend the cell list to probe MP voice for admirative present/imperfect/perfect/pluperfect

## 5. Engine unit tests

- [x] 5.1 Add vitest scenarios in `packages/engine/test/admirative-mp.test.ts` covering MP admirative present (`u folkam` for flas, `u punuakam` for punoj, `u pakam` for shoh)
- [x] 5.2 Add vitest scenarios for MP admirative imperfect (`u folkësha`, `u punuakësha`, `u pakësha`)
- [x] 5.3 Add vitest scenarios for MP admirative perfect (`qenkam folur`, `qenkam punuar`, `qenkam parë`)
- [x] 5.4 Add vitest scenarios for MP admirative pluperfect (`qenkësha folur`, `qenkësha punuar`, `qenkësha parë`)
- [x] 5.5 Add a regression test for the pre-existing bug: `punoj` MP admirative present 1sg SHALL equal `"u punuakam"`, NOT `"punuakam"`

## 6. Run verify-engine + reconcile

- [x] 6.1 Run `npx tsx scripts/verify-engine.ts` and confirm zero unexpected mismatches
- [x] 6.2 Resolve any verb-specific mismatches (likely none) via cellOverrides or paradigm tweak
- [x] 6.3 Capture the new total cell count (previously 1406+N from `add-admirative-imperfect-pluperfect`; gains MP admirative cells where Kaikki has positive forms)

## 7. Web E2E

- [x] 7.1 Add an e2e assertion that `/verb/flas` renders `u folka` (MP admirative present 3sg, the cell Kaikki actually has)
- [x] 7.2 Add an e2e assertion that `/verb/flas` renders `qenkam folur` (MP admirative perfect 1sg)
- [x] 7.3 Confirm no existing test breaks

## 8. Documentation

- [x] 8.1 Update `packages/engine/docs/sources.md` with the MP admirative coverage and the buildSimpleCell-bug fix; bump match-rate baseline

## 9. Validation

- [x] 9.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 9.2 `openspec validate add-mp-admirative-coverage --strict` — zero errors
