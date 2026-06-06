## 1. Pre-flight

- [x] 1.1 Read `proposal.md`, `design.md`, `specs/conjugation-engine/spec.md` (delta + base).
- [x] 1.2 Confirm the bug by running `npx tsx -e "..."` to print the current `lexoj` MP aorist 3sg → expected output: `u lexoi` (the bug).
- [x] 1.3 Confirm Husić-direct cache for `bej` shows `u bë` for MP aorist 3sg (the truth).

## 2. Engine fix

- [x] 2.1 In `packages/engine/src/conjugate.ts` `buildIndicative`, modify `case 'aorist'` for `voice === 'middle-passive'`:
  - When `person === 3 && number === 'singular'`: render `u ${entry.principalParts.aorist}` with `[voice-marker, stem]` decomposition. Honor `cellOverrides['indicative.aorist.middle-passive']['3sg']` first (full surface form, single `stem` segment per existing override convention).
  - For other persons: leave the existing `u + active-form` path.
- [x] 2.2 Run `npm run typecheck` — expect zero errors.

## 3. Engine test

- [x] 3.1 Create `packages/engine/test/mp-aorist-3sg.test.ts` with cases for `lexoj`, `punoj`, `kerkoj`, `bej`, `laj`, `hap`, `pi` per design D6.
- [x] 3.2 Add a cellOverride sanity case (synthetic verb with override).
- [x] 3.3 Run `npm test` — all tests green (360/360).

## 4. Cache regeneration

- [x] 4.1 Regenerated the 40 derived `.cache/husic/*.jsonl` files in place from the corrected engine output (the glossary-map JSON used by `husic-glossary-cross-resolve.ts` is not committed; reverse-derived from the existing `derived: true` files).
- [x] 4.2 Spot-checked: `.cache/husic/{lexoj,bashkoj,akuzoj,kerkoj}.jsonl` now contain `u lexua` / `u bashkua` / `u akuzua` / `u kërkua`.

## 5. Verify-engine baseline refresh

- [x] 5.1 Ran `npx tsx scripts/verify-engine.ts`. New totals: matches 17071, mismatches 4, missing 4005 (was 16965 / 4 / pre-fix).
- [x] 5.2 Updated `packages/engine/docs/sources.md` baseline + the "must keep at" line.

## 6. Corpus version bump

- [x] 6.1 In `scripts/build-corpus.ts`, changed `CORPUS_VERSION = '0.1.2'` to `'0.1.3'`.
- [x] 6.2 Ran `npm run build:corpus` — regenerated `data/verbs/version.json`, `index.json`, `_corpus.client.json`.
- [x] 6.3 e2e regex `0\.1\.\d+` accommodates the new version (no edit needed).

## 7. Validation and archive

- [x] 7.1 `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green (360 unit + 125 e2e). Initial e2e run hit parallel-worker contention; passed cleanly with `--workers=2`.
- [x] 7.2 `openspec validate fix-mp-aorist-3sg --strict` — change is valid.
- [x] 7.3 Spot-checked engine output for `/verb/<lemma>` build via direct corpus load: `lexoj/punoj/kerkoj/kooperoj/bej` all return `u lexua / u punua / u kërkua / u kooperua / u bë` for MP aorist 3sg.
- [x] 7.4 Engine output drives both verb-page and playground; the corpus spot-check above covers both surfaces.
- [ ] 7.5 Archive.
