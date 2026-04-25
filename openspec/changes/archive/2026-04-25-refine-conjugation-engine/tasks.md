## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and both spec files; confirm scope is unchanged
- [x] 1.2 Run `npx tsx scripts/verify-engine.ts` to capture the v0.1.0 baseline (1183 / 1406 = 84%)
- [x] 1.3 Group the mismatches by sub-paradigm pattern (Class 1B vowel-stem, Class 2 stem alternation, Class 2D, Class 3 irregulars, suppletive cell typos)

## 2. Schema + type changes

- [x] 2.1 Add `cellOverrides` to the Zod schema in `packages/data/src/schema.ts`
- [x] 2.2 Add `cellOverrides` to the `VerbEntry` interface in `packages/engine/src/types.ts`
- [x] 2.3 Verify `npm run typecheck` passes across all workspaces

## 3. Engine paradigm fixes

- [x] 3.1 Replace `class-2.ts` admirative trim from 1 to 2 (drop entire -ur)
- [x] 3.2 Add `admirativeTrim(participle)` helper in `conjugate.ts` and use it in place of the rule's static `trim` for admirative cells
- [x] 3.3 Fix `auxiliaries.ts` jam optative 2pl: qofshi → qofshit
- [x] 3.4 Fix `suppletion.ts` shoh admirative: parkam → pakam (and matching plural cells)

## 4. Override consultation

- [x] 4.1 Add top-level override check at the start of `conjugate()` (before mood dispatch) — gated to active voice + affirmative + declarative
- [x] 4.2 Add buildSimpleCell-level override check with `SIMPLE_TENSE_OVERRIDE_KEY` mapping; strip leading `të ` so compound composers can re-prepend
- [x] 4.3 Verify `npm test` (golden-form tests) still passes

## 5. Verification tooling

- [x] 5.1 Add `scripts/verify-engine.ts` that fetches Kaikki JSONL per verb, parses tagged forms, compares against engine output
- [x] 5.2 Add `.cache/` to `.gitignore`
- [x] 5.3 Run baseline; measure improvement after each subsequent fix

## 6. Per-verb cellOverrides

- [x] 6.1 iki — Class 2D pattern (1sg `iki`, 2sg/3sg `ikën`, aorist 3sg `iku`)
- [x] 6.2 ha — consonant-stem aorist endings + irregular optative (ngrën-) + subjunctive 3sg
- [x] 6.3 rri — consonant-stem aorist + aorist-stem-based optative
- [x] 6.4 dua — extensive multi-stem alternation across present, imperfect, aorist, subjunctive 3sg+plurals, optative, imperative
- [x] 6.5 bej — Class 1B -r aorist + imperative `bëj`
- [x] 6.6 laj — Class 1B aorist 3sg `lau` + plurals retain `-ë` + optative 2pl `lafshit` + imperative `laj`
- [x] 6.7 djeg — palatalization `digj` for present 2pl + all imperfect + subjunctive 2pl + imperative + optative 2pl
- [x] 6.8 pjek — palatalization `piq` (parallel pattern to djeg) + optative 2pl `pjekshit`
- [x] 6.9 marr — present-stem alternation `merr` (2sg/3sg/2pl) + imperfect + aorist Class 2 endings on stem `mor` + imperative
- [x] 6.10 flas — three-stem alternation `flas`/`flet`/`flis` + suppletive aorist `fol` + irregular optative + imperative

## 7. Documentation

- [x] 7.1 Update `packages/engine/docs/sources.md` with the 100% baseline + per-cluster fix summary
- [x] 7.2 Add citations for each modified corpus entry pointing to Kaikki

## 8. Validation and handoff

- [x] 8.1 Run `npx tsx scripts/verify-engine.ts` and confirm `mismatches: 0`
- [x] 8.2 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` — all green
- [x] 8.3 Run `openspec validate refine-conjugation-engine --strict` and confirm zero errors
