## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/conjugation-engine/spec.md
- [x] 1.2 Re-read `buildOptative` in `packages/engine/src/conjugate.ts:499–545`
- [x] 1.3 Confirm `prependUMarker` helper exists (added by add-mp-admirative-coverage)

## 2. Engine fix

- [x] 2.1 Modify `buildOptative.present` case: dispatch to `buildSimpleCell`, then conditionally `prependUMarker` for MP voice (mirrors `buildAdmirative.present`)
- [x] 2.2 Confirm `buildOptative.perfect` already handles voice correctly (it does — uses `aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary`)
- [x] 2.3 Run a sanity check: `conjugate('punoj', { mood: 'optative', tense: 'present', voice: 'middle-passive', person: 1, number: 'singular', ... })` returns `"u punofsha"`

## 3. Audit test

- [x] 3.1 Create `packages/engine/test/audit-mp-coverage.test.ts`
- [x] 3.2 Implement `isVoiceMarked(form, mood, tense)` per design D2
- [x] 3.3 Iterate `engine.table(verb)` for `verb` in `['punoj', 'flas', 'shoh', 'pjek']`; for every cell key ending in `.middle-passive`, assert `isVoiceMarked` returns true
- [x] 3.4 Add a clear failure diagnostic: when a cell fails, the test message names the verb, mood, tense, person/number, the offending form, and links to design D2

## 4. verify-engine extension

- [x] 4.1 Add `{ mood: 'optative', tense: 'present', voice: 'middle-passive' }` to the cell list in `scripts/verify-engine.ts`
- [x] 4.2 Run `npx tsx scripts/verify-engine.ts`; capture new baseline and confirm zero mismatches
- [x] 4.3 If `laj` MP optative present (or any other corpus verb) shows mismatches, investigate and fix

## 5. Vitest scenarios

- [x] 5.1 Add scenarios in `packages/engine/test/admirative-mp.test.ts` (or a new file) covering MP optative present 6 cells for `punoj` and `laj`
- [x] 5.2 Add a scenario asserting MP optative perfect for `punoj` returns `qofsha punuar` (regression check)

## 6. E2E coverage

- [x] 6.1 Add a playground e2e: navigating to `/playground?verb=punoj&mood=optative&tense=present&voice=middle-passive&person=1&number=singular&polarity=affirmative&modality=declarative` SHALL render `u punofsha`
- [x] 6.2 Verify `/verb/punoj` optative MP row shows `u punofsha` etc.

## 7. Documentation

- [x] 7.1 Update `packages/engine/docs/sources.md` — note that the MP voice arc is now complete; bump baseline
- [x] 7.2 Add an inline comment near the audit test explaining its role as a permanent regression gate

## 8. Validation and archive

- [x] 8.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 8.2 `openspec validate complete-mp-voice-arc --strict` — zero errors
- [x] 8.3 Archive
