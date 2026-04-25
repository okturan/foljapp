## Why

After `add-conjugation-engine` ships, foljapp can produce conjugations programmatically — but a user cannot yet *see* them. This change introduces the first user-facing capability: a per-verb static reference page at `/verb/[lemma]` that renders the full conjugation table for any verb in the corpus, with role-coded coloring (particle / auxiliary / stem / ending / voice marker) drawn from the engine's morphological decomposition. This is the seed of the reference experience — every later capability (search, playground, articles, IGT export) plugs into or links to these pages.

This change closes the foundation phase by delivering the first end-to-end vertical slice: a user types `/verb/marr` into the address bar and sees a complete, sourced, statically-rendered conjugation table.

## What Changes

- Add a dynamic route `apps/web/app/verb/[lemma]/page.tsx` rendered as a React Server Component, statically pre-generated at build time for every verb in the corpus via `generateStaticParams`.
- Add a `ConjugationTable` component that accepts the engine's `ConjugatedForm[]` output and renders a per-mood table grouped by tense, with each form's morphological roles colored via the `morph.*` Tailwind tokens reserved by `add-project-foundation`.
- Add a verb-page header showing: the lemma (1st person singular present), English translation, conjugation class (Zgjedhimi 1/2/3), auxiliary verb (kam / jam), and the three principal parts (present stem / aorist stem / participle).
- Add a citations footer listing the source(s) for the verb's paradigm: uniparser paradigm name, Kaikki entry URL, Husić paradigm number when known, plus the engine version that produced this rendering.
- Add a 404 page for unknown lemmas.
- Add E2E tests asserting that visiting `/verb/punoj`, `/verb/jam`, and `/verb/pjek` each renders a populated table containing forms from at least four moods.

## Capabilities

### New Capabilities
- `reference-pages`: Defines the contract of the per-verb reference page: URL shape (`/verb/[lemma]`), required content blocks (header, table, footer), role-coded rendering rules, static-generation requirements, 404 behavior, and cross-link targets reserved for later capabilities (search, playground, IGT export).

### Modified Capabilities
_None._ The `conjugation-engine` and `verb-corpus` capabilities are *consumed* by this change but their requirements are unchanged. The page imports `conjugate()` and reads corpus JSON; neither contract is altered.

## Impact

- **Code** — Adds `apps/web/app/verb/[lemma]/page.tsx`, `apps/web/app/verb/[lemma]/not-found.tsx`, `apps/web/components/conjugation-table.tsx`, `apps/web/components/verb-header.tsx`, `apps/web/components/citations-footer.tsx`, plus E2E specs.
- **Dependencies** — None added. All UI built from the shadcn primitives already seeded in foundation.
- **APIs** — None added. Pages are static; engine is imported as a Node module at build time.
- **Linguistic claims** — Display-layer only. The page presents whatever the engine returns, and the citations footer surfaces the same source attributions the engine and corpus already track. No new morphological assertions are made.
- **Audience tier** — Primary: **learners** (default visual experience). Secondary: **students** (citations footer, principal parts header). Tertiary reach for **researchers** is deferred to `add-igt-export` and `add-public-api`.

## Non-Goals

- No search input or browse index. Direct URLs only — `add-search-and-browse` ships discovery.
- No interactive switches (causative, passive toggle, etc.). Read-only static table. Interactivity belongs to `add-interactive-playground`.
- No "why does this change?" tooltips, no inline grammar-article links. Educational annotation lives in `add-decomposition` and `add-grammar-articles`.
- No practice mode, no flashcards. `add-practice-mode` is Phase 3.
- No IPA, no audio, no dialect toggle. Phase 5.
- No download buttons (JSON/CoNLL-U). `add-igt-export` is Phase 4.
- No frequency badges. `add-frequency-data` is Phase 4.
- No internationalization. English UI strings only.

## Sequence

```
PREV  →  add-project-foundation         (provides the workspace, Tailwind morph tokens, MDX, shadcn)
PREV  →  add-conjugation-engine         (provides conjugate() and the corpus)
THIS  →  add-verb-reference-page        (creates reference-pages capability)
NEXT  →  add-search-and-browse          (Phase 2 — adds discovery on top of reference pages)
```

This change is implementable only after both `add-project-foundation` and `add-conjugation-engine` are archived. It does not modify the specs of the capabilities it consumes; it composes them into the first user-visible product surface.
