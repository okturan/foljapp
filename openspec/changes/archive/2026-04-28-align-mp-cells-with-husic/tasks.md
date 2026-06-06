## 1. Pre-flight

- [x] 1.1 Confirmed engine output divergences for `djeg/pjek/marr/shoh/jap/dua` MP indicative present (un-mutated forms emitted pre-fix).
- [x] 1.2 Confirmed `bitis/djeg/gudulis/laj/pjek` produced optative 2pl `-shit` pre-fix.

## 2. Engine fix

- [x] 2.1 `packages/engine/src/conjugate.ts` `SIMPLE_TENSE_OVERRIDE_KEY`: `middlePassivePresent → 'indicative.present.middle-passive'`, `middlePassiveImperfect → 'indicative.imperfect.middle-passive'`. Comment updated.
- [x] 2.2 `npm run typecheck` — zero errors.

## 3. Corpus overrides — Class 2B mutation verbs

- [x] 3.1 `data/verbs/djeg.json` — added MP present (digjem family) and MP imperfect (digjesha family) overrides.
- [x] 3.2 `data/verbs/pjek.json` — added MP present (piqem family) and MP imperfect (piqesha family) overrides.
- [x] 3.3 `data/verbs/marr.json` — added MP present + imperfect overrides (merrem / merresha families).
- [x] 3.4 `data/verbs/shoh.json` — added MP present + imperfect overrides (shihem / shihesha families).
- [x] 3.5 `data/verbs/jap.json` — added MP present (jepem family) override.
- [x] 3.6 `data/verbs/dua.json` — added MP present + imperfect overrides (duhem / duhesha families).

## 4. Corpus override deletions — `-shit`

- [x] 4.1 `data/verbs/bitis.json` — deleted `cellOverrides` entirely (only had the wrong `-shit` entry).
- [x] 4.2 `data/verbs/djeg.json` — removed `optative.present` override.
- [x] 4.3 `data/verbs/gudulis.json` — deleted `cellOverrides` entirely.
- [x] 4.4 `data/verbs/laj.json` — removed `optative.present` override and the misleading note.
- [x] 4.5 `data/verbs/pjek.json` — removed `optative.present` override.

## 5. Engine tests

- [x] 5.1 Created `packages/engine/test/mp-mutation-cells.test.ts` with: Class 2B (djeg/pjek/marr/dua) × present/imperfect 1sg+3pl; subjunctive-imperfect MP cascade; conditional-present MP cascade; voice-axis isolation (synthetic verb); `-shit`→`-shi` regression for djeg/pjek active+MP. (jap and shoh are exercised via the corpus spot-check; not duplicated in fixture-based tests since fixtures.ts already contains shoh and replacing it would cascade through the existing audit-mp-coverage suite.)
- [x] 5.2 `npm test` — 377/377 (was 360; +17 new).

## 6. Cache regeneration + baseline refresh

- [x] 6.1 Regenerated 40 derived `.cache/husic/*.jsonl` files in place via local helper (cleaned up after).
- [x] 6.2 `npx tsx scripts/verify-engine.ts`: matches 17068, mismatches 7, missing 4005. Mismatches are all true Kaikki anomalies (Kaikki active optative 2pl `-shit` for bitis/djeg/gudulis/laj/pjek + the `hekuros` typo).
- [x] 6.3 `packages/engine/docs/sources.md` baseline refreshed; "must keep at" line updated to 17068/17075.

## 7. Corpus version bump

- [x] 7.1 `scripts/build-corpus.ts`: `CORPUS_VERSION` 0.1.3 → 0.1.4.
- [x] 7.2 `npm run build:corpus` — `data/verbs/version.json`, `index.json`, `_corpus.client.json` regenerated for 0.1.4.

## 8. Validation and archive

- [x] 8.1 `npm run typecheck`, `lint`, `test`, `build`, `test:e2e` — all green. (e2e single-flake on `playground-layout.spec.ts:58`, passed on retry; unrelated to this change.)
- [x] 8.2 `openspec validate align-mp-cells-with-husic --strict` — change is valid.
- [x] 8.3 Spot-checked djeg/pjek/marr/shoh/jap/dua MP present + imperfect 1sg via direct corpus load — all match Husić-direct.
- [x] 8.4 Tasks marked.
- [ ] 8.5 Archive.
