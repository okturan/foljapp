## ADDED Requirements

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
