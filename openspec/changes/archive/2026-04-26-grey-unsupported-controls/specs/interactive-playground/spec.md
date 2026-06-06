## ADDED Requirements

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
