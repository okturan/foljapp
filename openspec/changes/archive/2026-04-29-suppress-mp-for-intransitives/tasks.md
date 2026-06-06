## 1. Pre-flight

- [x] 1.1 Confirmed pre-fix: jam/iki/vij MP indicative present 1sg emit `jamem`/`ikem`/`vihem`.
- [x] 1.2 Pre-fix verify-engine baseline: 18794 / 18803 / 9 mismatches.

## 2. Engine

- [x] 2.1 `packages/engine/src/types.ts`: `VerbEntryFlags.noMiddlePassive?: boolean`.
- [x] 2.2 `packages/engine/src/conjugate.ts` `conjugate()`: throws `UnsupportedCellError` when `voice === 'middle-passive'` && `entry.flags?.noMiddlePassive`.
- [x] 2.3 `npm run typecheck` — zero errors.
- [x] Bonus: extended `packages/data/src/schema.ts` `verbEntryFlagsSchema` to allow the new flag (otherwise corpus build fails strict zod validation).

## 3. Corpus

- [x] 3.1 `data/verbs/jam.json`: `flags.noMiddlePassive: true`.
- [x] 3.2 `data/verbs/iki.json`: added `flags: { noMiddlePassive: true }` (didn't have a `flags` block before).
- [x] 3.3 `data/verbs/vij.json`: added `noMiddlePassive: true` to existing flags.

## 4. Tests

- [x] 4.1 `packages/engine/test/audit-mp-coverage.test.ts`: skips verbs with `flags.noMiddlePassive: true`.
- [x] 4.2 `packages/engine/test/no-middle-passive.test.ts` created — 64 cases covering jam/iki/vij/synthetic verb across every supported MP mood/tense; flag-vs-cellOverride precedence; active voice unaffected; table() returns no MP cells for flagged verbs.
- [x] 4.3 `npm test` — 441/441 (was 377; +64 new).

## 5. Cache regeneration + baseline

- [x] 5.1 (No regenerator run needed — flagged verbs aren't in the derived-cache set; non-flagged verbs unaffected by this change.)
- [x] 5.2 `npx tsx scripts/verify-engine.ts` — new totals: 19100 matches (+306), 9 mismatches (unchanged), 13131 missing (-306). The 306 reclassified cells are jam/iki/vij MP cells now correctly hitting the `engineError === 'unsupported' && both null → match` branch.
- [x] 5.3 `packages/engine/docs/sources.md` baseline + "must keep at" line updated to 19100/19109.

## 6. Corpus version bump

- [x] 6.1 `scripts/build-corpus.ts`: `CORPUS_VERSION` 0.1.4 → 0.1.5.
- [x] 6.2 `npm run build:corpus` — corpus 0.1.5 emitted.

## 7. UI verification

- [x] 7.1 `npm run build` — green.
- [x] 7.2 Spot-checked via direct corpus load: `table('jam'/'iki'/'vij').indicative.present` returns 0/0 MP cells (filtered out before reaching the page renderer). Existing e2e suite for verb pages passes.

## 8. Validation

- [x] 8.1 typecheck, lint, 441 unit tests, build, 125 e2e (--workers=1, --retries=2 — 2 flaky layout tests passed on retry, unrelated).
- [x] 8.2 `openspec validate suppress-mp-for-intransitives --strict` — change is valid.

## 9. Archive

- [x] 9.1 Tasks marked.
- [ ] 9.2 Archive.
