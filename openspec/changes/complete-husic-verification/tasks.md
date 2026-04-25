## 1. Source acquisition (manual prerequisite)

- [ ] 1.1 Choose source format per design D1: hand-tabulated TSV, publisher PDF, or library scan + OCR. Document the rationale and any licensing constraints in `packages/engine/docs/husic-format.md` under a new "Source provenance" section
- [ ] 1.2 Acquire the file. Place it under a path the parser can read; do NOT commit copyrighted source content to the repo
- [ ] 1.3 Inspect the file's structure: paradigm tables per verb? regular vs irregular sections? class numbering? Note observations under "Source provenance" so a future re-implementer has the context

## 2. Parser implementation

- [x] 2.1 In `scripts/parse-husic.ts`, replace the `parseHusicSource` stub with a format-specific parser. v1 implementation: markdown-table format (`parseMarkdownTables`); PDF / TSV / image formats remain to be added when source format is finalized
- [x] 2.2 The parser calls `mapHusicLabelToTags(huLabel, persNum)` for every cell to align tags with Kaikki's convention
- [ ] 2.3 The parser SHALL filter Gheg / archaic / dialectal variants at parse time; emit Standard Albanian only — pending real source (current parser passes all forms through; filtering rules are source-specific)
- [x] 2.4 Add unit tests for the parser using fabricated input fixtures (`packages/engine/test/parse-husic.test.ts`, 14 tests covering label-to-tag mapping + markdown table parsing)

## 3. Pilot run on 5 verbs

- [ ] 3.1 Run `npx tsx scripts/parse-husic.ts --source <path> --only-verb punoj` and inspect `.cache/husic/punoj.jsonl`
- [ ] 3.2 Repeat for `flas`, `pjek`, `jam`, `pi`
- [ ] 3.3 Run `npx tsx scripts/verify-engine.ts` for each pilot verb individually (`--verb=<id>`) and inspect output
- [ ] 3.4 For Kaikki-vs-Husić disagreement on shared cells: parser bug — debug, fix, re-run pilot
- [ ] 3.5 For engine-vs-Husić disagreement: real engine bug; fix paradigm / add cellOverride; re-run pilot

## 4. Full corpus pass

- [ ] 4.1 Remove `--only-verb` and run `parse-husic.ts` on all 50 corpus verbs
- [ ] 4.2 Confirm `.cache/husic/<id>.jsonl` exists for each verb (or document the verb as Husić-not-applicable in sources.md)
- [ ] 4.3 Run full `verify-engine.ts` and capture the combined match-rate figures

## 5. Mismatch reconciliation

- [ ] 5.1 Inspect each engine-vs-Husić mismatch surfaced
- [ ] 5.2 Per design D5, fix paradigm bugs (highest priority), add cellOverrides for per-verb irregularities, or escalate parser bugs
- [ ] 5.3 Re-run verify-engine after each batch of fixes; iterate until zero mismatches
- [ ] 5.4 For any "Potential override candidate" warnings (engine throws + Husić has form), triage: add cellOverride if linguistically attested, or leave as deferred with a note

## 6. Documentation

- [ ] 6.1 Update `packages/engine/docs/sources.md` with combined baseline per design D7 — break out per-source counts; list any Husić-not-applicable verbs
- [ ] 6.2 Update `packages/engine/docs/husic-format.md` with the chosen source format, parser implementation notes, and any quirks encountered
- [ ] 6.3 Add a brief note in the project README (if one exists) or in CLAUDE.md indicating that the project is now dual-source-verified

## 7. Validation and archive

- [ ] 7.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [ ] 7.2 `verify-engine.ts` shows zero mismatches and reports combined baseline > 6000 cells
- [ ] 7.3 `openspec validate complete-husic-verification --strict` — zero errors
- [ ] 7.4 Archive
