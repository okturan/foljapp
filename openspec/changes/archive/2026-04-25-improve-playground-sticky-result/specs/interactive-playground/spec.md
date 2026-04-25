## ADDED Requirements

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
