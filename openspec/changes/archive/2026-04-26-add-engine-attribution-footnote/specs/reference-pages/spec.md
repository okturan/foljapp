## ADDED Requirements

### Requirement: Citations footer surfaces engine-wide paradigm attribution

The `CitationsFooter` rendered on every `/verb/<lemma>` page SHALL include a one-line attribution to the engine-wide paradigm authorities, distinct from the per-verb `sources` list. The line SHALL appear between the per-verb sources block (and any Notes line) and the `engine: x · corpus: y` version line.

The attribution SHALL name at least these four authorities: `uniparser-grammar-albanian`, `Husić (2002)`, `Kadriu (2015)`, and `Wikipedia`. The attribution SHALL include a navigable link to `/references` (the global bibliography page) for full citations.

The line SHALL render unconditionally — it appears on every verb page regardless of which per-verb sources are present in the entry's `sources` field.

#### Scenario: Engine attribution visible on every verb page

- **GIVEN** any corpus verb (e.g., `kooperoj`, `punoj`, `dhemb`)
- **WHEN** the user visits `/verb/<lemma>`
- **THEN** the Sources footer SHALL contain the substring `Paradigm engine`
- **AND** the footer SHALL contain the substring `uniparser-grammar-albanian`
- **AND** the footer SHALL contain the substring `Husić`
- **AND** the footer SHALL contain the substring `Kadriu`
- **AND** the footer SHALL contain the substring `Wikipedia`
- **AND** the footer SHALL contain a clickable `References` link whose `href` is `/references`

#### Scenario: References link navigates to the global bibliography

- **GIVEN** the user is on `/verb/kooperoj`
- **WHEN** the user clicks the `References` link inside the engine attribution line
- **THEN** the browser SHALL navigate to `/references`

#### Scenario: Per-verb sources are unchanged

- **GIVEN** the user visits `/verb/kooperoj` (a verb with `sources: [kaikki, manual]`)
- **WHEN** the page renders
- **THEN** the per-verb sources list SHALL still show `Kaikki — Wiktionary` and `Manual entry`
- **AND** the per-verb sources list SHALL NOT additionally show a `husic` or `uniparser` entry as a result of this change
