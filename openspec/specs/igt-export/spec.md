# igt-export Specification

## Purpose
TBD - created by archiving change add-igt-export. Update Purpose after archive.
## Requirements
### Requirement: IGT formatter renders a 3-line block per cell

`formatIgt(verbId, options)` SHALL return a string containing three aligned lines:

1. **Surface** — the morpheme-broken form (segments separated by spaces; multi-token forms preserve their spacing)
2. **Gloss** — one ALL-CAPS gloss tag per surface segment, derived from the segment's role + meta
3. **English** — a free-translation line including the verb's `translationEn` and the cell coordinates

#### Scenario: Compound perfect 1sg of punoj formats as a 3-line IGT

- **WHEN** `formatIgt("punoj", { mood: "indicative", tense: "perfect", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** the result SHALL contain three lines (or four including a header)
- **AND** the Surface line SHALL contain `kam`, `punu`, `ar` (each on its own column)
- **AND** the Gloss line SHALL contain the tags `AUX`, `STEM`, and a glossed ending containing `1SG` and a tense identifier
- **AND** the English line SHALL contain `to work` and `1sg perfect`

### Requirement: Full-table IGT export

`formatIgtTable(verbId)` SHALL return a string containing one IGT block per supported cell, separated by blank lines, prefixed by a header containing the verb's lemma, translation, class, auxiliary, and the engine version.

#### Scenario: Full-table export contains all moods

- **WHEN** `formatIgtTable("punoj")` is invoked
- **THEN** the result SHALL contain at least one IGT block in each of: indicative present, subjunctive present, conditional present, admirative present, optative present, imperative

### Requirement: CoNLL-U export

`formatConllu(verbId)` SHALL return a string in the CoNLL-U format. Each row corresponds to one cell of the verb's table. Columns:

- `ID` — sequential 1-based index
- `FORM` — the surface form
- `LEMMA` — the verb's lemma
- `UPOS` — `VERB`
- `XPOS` — `_`
- `FEATS` — pipe-separated `Mood=...|Tense=...|VerbForm=Fin|Person=...|Number=...|Voice=Act|Polarity=Pos|...`
- `HEAD` — `_`
- `DEPREL` — `_`
- `DEPS` — `_`
- `MISC` — empty or contains the cell label (e.g., `Cell=indicative-present-1sg`)

The first line of the output SHALL be a `# sent_id = <verb-id>` comment per CoNLL-U conventions.

#### Scenario: CoNLL-U export covers all six indicative-present cells

- **WHEN** `formatConllu("punoj")` is invoked
- **THEN** the result SHALL contain six lines whose `MISC` field starts with `Cell=indicative-present-` and includes each of `1sg`, `2sg`, `3sg`, `1pl`, `2pl`, `3pl`

### Requirement: Download button on verb page

The verb page SHALL render a download control that triggers client-side blob downloads in two formats: IGT (`.txt` extension) and CoNLL-U (`.conllu` extension). Filenames SHALL be `<lemma>.txt` and `<lemma>.conllu`.

#### Scenario: Click triggers a download (E2E sanity)

- **WHEN** the user clicks the IGT download option on `/verb/punoj`
- **THEN** the browser SHALL receive a download with filename `punoj.txt`
- **AND** the file content SHALL contain the verb's lemma in the header

