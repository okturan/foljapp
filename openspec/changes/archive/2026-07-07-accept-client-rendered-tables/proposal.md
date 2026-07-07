## Why

Commit 6dc3822 ("Reduce Pages verb artifact size", 2026-06) made the verb
page's conjugation tables client-rendered (`dynamic(..., { ssr: false })`)
to shrink the Cloudflare Pages artifact from 153 MB of prerendered HTML to
9.8 MB — each of the 203 verb pages embedded ~540 KB of table/RSC markup.
That decision was never reconciled with the `reference-pages` requirement
"Server-side rendering only — no JS required for content", leaving one E2E
test (`decomposition.spec.ts` "static title attribute is present without
JS") permanently red and the spec asserting something the product
deliberately does not do.

On 2026-07-07 the user ratified the tradeoff: keep client-rendered tables,
amend the spec. (The alternative — restoring SSR with a size-mitigation
strategy — remains reopenable via a fresh proposal per project convention.)

## What Changes

- **`reference-pages` spec** — the SSR-only requirement is MODIFIED: the
  static shell (header, principal parts, metadata, citations footer) SHALL
  remain statically pre-rendered; the conjugation tables and decomposition
  markup are client-rendered from the corpus bundle, with a loading
  placeholder in the static HTML.
- **`openspec/config.yaml`** — the "Every page statically renderable"
  quality bar gains the tables carve-out so future proposals inherit the
  real constraint.
- **E2E** — the no-JS table test is retired; the JS-enabled equivalent
  (keyboard-focus title attributes) already covers the same assertions and
  stays. The suite goes fully green (128 → 127 tests, 127 passing).

## Capabilities

Modifies `reference-pages` (rendering requirement only; content,
accessibility, and metadata requirements are untouched — metadata stays
statically derived, so SEO titles/descriptions are unaffected).

## Impact

- **Code** — one E2E test removed; no runtime code changes (this ratifies
  existing behavior).
- **SEO/no-JS** — conjugated forms are not in the static HTML; page
  titles/descriptions/OG tags remain static. Accepted consciously.
- **Audience tier** — all; primarily an engineering-truth cleanup.

## Non-Goals

- **No SSR restoration or partial-SSR experiment** (e.g. shell + default
  table server-rendered): reopenable with size measurements as its own
  proposal.
- **No offline/service-worker work.**

## Sequence

```
PREREQ → 6dc3822 (behavior landed June 2026)
THIS   → accept-client-rendered-tables (spec catches up, user-ratified)
NEXT   → (optional) partial-SSR proposal if no-JS content becomes a goal
```
