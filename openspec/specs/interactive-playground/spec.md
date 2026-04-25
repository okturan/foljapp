# interactive-playground Specification

## Purpose
TBD - created by archiving change add-interactive-playground. Update Purpose after archive.
## Requirements
### Requirement: /playground renders a controllable conjugation surface

The webapp SHALL expose `/playground` as a route that lets the user choose any corpus verb and any combination of grammatical parameters supported by the engine, and live-renders the resulting form with role-coded coloring + tooltips.

#### Scenario: Default playground load

- **WHEN** the user requests `GET /playground` with no search params
- **THEN** the page SHALL render with `verb=punoj`, `mood=indicative`, `tense=present`, `voice=active`, `person=1`, `number=singular`, `polarity=affirmative`, `modality=declarative`
- **AND** the rendered form SHALL be `punoj`

#### Scenario: Changing mood updates the form live

- **WHEN** the user changes the mood radio from `indicative` to `subjunctive`
- **THEN** the rendered form SHALL update to `të punoj` without a full page reload

### Requirement: URL-driven state

Every playground control SHALL be reflected in the URL search params. Reloading the page or sharing the URL SHALL reproduce the exact configuration.

#### Scenario: Configuration is shareable

- **WHEN** the user has selected `verb=punoj&mood=admirative&tense=present&person=1&number=singular`
- **THEN** the URL bar SHALL contain `?verb=punoj&mood=admirative&tense=present&person=1&number=singular&voice=active&polarity=affirmative&modality=declarative`
- **AND** copying the URL and opening it in a new tab SHALL render the form `punuakam`

### Requirement: Tense options track the selected mood

The tense control SHALL display only the tense values valid for the selected mood. For example, switching to `imperative` SHALL hide the tense control entirely (or disable it with a single `present` value).

#### Scenario: Imperative mood hides tense

- **WHEN** the user selects `mood=imperative`
- **THEN** the tense control SHALL either be hidden OR render only `present` as a fixed value
- **AND** the person control SHALL restrict to `2`
- **AND** changing person to 1 or 3 SHALL produce an "unsupported cell" message rather than a form

### Requirement: Output respects unsupported cells

When the user's selection produces an `UnsupportedCellError` from the engine, the output area SHALL render a muted explanatory message and SHALL NOT throw or crash.

#### Scenario: Imperative 1sg is shown as unsupported

- **WHEN** the user selects `mood=imperative&person=1`
- **THEN** the output area SHALL contain the text `unsupported`
- **AND** the page SHALL still render successfully

### Requirement: Copy-link button shares the current configuration

The playground SHALL render a "Copy link" button that, when clicked, copies the current URL (with all search params) to the clipboard.

#### Scenario: Copy link button is present

- **WHEN** the user views any playground configuration
- **THEN** the page SHALL render a button labeled `Copy link` (or with that as `aria-label`)

### Requirement: Verb picker is the same as home search

The playground's verb picker SHALL use the same component as the home page's search input — substring matching against `lemma` and `translationEn`, click-to-select.

#### Scenario: Selecting a verb updates the URL

- **WHEN** the user types `pun` in the playground's verb picker and clicks the `punoj` suggestion
- **THEN** the URL search params SHALL update to include `verb=punoj`
- **AND** the rendered form SHALL update to reflect the new verb

