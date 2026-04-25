## MODIFIED Requirements

### Requirement: verify-engine covers admirative imperfect and pluperfect

The `scripts/verify-engine.ts` cell list SHALL include `{ mood: 'admirative', tense: 'imperfect' }` and `{ mood: 'admirative', tense: 'pluperfect' }` for active voice across all corpus verbs. The match-rate baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to the new total (current cells + new admirative cells), and the verification script SHALL maintain a 100% match against Kaikki for these new cells.

The script SHALL ALSO maintain accurate Kaikki tag mapping for moods Kaikki tags non-canonically (conditional present → `imperfect`, conditional perfect → `past + perfect`), and the past-disambiguation filter SHALL be mood-agnostic (auto-skip Kaikki forms tagged `past` when the wanted tag set does not include `past`).

The script SHALL consult Husić's *Albanian Verb Dictionary and Manual* (KU Libraries, 2002) as a secondary verification source for cells where Kaikki returns no form. Husić data SHALL be cached at `.cache/husic/<id>.jsonl` with each record optionally carrying a `derived` boolean field distinguishing two provenance classes:

- **Direct (`derived: false` or absent)** — record was extracted from the paradigm-model section of Husić's PDF (pages ~38–140); the form is verbatim Husić-tabulated.
- **Derived (`derived: true`)** — record was constructed via glossary cross-resolution: the target verb's lemma was looked up in Husić's alphabetical glossary, its class-pattern reference resolved to a paradigm-model verb, and the model's paradigm template applied to the target's principal parts.

The dispatch order is Kaikki → Husić → no-ground-truth. The script's per-cell output annotation distinguishes direct from derived Husić matches: `M (k)` for Kaikki, `M (h)` for direct Husić, `M (h*)` for derived Husić.

The summary block SHALL break out per-source counts including the direct/derived split:

```
Summary:
  matches:    14872 (12331 via Kaikki + 1810 via Husić-direct + 731 via Husić-derived)
  mismatches: 5
  ...
```

Match-rate counts derived matches the same as direct matches; the distinction exists for transparency, not for filtering.

#### Scenario: Direct Husić records lack `derived` field or have `derived: false`

- **WHEN** `scripts/parse-husic-pdf.py` produces a JSONL record from the paradigm-model section
- **THEN** the record SHALL omit the `derived` field, OR SHALL set `derived: false`

#### Scenario: Glossary-derived records carry `derived: true`

- **WHEN** the glossary cross-resolver constructs a record by applying a paradigm model to a glossary-target verb
- **THEN** the record SHALL have `derived: true`

#### Scenario: verify-engine annotates derived matches with `M (h*)`

- **WHEN** `verify-engine.ts --verbose` runs and matches a derived Husić record
- **THEN** the per-cell line SHALL end with `M (h*)`
- **AND** the summary block SHALL count the cell in the `Husić-derived` bucket

#### Scenario: Direct vs derived counts are reported separately

- **WHEN** the script reports its summary
- **THEN** total Husić matches SHALL be broken into "direct" and "derived" sub-counts
- **AND** the combined Kaikki + Husić-direct + Husić-derived figure SHALL equal the overall match count

#### Scenario: Conditional present cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional present 1sg cell

## ADDED Requirements

### Requirement: parse-husic-pdf.py extends to glossary cross-resolution

The Python parser at `scripts/parse-husic-pdf.py` SHALL gain a glossary-section parser that:

1. Identifies the alphabetical glossary section by section heading (e.g., "Albanian-English Verb Glossary" or "Verb Paradigms Index").
2. Extracts `(lemma, class-pattern-ref)` pairs from each glossary entry. The class-pattern reference uses Husić's notation (e.g., `I-1`, `II-3a`, `Irr.`).
3. Builds an in-memory map `class-pattern → paradigm-model-verb-id` from the paradigm-model section's already-parsed entries.
4. For each glossary entry whose class-pattern resolves to a known paradigm model: derive the target verb's principal parts from its lemma (using the same class-aware morphology rules as `ingest-kaikki-batch.ts`), apply the model's paradigm template (replacing the model's stems with the target's stems for each cell), emit `.cache/husic/<target>.jsonl` records each marked with `derived: true`.
5. For glossary entries whose class-pattern reference is unknown or whose lemma can't be classified: log a warning and skip.

The parser SHALL respect the existing `--only-verb` flag and the existing tag mapping in `mapHusicLabelToTags`.

#### Scenario: Glossary section is parsed into entry pairs

- **WHEN** `parse-husic-pdf.py` runs against the Husić PDF after this change
- **THEN** the parser SHALL return at least 500 `(lemma, class-pattern)` pairs from the glossary section
- **AND** each pair's class-pattern SHALL match Husić's notation pattern (e.g., `I-1`, `II-3a`, `III-2b`, `Irr.`)

#### Scenario: Class-pattern resolution uses paradigm-model index

- **WHEN** the glossary entry `(kërkoj, I-1)` is encountered
- **AND** the paradigm-model entry for `I-1` is `bëj`
- **THEN** the parser SHALL apply `bëj`'s paradigm template to `kërkoj`'s principal parts
- **AND** SHALL emit derived forms for every cell `bëj` has

#### Scenario: Unresolvable glossary entries are logged but skipped

- **WHEN** a glossary entry references a class-pattern not in the paradigm-model index
- **THEN** the parser SHALL log a warning naming the lemma and the unresolved pattern
- **AND** SHALL NOT emit a cache record for the unresolved entry

#### Scenario: A class-pattern resolves to multiple model verbs (rare; pick first)

- **WHEN** Husić's index lists multiple models for the same class-pattern (rare in practice)
- **THEN** the parser SHALL select the first model alphabetically and document the choice in a comment in `husic-format.md`

### Requirement: Husić baseline grows materially with glossary resolution

After this change is implemented, the Husić-derived match count SHALL exceed the Husić-direct match count (i.e., the long tail of glossary verbs adds more cells than the paradigm-model section did). The combined Husić baseline SHALL exceed 1500 cells across the corpus.

#### Scenario: Combined Husić baseline reaches the threshold

- **WHEN** `verify-engine.ts` runs after the change is implemented
- **THEN** the combined Husić match count (direct + derived) SHALL be ≥ 1500
- **AND** the derived count SHALL be ≥ the direct count
