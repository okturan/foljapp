## ADDED Requirements

### Requirement: Conjugation tables fit fully at desktop viewports

At viewport widths ≥ 1024px (`lg`), every conjugation table on `/verb/<lemma>` SHALL render all six person/number columns plus the TENSE label column within the visible viewport — no horizontal scroll inside the table's `overflow-x-auto` scroller. The verb-page `<main>` wrapper SHALL widen at desktop breakpoints to provide adequate horizontal space:

| Viewport               | `<main>` max-width         |
|------------------------|----------------------------|
| < 1024px               | `max-w-3xl` (768px) — current narrow reading column |
| ≥ 1024px and < 1280px  | `max-w-5xl` (1024px)       |
| ≥ 1280px (`xl`)        | `max-w-6xl` (1152px)       |

Inner conjugation-table cells SHALL use compressed padding (`py-2.5 px-2`) and the table's `<table className="text-sm">` ancestor SHALL propagate font-size to inner segment markup so monospace cell text renders at 14px (not 16px).

#### Scenario: All six cells visible at xl viewport

- **GIVEN** a viewport width of 1280px
- **WHEN** the user visits `/verb/kooperoj`
- **THEN** the indicative-present row's 3pl cell (`#indicative-present-3pl`) SHALL have a `getBoundingClientRect().right` ≤ `window.innerWidth`
- **AND** the user SHALL NOT be required to scroll the inner table container to see any cell

#### Scenario: All six cells visible at lg viewport

- **GIVEN** a viewport width of 1024px
- **WHEN** the user visits `/verb/kooperoj`
- **THEN** the indicative-present row's 3pl cell SHALL have a `getBoundingClientRect().right` ≤ `window.innerWidth`

#### Scenario: Mobile viewport keeps narrow reading column and allows scroll

- **GIVEN** a viewport width of 375px
- **WHEN** the user visits `/verb/kooperoj`
- **THEN** the verb-page `<main>` SHALL render with `max-width: 768px` (`max-w-3xl`) — the narrow reading column for prose elements
- **AND** the conjugation table's inner `overflow-x-auto` scroller SHALL be active

### Requirement: TENSE column sticks on horizontal scroll

When the conjugation table's inner `overflow-x-auto` scroller is active (i.e., when the table is wider than the available container width), the TENSE label column (the leftmost `<th>` for both header and row labels) SHALL apply `position: sticky` with `left: 0` and an opaque background, so the user's row-context is preserved while horizontally scrolling.

The sticky column SHALL have a subtle right border (e.g., `border-r border-stone-100`) for visual separation from the scrolling cells, and a `z-index` sufficient to render above the scrolling cell content.

#### Scenario: TENSE column visible after horizontal scroll on mobile

- **GIVEN** a viewport width of 375px
- **WHEN** the user visits `/verb/kooperoj` and horizontally scrolls the indicative table to its right edge
- **THEN** the TENSE label cell for the present row SHALL still be visible at the left edge of the scroller
- **AND** the cell's computed `position` SHALL be `sticky`
