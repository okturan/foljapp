## Context

Each `/verb/<lemma>` page renders six full conjugation tables (Indicative, Subjunctive, Conditional, Admirative, Optative, Imperative) plus a non-finite-forms section. Each table has up to seven columns: a TENSE label column + 6 person/number cells (1sg, 2sg, 3sg, 1pl, 2pl, 3pl).

For a regular -oj verb like `kooperoj`, cell contents range from short (`punoj` — 5 chars) to long single-word (`kooperohesha` — 12 chars) to multi-word compound (`kemi kooperuar` — 14 chars including space, often wraps to two lines). Mono-font (`font-mono text-base` = 16px monospace) widths:

- 5-char form: ~50px
- 12-char form: ~120px
- 14-char form: ~140px

Plus 12px×2 padding (`px-3`) per cell = 144–164px per cell. For 6 cells:

- 6 × 150 = 900px content
- TENSE column: ~110px (longest label `future-perfect-in-past`)
- Total: ~1010px

The page's `<main className="mx-auto max-w-3xl px-6 py-10">` constrains content to 768px – 48px padding = 720px available. The table doesn't fit.

Two failure modes today:

1. **Desktop**: viewport is 1280px+, max-w-3xl center-aligns content. Table is 720px wide internally; right ~290px of the table content (including 3PL column) clips inside the inner `overflow-x-auto` scroller.
2. **Mobile**: viewport is 360px, max-w-3xl gracefully shrinks. Table needs 1010px, page available is ~312px. Inner overflow-x-auto kicks in. User scrolls to see all columns. The TENSE label column scrolls off too, losing context.

This change addresses both — desktop by widening the container, mobile by sticky-sticking the TENSE column.

## Goals / Non-Goals

**Goals:**

- Full table visible without horizontal scroll at lg+ viewports (≥1024px).
- TENSE label column stays visible when scroll IS necessary at narrower widths.
- Existing reading-comfort width preserved for prose elements (header, sources, etc.).
- Pure CSS/Tailwind — no JS layout logic.

**Non-Goals:**

- Mobile-card layout. Tabular structure stays.
- Engine, IPA, or English-gloss changes.
- Compromising playground typography.

## Decisions

### D1. Container width strategy

The verb-page's `<main>` wrapper switches from a single `max-w-3xl` to a responsive triple:

```
max-w-3xl lg:max-w-5xl xl:max-w-6xl
```

| Viewport       | Container width | Content width (after px-6) |
|----------------|-----------------|----------------------------|
| < 1024px       | 768px (max-w-3xl)  | 720px |
| ≥ 1024px (lg)  | 1024px (max-w-5xl) | 976px |
| ≥ 1280px (xl)  | 1152px (max-w-6xl) | 1104px |

At lg, 976px content > 1010px table need is *just under* the threshold. Combined with the cell-compression in D2 (saves ~80px), the lg layout will fit all six cells comfortably.

At xl, 1104px content > everything — generous breathing room.

**Rejected alternatives:**

- *Always max-w-6xl*. Hurts mobile/tablet reading comfort for non-table content (header, citations, etc.); not all of the verb page is table.
- *Negative-margin "full bleed" tables.* Visually breaks the page-content alignment; harder to maintain.
- *Container queries.* Tailwind 4 supports them but viewport-based breakpoints are simpler and equivalent here.

### D2. Cell compression

Three orthogonal compressions, applied together:

**(a) Cell padding** `py-3 px-3` → `py-2.5 px-2`. Saves 8px per cell horizontally × 6 cells = 48px. Vertically saves a tiny bit but rows still readable.

**(b) Cell font** via `DecomposedForm` change: outer `<span className="font-mono text-base">` becomes `<span className="font-mono text-inherit">`. The conjugation table's `text-sm` (already on `<table>`) propagates. 14px monospace is ~12% narrower than 16px. For a 120px form, saves ~14px → 14px × 6 cells = 84px.

**(c) TENSE label column** `pr-4` → `pr-2`. Saves 8px.

Combined savings: 48 + 84 + 8 = 140px. 1010px – 140px = 870px table need. Comfortably fits in 976px (lg).

The DecomposedForm change is context-aware: it only affects callers who set a smaller text size in their wrapper. Playground uses `text-3xl` wrapper — DecomposedForm at text-3xl. Verb-page table uses text-sm — DecomposedForm at text-sm. Non-finite forms list uses default (text-base inherited from body) — DecomposedForm at text-base. All correct.

### D3. Sticky TENSE column on scroll

Inside `apps/web/components/conjugation-table.tsx`, the row-label `<th scope="row">` (the cell containing tense names like `present`, `imperfect`) gets `sticky left-0 bg-white` (and `bg-stone-50/50` for MP rows so the sticky tinting matches). The `<th scope="col">` for `tense` in the header row gets the same treatment.

Effect: when the user horizontally scrolls inside the inner `overflow-x-auto` scroller (mobile, or any case where the table > container), the TENSE column stays pinned to the left.

Z-index: the sticky column needs `z-10` so cell content scrolls under it. Add a subtle right border (`border-r border-stone-100`) to visually separate the sticky column from the scrolling content.

### D4. whitespace-nowrap on single-word forms

Most forms are single words. Wrap them in `whitespace-nowrap` to prevent ugly mid-word breaks ("kooper-oj" wrapped). For multi-word compound forms (e.g., `kam kooperuar`), the natural space lets the form wrap to two lines IF the cell forces it — which only happens on very narrow viewports. The decomposition layout in DecomposedForm uses `inline` segments with explicit spaces between auxiliary/stem/etc., so spaces persist.

In practice: add `whitespace-nowrap` to each `<td>` cell. The internal segments (which are already `<span>` elements) will respect the white-space rule. For long single-word forms that would overflow a 150px cell, the `whitespace-nowrap` produces *clipping into the next cell* — but at lg+ widths the cell is wide enough; at narrow widths the inner overflow-x-auto handles it.

Actually, simpler: don't add `whitespace-nowrap`. Let the natural word-break boundaries (spaces) wrap multi-word forms. Single-word forms are short enough not to wrap on lg+ widths. If they do wrap on mobile, the inner scroller still works.

Decision: skip the whitespace-nowrap step. The container widening + cell compression + sticky col is enough.

### D5. Edge case: future-perfect-in-past tense label

The longest tense label is `future-perfect-in-past` (22 characters). At text-xs (TENSE col uses `text-xs`), 22 chars × ~7px = 154px. Plus padding = ~170px. The TENSE column needs to be at least that wide.

Currently the TENSE column gets the natural width of its longest content. With our compression (`pr-2`), it ends up at ~150px. The `future-perfect-in-past` label may wrap to two lines on narrow column widths.

Acceptable: the label stays readable, just on two lines. Alternative would be to use `whitespace-nowrap` on the th, forcing the column to be wider — preferred? Yes, because:
- The column sticks (D3) and looks better with consistent height.
- Two-line tense labels desync row alignment with the cell content.

Add `whitespace-nowrap` ONLY on TENSE label `<th>` cells. Cell `<td>`s remain wrappable.

### D6. No change to non-finite-forms section

The non-finite forms section (`<NonFiniteForms>`) uses a different layout (a 2-column grid: term + DecomposedForm). It's not table-shaped and isn't affected by the same width crunch. No changes there.

### D7. Tests

E2E covers:

- At viewport 1280px, all six cell columns are visible without horizontal scroll inside the table's `overflow-x-auto`.
- At viewport 1024px, same.
- At viewport 768px, horizontal scroll IS available (overflow-x-auto active), and the TENSE column has `position: sticky`.

A bounding-rect check: for a known cell anchor (`#indicative-perfect-3pl`), the cell's right edge SHALL be ≤ viewport.innerWidth at lg+ viewports.

## Tradeoffs

- **Page-width tradeoff**: max-w-5xl/6xl makes the prose paragraphs (header text, sources description) wider than the optimal reading line. Mitigated because most verb-page text content is short labels and structured data, not long prose.
- **DecomposedForm font size in tables**: 14px instead of 16px is slightly less prominent. Acceptable — the compactness gain outweighs.
- **Sticky column adds a thin border**: minor visual addition, but signals scrollability. Net positive.
- **No mobile-card layout**: small phones still need horizontal scroll inside the table. The sticky column makes this acceptable. A full card-per-cell layout for narrow phones could be a follow-up.

## Resolved Questions

None.

## Open Questions

- **Q1.** Should the citations-footer also widen at lg/xl, or stay narrow for readability? Default: it lives inside the same `<main>` wrapper, so it widens automatically. Long citation strings might look stretched. Acceptable to revisit if user feedback surfaces.
- **Q2.** Add `xl:max-w-7xl` (1280px) for ultrawide displays? Defer — 1152px already gives comfortable breathing room; pushing wider would make text feel sprawled.
