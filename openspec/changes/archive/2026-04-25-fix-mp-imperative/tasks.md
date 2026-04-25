## 1. Pre-flight

- [x] 1.1 Read proposal.md and both spec deltas
- [x] 1.2 Re-read `buildImperative` in `packages/engine/src/conjugate.ts`

## 2. Engine — voice-aware buildImperative

- [x] 2.1 Change signature to `buildImperative(entry, person, number, voice)`
- [x] 2.2 For `voice === 'middle-passive'`, look up `entry.cellOverrides?.['imperative.present.middle-passive']?.[cell]`. Return single-segment `ResolvedCell` if present
- [x] 2.3 Otherwise throw `UnsupportedCellError(\`${cell}/imperative/middle-passive\`, '...')`
- [x] 2.4 Update the `case 'imperative'` site in the orchestrator to thread `voice` through

## 3. Corpus — MP imperative overrides

- [x] 3.1 Add `imperative.present.middle-passive: { '2sg': 'lahu', '2pl': 'lahuni' }` to `data/verbs/laj.json`
- [x] 3.2 Add `imperative.present.middle-passive: { '2sg': 'shihu', '2pl': 'shihuni' }` to `data/verbs/shoh.json`
- [x] 3.3 Verify build pipeline (`npx tsx scripts/build-corpus.ts`) succeeds

## 4. UI — remove imperativeOnly MP-skip workaround

- [x] 4.1 In `apps/web/components/conjugation-table.tsx`, remove the `!imperativeOnly &&` clause guarding the `hasMp` computation. The natural `hasMp` check now correctly handles imperative because the engine throws for verbs without overrides
- [x] 4.2 Confirm that `/verb/punoj` still has no MP imperative row, `/verb/laj` and `/verb/shoh` have one

## 5. verify-engine — probe MP imperative

- [x] 5.1 Add `{ mood: 'imperative', tense: 'present' }` and `{ mood: 'imperative', tense: 'present', voice: 'middle-passive' }` to the `CellSpec[]` list. Restrict person to 2 (per the existing imperative-cell handling)
- [x] 5.2 Run `npx tsx scripts/verify-engine.ts` and confirm zero new mismatches; capture new baseline

## 6. Tests

- [x] 6.1 Add vitest scenarios in `packages/engine/test/imperative-mp.test.ts` covering: laj 2sg/2pl returns `lahu`/`lahuni`; shoh 2sg/2pl returns `shihu`/`shihuni`; punoj 2sg MP throws; flas 2sg MP throws
- [x] 6.2 E2E: assert `/verb/laj` renders `lahu` in the MP imperative cell
- [x] 6.3 E2E: assert `/verb/punoj` has no `imperative-present-2sg-mp` anchor

## 7. Validation and archive

- [x] 7.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 7.2 `openspec validate fix-mp-imperative --strict` — zero errors
- [x] 7.3 Archive
