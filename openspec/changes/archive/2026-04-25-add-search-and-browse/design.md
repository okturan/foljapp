## Context

After Phase 1, every corpus verb has a stable URL but no discovery surface. Users must guess `/verb/<lemma>` or follow links from elsewhere. With 20 verbs this is tolerable; the moment we expand the corpus, search becomes the only practical entry point.

## Goals / Non-Goals

**Goals:**

- Type-ahead lookup on the home page that surfaces matches as the user types.
- A `/browse` page that lists every corpus entry in a sortable, filterable table.
- A top-level navigation header consistent across all pages.
- Cell anchor IDs on verb pages so search results can deep-link into a specific form.
- A `/random` route as a learner-loop entry point.
- All discovery surfaces statically pre-rendered for the empty/default state.

**Non-Goals:**

- No reverse lookup (form → lemma) at v0.1.x. Deferred to a follow-up `add-reverse-lookup` change because it requires precomputing every form for every verb (~2,000 entries) and a disambiguation UI for ambiguous forms.
- No FlexSearch index — for 20 verbs a simple JS array filter is faster than the index it would build. Adoption follows when the corpus exceeds ~200 verbs.
- No `/api/search` JSON endpoint at v0.1.x. The search input is fully client-rendered; researchers can read `data/verbs/index.json` directly.
- No saved searches, no search history, no recent verbs.
- No fuzzy / Levenshtein matching. Substring matching only.

## Decisions

### D1. Client-side filter over indexed search

Considered: FlexSearch with build-time index; simple JS filter; server-side `/api/search` handler.

Chosen: **simple JS filter on a 20-verb array**. The corpus index (`data/verbs/index.json`) is ≤ 4 KB and ships with the page bundle. Filtering 20 entries on every keystroke takes microseconds.

Trade-off: when the corpus reaches ~200 verbs, the filter cost grows linearly. At that point we adopt FlexSearch. The transition is mechanical — same input shape, different `filter()` function.

### D2. Search and browse share the same client state shape

Both surfaces read the corpus index, both filter client-side, both render rows with the same per-row component (`<VerbRow>`). The home page just constrains the row count to top-N matches; browse renders the full set with filters.

### D3. Diacritic-aware exact matching

Albanian text contains `ë`, `ç`, etc. We match them as themselves — no fold-to-ASCII shortcut. Users can copy-paste Albanian or type with diacritics. Rationale: the audience reads Albanian; folding diacritics would make `bëj`/`bej` collide and surface false matches.

### D4. /random uses a deterministic-per-build seed

Chosen: a 307 redirect from `/random` to `/verb/<lemma>` where `lemma` is selected by hashing the build timestamp. This lets us pre-render the redirect statically. Every deploy randomizes the destination; within a deploy the link is stable (good for caching, OK for UX).

Alternative: runtime-random. Rejected because it forces `/random` out of the static cache.

### D5. Cell anchor IDs

Format `<mood>-<tense>-<person><number>` (e.g., `indicative-aorist-1sg`) on the `<td>`. Non-finite use `non-finite-<form>`. Imperative restricts to `imperative-present-2sg` / `2pl`. Avoid colons / dots in IDs (better URL fragment ergonomics).

### D6. Layout

```
   ┌──────────────────────────────────────────────────────┐
   │  foljapp · Home · Browse · Random                    │  ← <NavHeader>
   ├──────────────────────────────────────────────────────┤
   │                                                      │
   │     foljapp                                          │
   │     Albanian verbal system reference                 │
   │                                                      │
   │     ╭──────────────────────────────────────────╮     │
   │     │ search a verb…                           │     │
   │     ╰──────────────────────────────────────────╯     │
   │       ┌──────────────────────────────────────┐       │
   │       │ punoj      to work       Zg 1  kam   │       │
   │       │ punësoj    to employ     Zg 1  kam   │       │
   │       └──────────────────────────────────────┘       │
   │                                                      │
   │     →  Browse all 20 verbs                           │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │  foljapp · Home · Browse · Random                    │
   ├──────────────────────────────────────────────────────┤
   │                                                      │
   │     Browse                       Class · Auxiliary   │
   │     ┌────────────────────────────────────────────┐   │
   │     │ lemma │ translation │ class │ auxiliary    │   │
   │     ├────────────────────────────────────────────┤   │
   │     │ bëj   │ to make     │  1    │  kam         │   │
   │     │ djeg  │ to burn     │  2    │  kam         │   │
   │     │ ...                                        │   │
   │     └────────────────────────────────────────────┘   │
   └──────────────────────────────────────────────────────┘
```

## Tradeoffs

- **Search input is a Client Component, home page is otherwise an RSC.** This forces a hydration boundary on `/`. Acceptable: the input is small, the rest of the page stays static.
- **Browse filters live client-side.** Initial paint shows all 20 rows; filtering rerenders. Acceptable for small N; we'll re-architect with URL-driven filter state when the corpus grows.
- **Anchor IDs change the verb page's HTML structure.** Adding `id="..."` to `<td>` is a backward-compatible enrichment; nothing relies on the previous structure.

## Migration Plan

Not applicable.

## Resolved Questions

- **Q1.** Reverse lookup on the home input. → **Resolved: defer to `add-reverse-lookup`.** Scope here is lemma + English substring matching only.
- **Q2.** Filter persistence across navigation. → **Resolved: no.** Filters reset on each visit. URL-driven filters are a follow-up.
