## 1. Pre-flight

- [x] 1.1 Captured pre-change baseline: 17068 / 17075 matches, 7 mismatches, 4005 missing.
- [x] 1.2 Confirmed `bej.indicative.aorist.middle-passive.3sg = "u bë"` was bucketed as `missing-kaikki` despite Husić-direct having it.

## 2. Verifier change

- [x] 2.1 `scripts/verify-engine.ts`:
  - `FINITE_TENSE_KEYS` typed `Array<{ mood: Mood; tense: Tense; voice?: 'middle-passive' }>`; added MP variants for indicative {present, imperfect, aorist, perfect, pluperfect, future}, subjunctive {present, imperfect, perfect, pluperfect}, conditional {present, perfect}.
  - `formMatchesVoice` strips `do të `, `do `, `të ` particles before MP-shape detection (peeling once each, in that order).
  - Tightened jam-paradigm regexes to require `\s+\S` (continuation) so bare `jam`/`qenkam`/etc. no longer false-match as MP compounds.
  - Added `perfect`-tag exclusion mirroring the existing `past`-tag exclusion in `findKaikkiForm` and `findHusicFormWithProvenance` so future-perfect forms (`do të jemi bërë`) don't mistakenly match future-MP probes (`do të bëhemi`).
- [x] 2.2 `npm run typecheck` — zero errors.
- [x] 2.3 `npx tsx scripts/verify-engine.ts | tail -5` — new totals: 18794 matches, 9 mismatches, 13437 missing.

## 3. Triage surfaced mismatches

- [x] 3.1 Ran verbose. 173 pre-fix mismatches → 65 (after `perfect` filter) → 11 (after jam-paradigm tightening) → 9 (after ha/jap MP aorist 3sg overrides).
- [x] 3.2 Categorized:
  - 6 `-shit` Kaikki anomalies (5 active + 1 MP for laj) — already documented from `align-mp-cells-with-husic`. Engine correct.
  - 1 `hekuros` Kaikki typo — already documented. Engine correct.
  - 2 MP aorist 3sg Kaikki anomalies (`bej` `u bëri`, `laj` `u lau`) — Kaikki applies the buggy active-ending pattern to MP, mirror of the bug we fixed in the engine. Engine correct, Kaikki wrong. Documented.
  - 2 real engine bugs (`ha` `u hëngr` should be `u hëngër`, `jap` `u dhash` should be `u dha`) — fixed inline as one-line cellOverrides.
- [x] 3.3 Applied inline fixes:
  - `data/verbs/ha.json`: added `cellOverrides['indicative.aorist.middle-passive']['3sg'] = 'u hëngër'`.
  - `data/verbs/jap.json`: added `cellOverrides['indicative.aorist.middle-passive']['3sg'] = 'u dha'`.

## 4. Baseline + docs

- [x] 4.1 Updated `packages/engine/docs/sources.md` baseline: 18794 / 18803 across 204 verbs (99.95%); "must keep at" line bumped to 18794/18803.
- [x] 4.2 Added "documented anomalies" section listing all 9 surfaced mismatches with one-line provenance for each.

## 5. Validation

- [x] 5.1 typecheck, lint, 377 unit tests, build, 125 e2e (--workers=1, 2 flaky tests on `playground-full-corpus.spec.ts` for `tregoj`/`kërkoj`/`qëndroj` passed on retry — unrelated dev-server warm-up).
- [x] 5.2 `openspec validate verify-engine-voice-coverage --strict` — change is valid.

## 6. Archive

- [x] 6.1 Tasks marked.
- [ ] 6.2 Archive.
