## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/pronunciation/spec.md
- [x] 1.2 Confirm `add-ipa-stress-marking` has landed (default rule + initial registry)

## 2. Audit script

- [x] 2.1 Create `scripts/audit-stress.ts`
- [x] 2.2 Walk every corpus verb; generate ~12 representative forms per verb
- [x] 2.3 For each form: compute engine IPA, look up reference, compare
- [x] 2.4 Output divergences with diagnostic + recommended action
- [x] 2.5 Exit zero only when reference + registry covers every form

## 3. Reference set authoring

- [x] 3.1 Author initial reference set in script: ~50–100 representative forms across the corpus, each with a Newmark/Buchholz citation
- [x] 3.2 Cover Class 1 -oj/-aj/-ej, Class 2, Class 3, MP-stem patterns
- [x] 3.3 Cover aorist 3sg of -j verbs (these are systematic; encoded as either heuristic or registry)
- [x] 3.4 Cover monosyllables (jam, kam, bëj, etc.)

## 4. First audit run

- [x] 4.1 Run `npx tsx scripts/audit-stress.ts` against current corpus + initial reference
- [x] 4.2 Triage divergences:
  - Heuristic refinement candidates: count and decide
  - Registry entries to add
  - Reference-set errors to correct

## 5. Heuristic refinement

- [x] 5.1 If aorist-3sg-of-j-verbs is widely systematic: encode in `placeStress` per design D3
- [x] 5.2 Re-run audit; expect divergences to drop
- [x] 5.3 Add unit tests in `apps/web/lib/stress.test.ts` for the new heuristic

## 6. Registry growth

- [x] 6.1 For each remaining divergence: add a `data/stress-overrides.json` entry with source citation
- [x] 6.2 Re-run audit until zero divergences
- [x] 6.3 Confirm registry is well-formed via existing schema check

## 7. CI gate

- [x] 7.1 Add `apps/web/lib/audit-stress.test.ts` (or `packages/engine/test/audit-stress.test.ts` — wherever fits) that calls the audit's check function
- [x] 7.2 Verify it fails when an artificial divergence is introduced; passes when clean
- [x] 7.3 Confirm full `npm test` runs in < 30 seconds

## 8. Documentation

- [x] 8.1 Update `data/stress-overrides.json`'s top-level field documentation (or add a sibling `data/stress-overrides.README.md`) explaining the audit workflow + source policy
- [x] 8.2 Reference the audit script in `packages/engine/docs/sources.md`

## 9. Validation and archive

- [x] 9.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 9.2 audit-stress.ts exits clean against full corpus
- [x] 9.3 `openspec validate expand-stress-override-registry --strict` — zero errors
- [x] 9.4 Archive
