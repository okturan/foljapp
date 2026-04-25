## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/conjugation-engine/spec.md
- [x] 1.2 Re-read `tagsFor` and `findKaikkiForm` in `scripts/verify-engine.ts` (lines 129–186)
- [x] 1.3 Re-confirm Kaikki tagging by greping `.cache/kaikki/punoj.jsonl` for `'conditional'` (active forms only)

## 2. Update tagsFor for conditional

- [x] 2.1 Wrap the existing tense-tag-emission block in a mood switch
- [x] 2.2 For `mood === 'conditional'`: emit `'imperfect'` for tense='present', and `'past' + 'perfect'` for tense='perfect'
- [x] 2.3 All other moods: keep existing behavior (no behavior change for indicative / subjunctive / admirative / optative / imperative)

## 3. Refactor past-disambiguation filter

- [x] 3.1 Replace `if (spec.tense === 'perfect' && ftags.has('past')) continue;` with `if (!wanted.has('past') && ftags.has('past')) continue;`
- [x] 3.2 Add an inline comment explaining the auto-skip semantics (mood-agnostic; the filter relies on tagsFor's own past-emission as the signal)

## 4. Run verify-engine

- [x] 4.1 Run `npx tsx scripts/verify-engine.ts` and capture the new match-rate baseline
- [x] 4.2 Confirm: zero mismatches, conditional cells now matching for all corpus verbs that have Kaikki coverage
- [x] 4.3 If any verb shows new mismatches (unlikely), investigate per-verb cellOverrides or paradigm tweaks before merging

## 5. Documentation

- [x] 5.1 Update `packages/engine/docs/sources.md` match-rate baseline to the new total
- [x] 5.2 Add a bullet in the "How the 100% rate was achieved" section describing the conditional-tag fix

## 6. Tests

- [x] 6.1 No new vitest scenarios needed — the engine output is unchanged. The verify-engine pass IS the test.
- [x] 6.2 No new e2e — UI does not depend on verify-engine

## 7. Validation and archive

- [x] 7.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 7.2 `openspec validate refine-verify-engine-tagging --strict` — zero errors
- [x] 7.3 Archive
