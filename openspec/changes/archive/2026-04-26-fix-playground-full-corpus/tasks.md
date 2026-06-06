## 1. Pre-flight

- [x] 1.1 Read `proposal.md`, `design.md`, `specs/interactive-playground/spec.md` (delta + base).
- [x] 1.2 Confirm `data/verbs/_corpus.client.json` does not yet exist.

## 2. Build pipeline

- [x] 2.1 In `scripts/build-corpus.ts`, add a `CORPUS_VERSION` constant set to `'0.1.1'` (matches the current hand-bumped `version.json`). Use it in `emitVersion` instead of the hardcoded `'0.1.0'`.
- [x] 2.2 Add `emitClientBundle(entries)` that writes `data/verbs/_corpus.client.json` containing the full `VerbEntry[]` array (ordered by `id`, pretty-printed).
- [x] 2.3 Wire `emitClientBundle` into `main()` after the round-trip gate, before `emitIndex`.
- [x] 2.4 Run `npm run build:corpus` and verify the new file appears at `data/verbs/_corpus.client.json` with 204 entries.

## 3. Client refactor

- [x] 3.1 In `apps/web/lib/corpus-client.ts`, replace the 20 individual JSON imports with a single import of `_corpus.client.json`.
- [x] 3.2 Cast the imported value to `VerbEntry[]`.
- [x] 3.3 Confirm `ensureClientConfigured()` and `findClientEntry()` exports are unchanged.
- [x] 3.4 Run `npm run typecheck` — expect zero errors.

## 4. Test coverage

- [x] 4.1 Add an e2e in `apps/web/e2e/playground-full-corpus.spec.ts`:
  - Navigate to `/playground?verb=dhemb&mood=indicative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative`. Expect the result panel to contain the conjugated form for `dhemb` (e.g., the surface should match the engine's output) and NOT contain "Unknown verb".
  - Sample 5 random non-seed corpus lemmas (e.g., `kërkoj`, `tregoj`, `qëndroj`, `lejoj`, `kontrolloj`) and assert the same pattern.
- [x] 4.2 Add a unit test in `apps/web/lib/corpus-client.test.ts`: load the module, call `ensureClientConfigured()`, and assert `listVerbs().length` matches the count in `data/verbs/index.json`.

## 5. Validation and archive

- [x] 5.1 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green.
- [x] 5.2 `openspec validate fix-playground-full-corpus --strict` — zero errors.
- [x] 5.3 Manual sanity: load `/playground` in dev, change verb to a few non-seed lemmas (`dhemb`, `kërkoj`, `qëndroj`), confirm conjugation appears.
- [x] 5.4 Archive.
