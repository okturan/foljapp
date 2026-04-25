## 1. Pre-flight

- [ ] 1.1 Read proposal.md, design.md, and both spec files; confirm scope is unchanged

## 2. Bibliography data + emitters

- [ ] 2.1 Create `apps/web/lib/bibliography.ts` exporting:
  - `Source` type
  - `BIBLIOGRAPHY` — array of source records covering Husić, Kadriu, uniparser, Kaikki, UD-Albanian-TSA, UD-Albanian-STAF, Kote & Biba, Newmark/Hubbard, Wikipedia Albanian morphology
  - `bibtexForSource(s)` — emits BibTeX for a single source
  - `bibtexForVerb(entry, url)` — emits @misc BibTeX for a foljapp verb page
  - `bibtexForEngine(engineVersion, corpusVersion)` — emits @software BibTeX
- [ ] 2.2 Vitest coverage of all three emitters

## 3. /references page

- [ ] 3.1 Create `apps/web/app/references/page.tsx` (RSC) rendering the bibliography
- [ ] 3.2 Each entry: prose bibliographic line + collapsible <pre> with BibTeX
- [ ] 3.3 Bottom of page: "Cite foljapp" section with the @software BibTeX block

## 4. Cite button on verb pages

- [ ] 4.1 Create `apps/web/components/cite-button.tsx` Client Component
- [ ] 4.2 Opens a popover with three labeled blocks: BibTeX / APA / plain text
- [ ] 4.3 Mounted in reserved-actions row alongside Download + Practice
- [ ] 4.4 The popover content includes the verb's lemma, translation, and a constructed URL `/verb/<lemma>`

## 5. NavHeader

- [ ] 5.1 Add `References` link to `apps/web/components/nav-header.tsx` (after Articles)

## 6. End-to-end tests

- [ ] 6.1 Add `apps/web/e2e/references.spec.ts` covering: /references lists at least 7 sources; Husić block contains BibTeX; Cite-foljapp block contains @software with engine version
- [ ] 6.2 Verb page Cite button: clicking surfaces BibTeX @misc with the lemma

## 7. Validation and handoff

- [ ] 7.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green
- [ ] 7.2 Update specs if implementation surfaced clarifications
- [ ] 7.3 `openspec validate add-bibliographic-citations --strict` — zero errors
