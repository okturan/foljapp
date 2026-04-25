## MODIFIED Requirements

### Requirement: Full conjugation table — all moods rendered

The page SHALL render a conjugation table covering every mood the engine supports for the verb: `Indicative` (9 finite tenses), `Subjunctive` (4 tenses), `Conditional` (2 tenses), `Admirative` (4 tenses), `Optative` (2 tenses), `Imperative` (present, restricted cells), plus the non-finite forms (`Participle`, `Infinitive`, `Gerund`, `Privative`, `Temporal`). Within each mood, the table SHALL group rows by tense and columns by person/number. For each tense, the table SHALL render an active-voice row first; when at least one cell of that tense has a middle-passive form (i.e., `engine.table()` returns a value for `<cell>.middle-passive`), the table SHALL render an additional row immediately below the active row containing the middle-passive forms. Tenses without any middle-passive forms (e.g., the imperative) SHALL render only the active row. Cell anchor IDs for middle-passive cells SHALL be `<mood>-<tense>-<cell>-mp`; active anchor IDs remain `<mood>-<tense>-<cell>` so existing deep-links continue to work.

#### Scenario: Indicative present table shows all six cells

- **WHEN** the user visits `/verb/punoj` and locates the Indicative > Present block
- **THEN** the rendered cells SHALL contain `punoj`, `punon`, `punon`, `punojmë`, `punoni`, `punojnë` for 1sg/2sg/3sg/1pl/2pl/3pl
- **AND** these forms SHALL be visible in the rendered HTML without requiring client-side JavaScript

#### Scenario: Indicative imperfect renders both active and middle-passive rows

- **WHEN** the user visits `/verb/punoj` and locates the Indicative > Imperfect block
- **THEN** the active row SHALL contain `punoja, punoje, punonte, punonim, punonit, punonin`
- **AND** the middle-passive row SHALL contain `punohesha, punoheshe, punohej, punoheshim, punoheshit, punoheshin`
- **AND** the middle-passive cells SHALL have anchor IDs ending in `-mp`

#### Scenario: Admirative imperfect renders MP for flas

- **WHEN** the user visits `/verb/flas` and locates the Admirative > Imperfect block
- **THEN** the active row SHALL contain `folkësha` somewhere
- **AND** the middle-passive row SHALL contain `u folkësha` somewhere
- **AND** the middle-passive 3sg cell anchor `#admirative-imperfect-3sg-mp` SHALL contain `u folkësh`

#### Scenario: Admirative perfect renders MP with jam-aux

- **WHEN** the user visits `/verb/flas` and locates the Admirative > Perfect block
- **THEN** the middle-passive 1sg cell SHALL contain `qenkam` and `folur`

#### Scenario: Imperative renders only the active row (no MP)

- **WHEN** the user visits `/verb/punoj` and locates the Imperative block
- **THEN** there SHALL NOT be a row labeled with the `MP` voice marker for the imperative tense
- **AND** there SHALL NOT be any cell anchor of the form `imperative-present-*-mp`

#### Scenario: MP row is omitted when no MP cells exist for a tense

- **WHEN** the user visits any `/verb/[lemma]` page
- **AND** a particular tense has zero `.middle-passive` cells in the engine.table() result
- **THEN** the table SHALL NOT render an MP row for that tense (no row of dashes)

#### Scenario: MP row carries a textual voice marker

- **WHEN** the user visits `/verb/punoj` and locates an MP row for any tense
- **THEN** the row's label cell SHALL contain the marker text `MP` (case-insensitive) so screen readers and sighted users can identify the voice
- **AND** color SHALL NOT be the only conveyance of the active/MP distinction

#### Scenario: JS-disabled rendering still shows MP rows

- **WHEN** an automated test fetches `/verb/punoj` over HTTP and parses the HTML response without executing any JavaScript
- **THEN** the parsed HTML SHALL contain an element with id `indicative-imperfect-1sg-mp` (the MP cell anchor)
- **AND** the parsed HTML SHALL contain the substring `hesha` (the MP imperfect 1sg ending segment)

Note: each role-coded segment is a separate `<span>`, so substring checks across segment boundaries (e.g., literal `punohesha`) will not match the rendered HTML. Tests assert per-segment.
