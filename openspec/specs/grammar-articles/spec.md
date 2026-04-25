# grammar-articles Specification

## Purpose
TBD - created by archiving change add-grammar-articles. Update Purpose after archive.
## Requirements
### Requirement: Articles index lists every published article

The webapp SHALL expose `/articles` as a Server Component that renders the title, summary, category, and updated-at date for every `.mdx` file under `apps/web/app/articles/<slug>/page.mdx` whose frontmatter has `published: true`. The index SHALL be sorted by `updatedAt` descending.

#### Scenario: Index renders the two starter articles

- **WHEN** the user requests `GET /articles`
- **THEN** the response SHALL be HTTP 200
- **AND** the rendered HTML SHALL contain the title `"Albanian Verb Classes"` (linked to `/articles/verb-classes`)
- **AND** the rendered HTML SHALL contain the title `"The Admirative Mood"` (linked to `/articles/admirative-mood`)

### Requirement: Individual article pages render MDX

Each `apps/web/app/articles/<slug>/page.mdx` file SHALL be served at `/articles/<slug>`, statically pre-rendered, with its frontmatter exposed via Next's `metadata` export and its body rendered through the MDX pipeline.

#### Scenario: Verb-classes article renders

- **WHEN** the user requests `GET /articles/verb-classes`
- **THEN** the response SHALL be HTTP 200
- **AND** the rendered HTML SHALL contain `<h1>` text matching `Albanian Verb Classes`

### Requirement: Inline MDX components

Articles SHALL be able to import three components from a shared module: `<Example>`, `<VerbLink>`, `<MoodBadge>`.

- `<Example verbId mood tense person number />` renders one conjugation cell using the engine, with role-coded coloring and tooltips identical to the verb page.
- `<VerbLink lemma />` renders an anchor to `/verb/<lemma>` with monospaced lemma text.
- `<MoodBadge name />` renders a styled span surfacing the English + Albanian mood names (e.g., `Admirative · Habitore`).

#### Scenario: Example component renders an engine-derived form

- **WHEN** an article renders `<Example verbId="punoj" mood="admirative" tense="present" person={1} number="singular" />`
- **THEN** the rendered HTML SHALL contain the form `punuakam`
- **AND** the segments SHALL carry the standard role-tagged decomposition

### Requirement: Frontmatter validation at build time

Each `.mdx` file SHALL declare its frontmatter via JS-export syntax (Next's recommended path), and `apps/web/lib/articles.ts` SHALL validate every article's exported `metadata` object against a Zod schema requiring `title`, `slug`, `summary`, `category`, `published`, `updatedAt`.

#### Scenario: An article missing required frontmatter fails the build

- **WHEN** an article omits `summary` from its exported metadata
- **AND** the developer runs `npm run build`
- **THEN** the build SHALL fail with an error pointing to the offending file

### Requirement: Static rendering

The articles index AND every individual article page SHALL be statically pre-rendered at build time. Article authors do not need a server runtime to read articles.

#### Scenario: Build emits one HTML for each article

- **WHEN** the developer runs `npm run build` against the seeded articles
- **THEN** the build output SHALL include one statically-pre-rendered HTML file for `/articles` AND for `/articles/verb-classes` AND for `/articles/admirative-mood`

