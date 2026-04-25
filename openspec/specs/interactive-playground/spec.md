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

### Requirement: Playground exposes a derivation panel

The playground page (`/playground`) SHALL render a collapsible "How is this built?" panel beneath the conjugated form. When expanded, the panel SHALL render the steps returned by `engine.trace(...)` as a numbered list. The panel SHALL be collapsed by default.

#### Scenario: Derivation panel appears below the form

- **WHEN** the user visits `/playground` (default config)
- **THEN** the page SHALL render a button or summary element labeled `How is this built?` (case-insensitive match)

#### Scenario: Expanding shows numbered trace steps

- **WHEN** the user clicks the "How is this built?" toggle
- **THEN** the page SHALL render a numbered ordered list with at least 2 list items
- **AND** the list SHALL include text matching the trace summaries (e.g., for compound perfect, `kam punuar` appears in the final step)

#### Scenario: Unsupported cell hides the panel

- **WHEN** the user navigates to a configuration that produces an unsupported cell (e.g., imperative + 1sg)
- **THEN** the panel SHALL NOT render (since there is no trace to show)

### Requirement: Result panel stays in view on desktop viewports

At viewport widths ≥ 1024px (the Tailwind `lg` breakpoint), `/playground` SHALL render its controls and the conjugated-form result side-by-side, with the result panel pinned via `position: sticky` so it remains visible in the viewport while the user scrolls through the controls list.

The result panel SHALL contain — in this order — the conjugated form with role-coded decomposition, the form's IPA transcription, the derivation panel (`<details>` collapsed by default), the "Copy link" button, and the "See full table" link.

#### Scenario: Result is visible alongside the first control on initial load

- **WHEN** the user requests `GET /playground` in a 1280×800 viewport with no search params
- **THEN** the page SHALL render with the controls column occupying approximately the left three-fifths of the page and the result panel occupying approximately the right two-fifths
- **AND** the rendered text `punoj` (the default form) SHALL be inside the viewport (its bounding box's `y` SHALL be ≥ 0 and ≤ viewport height) at the same time as the verb picker is visible

#### Scenario: Result remains visible after scrolling past initial position

- **WHEN** the user is on `/playground` in a 1280×800 viewport and scrolls the page down by 400 pixels
- **THEN** the result panel's bounding box `y` SHALL still be ≤ viewport height (it has not scrolled out of view)
- **AND** the rendered form text SHALL still be visible to the user

### Requirement: Result band sticks to the top on mobile viewports

At viewport widths < 1024px, `/playground` SHALL render the result panel ABOVE the title and controls in DOM order, with `position: sticky` and `top: 0` so that once the user scrolls past the band's natural position, the band pins to the top of the viewport.

The mobile result band SHALL contain the same content as the desktop result panel (form, IPA, derivation panel, action buttons), but MAY use a more compact visual treatment (translucent background, no card border).

#### Scenario: Mobile band pins to viewport top after scroll

- **WHEN** the user is on `/playground` in a 390×844 viewport (mobile) and scrolls the page down by 600 pixels
- **THEN** the result band's bounding box `y` SHALL be 0 (pinned to the viewport top)
- **AND** the rendered form text SHALL be visible

#### Scenario: Mobile band renders before the title in DOM order

- **WHEN** the page source for `/playground` is fetched (any viewport)
- **THEN** the `<aside>` containing the result panel SHALL appear in the document before the `<h1>` containing "Playground"

### Requirement: Control changes do not require scrolling to see the new form

`/playground` SHALL update the rendered form in response to control changes (verb pick, mood / tense / voice / polarity / modality / person / number radio toggles, non-finite form selection) without the user needing to scroll to see the updated form. This requirement applies to both the desktop two-pane layout and the mobile sticky-band layout, and follows from the sticky positioning specified above.

#### Scenario: Mood change on desktop keeps result visible

- **WHEN** the user is on `/playground` in a 1280×800 viewport with the page scrolled to position the mood radio inside the viewport
- **AND** the user clicks the `subjunctive` radio
- **THEN** the rendered form SHALL update to `të punoj`
- **AND** the rendered form's bounding box SHALL still be inside the viewport (no scroll required)

#### Scenario: Voice change on mobile keeps result visible

- **WHEN** the user is on `/playground` in a 390×844 viewport with the page scrolled so the voice radio is inside the viewport but the form's natural (non-sticky) position is above the viewport
- **AND** the user clicks the `middle-passive` radio
- **THEN** the result band SHALL be pinned at viewport top with the updated form visible

