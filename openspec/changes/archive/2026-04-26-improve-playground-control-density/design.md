## Context

The playground's controls panel currently renders eight `<fieldset>`s in vertical sequence:

1. Verb picker (search input)
2. Mood (7 options) — wide, uses internal 2/3-col grid
3. Tense (2–10 options depending on mood) — wide when ≥4 options
4. Form (5 options, non-finite only) — wide
5. Voice (2 options) — compact, single flex row
6. Polarity (2 options) — compact, single flex row
7. Modality (2 options) — compact, single flex row
8. Person (3 options) — compact, single flex row
9. Number (2 options) — compact, single flex row

Groups 5–9 average two options each, so each row has hundreds of pixels of empty horizontal space. On a desktop layout where the controls panel is ~660px wide, two compact groups fit comfortably side-by-side; three at xl widths.

This change wraps groups 5–9 in a parent Grid that flows them into 1/2/3 columns based on viewport width.

## Goals / Non-Goals

**Goals:**

- Reduce the controls panel's vertical height by packing compact groups.
- Maintain readability and per-group `<legend>` semantics.
- Use only CSS Grid + Tailwind responsive utilities (no JS).
- Preserve mobile single-column layout (no horizontal scroll on phones).

**Non-Goals:**

- Repack the wide groups (Mood, Tense, Form). Their internal grids already use horizontal space.
- Combine Polarity + Modality + similar into single `<fieldset>`s. The grouping is a layout concern, not a semantic one.
- Touch the verb picker or any non-radio control.

## Decisions

### D1. Parent grid breakpoints

| Viewport | Cols | Note |
|----------|------|------|
| < 640px (default) | 1 | Single column — preserves today's mobile layout. |
| ≥ 640px (`sm`)   | 2 | First desktop-ish breakpoint; controls panel ≥640px. |
| ≥ 1024px (`lg`)  | 3 | Two-pane playground layout active; controls panel ~660px ÷ 3 = ~220px per col, fits "middle-passive" comfortably. |

Tailwind class: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

**Rejected alternatives:**

- *2 cols at `sm`, 3 at `xl` (1280)*. Too conservative — `lg` panel width already supports 3 cols and the user explicitly asked for "2 or 3 on really wide screens".
- *Always 2 cols on desktop*. Wastes the lg+ width.
- *`auto-fit minmax`*. Auto-responsive but produces unpredictable layouts at intermediate widths. Predictable breakpoints are better here.

### D2. Vertical spacing

Each inner fieldset already has `mt-6`. In a grid:

- Row 1: each cell has mt-6 → separates the grid from the preceding Tense/Form group. ✓
- Row 2 onward: each cell has mt-6 → row gap of 24px. Matches the visual rhythm of the rest of the page. ✓

No extra `gap-y` on the grid is needed; the fieldset margins do the work. Set `gap-y-0` to be explicit.

For column gap, use `gap-x-6` (24px) — a comfortable visual separation matching the typography baseline.

### D3. Wide-group exemption

Mood, Tense (when ≥4 options), and Form already use the 2/3-col within-group grid established by `improve-playground-option-grid`. Packing them into the compact-group parent grid would either:

- Squeeze a 7-option Mood grid into a 220px column (illegible), or
- Force the parent grid to mix a 660px-wide row (Mood) with 220px-wide rows (compact groups) — chaotic.

Wide groups stay above the compact-group grid, full-width, as today.

### D4. Order within the compact grid

Preserve the current document order: Voice → Polarity → Modality → Person → Number. Reasoning:

- Voice and Polarity are both **lexical-shape** modifiers (they change the form's surface).
- Modality is a **sentence-shape** modifier (declarative vs. interrogative).
- Person and Number are **agreement** features (about the subject).

A 3-col layout at lg renders:
- Row 1: Voice | Polarity | Modality
- Row 2: Person | Number | (empty)

The empty cell at lg's row 2 is acceptable — it preserves a logical cluster (Voice/Polarity/Modality on row 1 modify the form; Person/Number on row 2 modify the subject).

A 2-col layout at sm renders:
- Row 1: Voice | Polarity
- Row 2: Modality | Person
- Row 3: Number | (empty)

Less elegant clustering but acceptable.

### D5. Imperative-mood Person clamp

When Mood = `imperative`, the playground's `update()` callback forces `person = 2` (since imperatives only exist for 2sg/2pl). The Person fieldset still renders showing `1`, `2`, `3` with `2` selected. The user can click `1` or `3` and the page will… let me check.

Looking at the existing code: when mood is changed, `next.person !== 2` is reset to 2. But once mood is imperative, clicking Person `1` would update the URL to person=1, then re-render with Person=1 still imperative. The conjugate call would throw `UnsupportedCellError` and the result panel shows "unsupported cell".

This is unchanged by the current proposal. A follow-up could disable Person 1/3 buttons in imperative mood — out of scope here.

### D6. Accessibility preservation

- Each fieldset keeps its `<legend>`. Screen readers still announce "Voice", "Polarity", etc.
- `role="radiogroup"` is implicit on `<fieldset>`.
- The previous change's `focus-within` ring on individual pills is preserved.

## Tradeoffs

- **Vertical density vs. visual breathing room.** Packing wins; the user explicitly asked for it.
- **Lg "Number" cell next to an empty cell** (3-col layout, last row has 2 cells of content + 1 empty). Mild — could fix by making the 5th group span 2 cols at lg, but that introduces asymmetry. Acceptable as-is.
- **Consistency vs. wide-group exemption.** Wide groups stay outside the parent grid for clarity (see D3); this means the parent-grid wrapper only contains 5 of the 8 groups, which is fine.

## Resolved Questions

- **Q.** Should the layout adapt when one of the compact groups is hidden (e.g., if `mood === 'non-finite'` hides them all)? A: When all 5 compact groups are hidden, the wrapper renders nothing. CSS Grid with no children is a no-op. ✓

## Open Questions

- **Q1.** Should we add `xl:grid-cols-4` (4 cols at ≥1280px) to handle ultrawide displays? Decision: defer. 3 cols already comfortably uses the playground's 660px panel; pushing to 4 cols would shrink each cell to ~165px, which is tight for "middle-passive" (~120px label + padding).
