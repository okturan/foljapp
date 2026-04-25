## ADDED Requirements

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
