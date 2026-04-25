## MODIFIED Requirements

### Requirement: verify-engine covers admirative imperfect and pluperfect

The `scripts/verify-engine.ts` cell list SHALL include `{ mood: 'admirative', tense: 'imperfect' }` and `{ mood: 'admirative', tense: 'pluperfect' }` for active voice across all corpus verbs. The match-rate baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to the new total (current cells + new admirative cells), and the verification script SHALL maintain a 100% match against Kaikki for these new cells.

The script SHALL ALSO maintain accurate Kaikki tag mapping for moods Kaikki tags non-canonically (conditional present → `imperfect`, conditional perfect → `past + perfect`), and the past-disambiguation filter SHALL be mood-agnostic (auto-skip Kaikki forms tagged `past` when the wanted tag set does not include `past`).

The script SHALL consult a secondary verification source — Husić's *Albanian Verb Dictionary and Manual* (KU Libraries, 2002) — for cells where Kaikki returns no form. Husić data SHALL be cached at `.cache/husic/<id>.jsonl` in the same shape as the Kaikki cache (`{ form: string, tags: string[] }` records). The dispatch order is Kaikki → Husić → no-ground-truth. Cells matched by Husić SHALL count toward the match-rate baseline. The script's output SHALL annotate the source of each match (e.g., `M (k)` for Kaikki, `M (h)` for Husić) so the verification provenance is auditable per cell.

#### Scenario: verify-engine reports admirative imperfect for every corpus verb

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **THEN** the output SHALL include at least one match for `admirative.imperfect` per corpus verb that has Kaikki coverage
- **AND** zero mismatches SHALL be reported for `admirative.imperfect` and `admirative.pluperfect` cells

#### Scenario: Match-rate baseline is updated

- **WHEN** the change is archived
- **THEN** `packages/engine/docs/sources.md` SHALL no longer mention "admirative imperfect/pluperfect not implemented in v0.1.0" as a deferred item
- **AND** the recorded baseline match-rate SHALL reflect the expanded cell count

#### Scenario: Conditional present cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run
- **AND** the cell list contains `{ mood: 'conditional', tense: 'present' }`
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional present 1sg cell

#### Scenario: Conditional perfect cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run
- **AND** the cell list contains `{ mood: 'conditional', tense: 'perfect' }`
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional perfect 1sg cell

#### Scenario: Husić matches a cell Kaikki does not list

- **WHEN** `npx tsx scripts/verify-engine.ts` is run for a verb whose `.cache/husic/<id>.jsonl` exists and contains a form for the indicative future-perfect 1sg cell
- **AND** Kaikki has no entry for that cell (`kaikkiForm === null`)
- **AND** the engine output equals the Husić form
- **THEN** the script SHALL count the cell as a match
- **AND** the per-cell line SHALL be annotated `M (h)` (matched via Husić)

#### Scenario: Husić mismatch counts as a real mismatch

- **WHEN** the engine produces a form for a cell where Husić has a different form
- **AND** Kaikki has no entry for that cell (so the cell would otherwise be `missing-kaikki`)
- **THEN** the script SHALL report a mismatch for the cell with `kaikkiForm: null` and `husicForm: <Husić's form>`

#### Scenario: Cell genuinely missing from both sources counts as missing-kaikki

- **WHEN** Kaikki has no entry for a cell
- **AND** Husić also has no entry for that cell
- **THEN** the script SHALL count the cell as `missing-kaikki` (no source has ground truth)
- **AND** the cell SHALL NOT be counted as a match or mismatch

#### Scenario: Husić cache absence is a soft fallback, not an error

- **WHEN** `.cache/husic/<id>.jsonl` does not exist for some verb `id`
- **THEN** the script SHALL fall back to Kaikki-only behavior for that verb
- **AND** the script SHALL NOT exit with an error
- **AND** the script SHALL log a warning indicating Husić cache absence (one line per verb)

## ADDED Requirements

### Requirement: parse-husic.ts emits JSONL parallel to Kaikki

The `scripts/parse-husic.ts` script SHALL accept a Husić digital-source input path and emit per-verb JSONL files at `.cache/husic/<id>.jsonl` in the same shape as the Kaikki cache (one JSON record per line, each with at least `form: string` and `tags: string[]` fields). The tag vocabulary SHALL include `indicative | subjunctive | conditional | admirative | optative | imperative`, `present | imperfect | aorist | perfect | pluperfect | future | past-anterior | future-perfect | future-in-past | future-perfect-in-past`, `first-person | second-person | third-person`, `singular | plural`, and `active | middle-passive` (when Husić distinguishes voice). The script SHALL document its input format expectations in `packages/engine/docs/husic-format.md`.

#### Scenario: parse-husic produces one JSONL line per cell

- **WHEN** `npx tsx scripts/parse-husic.ts <source-path>` is run
- **THEN** for each verb in the source, the script SHALL emit a `.cache/husic/<id>.jsonl` file
- **AND** each line SHALL be a parseable JSON record with `form` and `tags` fields
- **AND** the tag vocabulary SHALL match the convention defined in `packages/engine/docs/husic-format.md`

#### Scenario: parse-husic preserves voice distinctions where Husić marks them

- **WHEN** Husić's source contains both active and middle-passive paradigm tables for a verb
- **THEN** the emitted JSONL SHALL contain entries with `'middle-passive'` tag for the MP cells
- **AND** entries without an explicit voice tag SHALL be treated as active by `verify-engine.ts`

#### Scenario: parse-husic handles paradigm gaps

- **WHEN** Husić's source omits a particular cell (e.g., 1sg imperative, which doesn't exist in Albanian)
- **THEN** the emitted JSONL SHALL omit that cell entirely
- **AND** verify-engine SHALL treat its absence as no-ground-truth (consistent with Kaikki absence)
