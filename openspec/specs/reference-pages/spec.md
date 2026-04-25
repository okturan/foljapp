# reference-pages Specification

## Purpose
TBD - created by archiving change add-verb-reference-page. Update Purpose after archive.
## Requirements
### Requirement: Per-verb URL contract

The webapp SHALL expose every verb in the corpus at the URL pattern `/verb/[lemma]` where `[lemma]` is the URL-encoded `lemma` field of the corresponding `VerbEntry`. URLs SHALL be case-sensitive and SHALL NOT canonicalize diacritics — `/verb/punoj` and `/verb/Punoj` are distinct URLs and only the lowercase form matches.

#### Scenario: A seeded verb is reachable at its lemma URL

- **WHEN** the user requests `GET /verb/punoj`
- **THEN** the server SHALL respond with HTTP 200
- **AND** the response body SHALL contain the lemma `"punoj"` rendered as the page heading

#### Scenario: A diacritic-bearing lemma resolves at its UTF-8 path

- **WHEN** the user requests `GET /verb/b%C3%ABj` (URL-encoded `bëj`)
- **THEN** the server SHALL respond with HTTP 200
- **AND** the response body SHALL contain the lemma `"bëj"` as the page heading

#### Scenario: An unknown lemma 404s

- **WHEN** the user requests `GET /verb/notarealverb`
- **THEN** the server SHALL respond with HTTP 404
- **AND** the response body SHALL render a 404 page identifying the missing lemma and linking back to `/`

### Requirement: Static generation for every corpus verb

The verb route SHALL declare `generateStaticParams` enumerating every entry in `data/verbs/index.json`, so that `npm run build` produces a pre-rendered static HTML file for every verb at build time. Adding a verb to the corpus SHALL require only a corpus rebuild + Next build, with no per-verb code changes.

#### Scenario: Build emits one static HTML per corpus verb

- **WHEN** the developer runs `npm run build` against the seeded corpus (≥20 verbs)
- **THEN** the build output SHALL include a statically pre-rendered HTML file for every verb in the index
- **AND** none of these files SHALL require server-side execution to render

### Requirement: Verb header — principal parts and metadata

The page SHALL render a header block at the top displaying: the lemma (1st person singular present, prominent), the English translation, the conjugation class (`Zgjedhimi 1` / `2` / `3`), the auxiliary verb (`kam` or `jam`), and the three principal parts (present stem, aorist stem, participle) with explicit labels.

#### Scenario: Header shows principal parts for punoj

- **WHEN** the user visits `/verb/punoj`
- **THEN** the page SHALL render a header containing the text `"punoj"`, `"to work"`, `"Zgjedhimi 1"`, and `"kam"`
- **AND** the header SHALL display three labeled principal parts: `present: puno`, `aorist: punua`, `participle: punuar`

### Requirement: Full conjugation table — all moods rendered

The page SHALL render a conjugation table covering every mood the engine supports for the verb: `Indicative` (9 finite tenses), `Subjunctive` (4 tenses), `Conditional` (2 tenses), `Admirative` (4 tenses), `Optative` (2 tenses), `Imperative` (present, restricted cells), plus the non-finite forms (`Participle`, `Infinitive`, `Gerund`, `Privative`, `Temporal`). Within each mood, the table SHALL group rows by tense and columns by person/number.

#### Scenario: Indicative present table shows all six cells

- **WHEN** the user visits `/verb/punoj` and locates the Indicative > Present block
- **THEN** the rendered cells SHALL contain `punoj`, `punon`, `punon`, `punojmë`, `punoni`, `punojnë` for 1sg/2sg/3sg/1pl/2pl/3pl
- **AND** these forms SHALL be visible in the rendered HTML without requiring client-side JavaScript

#### Scenario: Admirative mood is present and labeled

- **WHEN** the user visits `/verb/punoj` and scrolls to the Admirative section
- **THEN** the section SHALL be labeled `"Admirative (Habitore)"`
- **AND** it SHALL render the present-admirative form `"punuakam"` for 1sg

#### Scenario: Imperative omits unsupported cells gracefully

- **WHEN** the user visits `/verb/punoj` and locates the Imperative block
- **THEN** the block SHALL render only the 2sg and 2pl cells (`puno`, `punoni`)
- **AND** other person/number cells SHALL be rendered as visually-muted dashes labeled `unsupported`, NOT omitted from the layout

### Requirement: Role-coded coloring via reserved Tailwind tokens

Every conjugated form rendered in the table SHALL color its segments using the five reserved Tailwind tokens from `webapp-foundation`: `morph.particle`, `morph.auxiliary`, `morph.stem`, `morph.ending`, `morph.voice`. The coloring SHALL be derived directly from the engine's `decomposition` array — the page SHALL NOT independently parse forms.

#### Scenario: Compound perfect form is colored by role

- **WHEN** the user inspects the rendered cell for Indicative > Perfect > 1sg of `punoj`
- **THEN** the visible text SHALL be `"kam punuar"`
- **AND** the substring `"kam"` SHALL be styled with the `morph.auxiliary` token
- **AND** the substring `"punu"` SHALL be styled with the `morph.stem` token
- **AND** the substring `"ar"` SHALL be styled with the `morph.ending` token

#### Scenario: Subjunctive form colors the particle

- **WHEN** the user inspects the rendered cell for Subjunctive > Present > 2sg of `punoj`
- **THEN** the visible text SHALL be `"të punosh"`
- **AND** `"të"` SHALL be styled with the `morph.particle` token

### Requirement: Citations footer

The page SHALL render a footer block listing the source(s) of the verb's paradigm. Each citation SHALL display the source name (`uniparser`, `kaikki`, `husic`, `manual`) and the reference identifier (paradigm name, URL, paradigm number). The footer SHALL also display the `engineVersion` and `corpusVersion` strings retrieved from the engine and corpus respectively.

#### Scenario: Footer displays Husić paradigm number for pjek

- **WHEN** the user visits `/verb/pjek` and scrolls to the citations footer
- **THEN** the footer SHALL include at least one citation labeled `Husić` with the paradigm number from the corpus entry
- **AND** the footer SHALL render two version strings: `engine: <version>` and `corpus: <version>`

### Requirement: 404 page for unknown lemma

A request for `/verb/<unknown>` SHALL render a typed 404 page (Next.js `not-found.tsx`) rather than the verb-page template populated with empty state. The 404 page SHALL display the unknown lemma the user requested and SHALL link to the homepage.

#### Scenario: 404 page displays the requested lemma

- **WHEN** the user requests `GET /verb/foobar`
- **THEN** the response status SHALL be 404
- **AND** the rendered HTML SHALL contain the substring `"foobar"` (the requested lemma)
- **AND** the rendered HTML SHALL contain a link with `href="/"`

### Requirement: Cross-link reservations

The verb page SHALL include placeholder slots (rendered but inert in v1) for cross-links to capabilities not yet built: a `Practice this verb` button (reserved for `add-practice-mode`), a `Try in playground` button (reserved for `add-interactive-playground`), an `Export as IGT/CoNLL-U` button (reserved for `add-igt-export`), and a `Frequency: …` badge (reserved for `add-frequency-data`). Each placeholder SHALL render with `disabled` and `title="Coming soon"` attributes so the design language is consistent from v1.

#### Scenario: Reserved buttons render but are disabled

- **WHEN** the user visits `/verb/punoj`
- **THEN** the page SHALL render four reserved-action elements with attributes `disabled` and `title="Coming soon"`
- **AND** clicking any of these elements SHALL have no effect (no navigation, no state change)

### Requirement: Server-side rendering only — no JS required for content

The verb page's conjugation table, header, and footer SHALL be statically pre-rendered by the React Server Component. A user with JavaScript disabled SHALL see all linguistic content (forms, decomposition coloring, citations) intact. Client-side JavaScript SHALL be reserved for interactive enhancements added in later capabilities.

#### Scenario: Page content is intact with JavaScript disabled

- **WHEN** an automated test fetches `/verb/punoj` over HTTP and parses the HTML response without executing any JavaScript
- **THEN** the parsed DOM SHALL contain at least 100 distinct conjugated forms across all moods
- **AND** the parsed DOM SHALL contain the citations footer with engine and corpus versions

### Requirement: Accessible markup

The conjugation table SHALL use semantic HTML: `<table>` with `<thead>`, `<tbody>`, `<th scope="col">` for person/number columns, `<th scope="row">` for tense rows, and one `<table>` per mood inside a `<section>` with an accessible heading. Color SHALL NOT be the only conveyance of role: each segment SHALL also carry an `aria-label` describing its role (e.g., `aria-label="auxiliary kam"`).

#### Scenario: A screen reader can announce a compound form's roles

- **WHEN** a screen reader reads the Indicative > Perfect > 1sg cell for `punoj`
- **THEN** the announcement SHALL include the role labels `auxiliary`, `stem`, `ending` for the corresponding segments
- **AND** the announcement SHALL be possible without sighted input

### Requirement: Page metadata for SEO and sharing

Each verb page SHALL set `<title>` to `"<lemma> — <translationEn> — foljapp"`, set the `<meta name="description">` to a short sentence including the lemma, English translation, class, and auxiliary, and set Open Graph and Twitter Card meta tags to the same content. These metadata SHALL be derived at static-generation time from the corpus entry, not at request time.

#### Scenario: Page title and description are derived from corpus

- **WHEN** the static-rendered HTML for `/verb/punoj` is inspected
- **THEN** the `<title>` SHALL equal `"punoj — to work — foljapp"`
- **AND** the `<meta name="description">` content SHALL contain `"punoj"`, `"to work"`, `"Zgjedhimi 1"`, and `"kam"`

### Requirement: Cell anchor IDs

Every conjugated form on `/verb/[lemma]` SHALL be reachable via a fragment identifier `#<mood>-<tense>-<person><number>` (e.g., `#indicative-aorist-1sg`). The id SHALL be on the cell's `<td>` element. Non-finite forms SHALL use `#non-finite-<form>` (e.g., `#non-finite-gerund`). Imperative cells SHALL use `#imperative-present-2sg` and `#imperative-present-2pl` only.

#### Scenario: Indicative aorist 1sg is deep-linkable

- **WHEN** the user requests `/verb/punoj` and inspects the rendered HTML
- **THEN** the page SHALL contain an element with `id="indicative-aorist-1sg"`
- **AND** that element SHALL contain the form `punova`

#### Scenario: Non-finite gerund is deep-linkable

- **WHEN** the user requests `/verb/punoj` and inspects the rendered HTML
- **THEN** the page SHALL contain an element with `id="non-finite-gerund"`
- **AND** that element SHALL contain the form `duke punuar`

### Requirement: Every form segment is tooltip-explorable

Every conjugated form rendered on `/verb/[lemma]` SHALL surface a learner-readable explanation per segment via the `title` attribute (no JS required) and additionally via a hover/focus tooltip when JavaScript is available.

#### Scenario: A compound perfect form is fully explored on hover

- **WHEN** the user hovers each segment of `kam punuar` on `/verb/punoj`
- **THEN** the user SHALL see explanations for `kam` (auxiliary), `punu` (verb stem), and `ar` (Class 1 participle ending)

### Requirement: Verb page exposes IGT + CoNLL-U download

The verb page SHALL replace the v0.1.x disabled "Export IGT" placeholder with a working download control offering IGT (`.txt`) and CoNLL-U (`.conllu`) outputs. The other reserved-action placeholders (Practice, Playground, Frequency) remain in their current states pending their respective capabilities.

#### Scenario: Reserved actions row renders an enabled IGT export

- **WHEN** the user visits `/verb/punoj`
- **THEN** the reserved-actions row SHALL contain a non-disabled control labeled `Download` or `IGT export`
- **AND** clicking it SHALL surface IGT and CoNLL-U format options

### Requirement: Practice link enabled in reserved-actions

The verb page's reserved-actions row SHALL replace the disabled "Practice" placeholder with an enabled anchor pointing to `/practice/quiz?focus=<lemma>`. The Frequency placeholder remains disabled pending its capability.

#### Scenario: Practice link routes to the verb-scoped quiz

- **WHEN** the user clicks the Practice button on `/verb/punoj`
- **THEN** the browser SHALL navigate to `/practice/quiz?focus=punoj`

### Requirement: Verb page exposes a Cite action

Every `/verb/[lemma]` page SHALL render a Cite control adjacent to the existing reserved-actions row (Download, Practice). Activating the control SHALL surface BibTeX, APA, and plain-text citations for the verb's foljapp URL. The action SHALL be enabled (not a placeholder).

#### Scenario: Cite control opens a citation popover

- **WHEN** the user clicks the Cite control on `/verb/punoj`
- **THEN** the page SHALL surface citation strings including the verb's lemma, translation, and the foljapp URL pattern `/verb/punoj`

### Requirement: Verb header shows lemma IPA

The `/verb/[lemma]` page header SHALL render the lemma's IPA transcription in slashes beneath the lemma title, and SHALL render IPA inline next to each principal part.

#### Scenario: pjek page shows /pjɛk/ for the lemma and /pɔc/ for the aorist stem

- **WHEN** the user visits `/verb/pjek`
- **THEN** the rendered HTML SHALL contain `/pjɛk/` (the lemma IPA)
- **AND** SHALL contain `/pɔc/` (the aorist-stem `poq` mapped to IPA — note `q` → `c`)

