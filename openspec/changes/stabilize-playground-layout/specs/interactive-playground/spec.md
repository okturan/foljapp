## ADDED Requirements

### Requirement: Playground controls keep a stable layout across selections

The `/playground` controls panel SHALL render the same set of option groups, in the same order, for every verb and every mood: Verb, Mood, Tense, Form, and the compact grid (Voice, Polarity, Modality, Person, Number). No option group SHALL be unmounted as a consequence of a mood, tense, form or verb selection.

An option group that does not apply to the current selection SHALL render with all of its options disabled, using the same disabled styling as feasibility-based greying (`text-stone-300`, `bg-stone-50`, `border-stone-100`, `cursor-not-allowed`).

Each group's option count SHALL be constant, so the density rule (≤3 flex, ≥4 grid) resolves to the same layout on every render:

| Group    | Options | Layout |
|----------|---------|--------|
| Mood     | 7       | grid   |
| Tense    | 10      | grid   |
| Form     | 5       | grid   |
| Voice    | 2       | flex   |
| Polarity | 2       | flex   |
| Modality | 2       | flex   |
| Person   | 3       | flex   |
| Number   | 2       | flex   |

The verb metadata line below the picker (`<translation> · Zgjedhimi <class> · auxiliary <aux>`) SHALL reserve its vertical space when no corpus entry matches the current input, so a mid-edit verb does not shift the controls below it.

#### Scenario: Switching mood does not move the controls below it

- **GIVEN** `/playground?verb=punoj&mood=indicative`
- **WHEN** the user selects each of `subjunctive`, `conditional`, `admirative`, `optative`, `imperative`, `non-finite` in turn
- **THEN** the Mood, Tense, Form, Voice, Polarity, Modality, Person and Number groups SHALL all remain in the document
- **AND** each group's vertical position SHALL be unchanged (within 1px) from its position under `indicative`

#### Scenario: Non-finite mood disables rather than removes the finite controls

- **GIVEN** `/playground?verb=punoj&mood=non-finite&form=participle`
- **WHEN** the page renders
- **THEN** the Tense group SHALL be present with all 10 pills disabled
- **AND** the Voice, Person and Number groups SHALL be present with every pill disabled
- **AND** the Form group's 5 pills SHALL be enabled subject to per-verb feasibility

#### Scenario: Finite moods disable rather than remove the Form control

- **GIVEN** `/playground?verb=punoj&mood=indicative`
- **WHEN** the page renders
- **THEN** the Form group SHALL be present with all 5 non-finite pills disabled

#### Scenario: An unrecognised verb does not shift the controls

- **GIVEN** `/playground?verb=punoj`
- **WHEN** the verb input is edited to a string matching no corpus entry
- **THEN** the Mood group's vertical position SHALL be unchanged (within 1px)

### Requirement: Result pane reserves space for optional content

The `/playground` result pane SHALL reserve the vertical space of its optional regions so that a missing gloss, an absent derivation, an unsupported cell, or an in-flight examples query does not resize the pane.

The form / IPA / gloss stack SHALL occupy a fixed minimum height regardless of whether a gloss is available. The derivation panel SHALL render for every selection, showing an explanatory line when the engine produced no trace steps. The examples section SHALL render whenever a lookup form exists, including while the request is in flight.

#### Scenario: A form without an English gloss keeps the pane height

- **GIVEN** a selection whose gloss is unavailable
- **WHEN** the result pane renders
- **THEN** the vertical offset of the derivation panel SHALL match its offset for a selection that does have a gloss

#### Scenario: The derivation panel is always present

- **GIVEN** any verb and any supported selection
- **WHEN** the result pane renders
- **THEN a** "How is this built?" disclosure SHALL be present
- **AND** when the engine returned no trace steps it SHALL contain an explanatory line rather than be absent

### Requirement: Corpus examples hold their shape across filters and reloads

The examples table on `/playground` SHALL NOT change size as a consequence of switching the source filter (All / Local / Translated) or of a new examples request being issued.

While a new request is in flight and previously-loaded rows are on screen, those rows SHALL remain rendered with `aria-busy="true"` on the examples region; the standalone loading line SHALL appear only when there is nothing yet to show.

The table SHALL use a fixed layout with declared column widths (Source, Albanian, Context) rather than content-derived widths, and SHALL scroll horizontally inside its own container below its minimum width. Every row SHALL occupy the same height; sentence and context text exceeding that height SHALL be clamped.

The table region SHALL reserve the height of the unfiltered result set, so selecting a filter with fewer matches leaves the surrounding pane unchanged.

The filter counts SHALL render with tabular figures and a reserved width so that a count changing width does not move the buttons beside it.

#### Scenario: Filtering to Local does not resize the pane

- **GIVEN** a selection whose examples include both local and translated sources
- **WHEN** the user clicks `Local`
- **THEN** the examples region's height SHALL be unchanged (within 1px)
- **AND** the filter buttons' horizontal positions SHALL be unchanged (within 1px)

#### Scenario: Changing a parameter does not blank the examples table

- **GIVEN** `/playground?verb=punoj` with examples on screen
- **WHEN** the user changes person
- **THEN** the previously-rendered rows SHALL remain visible while the new request is in flight
- **AND** the examples region SHALL carry `aria-busy="true"` until the request settles

#### Scenario: Long sentences do not produce tall rows

- **GIVEN** an examples set mixing short and long sentences
- **WHEN** the table renders
- **THEN** every row SHALL have the same height
- **AND** the Albanian column SHALL render at its declared width rather than being squeezed by the Source column's content

## MODIFIED Requirements

### Requirement: Playground exposes a derivation panel

The playground page (`/playground`) SHALL render a collapsible "How is this built?" panel beneath the conjugated form. When expanded, the panel SHALL render the steps returned by `engine.trace(...)` as a numbered list. The panel SHALL be collapsed by default.

The panel SHALL be present for every selection, including one with no trace steps (an unsupported cell). With no steps it SHALL render an explanatory line in place of the list, and its summary SHALL be styled as inert. It SHALL NOT be unmounted, because a panel that comes and goes moves the examples section below it on every parameter change.

#### Scenario: Derivation panel appears below the form

- **WHEN** the user visits `/playground` (default config)
- **THEN** the page SHALL render a button or summary element labeled `How is this built?` (case-insensitive match)

#### Scenario: Expanding shows numbered trace steps

- **WHEN** the user clicks the "How is this built?" toggle
- **THEN** the page SHALL render a numbered ordered list with at least 2 list items
- **AND** the list SHALL include text matching the trace summaries (e.g., for compound perfect, `kam punuar` appears in the final step)

#### Scenario: Unsupported cell keeps the panel with an empty body

- **WHEN** the user navigates to a configuration that produces an unsupported cell (e.g., imperative + 1sg)
- **THEN** the panel SHALL still render
- **AND** expanding it SHALL show an explanatory line rather than a numbered list

### Requirement: Tense options track the selected mood

The tense control SHALL always render the full set of tense values (the 10 indicative tenses, which are a superset of every other mood's tenses) and SHALL disable those that are not valid for the selected mood. Switching to `imperative` SHALL leave only `present` enabled; switching to `non-finite` SHALL disable every tense pill. The control SHALL NOT be hidden.

Selecting a mood whose tense set excludes the current tense SHALL move the selection to that mood's first tense, as today.

#### Scenario: Imperative mood disables every tense but present

- **WHEN** the user selects `mood=imperative`
- **THEN** the tense control SHALL remain rendered with 10 pills
- **AND** only `present` SHALL be enabled
- **AND** the person control SHALL restrict to `2`
- **AND** changing person to 1 or 3 SHALL produce an "unsupported cell" message rather than a form

#### Scenario: Conditional mood disables the eight tenses it does not have

- **GIVEN** `/playground?verb=punoj&mood=indicative&tense=aorist`
- **WHEN** the user selects `mood=conditional`
- **THEN** the tense control SHALL remain rendered with 10 pills
- **AND** `present` and `perfect` SHALL be enabled and the other eight disabled
- **AND** the selected tense SHALL become `present`

### Requirement: Option groups use a density-aware responsive grid layout

The `/playground` page SHALL render each radio-button option group with a layout chosen by the group's option count:

| Option count | Layout                                                |
|--------------|-------------------------------------------------------|
| 1–3          | `flex flex-wrap` single-row natural-width pills       |
| 4 or more    | CSS Grid: 2 columns at viewport widths < 1024px; 3 columns at widths ≥ 1024px (Tailwind `lg`). |

In grid mode, cells SHALL be equal-width (`1fr`) and the option label SHALL be horizontally centered within its cell. The pill styling (rounded border, padding, `text-sm`, active = `bg-stone-900 text-stone-50`, hover = `bg-stone-50`) SHALL be unchanged.

In flex mode, the layout SHALL behave as today: pills sized to their content, wrapping to a new line when a row is full.

The decision SHALL be derived from `options.length` inside the component; callers (Mood, Tense, Voice, Polarity, Modality, Person, Number, Form) SHALL NOT need to pass a density flag. Because every caller now passes a constant number of options, a group's resolved layout SHALL NOT change in response to a selection.

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

#### Scenario: Tense (10 options) renders as a grid

- **GIVEN** any mood
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

#### Scenario: Tense layout does not change when Mood changes

- **GIVEN** the user has Mood = `indicative` (grid mode active)
- **WHEN** the user clicks the `conditional` mood pill
- **THEN** the Tense control SHALL still render 10 pills in a 3-column grid
- **AND** its `display` SHALL remain `grid`

### Requirement: Compact option groups pack into a responsive parent grid

The compact option groups on `/playground` (Voice, Polarity, Modality, Person, Number) SHALL be wrapped in a parent CSS Grid container with column count determined by viewport width:

| Viewport | Column count |
|----------|--------------|
| < 640px (mobile)             | 1 |
| ≥ 640px and < 1024px (`sm`)  | 2 |
| ≥ 1024px (`lg`)              | 3 |

Each compact group SHALL retain its own `<fieldset>` and `<legend>` (no semantic regrouping). The parent grid SHALL use a horizontal column gap of 1.5rem (`gap-x-6`); vertical row spacing SHALL come from the existing per-fieldset `mt-6` margin.

The parent grid SHALL be present for every mood, including `non-finite`, where its groups render disabled.

The wide groups (Mood, Tense, Form) SHALL remain OUTSIDE the parent grid, rendered full-width above it.

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

The same disabled styling SHALL apply to options that are out of scope for the selected mood (every tense under `non-finite`; every non-`present` tense under `imperative`; the finite parameter groups under `non-finite`; the non-finite forms under any finite mood). Those pills SHALL carry a `title` reading "not available for this mood".

The disabled pill's inner `<input type="radio">` SHALL carry the native `disabled` attribute, so click events do not fire and form submission cannot select the value.

The feasibility check SHALL derive from `engine.table(verbId)` for the currently-selected verb. A cell is feasible iff the table populates a value for that `(mood, tense, voice, cellLabel)` tuple. For non-finite forms, feasibility comes from `table.nonFinite[form]`.

The following controls SHALL apply feasibility-based disabling: **Mood**, **Tense**, **Voice**, **Person**, **Number**, **Form (non-finite)**. The following controls SHALL NOT be disabled by feasibility: **Polarity**, **Modality** (always supported as post-engine string transforms) — except that both are disabled under `non-finite`, where person-independent forms take no polarity or modality selection.

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

#### Scenario: Polarity and Modality are never disabled under a finite mood

- **GIVEN** `/playground?verb=punoj` with any finite mood and any combination of tense / voice / person / number
- **WHEN** the page renders
- **THEN** both Polarity pills (`affirmative`, `negative`) SHALL be enabled
- **AND** both Modality pills (`declarative`, `interrogative`) SHALL be enabled
