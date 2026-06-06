## ADDED Requirements

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
