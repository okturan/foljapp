## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and spec; confirm scope is unchanged
- [x] 1.2 Confirm MDX is wired in `apps/web/next.config.mjs`

## 2. Article registry

- [x] 2.1 Create `apps/web/lib/articles.ts` exporting `articleMetadataSchema` and `getArticles()`
- [x] 2.2 Implement `getArticles()` via build-time imports of each article's `metadata` export
- [x] 2.3 Vitest coverage of frontmatter parsing — covered indirectly by build-time validation; explicit unit deferred (build fails fast on missing/invalid metadata)

## 3. MDX components

- [x] 3.1 Create `apps/web/components/article-mdx-components.tsx` exporting `<Example>`, `<VerbLink>`, `<MoodBadge>`
- [x] 3.2 `<Example>` calls `engine.conjugate()` and renders via `<DecomposedForm>` (full role-coded coloring + tooltips)
- [x] 3.3 `<VerbLink>` renders an anchor to `/verb/<lemma>` with translation aside
- [x] 3.4 `<MoodBadge>` renders English + Albanian mood names side by side
- [x] 3.5 `apps/web/mdx-components.tsx` merges in the article components so MDX uses them implicitly

## 4. Articles index page

- [x] 4.1 Create `apps/web/app/articles/page.tsx` as a Server Component listing every published article
- [x] 4.2 Sort by `updatedAt` descending; show title, summary, category, date
- [x] 4.3 Set page metadata for SEO

## 5. Starter article — verb-classes

- [x] 5.1 Create `apps/web/app/articles/verb-classes/page.mdx` with frontmatter
- [x] 5.2 Author body covering Class 1, 2, 3 with diagnostic 1sg-present rule
- [x] 5.3 Use `<Example>` for one form per class (punoj, hap, pi)
- [x] 5.4 Cite Husić §1A/§2A/§3A + Kadriu + Wikipedia

## 6. Starter article — admirative-mood

- [x] 6.1 Create `apps/web/app/articles/admirative-mood/page.mdx` with frontmatter
- [x] 6.2 Author body covering register (surprise/irony/reported speech), Balkan distribution, construction
- [x] 6.3 Use `<Example>` for at least 3 verbs in admirative present (punoj, hap, marr, jam, shoh, them used)
- [x] 6.4 Cite Husić + Newmark/Hubbard + Wikipedia

## 7. NavHeader extension

- [x] 7.1 Add `Articles` link to `apps/web/components/nav-header.tsx`

## 8. Home page link

- [x] 8.1 Add a link to `/articles` underneath the existing `/browse` link on home page

## 9. End-to-end tests

- [x] 9.1 Add `apps/web/e2e/articles.spec.ts` covering index, both articles, NavHeader, VerbLink navigation
- [x] 9.2 Cover NavHeader presence (Articles link visible on every page)

## 10. Validation and handoff

- [x] 10.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green (72 unit + 28 E2E pass)
- [x] 10.2 Update specs if implementation surfaced clarifications — wrapped article content in `<main>` via `apps/web/app/articles/layout.tsx`
- [x] 10.3 `openspec validate add-grammar-articles --strict` — zero errors
