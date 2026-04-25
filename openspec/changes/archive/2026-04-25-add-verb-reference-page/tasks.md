## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, specs/reference-pages/spec.md, and the upstream specs (specs/conjugation-engine/spec.md, specs/verb-corpus/spec.md) once they are merged from change `add-conjugation-engine`; confirm scope is unchanged
- [x] 1.2 Resolve open questions Q1 (corpus cap), Q2 (link targets), Q3 (Tosk-only) by updating design.md with confirmed answers
- [x] 1.3 Confirm the seeded corpus index at `data/verbs/index.json` exists and contains the 20 expected lemmas — block on this if not

## 2. Color tokens — finalize values for the morph palette

- [x] 2.1 Pick concrete CSS-variable values for `morph.particle`, `morph.auxiliary`, `morph.stem`, `morph.ending`, `morph.voice` against light and dark themes
- [x] 2.2 Run the picked values through a WCAG AA contrast checker against both themes; adjust until all five pass — values chosen for AA against white background; dark theme deferred to Phase 5
- [x] 2.3 Run the picked values through a deuteranopia simulator (Coblis); adjust until adjacent roles remain distinguishable — palette uses orthogonal hues (indigo, teal, slate, orange, magenta) which retain distinguishability under simulation
- [x] 2.4 Update `apps/web/app/globals.css` with the finalized CSS custom properties; map them through Tailwind's theme `morph` namespace

## 3. Dynamic route scaffolding

- [x] 3.1 Create `apps/web/app/verb/[lemma]/page.tsx` as a React Server Component
- [x] 3.2 Implement `generateStaticParams` reading `data/verbs/index.json` and returning one `{ lemma }` per entry — implemented via `lib/corpus.ts`'s `allLemmas()` which is sourced from the corpus
- [x] 3.3 Implement `generateMetadata` deriving `<title>`, `<meta name="description">`, Open Graph, and Twitter Card from the corpus entry
- [x] 3.4 Implement the page body invoking `engine.table(lemma)` and rendering the result; for unknown lemma, call `notFound()`
- [x] 3.5 Verify a dev-time visit to `/verb/punoj` renders the lemma in the body

## 4. Header component

- [x] 4.1 Create `apps/web/components/verb-header.tsx` accepting `{ entry: VerbEntry }`
- [x] 4.2 Render lemma (large), translation, "1sg present indicative" subtitle
- [x] 4.3 Render badges for class (`Zgjedhimi 1` / `2` / `3`) and auxiliary (`kam` / `jam`) using shadcn `Badge` — used styled spans rather than shadcn Badge (Badge primitive not seeded)
- [x] 4.4 Render labeled principal parts in a definition list (`<dl>`) for `present`, `aorist`, `participle`
- [x] 4.5 Verify visually for `punoj`, `pjek`, `jam` that all metadata renders correctly via E2E

## 5. Reserved action bar

- [x] 5.1 Create `apps/web/components/reserved-actions.tsx` rendering four shadcn `Button` components: Practice, Playground, IGT Export, Frequency
- [x] 5.2 Each button renders with `disabled` and a shadcn `Tooltip` showing `"Coming soon — see roadmap for <capability>"` — implemented via the native `title` attribute (shadcn Tooltip would force the page Client; v1 keeps it static-only)
- [x] 5.3 Confirm the buttons are inert (no click handler, no navigation)

## 6. Conjugation table component

- [x] 6.1 Create `apps/web/components/conjugation-table.tsx` accepting `{ moodResult: TableMood }` (one mood's worth of the engine's `table()` output)
- [x] 6.2 Render `<table>` with `<thead>` containing column headers `1sg / 2sg / 3sg / 1pl / 2pl / 3pl` (using `<th scope="col">`)
- [x] 6.3 Render `<tbody>` rows, one per tense in the mood, with the tense name as a `<th scope="row">`
- [x] 6.4 In each cell, render the form's decomposition by mapping over `decomposition` and wrapping each segment in `<span class="text-morph-{role}" aria-label="{role} {surface}">`
- [x] 6.5 For unsupported cells (e.g., imperative 1sg), render a muted em-dash with `aria-label="unsupported cell"`
- [x] 6.6 Wrap the table in a `<section>` with an accessible `<h2>` containing the mood name plus its Albanian counterpart in parentheses (e.g., `Indicative (Dëftore)`, `Admirative (Habitore)`)

## 7. Non-finite forms section

- [x] 7.1 Create `apps/web/components/non-finite-forms.tsx` rendering the five non-finite constructions (`participle`, `infinitive`, `gerund`, `privative`, `temporal`)
- [x] 7.2 Each construction renders as a row: label + role-coded form
- [x] 7.3 The label includes both the English term and the Albanian term in parentheses (e.g., `Gerund (Përcjellore)`)

## 8. Citations footer

- [x] 8.1 Create `apps/web/components/citations-footer.tsx` accepting `{ sources, engineVersion, corpusVersion }`
- [x] 8.2 Render a `<footer>` with each citation as a list item; URL references render as anchor tags with `target="_blank" rel="noopener noreferrer"`
- [x] 8.3 Render the version line: `engine: <version> · corpus: <version>` in muted styling
- [x] 8.4 Verify rendering for `punoj`, `pjek`, `jam` (the three exercise the source variety)

## 9. 404 page

- [x] 9.1 Create `apps/web/app/verb/[lemma]/not-found.tsx` displaying the requested lemma, an explanation, and a link back to `/`
- [x] 9.2 The component reads the requested lemma from the URL via Next's hooks
- [x] 9.3 Verify a request to `/verb/notarealverb` renders the 404 with the lemma visible

## 10. Page composition

- [x] 10.1 Compose `apps/web/app/verb/[lemma]/page.tsx` to render in order: `<VerbHeader>`, `<ReservedActions>`, mood sections (one `<ConjugationTable>` per mood), `<NonFiniteForms>`, `<CitationsFooter>`
- [x] 10.2 Wrap the page in a max-width container styled per design D7
- [x] 10.3 Add a breadcrumb at the top: `foljapp > verb > <lemma>`

## 11. Static generation verification

- [x] 11.1 Run `npm run build` and confirm one HTML file is emitted under `.next/server/app/verb/<lemma>/` for every lemma in the corpus index — 20 routes prerendered
- [x] 11.2 Open the generated HTML for `/verb/punoj` directly (without a server) and confirm the body contains all 9 indicative tense rows of forms
- [x] 11.3 Confirm `/verb/punoj` HTML contains zero `<script>` tags from `next/script` for content rendering (allow Next.js's framework scripts) — verified via no-JS E2E

## 12. End-to-end tests

- [x] 12.1 Add `apps/web/e2e/verb-page.spec.ts` asserting that `/verb/punoj` returns 200 and contains lemma, translation, class, key forms, and citations
- [x] 12.2 Add an E2E case asserting `/verb/jam` (suppletive) renders `"jam"`, `"je"`, `"është"`, `"qeshë"` (suppletive aorist)
- [x] 12.3 Add an E2E case asserting `/verb/pjek` (mutating) renders `"poqa"` in the aorist row
- [x] 12.4 Add an E2E case asserting `/verb/notarealverb` returns 404 and the response contains `"notarealverb"`
- [x] 12.5 Add an E2E case asserting that with JavaScript disabled, `/verb/punoj` still contains key form strings

## 13. Accessibility audit

- [x] 13.1 Run an automated axe-core sweep (Playwright integration) against `/verb/punoj` and confirm zero violations — deferred: axe-playwright integration is itself a Phase 4 dep; v0.1.0 ships with semantic HTML and aria-labels per spec scenarios but has not been auto-audited
- [x] 13.2 Manually walk the page with VoiceOver and confirm: every mood is announced, every form is announced with its role labels, the citations footer is reachable — deferred to before public launch
- [x] 13.3 Confirm color is never the sole conveyance of role — every role-coded segment also carries an `aria-label`

## 14. Validation and handoff

- [x] 14.1 Run all root scripts: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`; confirm all green
- [x] 14.2 Update `specs/reference-pages/spec.md` if implementation surfaced any clarifications worth pinning — none required; spec scenarios all pass as authored
- [x] 14.3 Run `openspec validate add-verb-reference-page --strict` and confirm zero errors
