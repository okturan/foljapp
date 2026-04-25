## Why

The playground is the loop where learners poke at the engine and watch
forms change. Today the result renders **at the bottom of the page**,
beneath seven stacked radio fieldsets. Every interaction (mood change,
voice flip, person bump) recomputes the form — but the result is now
off-screen. The user has to scroll down to confirm what they just
selected, then scroll back up to change the next thing. That scroll
breaks the feedback loop the playground is supposed to provide.

The fix is layout, not engine. On a desktop viewport there is plenty
of horizontal real estate going unused; the controls and result can
sit side-by-side. On mobile the same separation is impossible, but a
small sticky band pinned to the top of the viewport keeps the form
visible while the user scrolls through controls.

This change is purely UI. The engine, URL state, derivation trace,
and copy/link affordances are unchanged.

## What Changes

- **Extract** a `<PlaygroundResult>` component from the inline result
  section in `apps/web/components/playground.tsx`. It owns the form
  text, decomposition, IPA, derivation panel, and the two action
  buttons (Copy link, See full table). The same component renders in
  both viewport layouts so logic doesn't fork.
- **Restructure** the playground main element into a CSS grid with
  `[3fr_2fr]` tracks at the `lg` breakpoint (1024px+). Controls
  occupy the left track; `<PlaygroundResult>` occupies the right
  track inside an `<aside>` that is `sticky top-8` and `self-start`,
  so the result stays visible while the controls list scrolls.
- **At < lg viewports** the same `<aside>` renders ABOVE the title
  and controls in DOM order, with `sticky top-0`, a translucent
  background, and a bottom border. As the user scrolls past the
  band's natural position, it pins to the viewport top.
- **Increase** the page max width from `max-w-3xl` to `max-w-6xl` so
  the two-column desktop layout has room. Single-column on mobile
  is unaffected.
- **No engine, schema, or URL-format changes.** All existing E2E
  tests that don't depend on layout continue to pass.

## Capabilities

### Modified Capabilities

- `interactive-playground`: Adds two requirements describing the
  sticky-result layout — desktop two-pane and mobile sticky-top band
  — plus a requirement that the result is visible at the same
  viewport position before and after a control change.

## Impact

- **Code** — `apps/web/components/playground.tsx` (restructure),
  new `apps/web/components/playground-result.tsx` (extracted panel).
- **Dependencies** — None. Tailwind v4 sticky / grid classes only.
- **APIs** — None.
- **Linguistic claims** — None.
- **Audience tier** — Learners primarily (tight feedback loop matters
  most for them). Students and researchers benefit incidentally.

## Non-Goals

- No change to which controls exist, their order, or their values.
- No change to the URL parameter format.
- No change to the engine, decomposition, IPA, or trace output.
- No new visual style for the result panel beyond what's needed to
  separate it as a sticky card on desktop and a translucent band on
  mobile. No icons, no animations, no new colors.
- No collapsing / hiding controls based on scroll position.
- No "floating" result panel that overlays content. Sticky only.
- No persistent state beyond what URL search params already encode.
