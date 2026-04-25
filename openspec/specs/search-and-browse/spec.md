# search-and-browse Specification

## Purpose
TBD - created by archiving change add-search-and-browse. Update Purpose after archive.
## Requirements
### Requirement: Home page surfaces a verb-search input

The home page (`/`) SHALL render a prominent search input that lists matching corpus entries as the user types. Matching is case-insensitive, diacritic-aware (`bëj` matches `bëj`, not `bej`), and runs against both `lemma` and `translationEn`. Selecting a match SHALL navigate to that verb's page (`/verb/<lemma>`).

#### Scenario: Typing "pun" surfaces "punoj"

- **WHEN** the user visits `/` and types `pun` in the search input
- **THEN** the suggestion list SHALL contain a row for `punoj` with translation `to work`
- **AND** clicking that row SHALL navigate to `/verb/punoj`

#### Scenario: Typing "wash" (English) surfaces "laj"

- **WHEN** the user types `wash`
- **THEN** the suggestion list SHALL contain a row for `laj` with translation `to wash`

#### Scenario: Empty query shows no suggestions

- **WHEN** the input is empty
- **THEN** the suggestion list SHALL be hidden
- **AND** the home page's other content (placeholder copy, link to /browse) SHALL remain visible

### Requirement: /browse renders the full corpus

The webapp SHALL expose a `/browse` route as a React Server Component that lists every corpus entry in a sortable table. Columns: `lemma`, `translationEn`, `class`, `auxiliary`. The table SHALL be statically pre-rendered at build time.

#### Scenario: Browse page lists all 20 seed verbs

- **WHEN** the user requests `GET /browse`
- **THEN** the response SHALL be HTTP 200
- **AND** the rendered HTML SHALL contain at least 20 verb rows
- **AND** every corpus lemma SHALL appear exactly once

#### Scenario: Each row links to the verb page

- **WHEN** the user clicks the lemma in any row
- **THEN** the browser SHALL navigate to `/verb/<lemma>`

### Requirement: Browse-page filters

The browse page SHALL provide filter affordances for: conjugation class (1, 2, 3, or all), auxiliary (`kam`, `jam`, or all), and an alphabetical-letter quick-jump. Filters SHALL be client-side; the server-rendered HTML SHALL show the unfiltered table by default.

#### Scenario: Class-1 filter narrows the table

- **WHEN** the user selects "Class 1" in the class filter
- **THEN** the table SHALL display only Class 1 verbs (currently `bej`, `laj`, `punoj`, `vij`)

#### Scenario: Filters compose

- **WHEN** the user selects "Class 2" AND "auxiliary: kam"
- **THEN** the table SHALL display Class 2 verbs whose auxiliary is `kam`

### Requirement: Top-level navigation

Every page SHALL render a top navigation header with links to `/` (Home), `/browse` (Browse), and `/random` (a route that 302-redirects to a random corpus verb). The current page SHALL be visually indicated.

#### Scenario: Nav header is present on every page

- **WHEN** the user visits any of `/`, `/browse`, `/verb/punoj`, `/smoke`
- **THEN** the page SHALL render a `<nav>` containing anchor tags pointing to `/`, `/browse`, `/random`

### Requirement: /random redirects to a corpus verb

The `/random` route SHALL respond with HTTP 307 (or 302) to `/verb/<lemma>` where `lemma` is selected from the corpus. The selection MAY be deterministic (e.g., based on the current build hash) so that static rendering is possible; runtime randomness is permitted but not required.

#### Scenario: /random produces a redirect to a corpus verb

- **WHEN** the user requests `GET /random`
- **THEN** the response status SHALL be 307 or 302
- **AND** the `Location` header SHALL match `^/verb/[^/]+$`
- **AND** the lemma in the redirect SHALL exist in the corpus

### Requirement: Cell anchor IDs on verb pages

Every conjugated form on `/verb/[lemma]` SHALL be reachable via a fragment identifier of the form `#<mood>-<tense>-<person><number>` (e.g., `#indicative-aorist-1sg`). This unblocks deep-linking from search results, the future reverse-lookup, and `add-decomposition`'s "see derivation" links. The IDs SHALL be on the cell's `<td>` element so browsers scroll the entire row into view.

#### Scenario: A specific cell can be deep-linked

- **WHEN** the user requests `/verb/punoj#admirative-present-1sg`
- **THEN** the page SHALL render with the admirative-present-1sg cell containing `id="admirative-present-1sg"`
- **AND** the form `punuakam` SHALL be present inside that element

