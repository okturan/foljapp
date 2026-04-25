## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and both spec files; confirm scope is unchanged
- [x] 1.2 Resolve open questions Q1 (reverse lookup) Q2 (filter persistence) by updating design.md with confirmed answers (defer both)

## 2. Top-level navigation

- [x] 2.1 Create `apps/web/components/nav-header.tsx` with three links: Home (`/`), Browse (`/browse`), Random (`/random`)
- [x] 2.2 Mount `<NavHeader>` in `apps/web/app/layout.tsx` so every page renders it
- [x] 2.3 Style with current-page indicator using Next's `usePathname` (Client Component)

## 3. Corpus index loader for client code

- [x] 3.1 Create `apps/web/lib/corpus-index.ts` exporting a typed array of `{ id, lemma, translationEn, class, auxiliary }` read from `data/verbs/index.json` at build time
- [x] 3.2 Verify the import works in both Server and Client Components (the JSON is bundled, not fetched at runtime)

## 4. Search input on home

- [x] 4.1 Create `apps/web/components/search-input.tsx` as a Client Component
- [x] 4.2 Implement substring filter against `lemma` and `translationEn`; case-insensitive; diacritic-aware
- [x] 4.3 Render up to 8 suggestions in a dropdown; each row links to `/verb/<lemma>`
- [x] 4.4 Hide dropdown on empty query, click-outside, or Escape
- [x] 4.5 Update `apps/web/app/page.tsx` to embed `<SearchInput>` with placeholder "search a verb…" and a link to `/browse`

## 5. /browse page

- [x] 5.1 Create `apps/web/app/browse/page.tsx` as a Server Component listing every corpus entry in a table
- [x] 5.2 Wrap the table in a Client Component for filter state (class, auxiliary) and column sort
- [x] 5.3 Each row's lemma cell links to `/verb/<lemma>`
- [x] 5.4 Verify build emits one static HTML for `/browse`

## 6. /random redirect

- [x] 6.1 Create `apps/web/app/random/page.tsx` that redirects via `next/navigation`'s `redirect()` to a corpus verb chosen at build time
- [x] 6.2 Use a build-stable seed (`SOURCE_DATE_EPOCH ?? Date.now()`) so the static render picks one verb per build
- [x] 6.3 Verify the redirect navigates to a corpus verb (E2E)

## 7. Cell anchor IDs on verb pages

- [x] 7.1 Update `apps/web/components/conjugation-table.tsx` so each `<td>` carries `id="<mood>-<tense>-<person><number>"`
- [x] 7.2 Update `apps/web/components/non-finite-forms.tsx` so each row carries `id="non-finite-<form>"`
- [x] 7.3 Verify deep-linking via E2E

## 8. End-to-end tests

- [x] 8.1 Add `apps/web/e2e/search.spec.ts` covering home-page search type-ahead and click-to-navigate
- [x] 8.2 Add E2E for /browse: page renders 20 verbs; class-1 filter narrows
- [x] 8.3 Add E2E for /random: redirects to `/verb/<lemma>`
- [x] 8.4 Add E2E for cell anchors: `/verb/punoj#admirative-present-1sg` element exists with `punuakam`; non-finite anchor works
- [x] 8.5 E2E for nav header on every page

## 9. Validation and handoff

- [x] 9.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green (70 unit + 16 E2E pass)
- [x] 9.2 Update specs if implementation surfaced clarifications (none required)
- [x] 9.3 `openspec validate add-search-and-browse --strict` — zero errors
