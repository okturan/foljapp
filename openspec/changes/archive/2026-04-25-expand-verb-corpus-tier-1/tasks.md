## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/verb-corpus/spec.md
- [x] 1.2 Confirm `refine-verify-engine-tagging` has landed (clean baseline; conditional cells matching)
- [x] 1.3 Optional but recommended: confirm `add-husic-verification-source` has landed for stronger verification

## 2. Manifest

- [x] 2.1 Create `data/sources/tier-1-manifest.json` listing the 30 lemmas with class/auxiliary hints (per design D2)
- [x] 2.2 Cross-check each lemma against Kote & Biba 2019 ranking; document tier assignment
- [x] 2.3 Add to-be-resolved entries (the four marked uncertain in D2) with explicit notes

## 3. Bulk-ingestion tooling

- [x] 3.1 Create `scripts/ingest-kaikki-batch.ts` per design D4
- [x] 3.2 Implement Kaikki fetch (URL pattern from existing `scripts/verify-engine.ts:kaikkiUrlFor`)
- [x] 3.3 Implement principal-parts parsing from Kaikki headword + inflection table (the headword usually carries the present 1sg; aorist 1sg and participle come from specific tagged forms)
- [x] 3.4 Implement class inference: lemma ending in `-j` → Class 1; vowel-final → Class 3; consonant-final → Class 2 (with manifest hint as authoritative override)
- [x] 3.5 Default auxiliary to `kam`; manifest override for the rare `jam`-aux verbs
- [x] 3.6 Emit scaffolded `data/verbs/<id>.json` with sources, no cellOverrides initially
- [x] 3.7 Run `verify-engine.ts --only-verb <id>` after each scaffold; capture pass/fail
- [x] 3.8 Mark TODO entries in `notes` field for failing verbs
- [x] 3.9 Vitest coverage of the principal-parts parser (5+ representative inputs)

## 4. Ingestion run

- [x] 4.1 Run `npx tsx scripts/ingest-kaikki-batch.ts data/sources/tier-1-manifest.json` and inspect output
- [x] 4.2 For each TODO-marked verb: investigate the verify-engine output, determine the cellOverride needed, hand-edit the JSON, re-run `verify-engine.ts --only-verb <id>` until clean
- [x] 4.3 Confirm all 30 new files exist and validate against `verbEntrySchema`

## 5. Frequency tiers

- [x] 5.1 Extend `data/verbs/frequency.json` with tier entries for the 30 new verbs
- [x] 5.2 Cross-check tier assignments against Kote & Biba ranks; adjust if any verb is misranked
- [x] 5.3 Confirm `frequency.json` parses (existing schema)

## 6. Re-build + full verify

- [x] 6.1 Run `npx tsx scripts/build-corpus.ts` (validates schemas, regenerates index)
- [x] 6.2 Run `npx tsx scripts/verify-engine.ts` across all 50 verbs; confirm zero mismatches
- [x] 6.3 Update the recorded baseline in `packages/engine/docs/sources.md`

## 7. UI smoke test

- [x] 7.1 Run dev server and visit `/browse` — confirm all 50 verbs appear in the table
- [x] 7.2 Visit a few new verb pages (`/verb/dal`, `/verb/mësoj`, `/verb/blej`) — confirm full conjugation tables render
- [x] 7.3 Search for a tier-1 lemma — confirm it appears in suggestions

## 8. E2E coverage

- [x] 8.1 Add an e2e assertion that `/browse` table count is ≥ 50
- [x] 8.2 Add an e2e for `/verb/dal` rendering correctly (motion verb, irregular aorist)
- [x] 8.3 Confirm existing e2e tests still pass (no regressions from corpus expansion)

## 9. Documentation

- [x] 9.1 Update `packages/engine/docs/sources.md` with the new baseline + per-verb match rate table
- [x] 9.2 Document the ingestion workflow in `scripts/ingest-kaikki-batch.ts` JSDoc

## 10. Validation and archive

- [x] 10.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 10.2 `openspec validate expand-verb-corpus-tier-1 --strict` — zero errors
- [x] 10.3 Archive
