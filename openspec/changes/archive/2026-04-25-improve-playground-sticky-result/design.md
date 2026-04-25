## Context

Playground today (single column, `max-w-3xl`):

```
┌─────────────────────────────────────────┐
│  Playground                             │
│  Pick a verb...                         │
├─────────────────────────────────────────┤
│  Verb: [picker]                         │
│  Mood: [○ ○ ○ ○ ○ ○ ○]                  │
│  Tense: [○ ○ ○ ○ ○ ○ ○ ○ ○ ○]           │
│  Voice: [○ active  ○ middle-passive]    │
│  Polarity: [○ affirmative  ○ negative]  │
│  Modality: [○ declarative  ○ interrog]  │
│  Person: [○ 1  ○ 2  ○ 3]                │
│  Number: [○ sg  ○ pl]                   │
├─────────────────────────────────────────┤
│  FORM                                   │
│  punoj                                  │
│  /punɔj/                                │
│  ▶ How is this built?                   │
│  [Copy link]  [See full table →]        │
└─────────────────────────────────────────┘
   ↑ user scrolls here every time, then back up to next control
```

The page is 600–1000 px tall depending on viewport and which radio
fieldsets are showing. Every control change recomputes the form,
but the form is below the fold for most of the controls. The user
needs to scroll down to verify the change, then back up to make the
next change.

## Goals / Non-Goals

**Goals:**

- Result form is always visible in the viewport while the user
  manipulates controls, on both desktop and mobile.
- Single source of truth for the result panel: one component used
  in both layouts so logic does not fork.
- No changes to engine, URL state, or content. Layout only.
- Existing E2E tests that don't depend on layout MUST continue to
  pass with no edits.

**Non-Goals:**

- No floating / overlay panels (only `position: sticky`).
- No collapsing controls based on scroll.
- No icons, animations, or new visual identity beyond what's needed
  to make sticky regions readable.
- No persistent state outside URL search params.

## Decisions

### D1. Two-pane desktop, sticky-top-band mobile

Desktop (≥1024 px / `lg`):

```
┌──────────────────────────────────────────────────────────────────┐
│  Playground                                                      │
│  Pick a verb...                                                  │
├──────────────────────────────┬───────────────────────────────────┤
│  CONTROLS COLUMN  (3fr)      │  RESULT COLUMN  (2fr)             │
│                              │  ┌─────────────────────────────┐  │
│  Verb: [picker]              │  │ FORM                        │  │
│                              │  │   punoj                     │  │
│  Mood: [○ ○ ○ ○ ○ ○ ○]       │  │   /punɔj/                   │  │
│                              │  │                             │  │
│  Tense: [○ ○ ○ ○ ○ ○]        │  │   ▶ How is this built?      │  │
│                              │  │                             │  │
│  Voice: [○ active  ○ m-p]    │  │   [Copy] [See full table →] │  │
│                              │  └─────────────────────────────┘  │
│  Polarity: [○ ○]             │     ↑ position: sticky; top: 2rem │
│                              │                                   │
│  Modality: [○ ○]             │                                   │
│                              │                                   │
│  Person: [○ ○ ○]             │                                   │
│                              │                                   │
│  Number: [○ ○]               │                                   │
│                              │                                   │
└──────────────────────────────┴───────────────────────────────────┘
```

Mobile (< 1024 px):

```
┌────────────────────────────────────────┐
│ ─── STICKY RESULT BAND ────────────── │ ← sticky top: 0
│  punoj                                 │
│  /punɔj/                               │
│  ▶ How is this built?                  │
│  [Copy] [See full →]                   │
├────────────────────────────────────────┤
│  Playground                            │
│  Pick a verb...                        │
│                                        │
│  Verb: [picker]                        │
│                                        │
│  Mood: [○ ○ ○ ○ ○ ○ ○]                 │
│                                        │
│  Tense: [○ ○ ○ ○ ○ ○]                  │
│                                        │
│  ... more radios ...                   │
│                                        │
└────────────────────────────────────────┘
   user scrolls — band pins at top, form stays visible
```

The result panel renders in DOM order BEFORE the `<h1>` and controls.
On mobile this places the form at the top of the page, exactly where
sticky-top behavior wants it. On desktop the same DOM ordering is
overridden via CSS Grid `order: 2` so the panel renders in the right
column visually.

### D2. Single component, dual placement via CSS

Extract `<PlaygroundResult>` from the inline `<section>` in
`playground.tsx`. Place it ONCE in the JSX, inside an `<aside>`
that uses Tailwind responsive classes to behave differently per
viewport.

```tsx
<main className="
  mx-auto max-w-6xl px-6 py-6
  lg:py-10 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-12 lg:items-start
">
  <aside
    aria-label="Conjugated form"
    className="
      sticky top-0 z-10 -mx-6 mb-6 px-6 py-4
      bg-stone-50/95 backdrop-blur border-b border-stone-200

      lg:order-2 lg:top-8 lg:self-start lg:z-0
      lg:mx-0 lg:mb-0 lg:px-6 lg:py-6
      lg:bg-white lg:border lg:border-stone-200 lg:rounded-lg
      lg:backdrop-blur-none
    "
  >
    <PlaygroundResult ... />
  </aside>

  <div className="lg:order-1">
    <h1>Playground</h1>
    <p>Pick a verb…</p>
    {/* picker + radio fieldsets */}
  </div>
</main>
```

`position: sticky` works in both contexts:

- On mobile (block flow): sticks to viewport `top: 0` once scrolled
  past natural position. The `-mx-6` + `px-6` lets the background
  band span edge-to-edge at the page's left/right padding.
- On desktop (grid track): sticks at `top: 2rem` within its grid
  cell. `self-start` is required so the cell does not stretch to
  match the controls-column height (a stretched cell defeats sticky
  because there's no scroll inside the cell).

### D3. Why DOM order = mobile-first, override on desktop

Two options were considered for the result panel's DOM position:

| Option                                | Mobile sticky        | Desktop right-pane | Tradeoff                    |
|---------------------------------------|----------------------|--------------------|-----------------------------|
| (A) Result FIRST in DOM, `lg:order-2` | natural sticky-top   | needs grid-order   | semantic concern: form-before-h1 |
| (B) Result LAST in DOM, mobile clone  | clone two renders    | natural            | duplication, state risk      |

Option A is chosen. The accessibility cost of `<aside>` appearing
before `<h1>` is acceptable because `<aside>` carries
`aria-label="Conjugated form"` and the heading hierarchy stays
intact — the heading still reads first within the controls column.
Screen readers announce landmarks; a labeled `<aside>` followed by
an `<h1>` is well-formed. Avoids the duplication of Option B and
the state-sync bugs that come with rendering the same client
component twice.

### D4. max-w-6xl, gap-12

The current `max-w-3xl` (≈ 768 px) is too narrow for two columns.
At `max-w-6xl` (≈ 1152 px) the 3fr/2fr split gives the controls
column ≈ 670 px (room for the longest radio rows) and the result
column ≈ 425 px (room for the longest compound forms like
`do të kisha pasur punuar`). `gap-12` (3 rem) is the breathing
room between columns; `gap-8` was tried in mockups but felt
cramped against a sticky card.

### D5. Mobile band visual treatment

The mobile sticky band uses `bg-stone-50/95 backdrop-blur` so
content scrolling underneath is dimmed but not invisible. The
`border-b border-stone-200` is a single hairline that disambiguates
the band from below content when it's pinned. No drop shadow — too
heavy for the rest of the design.

The full panel (form + IPA + derivation + buttons) renders inside
the band on mobile too. Clicking "How is this built?" expands the
`<details>` element, which grows the band's height. This is
accepted: the user explicitly requested the trace, and it's better
to have the trace right there than to send them somewhere else.
The controls below scroll naturally when the band gets tall.

### D6. Result column height is content-driven, not viewport-driven

On desktop, the result column is exactly as tall as its content.
This means short forms (e.g., `jam`) leave whitespace below the
card; long traces fill more of the viewport. This is preferred over
a fixed-height card with internal scroll because:

- Internal scroll inside a sticky card is fiddly; users can lose
  the trace if it's mid-scroll when sticky kicks in.
- The variable-height card is uglier in mockups but more usable.

## Tradeoffs

- **Form-before-heading DOM order.** Aria-labeled `<aside>` before
  `<h1>` is unconventional. Mitigated by aria-label and by the fact
  that the page's primary semantic content (controls + heading) is
  in DOM order within its own column.
- **Sticky elements may overlap browser-native UI on mobile.** Some
  iOS browsers float their address bar UI on top of `top: 0`
  elements during scroll. Mitigated: the band is short (≈ 120–180 px)
  and content underneath remains scrollable. The Playwright test at
  390×844 (iPhone 14 dimensions) is the regression baseline.
- **Long compound forms wrapping in the desktop column.**
  `do të kisha pasur punuar` is ~ 22 chars; in `text-3xl` (1.875 rem
  ≈ 30 px font) at 425 px column width it fits on one line. Forms
  longer than that wrap, which is acceptable — wrapping is rare and
  doesn't break decomposition styling.
- **No control auto-collapse on long pages.** If a verb has a sparse
  conjugation table the controls list is short and feels loose. We
  accept the loose feel rather than introduce conditional rendering
  rules that could surprise users mid-interaction.
- **Two `position: sticky` contexts.** Mobile (block) and desktop
  (grid) sticky behave subtly differently. We rely on Playwright
  coverage at both viewports to catch regressions; both cases are
  exercised by the new spec scenarios.

## Resolved Questions

_None._
