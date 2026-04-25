## Context

The MDX pipeline is wired but unused beyond the smoke page. Grammar articles are the natural first content to flow through it. This change activates the pipeline with a simple convention (one folder per slug, `page.mdx` inside) and ships two starter articles to prove the loop.

## Goals / Non-Goals

**Goals:**

- Authors can drop a new `.mdx` file in `apps/web/app/articles/<slug>/page.mdx` and it appears at `/articles/<slug>` with no other code changes.
- The index page always reflects the published article set, sorted by recency.
- Articles can render live conjugation examples via `<Example>` — the engine is the single source of truth for any form quoted in prose.
- Static rendering throughout.

**Non-Goals:**

- No CMS. Articles are committed `.mdx`.
- No localization.
- No tag pages, category indices, or related-articles widgets.
- No reading-time estimator.
- No versioning UI for article history (git is the version history).

## Decisions

### D1. One folder per slug, page.mdx inside

Next.js's App Router requires the file to be named `page.{ext}`. To get `/articles/verb-classes`, the file must live at `apps/web/app/articles/verb-classes/page.mdx`. This means each article is its own directory — slightly heavier than a flat `articles/<slug>.mdx` layout, but it matches Next's conventions and lets each article colocate assets (images, custom components) if needed later.

### D2. Frontmatter via JS export, not YAML

Next.js's MDX integration recommends exporting metadata via:

```mdx
export const metadata = { title: '...', slug: '...', ... }
```

This works with `generateMetadata` for SEO and avoids pulling in `gray-matter`. The trade-off: less familiar to authors used to YAML frontmatter. Mitigated by template comments in the starter articles.

### D3. Article registry built at compile time

`apps/web/lib/articles.ts` performs a synchronous filesystem scan at build time, importing each `page.mdx`'s `metadata` export. Validates against the Zod schema. Returns a sorted array.

This means the index page is RSC and ships zero JS for the listing. Adding an article requires a build, not a server reload.

Trade-off: dev mode hot-reload may be slow when adding articles. Acceptable for a content surface.

### D4. MDX components live in one file

`apps/web/components/article-mdx-components.tsx` exports `<Example>`, `<VerbLink>`, `<MoodBadge>`. The `mdx-components.tsx` at `apps/web/mdx-components.tsx` (already present) imports and re-exports them so MDX files use them implicitly without explicit imports.

This keeps articles low-ceremony: authors write prose, drop in `<Example .../>`, done.

### D5. Layout

```
   ┌──────────────────────────────────────────────────────┐
   │  foljapp · Home · Browse · Random · Articles         │  ← NavHeader (extended)
   ├──────────────────────────────────────────────────────┤
   │                                                      │
   │     Articles                                         │
   │     ───────────                                      │
   │     The Admirative Mood             4 days ago       │
   │     Why Albanian flexes its …                        │
   │                                                      │
   │     Albanian Verb Classes           4 days ago       │
   │     The three conjugations …                         │
   │                                                      │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │  foljapp · Home · Browse · Random · Articles         │
   ├──────────────────────────────────────────────────────┤
   │                                                      │
   │  ARTICLES                                            │
   │  The Admirative Mood (Habitore)                      │
   │                                                      │
   │  Lead paragraph...                                   │
   │                                                      │
   │  ## How it's built                                   │
   │  Take the participle, drop -ë/-ur/-rë...             │
   │  <Example verbId="punoj" mood="admirative"           │
   │     tense="present" person={1} number="singular" />  │
   │  →  punuakam                                         │
   │                                                      │
   └──────────────────────────────────────────────────────┘
```

### D6. NavHeader gains an Articles link

Extending the existing nav from D1 of search-and-browse. The link appears between Random and the right edge.

## Tradeoffs

- **Folder-per-slug** is more disk overhead than flat files. Minor; acceptable.
- **JS-export frontmatter** is non-standard for MDX. Mitigated by templates.
- **Engine import in MDX** means MDX files are no longer plain content — they're TS-aware components. Acceptable: the `<Example>` use case is the whole reason articles live alongside the engine.

## Resolved Questions

- **Format of frontmatter** → JS export (D2).
- **Registry pattern** → build-time fs scan (D3).
- **MDX component scope** → globally available via `mdx-components.tsx` re-export (D4).
