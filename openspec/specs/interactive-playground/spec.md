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

### Requirement: Option groups use a density-aware responsive grid layout

The `/playground` page SHALL render each radio-button option group with a layout chosen by the group's option count:

| Option count | Layout                                                |
|--------------|-------------------------------------------------------|
| 1–3          | `flex flex-wrap` single-row natural-width pills       |
| 4 or more    | CSS Grid: 2 columns at viewport widths < 1024px; 3 columns at widths ≥ 1024px (Tailwind `lg`). |

In grid mode, cells SHALL be equal-width (`1fr`) and the option label SHALL be horizontally centered within its cell. The pill styling (rounded border, padding, `text-sm`, active = `bg-stone-900 text-stone-50`, hover = `bg-stone-50`) SHALL be unchanged.

In flex mode, the layout SHALL behave as today: pills sized to their content, wrapping to a new line when a row is full.

The decision SHALL be derived from `options.length` inside the component; callers (Mood, Tense, Voice, Polarity, Modality, Person, Number, Form) SHALL NOT need to pass a density flag.

#### Scenario: Mood (7 options) renders as a 2-column grid on a narrow viewport

- **GIVEN** a viewport width of 768px
- **WHEN** the user opens `/playground`
- **THEN** the Mood option group SHALL render in a CSS grid with 2 columns
- **AND** the 7 mood pills SHALL appear in 4 rows (2 + 2 + 2 + 1)
- **AND** every pill in a non-final row SHALL have the same width as its row neighbor

#### Scenario: Mood (7 options) renders as a 3-column grid on a wide viewport

- **GIVEN** a viewport width ≥ 1024px (Tailwind `lg`)
- **WHEN** the user opens `/playground`
- **THEN** the Mood option group SHALL render in a CSS grid with 3 columns
- **AND** the 7 mood pills SHALL appear in 3 rows (3 + 3 + 1)

#### Scenario: Tense (indicative — 10 options) renders as a grid

- **GIVEN** Mood = `indicative` (10 tense values)
- **WHEN** the page renders at viewport width ≥ 1024px
- **THEN** the Tense option group SHALL render as a 3-column grid
- **AND** all 10 tense pills SHALL have visually equal width

#### Scenario: Voice (2 options) keeps the flex single-row layout

- **GIVEN** any viewport width ≥ 320px
- **WHEN** the page renders the Voice control
- **THEN** the Voice option group SHALL render as a flex single row (NOT a grid)
- **AND** the pill widths SHALL be sized to their labels (`active`, `middle-passive`)

#### Scenario: Person (3 options) keeps the flex single-row layout

- **GIVEN** any viewport width ≥ 320px
- **WHEN** the page renders the Person control
- **THEN** the Person option group SHALL render as a flex single row
- **AND** the three pills (`1`, `2`, `3`) SHALL appear next to each other with natural width

#### Scenario: Tense layout adapts when Mood changes

- **GIVEN** the user has Mood = `indicative` (10 tenses, grid mode active)
- **WHEN** the user clicks the `conditional` mood pill
- **THEN** the Tense control SHALL re-render with 2 options (`present`, `perfect`)
- **AND** the Tense control SHALL switch to flex single-row layout (since 2 ≤ 3)

### Requirement: Keyboard focus is visible on radio-button pills

When the hidden `<input type="radio">` inside a playground option pill receives keyboard focus, the wrapping `<label>` SHALL display a visible focus indicator. The indicator SHALL be a 2px ring in `stone-900` with a 1px offset, applied via `focus-within:` styling on the label.

The focus indicator SHALL appear only on keyboard focus (`focus-visible` semantics), not on mouse click; this matches Tailwind's `focus-within:` behavior combined with the browser's built-in `focus-visible` matching for the inner `<input>`.

#### Scenario: Tab navigation reveals focus ring

- **GIVEN** the user has loaded `/playground`
- **WHEN** the user presses `Tab` until focus reaches a Mood pill
- **THEN** the focused pill's label SHALL render with a 2px stone-900 ring
- **AND** the ring SHALL disappear when focus leaves that pill

#### Scenario: Mouse click does not show focus ring

- **GIVEN** the user is on `/playground`
- **WHEN** the user clicks a mood pill with a mouse
- **THEN** the pill SHALL update its selection state (active styling) but SHALL NOT show the keyboard focus ring

### Requirement: Playground supports every corpus verb

The `/playground` page SHALL accept any lemma present in the foljapp corpus index (`data/verbs/index.json`). Submitting a corpus lemma to the verb input SHALL produce a conjugation result, NOT an "Unknown verb" error.

The client-side engine SHALL be configured at module load with the full corpus — every verb entry validated by `scripts/build-corpus.ts` SHALL be reachable from the browser bundle.

#### Scenario: Any corpus lemma resolves in the playground

- **GIVEN** a corpus lemma (e.g., `dhemb`, `kërkoj`, `qëndroj`, `tregoj`) that has a `.json` file under `data/verbs/`
- **WHEN** the user navigates to `/playground?verb=<lemma>&mood=indicative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative`
- **THEN** the result panel SHALL render a conjugated form (NOT an "Unknown verb" / "No corpus entry found" error)

#### Scenario: Verb-page lemma list and playground lemma list match

- **GIVEN** the corpus index `data/verbs/index.json` lists `N` lemmas
- **WHEN** the playground configures its client-side engine on first load
- **THEN** the engine's `listVerbs()` SHALL return `N` entries
- **AND** for every lemma `L` rendered as a static `/verb/<L>` page, `/playground?verb=<L>` SHALL conjugate `L` without throwing `UnknownVerbError`

### Requirement: Compact option groups pack into a responsive parent grid

The compact option groups on `/playground` (Voice, Polarity, Modality, Person, Number) SHALL be wrapped in a parent CSS Grid container with column count determined by viewport width:

| Viewport | Column count |
|----------|--------------|
| < 640px (mobile)             | 1 |
| ≥ 640px and < 1024px (`sm`)  | 2 |
| ≥ 1024px (`lg`)              | 3 |

Each compact group SHALL retain its own `<fieldset>` and `<legend>` (no semantic regrouping). The parent grid SHALL use a horizontal column gap of 1.5rem (`gap-x-6`); vertical row spacing SHALL come from the existing per-fieldset `mt-6` margin.

The wide groups (Mood; Tense when option count ≥ 4; Form) SHALL remain OUTSIDE the parent grid, rendered full-width above it. This preserves the within-group 2/3-col layout established by `improve-playground-option-grid`.

#### Scenario: Five compact groups stack vertically on mobile

- **GIVEN** a viewport width of 375px
- **WHEN** the user opens `/playground`
- **THEN** the compact-group parent grid SHALL render with `display: grid` and `grid-template-columns` resolving to a single 1fr track
- **AND** Voice, Polarity, Modality, Person, Number SHALL appear in five distinct rows

#### Scenario: Compact groups pack into 2 columns at sm

- **GIVEN** a viewport width of 768px
- **WHEN** the user opens `/playground`
- **THEN** the parent grid SHALL resolve to 2 column tracks
- **AND** Voice and Polarity SHALL share row 1 (Voice in col 1, Polarity in col 2)
- **AND** Modality and Person SHALL share row 2
- **AND** Number SHALL occupy row 3 col 1 (col 2 empty)

#### Scenario: Compact groups pack into 3 columns at lg

- **GIVEN** a viewport width of 1280px
- **WHEN** the user opens `/playground`
- **THEN** the parent grid SHALL resolve to 3 column tracks
- **AND** Voice, Polarity, Modality SHALL share row 1
- **AND** Person, Number SHALL share row 2 (col 3 empty)

#### Scenario: Mood and Tense groups stay full-width above the compact grid

- **GIVEN** any viewport width ≥ 320px
- **WHEN** the user opens `/playground`
- **THEN** the Mood option group SHALL render outside the compact-group grid
- **AND** the Tense option group SHALL render outside the compact-group grid
- **AND** both SHALL span the full controls-panel width (NOT a column of the parent grid)

### Requirement: Playground controls reflect engine feasibility per verb

The `/playground` page SHALL render any radio-button option whose selection would yield an `UnsupportedCellError` from the engine — given the current values of the other controls — as a visually-disabled pill: reduced contrast (`text-stone-300`, `bg-stone-50`, `border-stone-100`), `cursor-not-allowed`, no hover effect, and a `title` attribute reading "not a standard form for this verb".

The disabled pill's inner `<input type="radio">` SHALL carry the native `disabled` attribute, so click events do not fire and form submission cannot select the value.

The feasibility check SHALL derive from `engine.table(verbId)` for the currently-selected verb. A cell is feasible iff the table populates a value for that `(mood, tense, voice, cellLabel)` tuple. For non-finite forms, feasibility comes from `table.nonFinite[form]`.

The following controls SHALL apply feasibility-based disabling: **Mood**, **Tense**, **Voice**, **Person**, **Number**, **Form (non-finite)**. The following controls SHALL NOT be disabled by feasibility: **Polarity**, **Modality** (always supported as post-engine string transforms).

#### Scenario: punoj + imperative greys out the middle-passive voice pill

- **GIVEN** `/playground?verb=punoj` (a verb without MP imperative cellOverrides) AND mood = `imperative`
- **WHEN** the page renders
- **THEN** the Voice control's `middle-passive` pill SHALL render as disabled (`text-stone-300`, `cursor-not-allowed`)
- **AND** clicking the pill SHALL NOT change the URL or the selected voice

#### Scenario: laj + imperative keeps middle-passive enabled

- **GIVEN** `/playground?verb=laj` (a verb WITH MP imperative cellOverrides — `lahu`, `lahuni`)
- **WHEN** the user selects mood = `imperative`
- **THEN** the Voice control's `middle-passive` pill SHALL render as enabled (default style)
- **AND** clicking it SHALL select MP voice and produce `lahu` / `lahuni`

#### Scenario: imperative greys persons 1 and 3

- **GIVEN** `/playground?verb=punoj&mood=imperative`
- **WHEN** the page renders
- **THEN** the Person control's `1` and `3` pills SHALL render as disabled
- **AND** the `2` pill SHALL remain enabled and selected

#### Scenario: switching verbs re-evaluates feasibility

- **GIVEN** the user has `verb=laj&mood=imperative&voice=middle-passive`
- **WHEN** the user changes verb to `punoj` (no MP imperative)
- **THEN** the Voice control's `middle-passive` pill SHALL switch to disabled state
- **AND** the result panel SHALL show the "unsupported cell" message (until the user picks a feasible voice)

#### Scenario: Polarity and Modality are never disabled

- **GIVEN** `/playground?verb=punoj` with any combination of mood / tense / voice / person / number
- **WHEN** the page renders
- **THEN** both Polarity pills (`affirmative`, `negative`) SHALL be enabled
- **AND** both Modality pills (`declarative`, `interrogative`) SHALL be enabled

### Requirement: Corpus examples render without the live examples API

The playground's Examples panel SHALL source retained-corpus examples from
the prebuilt per-verb assets (`/examples/<verbId>.json`) in every
environment. The `/api/examples` route SHALL run on the Edge runtime,
SHALL always report `local.available: false`, and SHALL serve only target
derivation (`lookupForm`, `target`) plus OPUS parallel pairs; the panel's
fallback then loads the asset and composes retained rows first —
signature-restricted lookup before the key-wide fallback — followed by
parallel pairs, within the same total example cap. When the API is
entirely unreachable the panel SHALL fall back the same way.

#### Scenario: Playground shows attested examples for a suppletive verb

- **GIVEN** `jam` has retained corpus examples in `/examples/jam.json`
- **WHEN** the user selects a `jam` cell whose target key has retained
  examples
- **THEN** the Examples panel SHALL render those sentences with their
  corpus provenance (source name, and link when a URL was retained)
- **AND** the panel SHALL indicate that prebuilt examples are being shown

#### Scenario: Phonologically-mutating verb falls back by target key

- **GIVEN** the static asset for `djeg` contains rows for target key
  `digjet` under a different signature than the one requested
- **WHEN** signature-restricted lookup finds no rows
- **THEN** the panel SHALL fall back to all rows for the target key

#### Scenario: The examples route deploys to the Edge runtime

- **WHEN** the Cloudflare Pages artifact is built with next-on-pages
- **THEN** the build SHALL succeed with `/api/examples` configured for the
  Edge runtime
- **AND** the route SHALL respond without any Node.js-only APIs

### Requirement: Per-verb example assets are generated from the retained corpus

`npm run build:static-examples` SHALL regenerate
`apps/web/public/examples/<verbId>.json` for every corpus verb plus an
`index.json` manifest, applying the same public-example quality filter as
the examples API, capping stored examples per target, and producing
deterministic output for a given database state. The assets SHALL be
committed so production builds require no local corpus artifacts.

#### Scenario: Regeneration is deterministic

- **WHEN** the generator runs twice against the same database with
  `--frozen-time`
- **THEN** the emitted files SHALL be byte-identical

