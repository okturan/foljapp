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

The page SHALL render a conjugation table covering every mood the engine supports for the verb: `Indicative` (9 finite tenses), `Subjunctive` (4 tenses), `Conditional` (2 tenses), `Admirative` (4 tenses), `Optative` (2 tenses), `Imperative` (present, restricted cells), plus the non-finite forms (`Participle`, `Infinitive`, `Gerund`, `Privative`, `Temporal`). Within each mood, the table SHALL group rows by tense and columns by person/number. For each tense, the table SHALL render an active-voice row first; when at least one cell of that tense has a middle-passive form (i.e., `engine.table()` returns a value for `<cell>.middle-passive`), the table SHALL render an additional row immediately below the active row containing the middle-passive forms. Tenses without any middle-passive forms (e.g., the imperative) SHALL render only the active row. Cell anchor IDs for middle-passive cells SHALL be `<mood>-<tense>-<cell>-mp`; active anchor IDs remain `<mood>-<tense>-<cell>` so existing deep-links continue to work.

#### Scenario: Indicative present table shows all six cells

- **WHEN** the user visits `/verb/punoj` and locates the Indicative > Present block
- **THEN** the rendered cells SHALL contain `punoj`, `punon`, `punon`, `punojmë`, `punoni`, `punojnë` for 1sg/2sg/3sg/1pl/2pl/3pl
- **AND** these forms SHALL be visible in the rendered HTML without requiring client-side JavaScript

#### Scenario: Indicative imperfect renders both active and middle-passive rows

- **WHEN** the user visits `/verb/punoj` and locates the Indicative > Imperfect block
- **THEN** the active row SHALL contain `punoja, punoje, punonte, punonim, punonit, punonin`
- **AND** the middle-passive row SHALL contain `punohesha, punoheshe, punohej, punoheshim, punoheshit, punoheshin`
- **AND** the middle-passive cells SHALL have anchor IDs ending in `-mp`

#### Scenario: Admirative imperfect renders MP for flas

- **WHEN** the user visits `/verb/flas` and locates the Admirative > Imperfect block
- **THEN** the active row SHALL contain `folkësha` somewhere
- **AND** the middle-passive row SHALL contain `u folkësha` somewhere
- **AND** the middle-passive 3sg cell anchor `#admirative-imperfect-3sg-mp` SHALL contain `u folkësh`

#### Scenario: Admirative perfect renders MP with jam-aux

- **WHEN** the user visits `/verb/flas` and locates the Admirative > Perfect block
- **THEN** the middle-passive 1sg cell SHALL contain `qenkam` and `folur`

#### Scenario: Imperative renders only the active row (no MP)

- **WHEN** the user visits `/verb/punoj` and locates the Imperative block
- **THEN** there SHALL NOT be a row labeled with the `MP` voice marker for the imperative tense
- **AND** there SHALL NOT be any cell anchor of the form `imperative-present-*-mp`

#### Scenario: MP row is omitted when no MP cells exist for a tense

- **WHEN** the user visits any `/verb/[lemma]` page
- **AND** a particular tense has zero `.middle-passive` cells in the engine.table() result
- **THEN** the table SHALL NOT render an MP row for that tense (no row of dashes)

#### Scenario: MP row carries a textual voice marker

- **WHEN** the user visits `/verb/punoj` and locates an MP row for any tense
- **THEN** the row's label cell SHALL contain the marker text `MP` (case-insensitive) so screen readers and sighted users can identify the voice
- **AND** color SHALL NOT be the only conveyance of the active/MP distinction

#### Scenario: JS-disabled rendering still shows MP rows

- **WHEN** an automated test fetches `/verb/punoj` over HTTP and parses the HTML response without executing any JavaScript
- **THEN** the parsed HTML SHALL contain an element with id `indicative-imperfect-1sg-mp` (the MP cell anchor)
- **AND** the parsed HTML SHALL contain the substring `hesha` (the MP imperfect 1sg ending segment)

Note: each role-coded segment is a separate `<span>`, so substring checks across segment boundaries (e.g., literal `punohesha`) will not match the rendered HTML. Tests assert per-segment.

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

The verb page SHALL statically pre-render its shell: header (lemma,
translation, IPA, class/auxiliary badges, principal parts), page metadata,
and the citations footer. The conjugation tables and decomposition markup
are client-rendered from the bundled corpus (a deliberate artifact-size
tradeoff: prerendering all verb tables produced a 153 MB Pages artifact vs
9.8 MB without; ratified 2026-07-07). The static HTML SHALL contain a
loading placeholder where the tables mount, and client-side rendering
SHALL require no additional network fetches beyond the deployed bundle.

#### Scenario: Shell content is intact with JavaScript disabled

- **WHEN** an automated test fetches `/verb/punoj` over HTTP and parses the
  HTML response without executing any JavaScript
- **THEN** the parsed DOM SHALL contain the lemma header, principal parts,
  and the citations footer with engine and corpus versions
- **AND** the parsed DOM SHALL contain the tables' loading placeholder

#### Scenario: Tables render fully with JavaScript enabled

- **WHEN** the page is loaded in a browser with JavaScript enabled
- **THEN** the conjugation tables SHALL render with at least 100 distinct
  conjugated forms across all moods
- **AND** decomposition segments SHALL carry their title attributes (the
  keyboard-focus E2E covers this)

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

### Requirement: Frequency placeholder is enabled with tier data

The verb-page reserved-actions row SHALL replace the disabled `Frequency: —` placeholder with an enabled badge displaying `Frequency: <tier>` where tier is one of `core`, `common`, `uncommon`, `rare`. The tier value comes from `data/verbs/frequency.json`.

#### Scenario: jam is core, djeg is rare or uncommon

- **WHEN** the user visits `/verb/jam`
- **THEN** the page SHALL contain `Frequency: core`
- **WHEN** the user visits `/verb/djeg`
- **THEN** the page SHALL contain `Frequency:` followed by one of `uncommon` or `rare`

### Requirement: Imperative MP rows render where the engine produces MP imperative cells

The verb-page conjugation table SHALL render an MP row for the imperative mood when (and only when) the engine produces at least one `<cell>.middle-passive` for the imperative tense. For verbs whose corpus entry carries an `imperative.present.middle-passive` cellOverride (currently `laj`, `shoh`), the MP row SHALL render with the override forms. For all other verbs, the MP row SHALL be omitted (no row of dashes).

#### Scenario: laj renders MP imperative row

- **WHEN** the user visits `/verb/laj`
- **THEN** the imperative table SHALL contain an MP row whose 2sg cell renders `lahu` and 2pl cell renders `lahuni`
- **AND** the MP cell anchors SHALL be `imperative-present-2sg-mp` and `imperative-present-2pl-mp`

#### Scenario: shoh renders MP imperative row

- **WHEN** the user visits `/verb/shoh`
- **THEN** the imperative table SHALL contain an MP row whose 2sg cell renders `shihu` and 2pl cell renders `shihuni`

#### Scenario: punoj renders no MP imperative row (no MP override)

- **WHEN** the user visits `/verb/punoj`
- **THEN** the imperative table SHALL NOT contain any cell with anchor `imperative-present-2sg-mp` or `imperative-present-2pl-mp`

### Requirement: Conjugation tables fit fully at desktop viewports

At viewport widths ≥ 1024px (`lg`), every conjugation table on `/verb/<lemma>` SHALL render all six person/number columns plus the TENSE label column within the visible viewport — no horizontal scroll inside the table's `overflow-x-auto` scroller. The verb-page `<main>` wrapper SHALL widen at desktop breakpoints to provide adequate horizontal space:

| Viewport               | `<main>` max-width         |
|------------------------|----------------------------|
| < 1024px               | `max-w-3xl` (768px) — current narrow reading column |
| ≥ 1024px and < 1280px  | `max-w-5xl` (1024px)       |
| ≥ 1280px (`xl`)        | `max-w-6xl` (1152px)       |

Inner conjugation-table cells SHALL use compressed padding (`py-2.5 px-2`) and the table's `<table className="text-sm">` ancestor SHALL propagate font-size to inner segment markup so monospace cell text renders at 14px (not 16px).

#### Scenario: All six cells visible at xl viewport

- **GIVEN** a viewport width of 1280px
- **WHEN** the user visits `/verb/kooperoj`
- **THEN** the indicative-present row's 3pl cell (`#indicative-present-3pl`) SHALL have a `getBoundingClientRect().right` ≤ `window.innerWidth`
- **AND** the user SHALL NOT be required to scroll the inner table container to see any cell

#### Scenario: All six cells visible at lg viewport

- **GIVEN** a viewport width of 1024px
- **WHEN** the user visits `/verb/kooperoj`
- **THEN** the indicative-present row's 3pl cell SHALL have a `getBoundingClientRect().right` ≤ `window.innerWidth`

#### Scenario: Mobile viewport keeps narrow reading column and allows scroll

- **GIVEN** a viewport width of 375px
- **WHEN** the user visits `/verb/kooperoj`
- **THEN** the verb-page `<main>` SHALL render with `max-width: 768px` (`max-w-3xl`) — the narrow reading column for prose elements
- **AND** the conjugation table's inner `overflow-x-auto` scroller SHALL be active

### Requirement: TENSE column sticks on horizontal scroll

When the conjugation table's inner `overflow-x-auto` scroller is active (i.e., when the table is wider than the available container width), the TENSE label column (the leftmost `<th>` for both header and row labels) SHALL apply `position: sticky` with `left: 0` and an opaque background, so the user's row-context is preserved while horizontally scrolling.

The sticky column SHALL have a subtle right border (e.g., `border-r border-stone-100`) for visual separation from the scrolling cells, and a `z-index` sufficient to render above the scrolling cell content.

#### Scenario: TENSE column visible after horizontal scroll on mobile

- **GIVEN** a viewport width of 375px
- **WHEN** the user visits `/verb/kooperoj` and horizontally scrolls the indicative table to its right edge
- **THEN** the TENSE label cell for the present row SHALL still be visible at the left edge of the scroller
- **AND** the cell's computed `position` SHALL be `sticky`

### Requirement: Citations footer surfaces engine-wide paradigm attribution

The `CitationsFooter` rendered on every `/verb/<lemma>` page SHALL include a one-line attribution to the engine-wide paradigm authorities, distinct from the per-verb `sources` list. The line SHALL appear between the per-verb sources block (and any Notes line) and the `engine: x · corpus: y` version line.

The attribution SHALL name at least these four authorities: `uniparser-grammar-albanian`, `Husić (2002)`, `Kadriu (2015)`, and `Wikipedia`. The attribution SHALL include a navigable link to `/references` (the global bibliography page) for full citations.

The line SHALL render unconditionally — it appears on every verb page regardless of which per-verb sources are present in the entry's `sources` field.

#### Scenario: Engine attribution visible on every verb page

- **GIVEN** any corpus verb (e.g., `kooperoj`, `punoj`, `dhemb`)
- **WHEN** the user visits `/verb/<lemma>`
- **THEN** the Sources footer SHALL contain the substring `Paradigm engine`
- **AND** the footer SHALL contain the substring `uniparser-grammar-albanian`
- **AND** the footer SHALL contain the substring `Husić`
- **AND** the footer SHALL contain the substring `Kadriu`
- **AND** the footer SHALL contain the substring `Wikipedia`
- **AND** the footer SHALL contain a clickable `References` link whose `href` is `/references`

#### Scenario: References link navigates to the global bibliography

- **GIVEN** the user is on `/verb/kooperoj`
- **WHEN** the user clicks the `References` link inside the engine attribution line
- **THEN** the browser SHALL navigate to `/references`

#### Scenario: Per-verb sources are unchanged

- **GIVEN** the user visits `/verb/kooperoj` (a verb with `sources: [kaikki, manual]`)
- **WHEN** the page renders
- **THEN** the per-verb sources list SHALL still show `Kaikki — Wiktionary` and `Manual entry`
- **AND** the per-verb sources list SHALL NOT additionally show a `husic` or `uniparser` entry as a result of this change

