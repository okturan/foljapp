## Why

`add-mp-admirative-coverage` and `fix-mp-imperative` closed two of the three places where `buildSimpleCell` ignored voice and silently returned active forms for MP requests. The third — `buildOptative.present` — was missed.

Empirical confirmation: `conjugate('punoj', { mood: 'optative', tense: 'present', voice: 'middle-passive', person: 1, number: 'singular', ... })` currently returns `'punofsha'` (the active form). It should return `'u punofsha'`. Kaikki for `laj` MP optative present 1sg confirms `u lafsha` (u-prefix + active form).

This change closes the bug AND adds an audit test that asserts every MP cell across the engine's full output either:
1. Surfaces with a `u` voice-marker (or `qenkam`/`qenkësha` jam-aux for compound tenses), OR
2. Throws `UnsupportedCellError`.

The audit catches any future regression where a builder forgets to handle voice.

## What Changes

- **Modify** `buildOptative` in `packages/engine/src/conjugate.ts`:
  - For `voice === 'middle-passive'` in the `present` case: dispatch to `buildSimpleCell(entry, 'optativePresentActive', ...)` then wrap with `prependUMarker(...)` — same shape as the recently-fixed `buildAdmirative` `present` and `imperfect` cases.
  - The `perfect` case already uses `aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary` correctly; no change.
- **Add** a vitest scenario in `packages/engine/test/audit-mp-coverage.test.ts` that iterates every cell of `engine.table()` for several representative verbs (one per class + one suppletive + one mutating). For each MP cell the engine produces, the audit asserts that either:
  - The cell's `decomposition[0].role === 'voice-marker'` (u-prefixed simple tenses), OR
  - The cell's `decomposition[0].role === 'auxiliary'` AND the auxiliary surface starts with `qenkam` / `qenkësha` / `jam` / `je` / etc. (jam-aux forms — voice carried by lexical choice), OR
  - The MP cell is absent (`UnsupportedCellError` was thrown internally).
  
  The audit MUST NOT find a single MP cell whose decomposition has no voice marker AND no jam-aux auxiliary — that would be the silent-active-form bug class.
- **Update** `scripts/verify-engine.ts` to probe MP optative present so the new fix is regression-gated.

## Capabilities

### Modified Capabilities

- `conjugation-engine`: The "Active and middle-passive voice" requirement gains an MP optative present scenario. The "Optative mood coverage" requirement gains an MP scenario. The audit test is documented as a standing regression check.

## Impact

- **Code** — `packages/engine/src/conjugate.ts` (3-line addition), `packages/engine/test/audit-mp-coverage.test.ts` (new), `scripts/verify-engine.ts` (one new cell spec).
- **Dependencies** — None.
- **APIs** — `/api/verbs/[lemma]` JSON: MP optative present cells now contain real surface forms with `u` prefix instead of silent active forms.
- **Linguistic claims** — MP optative is rare in actual usage but morphologically derivable; we produce it consistently with how MP aorist/admirative-simple work.
- **Audience tier** — Researchers (correctness); learners (a few cells gain proper forms).

## Non-Goals

- **No mood/tense coverage beyond MP optative present.** All other MP cells were verified during the audit and are correct.
- **No paradigm-rule changes.** The fix is a one-line `prependUMarker` wrapper at the dispatch site.
- **No expansion of `prependUMarker`.** It already exists with the right semantics (added by `add-mp-admirative-coverage`).
- **No suppletive-table changes.** Suppletives that produce optative present forms via the suppletion table will get the u-prefix too, automatically.
- **No retrofit of older MP-related logic.** Only the optative present builder is touched.

## Sequence

```
PREREQ → add-mp-admirative-coverage      (introduced prependUMarker)
PREREQ → fix-mp-imperative                (verified the buildSimpleCell-ignores-voice fix pattern)
THIS   → complete-mp-voice-arc
```
