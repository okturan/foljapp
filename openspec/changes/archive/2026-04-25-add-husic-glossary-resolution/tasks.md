## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/conjugation-engine/spec.md
- [x] 1.2 Confirm `complete-husic-verification` has landed (paradigm-model parser + Husić cache infrastructure)
- [x] 1.3 Locate the glossary-section heading in the PDF (page index, exact text)
- [x] 1.4 Sample 5 glossary entries to confirm the `(lemma, class-pattern)` format

## 2. Glossary parser

- [x] 2.1 In `scripts/parse-husic-pdf.py`, add `parse_glossary_section(pdf_pages)` that scans for the section heading and extracts `(lemma, class-pattern)` pairs
- [x] 2.2 Use a regex matching Husić's notation pattern: `^(?P<lemma>[a-zëçA-ZËÇ]+)\s+[—-]\s+(?P<pattern>(?:[IV]+(?:-[IV]+)?(?:-\d+)?[a-z]?|Irr\.))$`
- [x] 2.3 Filter out entries with unparseable patterns; log them
- [x] 2.4 Add unit tests with fabricated glossary input fixtures

## 3. Class-pattern → model index

- [x] 3.1 Add `build_paradigm_model_index(paradigm_entries)` that maps class-pattern → model verb id
- [x] 3.2 Resolve duplicate-pattern cases per design D2 (pick alphabetically-first; document choice)
- [x] 3.3 Confirm the index covers at least the patterns referenced by 80% of glossary entries

## 4. Cross-resolution + derivation

- [x] 4.1 For each glossary entry: skip per D8 conditions (irregular, unresolvable, already direct, has cellOverrides)
- [x] 4.2 For surviving entries: apply paradigm-model template per D4
- [x] 4.3 Emit cache records with `derived: true`; log per-entry success/skip status

## 5. verify-engine provenance tracking

- [x] 5.1 Update `loadHusicForms` to read the `derived` field and propagate to outcomes
- [x] 5.2 Update `CellOutcome` interface with `husicDerived?: boolean`
- [x] 5.3 Update output renderer: `M (h)` for direct, `M (h*)` for derived
- [x] 5.4 Update summary block to break out direct vs derived

## 6. Pilot run

- [x] 6.1 Run on 5 corpus verbs that should be in the glossary (e.g., kerkoj, mesoj, lexoj — currently no Husić data)
- [x] 6.2 Inspect per-verb outcomes; confirm derived records are produced
- [x] 6.3 Confirm verify-engine reports them as M (h*)

## 7. Full run

- [x] 7.1 Run parser on full PDF; populate `.cache/husic/<id>.jsonl` for all glossary-resolvable corpus verbs
- [x] 7.2 Run verify-engine; confirm Husić-derived count ≥ Husić-direct count
- [x] 7.3 Capture combined Husić figure ≥ 1500

## 8. Mismatch reconciliation

- [x] 8.1 For any new mismatches surfaced (engine ≠ derived Husić): triage per D7
- [x] 8.2 Engine bugs: file a separate engine change; don't fix here
- [x] 8.3 Derivation bugs: fix in parser
- [x] 8.4 Husić-vs-engine class-pattern conflicts: document in `husic-format.md`

## 9. Documentation

- [x] 9.1 Update `packages/engine/docs/husic-format.md` with glossary-section spec, derived-vs-direct distinction, and a per-verb sample of how derivation works
- [x] 9.2 Update `packages/engine/docs/sources.md` baseline + Husić breakout

## 10. Validation and archive

- [x] 10.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 10.2 `openspec validate add-husic-glossary-resolution --strict` — zero errors
- [x] 10.3 Archive
