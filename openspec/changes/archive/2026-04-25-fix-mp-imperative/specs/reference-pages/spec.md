## ADDED Requirements

### Requirement: Imperative MP rows render where the engine produces MP imperative cells

The verb-page conjugation table SHALL render an MP row for the imperative mood when (and only when) the engine produces at least one `<cell>.middle-passive` for the imperative tense. For verbs whose corpus entry carries an `imperative.present.middle-passive` cellOverride (currently `laj`, `shoh`), the MP row SHALL render with the override forms. For all other verbs, the MP row SHALL be omitted (no row of dashes).

#### Scenario: laj renders MP imperative row

- **WHEN** the user visits `/verb/laj`
- **THEN** the imperative table SHALL contain an MP row whose 2sg cell renders `lahu` and 2pl cell renders `lahuni`
- **AND** the MP cell anchors SHALL be `imperative-present-2sg-mp` and `imperative-present-2pl-mp`

#### Scenario: shoh renders MP imperative row

- **WHEN** the user visits `/verb/shoh`
- **THEN** the imperative table SHALL contain an MP row whose 2sg cell renders `shihu` and 2pl cell renders `shihuni`

#### Scenario: punoj renders no MP imperative row (no MP override)

- **WHEN** the user visits `/verb/punoj`
- **THEN** the imperative table SHALL NOT contain any cell with anchor `imperative-present-2sg-mp` or `imperative-present-2pl-mp`
