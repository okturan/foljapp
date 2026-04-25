## Why

The reference layer answers "what is the conjugation of X?" The educational layer needs to answer "why does Albanian have a *habitore* mood, and when do you use it?" — open-ended grammar prose that the table view can never deliver. The MDX scaffolding from `webapp-foundation` is already in place; this change activates it for grammar content.

Two starter articles ship with the change so the layout and conventions are exercised end-to-end. They are also the most "wow"-factor topics for foljapp's audience: Albanian's three verb classes (most students need this on day 1) and the admirative mood (the Balkan-only flex that distinguishes Albanian from any romance/germanic learner's prior experience).

## What Changes

- Add an `apps/web/app/articles/` route group:
  - `/articles` — index listing all published articles with title, summary, reading time
  - `/articles/[slug]` — individual article rendered via MDX (already wired in next.config.mjs `pageExtensions`)
- Add an article frontmatter contract (Zod-validated at build time):
  - `title: string`
  - `slug: string` (kebab-case, matches filename)
  - `summary: string` (one-line)
  - `category: 'mood' | 'tense' | 'classes' | 'phonology' | 'meta'`
  - `published: boolean`
  - `updatedAt: ISO8601`
- Add an `apps/web/lib/articles.ts` build-time loader that imports every `.mdx` under `apps/web/app/articles/`, validates frontmatter, and returns sorted metadata for the index page.
- Add MDX components callable inline from articles:
  - `<Example verbId="punoj" mood="..." tense="..." person={1} number="singular" />` — renders a single conjugation cell using the engine, with the same role-coded coloring + tooltips as the verb page.
  - `<VerbLink lemma="punoj" />` — renders a link to `/verb/punoj` with the lemma in mono.
  - `<MoodBadge name="admirative" />` — small badge consistently styled.
- Two starter articles:
  - `apps/web/app/articles/verb-classes/page.mdx` — "Albanian Verb Classes (Zgjedhimet)". Covers Class 1, 2, 3 with examples from the corpus; uses `<Example>` for one form per class.
  - `apps/web/app/articles/admirative-mood/page.mdx` — "The Admirative Mood (Habitore)". Explains its semantic register (surprise, irony, reported speech), shows construction from participle, gives examples drawn from the corpus.
- Update the home page to link to `/articles` underneath the existing `/browse` link.
- Update the verb page's reserved-actions row to drop the "Coming soon — articles" placeholder once articles are live (or keep but link out).

## Capabilities

### New Capabilities
- `grammar-articles`: Defines the contract for the articles index, individual article pages, the frontmatter schema, the available MDX components, and the requirement that articles be statically pre-rendered.

### Modified Capabilities
- `webapp-foundation`: adds the `/articles` and `/articles/[slug]` routes to the static-renderable surface (no behavioral change to existing requirements).

## Impact

- **Code** — `apps/web/app/articles/page.tsx` (index), `apps/web/app/articles/[slug]/` is NOT used (each MDX page lives at its own folder for cleaner URLs); each article is `apps/web/app/articles/<slug>/page.mdx`. Plus `apps/web/lib/articles.ts`, `apps/web/components/article-mdx-components.tsx`, the two starter `.mdx` files.
- **Dependencies** — `gray-matter` for frontmatter parsing if not already pulled in by `@next/mdx`. (Verify — if MDX export-syntax frontmatter is sufficient, no new dep is needed.)
- **APIs** — None.
- **Linguistic claims** — Heavy. Article prose makes substantive grammatical claims that need to be accurate. Each article cites its sources (Husić, Kadriu, Newmark/Hubbard).
- **Audience tier** — **Learners** primarily; **students** secondarily.

## Non-Goals

- No comment system, no community contributions.
- No localization; English only.
- No client-side article search (the corpus search input doesn't currently search articles; that's a follow-up).
- No reading-time auto-calculation; authors set `summary` and we display word count.
- Only two articles ship; the framework supports many more.

## Sequence

```
PREREQ → add-project-foundation              (provides MDX + Tailwind)
PREREQ → add-conjugation-engine              (provides <Example> data)
THIS   → add-grammar-articles                 (creates grammar-articles capability)
NEXT   → expand-article-set                   (more articles authored over time)
```
