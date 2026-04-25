## MODIFIED Requirements

### Requirement: verify-engine covers admirative imperfect and pluperfect

The `scripts/verify-engine.ts` cell list SHALL include `{ mood: 'admirative', tense: 'imperfect' }` and `{ mood: 'admirative', tense: 'pluperfect' }` for active voice across all corpus verbs. The match-rate baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to the new total (current cells + new admirative cells), and the verification script SHALL maintain a 100% match against Kaikki for these new cells.

The script SHALL ALSO maintain accurate Kaikki tag mapping for moods Kaikki tags non-canonically (conditional present → `imperfect`, conditional perfect → `past + perfect`), and the past-disambiguation filter SHALL be mood-agnostic (auto-skip Kaikki forms tagged `past` when the wanted tag set does not include `past`).

The script SHALL consult a secondary verification source — Husić's *Albanian Verb Dictionary and Manual* (KU Libraries, 2002) — for cells where Kaikki returns no form. Husić data SHALL be cached at `.cache/husic/<id>.jsonl` in the same shape as the Kaikki cache. The dispatch order is Kaikki → Husić → no-ground-truth. Cells matched by Husić SHALL count toward the match-rate baseline. The script's output SHALL annotate the source of each match (e.g., `M (k)` for Kaikki, `M (h)` for Husić).

After this change is implemented, every corpus verb SHALL have a populated `.cache/husic/<id>.jsonl` file produced by `scripts/parse-husic.ts`. The combined Kaikki+Husić baseline SHALL exceed 6000 cells across the corpus and SHALL show 100% match-rate (zero engine-vs-source mismatches).

#### Scenario: Husić cache populated for every corpus verb

- **WHEN** `scripts/parse-husic.ts --source <digital-husic>` has been run for the chosen source format
- **THEN** every `data/verbs/<id>.json` SHALL have a corresponding `.cache/husic/<id>.jsonl` file
- **AND** each `.cache/husic/<id>.jsonl` SHALL contain at least one JSON record per finite cell that Husić tabulates for that verb

#### Scenario: Husić matches the previously-missing cells

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after Husić cache is populated
- **THEN** the per-source match counts SHALL show a non-zero `M (h)` count
- **AND** the combined match-rate (`M (k) + M (h)`) SHALL exceed 6000 cells across the 50-verb corpus
- **AND** mismatches SHALL be zero

#### Scenario: Cell genuinely missing from both sources counts as missing

- **WHEN** Kaikki has no entry AND Husić has no entry for a cell
- **THEN** the script SHALL count the cell as `missing-kaikki` (no source has ground truth)

#### Scenario: Conditional present cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional present 1sg cell

#### Scenario: Conditional perfect cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional perfect 1sg cell

#### Scenario: Match-rate baseline reflects combined sources

- **WHEN** the change is archived
- **THEN** `packages/engine/docs/sources.md` SHALL list the combined baseline broken out by source (e.g., `M = X (Kaikki) + Y (Husić) = X+Y total`)

## ADDED Requirements

### Requirement: Husić mismatch surfaces as actionable diagnostic

When the engine output disagrees with a Husić-tabulated form (Husić is authority #1 per `openspec/config.yaml`), `verify-engine.ts` SHALL emit a mismatch annotation that distinguishes Husić mismatches from Kaikki mismatches in its output, so the per-cell resolution path is unambiguous.

#### Scenario: Husić mismatch is annotated distinctly

- **WHEN** `verify-engine.ts` runs and finds an engine output that disagrees with a Husić form for some cell
- **THEN** the per-cell line in `--verbose` mode SHALL show `kaikki=null` and `husic="<husic-form>"` and `engine="<engine-form>"`
- **AND** the per-verb verdict line SHALL include the mismatch in its mismatch count

### Requirement: "Potential override candidate" warnings

When the engine throws `UnsupportedCellError` for a cell where Husić has a form, `verify-engine.ts` SHALL log a warning line of the format `[?] <verbId> <cell> — engine throws; Husić has "<form>". Consider adding cellOverrides[<key>].`. The warning is informational; it SHALL NOT count as a mismatch.

#### Scenario: Engine-throws + Husić-has-form generates a candidate warning

- **WHEN** the engine throws for `verb_x` MP imperative 2sg
- **AND** Husić's cache has a form for that cell
- **THEN** the script SHALL log a `[?] verb_x imperative.present.middle-passive.2sg` warning
- **AND** the script's exit status SHALL still be 0 (warnings don't fail the run)

### Requirement: parse-husic.ts produces tagged JSONL per docs

`scripts/parse-husic.ts` (the format-specific parser, not the v1 scaffolding stub) SHALL emit JSONL records matching `packages/engine/docs/husic-format.md`. Tag vocabulary SHALL match Kaikki's convention to keep `findKaikkiForm`/`findHusicForm` filter logic shared. Pluperfect SHALL emit `past + perfect`; conditional present SHALL emit `imperfect + conditional`; future-perfect SHALL emit `future + perfect`.

#### Scenario: parse-husic produces well-formed JSONL for the pilot verbs

- **WHEN** the parser has been implemented and run on the digital Husić source
- **THEN** `.cache/husic/punoj.jsonl`, `.cache/husic/flas.jsonl`, `.cache/husic/pjek.jsonl`, `.cache/husic/jam.jsonl`, `.cache/husic/pi.jsonl` SHALL each exist
- **AND** each file SHALL contain valid JSONL (one JSON record per line; each record has `form` and `tags` fields)
- **AND** the tag vocabulary SHALL match the Albanian-label → engine-tag mapping in `husic-format.md`

#### Scenario: parse-husic filters Gheg / archaic variants at parse time

- **WHEN** Husić's source contains a Gheg or archaic variant for some cell
- **THEN** `parse-husic.ts` SHALL NOT emit that variant to the JSONL
- **AND** the standard Tosk-based form SHALL be the only entry for that cell

#### Scenario: Pilot cross-validation catches parser bugs

- **WHEN** the pilot run completes for the 5 pilot verbs
- **AND** `verify-engine.ts` is run with both Kaikki and Husić caches populated
- **THEN** for cells where Kaikki AND Husić both have data, the two sources SHALL agree (zero Kaikki-vs-Husić disagreement on shared cells)
- **AND** if any disagreement surfaces, the parser SHALL be debugged before the full corpus pass
