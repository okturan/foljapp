## Context

The playground sidebar lives at `apps/web/components/playground.tsx`. Its option groups are rendered by an internal `RadioGroup` helper that wraps each group in a `<fieldset>` + `<legend>` and lays the options out as `<div className="mt-2 flex flex-wrap gap-2">`.

Group option counts vary widely:

| Group     | Options                                                    | Count |
|-----------|------------------------------------------------------------|-------|
| Mood      | indicative, subjunctive, conditional, admirative, optative, imperative, non-finite | 7 |
| Tense.indicative | present, imperfect, aorist, perfect, pluperfect, past-anterior, future, future-perfect, future-in-past, future-perfect-in-past | 10 |
| Tense.subjunctive | present, imperfect, perfect, pluperfect | 4 |
| Tense.admirative | present, imperfect, perfect, pluperfect | 4 |
| Tense.conditional | present, perfect | 2 |
| Tense.optative | present, perfect | 2 |
| Form (non-finite) | participle, infinitive, gerund, privative, temporal | 5 |
| Voice / Polarity / Modality / Number | (paired) | 2 |
| Person | 1, 2, 3 | 3 |

The flex-wrap approach has two failure modes:

1. **Orphan rows.** A group of 7 options often wraps as 6+1 or 5+2 depending on viewport — the last row holds 1-2 lonely pills with a vast blank to their right.
2. **Mixed cell widths.** A row like `[present][imperfect][aorist][perfect][pluperfect]` has cells of width `~70/90/65/70/95px`. Right edges don't align across rows. Combined with mixed long/short labels (Tense.indicative has a 22-char outlier), the panel looks busy.

A capped-column grid (CSS Grid `grid-template-columns: repeat(N, 1fr)`) fixes both: predictable row count, equal-width cells, aligned right edges.

## Goals / Non-Goals

**Goals:**

- Predictable row count: 2 cols on narrow screens, 3 cols on wide.
- Equal-width cells within each grid-mode group → aligned right edges, consistent visual rhythm.
- Preserve current pill aesthetics (rounded, bordered, active = black bg).
- Preserve URL state model and accessibility semantics.
- Add a missing keyboard-focus-visible affordance.

**Non-Goals:**

- No layout customization or user preference.
- No change to which options exist or their order.
- No animation between layout states.
- No nested grids (e.g., pairing Polarity + Modality side-by-side) — keep one group per row.

## Decisions

### D1. Density rule by option count

Two layout modes, switched purely by `options.length`:

| Option count | Layout                                                |
|--------------|-------------------------------------------------------|
| 1–3          | `flex flex-wrap gap-2` (current behavior, single row) |
| 4 or more    | `grid grid-cols-2 lg:grid-cols-3 gap-2`              |

Why these cuts:

- **1–3 options** already fit on a single line at every viewport ≥ 320px. Forcing them into a 2-col grid would either stretch each pill grotesquely (Person `1`/`2`/`3` becoming half-the-panel-wide rectangles) or leave gaps. Single-row natural-width is the right shape.
- **4+ options** triggers grid. 2 cols is the default; 3 cols engages at the Tailwind `lg` breakpoint (≥1024px) where the desktop two-pane layout's left column is wide enough (~660–690px in a `max-w-6xl` container with `lg:grid-cols-[3fr_2fr]`).

The rule matches the user's request: "2 options in a row maybe or 3 on really wide screens." Mobile/tablet caps at 2; desktop opens up to 3.

**Rejected alternatives:**

- *Always grid.* Forces tiny groups into stretched cells; loses the natural compactness of 2-option rows.
- *Container queries* (`@container`). Tailwind 4 supports them but the playground panel size is already known from the viewport-based two-pane layout — viewport breakpoints are simpler and equivalent in effect.
- *`auto-fit, minmax(140px, 1fr)`.* Auto-responsive but produces unpredictable column counts at intermediate widths; "good divisions" implies designed, not auto-sized.

### D2. Equal-width cells via 1fr

Grid columns use `1fr`. The longest label sets the visual minimum; shorter labels render in a same-width cell with the text centered. This produces aligned right edges across rows — the "display discipline" the user requested.

Text alignment within each cell is `text-center`. (Currently the flex-wrap version inherits left-alignment from the surrounding text; in a grid where cell width is constant, centered text reads better.)

### D3. Min-width and overflow handling

Grid cells use `min-w-0` (Tailwind default for grid items) and rely on label wrapping for very long labels on very narrow viewports. At 360px viewport width:

- Container after padding: ~312px.
- 2 cols × `gap-2` (8px) = ~152px per cell.
- Longest label `future-perfect-in-past` (~155–175px in `text-sm`) — wraps to 2 lines within the cell.

Multi-line wrapping inside a pill is acceptable for the rare 22-char case; the cell border accommodates it cleanly with `py-1.5` vertical padding (which becomes `py-1.5` per line).

For 3-col mode at `lg` (panel ~660px wide): 3 × ~210px per cell. Comfortable for all current labels.

### D4. Focus-visible affordance

Current pills use `<input type="radio" class="sr-only">` inside `<label>`. The radio receives focus but no styling reflects it on the visible pill. We add `focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-stone-900` to the `<label>`. When the hidden radio is focused (keyboard `Tab` / arrow), the surrounding label shows a 2px ring.

This is a small accessibility improvement that pairs naturally with the layout refactor.

### D5. Component API

`RadioGroup`'s prop signature is unchanged:

```ts
interface RadioGroupProps {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}
```

The density decision is internal — derived from `options.length`. No prop drilling, no per-call configuration. Callers are unchanged.

A future need for per-call override (e.g., forcing flex even for 4-option groups) could add `density?: 'auto' | 'compact'` later — out of scope here.

### D6. Behavior of Tense control across moods

The Tense control re-renders with different option counts as Mood changes:

- Mood `indicative` → 10 tenses → grid mode (2/3 cols).
- Mood `subjunctive` / `admirative` → 4 tenses → grid mode (2/3 cols).
- Mood `conditional` / `optative` → 2 tenses → flex mode.
- Mood `imperative` / `non-finite` → no Tense control rendered.

The same component instance switches modes naturally because the layout decision is option-count-driven. No animation between modes; the layout simply re-renders.

## Tradeoffs

- **Equal-width cells vs. pill compactness.** Grid mode trades the current natural-width compactness for visual order. Acceptable: the user's complaint is exactly about the lack of order.
- **Centered cell text vs. left-aligned consistency with the rest of the page.** Centered reads better in equal-width grid cells; left-aligned looks awkward when the cell is wider than the label. The fieldset legend stays left-aligned.
- **Mobile cell width tightness.** Wrapping `future-perfect-in-past` to two lines on a 360px screen is the expected fallback. Better than horizontal scroll.
- **No animation.** Tense option count changes instantly when Mood changes. A crossfade would be polish; not requested.

## Resolved Questions

None.

## Open Questions

- **Q1.** Should we adopt 4 cols at `xl` (≥1280px) for the 7+ groups (Mood, Tense.indicative)? The panel at xl is ~768px wide, which fits 4 cols × 180px each comfortably. Decision: defer — stick with `lg:grid-cols-3` for now; add `xl:grid-cols-4` only if user testing shows demand.
- **Q2.** Should the "Form" group (5 options) get a 2-col grid even though 5 isn't divisible by 3 (would yield 3+2 at lg)? Decision: yes, per D1 — uniformity beats per-group tuning.
