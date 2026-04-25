## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/interactive-playground/spec.md; confirm scope is unchanged
- [x] 1.2 Read current `apps/web/components/playground.tsx` and confirm the result `<section>` block is the only place the form renders
- [x] 1.3 Confirm the existing `interactive-playground` spec scenarios continue to apply unchanged (only ADDED requirements; no MODIFIED / REMOVED)

## 2. Extract PlaygroundResult component

- [x] 2.1 Create `apps/web/components/playground-result.tsx` exporting a Client Component that takes the result, traceSteps, unsupported, errorMsg, and verb props
- [x] 2.2 Move the contents of the existing result `<section>` (form + DecomposedForm + DerivationPanel + Copy link button + See full table link) into the new component, preserving all behavior
- [x] 2.3 Move the IPA rendering into PlaygroundResult so the result column carries IPA directly
- [x] 2.4 Keep the `copied` state and `copyLink` callback inside the new component (it does not leak to the parent)

## 3. Restructure playground.tsx layout

- [x] 3.1 Change the outer `<main>` className from `mx-auto max-w-3xl px-6 py-10` to `mx-auto max-w-6xl px-6 py-6 lg:py-10 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-12 lg:items-start`
- [x] 3.2 Wrap `<PlaygroundResult>` in an `<aside aria-label="Conjugated form">` placed BEFORE the `<h1>` in DOM order
- [x] 3.3 Apply sticky / responsive classes to the `<aside>` per design D2 (mobile sticky-top with translucent band; desktop sticky-top-8 grid-cell with card border)
- [x] 3.4 Wrap the title, intro paragraph, verb picker, and all radio fieldsets in a single `<div className="lg:order-1">` so they form column 1 of the desktop grid
- [x] 3.5 Remove the original inline result `<section>` element

## 4. End-to-end coverage

- [x] 4.1 Add `apps/web/e2e/playground-layout.spec.ts` with a desktop test (1280×800 viewport) verifying the form text is in the viewport when both the verb picker and the result are visible after initial load
- [x] 4.2 Add a desktop test that scrolls the page by 400px and asserts the result panel's bounding box `y` is still ≤ 800
- [x] 4.3 Add a mobile test (390×844 viewport) verifying the `<aside>` containing the form appears before the `<h1>` in document order
- [x] 4.4 Add a mobile test that scrolls by 600px and asserts the band is pinned to `y` ≈ 0
- [x] 4.5 Add a desktop test that clicks a different mood radio and asserts the result panel's bounding box stays inside the viewport across the click

## 5. Regression coverage

- [x] 5.1 Run all existing `apps/web/e2e/*.spec.ts` files (especially `playground.spec.ts`, `practice.spec.ts`, `derivation.spec.ts`) and confirm none fail because of the layout change
- [x] 5.2 Confirm the Copy link button still copies to clipboard
- [x] 5.3 Confirm the See full table link still routes to `/verb/<lemma>`
- [x] 5.4 Confirm the URL search params still update on every control change

## 6. Validation and handoff

- [x] 6.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green
- [x] 6.2 Update specs if implementation surfaced clarifications
- [x] 6.3 `openspec validate improve-playground-sticky-result --strict` — zero errors
