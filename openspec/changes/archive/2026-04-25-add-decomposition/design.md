## Context

Phase 1 shipped role-coded coloring. Learners see WHAT is special about each segment but not WHY. The smallest, most-leveraged way to bridge that gap is hover tooltips: short, one-line explanations attached to every segment. Implementation is data-driven (a lookup table keyed by segment metadata) and has no engine impact.

A more ambitious "click-to-expand derivation panel" requires the engine to expose its construction trace as a returnable artifact. That work is structured but invasive (every internal builder needs to emit trace steps). Splitting it off as `add-engine-trace` lets us ship tooltips today and treat the panel as a follow-up.

## Goals / Non-Goals

**Goals:**

- Every visible segment exposes a one-line explanation.
- Static `title` fallback so explanations survive without JavaScript.
- Richer `<Tooltip>` rendering when JS is available, via shadcn's primitive (already seeded).
- Keyboard accessibility — focusable segments, tooltip on focus.

**Non-Goals:**

- No engine changes.
- No derivation-step rendering.
- No localization beyond English.

## Decisions

### D1. Pure-data lookup, no inference

`segment-explanations.ts` is a flat lookup table keyed by `role` (and `meta.particleName` when role is `particle`, `meta.tense + meta.mood` when needed for endings). No machine-learning, no template strings beyond simple parameterization. The set of distinct keys is small (~30); reviewable in a single PR.

Rationale: explanations are content, not logic. Keep the engine pure; let the page author the prose.

### D2. Static title + JS Tooltip layered together

The `title` attribute renders without JS and is enough for screen-reader access. The shadcn `<Tooltip>` enriches the experience with positioning, animation, and richer markup on JS clients. Both surface the same string.

### D3. Each segment is its own focusable button-like element

To make tooltips keyboard-accessible, segments need to receive focus. We render each segment as a `<span>` with `tabIndex={0}` and `role="button"` (since clicking won't navigate, but the element is interactable for tooltip purposes). The `aria-describedby` ties the tooltip content to the segment for screen readers.

Trade-off: every cell now has 2-4 tab stops. Acceptable for the educational mode; we can hide focus on the entire row behind a "study mode" toggle if it gets noisy.

### D4. `DecomposedForm` becomes a Client Component

Currently `DecomposedForm` is server-rendered (no JS). To use shadcn's Tooltip we must mark it `'use client'`. The static fallback (title attribute) is server-rendered HTML embedded in the SSR output, so the no-JS path still works.

Trade-off: the verb page (which already has client islands for ReservedActions tooltips) gains another. Bundle impact is small — shadcn Tooltip already ships.

## Tradeoffs

- **Verb page hydration cost grows.** Each cell becomes a hydratable Client Component. For 100+ cells per verb page, this is non-trivial. Mitigated by the fact that the static HTML still renders correctly without hydration; the JS layer is enhancement.
- **Explanation prose is approved by the author, not crowdsourced.** Mitigated by it being editable in one file; future refinements land as small PRs.

## Migration Plan

Not applicable.

## Resolved Questions

_None — all scope decisions are made up front. Future work (`add-engine-trace`) will reopen the derivation question._
