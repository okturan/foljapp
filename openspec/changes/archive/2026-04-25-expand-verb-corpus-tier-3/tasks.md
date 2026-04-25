## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/verb-corpus/spec.md
- [x] 1.2 Confirm `expand-verb-corpus-tier-2` and `complete-husic-verification` have landed
- [x] 1.3 Inventory existing corpus IDs to avoid manifest collisions

## 2. Manifest authoring

- [x] 2.1 Create `data/sources/tier-3-manifest.json` listing 100 lemmas grouped into 4 sub-batches per design D1
- [x] 2.2 For each lemma: cross-check Kote & Biba 2019 rank; assign tentative frequency tier
- [x] 2.3 Mark `irregular: true` for verbs likely needing cellOverrides
- [x] 2.4 Validate manifest by spot-checking 10 lemmas against Kaikki entries

## 3. Sub-batch 3a — Class 1 (40 verbs)

- [x] 3.1 Run `npx tsx scripts/ingest-kaikki-batch.ts data/sources/tier-3-manifest.json` filtered to 3a entries
- [x] 3.2 For each auto-scaffolded verb: confirm `verify-engine.ts --only-verb <id>` is clean
- [x] 3.3 For each `irregular: true` verb: hand-craft per design D3 workflow
- [x] 3.4 Sub-batch 3a complete when all 40 pass verify-engine

## 4. Sub-batch 3b — Class 2 (35 verbs)

- [x] 4.1 Run ingestion for 3b entries
- [x] 4.2 Hand-craft cellOverrides for ~10 mutating verbs (k→q, g→gj patterns) and 5 suppletives (`bie`, `pres`, `vdes`, etc.)
- [x] 4.3 Verify

## 5. Sub-batch 3c — Class 3 (15 verbs)

- [x] 5.1 Run ingestion for 3c entries (most will throw / TODO)
- [x] 5.2 Hand-craft all 15 (vowel-stem irregulars: `fle`, `lë`, `eci`, etc.)
- [x] 5.3 Verify

## 6. Sub-batch 3d — Reflexive / MP-only (10 verbs)

- [x] 6.1 Hand-craft each MP-only verb per design D2 (Option A: lemma=MP form, full cellOverrides)
- [x] 6.2 Document in each verb's `notes` field: "MP-only lemma; cellOverrides cover all cells; querying voice=middle-passive returns u-prefixed form (grammatical nonsense, expected)"
- [x] 6.3 Verify

## 7. Frequency tiers + sources

- [x] 7.1 Extend `data/verbs/frequency.json` with tier annotations for all 100 new verbs
- [x] 7.2 For verbs with Husić cache hits, add `husic` source citation
- [x] 7.3 Confirm `frequency.test.ts` passes

## 8. Re-build + full verify

- [x] 8.1 `npx tsx scripts/build-corpus.ts` (validates schemas, regenerates index)
- [x] 8.2 `npx tsx scripts/verify-engine.ts` across all 200 verbs
- [x] 8.3 Confirm: matches ≥ 16,000; mismatches ≤ 5 (documented)
- [x] 8.4 Update `packages/engine/docs/sources.md` baseline + per-class breakdown

## 9. UI smoke + e2e

- [x] 9.1 Dev server: visit `/browse`; confirm all 200 verbs in the table
- [x] 9.2 Visit one new verb per sub-batch (3a/3b/3c/3d); confirm full conjugation tables render
- [x] 9.3 Update `apps/web/e2e/search.spec.ts` "browse page lists all verbs" to expect ≥ 200
- [x] 9.4 Add an e2e for one MP-only verb (e.g., `përgjigjem`)
- [x] 9.5 Confirm existing e2e tests still pass

## 10. Documentation

- [x] 10.1 Update `packages/engine/docs/sources.md` with the new baseline + per-class breakdown
- [x] 10.2 Add a note in CLAUDE.md under "OpenSpec hygiene" if any new conventions emerged

## 11. Validation and archive

- [x] 11.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 11.2 `openspec validate expand-verb-corpus-tier-3 --strict` — zero errors
- [x] 11.3 Archive
