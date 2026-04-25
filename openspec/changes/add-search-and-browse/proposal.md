## Why

After Phase 1, every verb in the corpus has a stable URL but no way to *find* it without typing the lemma directly. The reference experience is incomplete without discovery. This change introduces three discovery surfaces that every later capability (playground, practice, articles) will link into:

- **Search** — type-ahead lookup by Albanian lemma, English translation, OR conjugated form (reverse lookup).
- **Browse** — filter the corpus by class, auxiliary, dialect, frequency.
- **Random** — single button that takes the user to a random verb page (a learner-loop entry point).

Without this, the only way users find verbs is by guessing the URL or following a link from another tool.

## What Changes

- Add `apps/web/app/search/page.tsx` — a Server Component that renders the search input plus an empty results panel. Search is performed client-side against a compile-time FlexSearch index.
- Add `apps/web/app/browse/page.tsx` — a Server Component that lists every corpus verb in a sortable, filterable table. Filters: conjugation class, auxiliary (kam / jam), dialect, alphabetical letter.
- Add `apps/web/app/api/search/route.ts` — a JSON GET endpoint that accepts a query and returns matching verbs. Backs the search UI for crawlers and curl users; the UI uses the client index for instant feedback.
- Add `apps/web/lib/search-index.ts` — a build-time helper that turns the corpus into a FlexSearch document index. The index includes: `lemma`, `translationEn`, `class`, `auxiliary`, plus a `formIndex` of the most-frequent conjugated forms for reverse lookup.
- Extend `apps/web/lib/corpus.ts` to expose `findEntryByConjugatedForm(form)` powered by an in-memory reverse map built at boot.
- Update the home page (`apps/web/app/page.tsx`) to include a prominent search field and links to `/browse` and to a randomly-selected verb.
- Add a top-level navigation header (visible on every page) with links to `/`, `/browse`, `/search`. Removes the breadcrumb-only navigation from verb pages.

### Reverse lookup specifics

The user types `punuakam`. The system identifies it as the admirative-present-1sg of `punoj` and links to `/verb/punoj#admirative-present-1sg`. Behavior:

- For unambiguous forms (one verb produces this surface), redirect directly.
- For ambiguous forms (e.g., `pi` is both lemma and 1sg/2sg/3sg present indicative), show a disambiguation page listing all verbs whose tables contain that form.

### URL inventory

| Route                          | Type   | Description                          |
| ------------------------------ | ------ | ------------------------------------ |
| `/search`                      | RSC+CC | Search UI, client-side FlexSearch    |
| `/search?q=…`                  | RSC    | Pre-filtered server render for SEO   |
| `/browse`                      | RSC    | Full sortable table                  |
| `/api/search?q=…`              | route  | JSON GET, stable contract            |
| `/random`                      | RSC    | 302 redirect to a random verb page   |

## Capabilities

### New Capabilities
- `search-and-browse`: Defines the contract for verb discovery — search input behaviors, browse filters, the reverse-lookup ambiguity policy, the disambiguation page, the JSON API surface, and the requirement that all discovery routes be statically renderable for the empty/default state.

### Modified Capabilities
- `reference-pages`: Adds requirements for cell-level anchor IDs (`#admirative-present-1sg`) so reverse-lookup links can deep-link into a specific table cell.

## Impact

- **Code** — `apps/web/app/search/`, `apps/web/app/browse/`, `apps/web/app/random/`, `apps/web/app/api/search/route.ts`, `apps/web/lib/search-index.ts`, plus a `<NavHeader>` component, plus updates to `verb/[lemma]/page.tsx` for cell anchors.
- **Dependencies** — Adds `flexsearch` (≈30KB minified) to `apps/web`. Engine remains zero-dep.
- **APIs** — New JSON contract at `/api/search`. OpenAPI documentation deferred until `add-public-api` (Phase 4).
- **Linguistic claims** — None. Search is a presentation layer over existing engine output.
- **Audience tier** — All three. Search is the universal entry point.

## Non-Goals

- No saved searches, no search history. No user accounts in v1.
- No fuzzy matching across diacritics for v1. `bëj` matches `bëj`, not `bej`. (Adding diacritic-insensitive matching is a small follow-up but adds index size.)
- No semantic / embedding-based search. Lexical only.
- No filter UI beyond class/auxiliary/dialect/letter. "Frequency" filter is reserved but blocked by `add-frequency-data`.

## Sequence

```
PREREQ → add-verb-reference-page              (provides /verb/[lemma] to link into)
THIS   → add-search-and-browse                (creates search-and-browse capability;
                                                modifies reference-pages with cell anchors)
NEXT   → add-decomposition                    (Phase 2 educational layer, builds on cell anchors too)
LATER  → add-grammar-articles                  (Phase 3, links into search results)
```
