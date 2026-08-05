## Why

Every interaction on `/playground` moves the furniture. Switching mood
unmounts whole control groups (Tense disappears for `non-finite` and
`imperative`; Form appears only for `non-finite`; the five compact groups
vanish for `non-finite`), so pills the user is aiming at jump hundreds of
pixels between clicks. Tense additionally re-flows between a 3-column grid
(indicative, 10 tenses) and a single flex row (conditional, 2 tenses), so
the control's own shape changes under the cursor.

The result pane does the same on the other side: the gloss line, the
derivation panel and the whole examples section each unmount when their
data is absent, the examples table collapses to a one-line "Loading
examples…" on every parameter change before the rows come back, and the
All / Local / Translated filters resize the card because each filter shows
a different row count. Row heights themselves vary with sentence length,
and the auto-width table squeezes the Albanian column down to roughly one
word per line whenever a corpus name is long.

This is the same class of problem the `grey-unsupported-controls` change
already settled for feasibility: the answer there was to **grey, not
hide**. That principle was applied per-option but not per-group, so the
groups still appear and disappear.

## What Changes

- **Controls are a fixed skeleton.** Mood, Tense, Form and the five compact
  groups render for every mood and every verb. Options that do not apply to
  the current selection are disabled with the existing greyed styling
  instead of being unmounted:
  - Tense always renders the union of all mood tenses (the 10 indicative
    values), disabling those outside the selected mood — all of them for
    `non-finite`, all but `present` for `imperative`.
  - Form always renders the 5 non-finite forms, disabled unless the mood is
    `non-finite`.
  - Voice / Polarity / Modality / Person / Number always render, disabled
    for `non-finite`.
  - Because every group's option count is now constant, the density rule
    (≤3 flex, ≥4 grid) resolves identically on every render; Tense is
    permanently a grid.
- **The verb meta line reserves its row** so an unknown or mid-edit verb
  does not shift the controls below it.
- **Result pane reserves its slots.** The form / IPA / gloss stack, the
  derivation panel and the examples section keep their space when the
  underlying data is missing, unsupported, or still loading.
- **Examples stop collapsing.** Previously-loaded rows stay on screen while
  a new query is in flight (marked `aria-busy`) instead of being replaced
  by a loading line; the table is fixed-layout with declared column widths;
  rows are uniform height; and the table area reserves the height of the
  unfiltered result set so All / Local / Translated switching does not
  resize the card.

## Capabilities

Modifies `interactive-playground`: control-group presence, tense control
behaviour, option-group density, and result-pane layout stability.

## Impact

- **Engine** — none. No conjugation, corpus or target logic changes;
  `verify-engine` numbers are untouched.
- **Behaviour** — no reachable state is removed. Every combination the user
  could previously select is still selectable; combinations that were
  previously unreachable-by-absence are now visibly disabled.
- **Tests** — `playground-option-grid.spec.ts` asserts that Tense collapses
  to flex when mood becomes conditional. That scenario is superseded and is
  replaced by its stability counterpart.

## Non-Goals

- **No visual redesign.** Pill styling, colours, spacing and the two-pane /
  sticky-band structure are unchanged.
- **No change to feasibility semantics.** Per-option greying still derives
  from `engine.table(verbId)`; this change only adds mood-scope greying on
  top of it.
- **No change to what examples are returned** — only to how the table
  holds its shape while they arrive.
