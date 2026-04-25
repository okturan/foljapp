## Why

foljapp already cites sources in scattered ways: corpus entries reference Husić paradigm numbers, the API responses include a `cite` field, IGT exports embed engine + corpus versions, articles drop reference lists in prose. There's no single page where a researcher can grab the full bibliography, and no machine-readable BibTeX. This change consolidates.

## What Changes

- Add `/references` (RSC) — a page listing every authoritative source foljapp draws on, formatted as a bibliography. Each entry shows author/title/year/publisher/URL, plus an inline BibTeX code block for copy.
- Add `apps/web/lib/bibliography.ts` exporting:
  - `BIBLIOGRAPHY` — typed array of source records used by the references page
  - `bibtexForSource(source)` — emits a BibTeX entry for a source record
  - `bibtexForVerb(entry, lemmaUrl)` — emits a BibTeX `@misc` entry citing a foljapp verb page
  - `bibtexForEngine(engineVersion, corpusVersion)` — emits a BibTeX `@software` entry for foljapp itself
- Add `<CiteButton>` Client Component on verb pages: opens a small popover with three citation formats (BibTeX, APA, plain text). Reuses the same pattern as the download button.
- Add `Cite this engine` block to `/references` with foljapp's own BibTeX entry.
- Add `References` link to NavHeader (between Articles and Random).

## Capabilities

### New Capabilities
- `bibliographic-citations`: Defines the references page, the bibliography data shape, and the BibTeX-emission requirements.

### Modified Capabilities
- `reference-pages`: Adds requirement that each verb page exposes a `Cite` action producing a BibTeX entry citing that specific verb URL.

## Impact

- **Code** — `apps/web/lib/bibliography.ts`, `apps/web/app/references/page.tsx`, `apps/web/components/cite-button.tsx`, updates to `nav-header.tsx` and `verb/[lemma]/page.tsx`.
- **Dependencies** — None.
- **APIs** — None.
- **Linguistic claims** — None (just citation rendering).
- **Audience tier** — **Researchers** primarily. Students can copy citations for papers.

## Non-Goals

- No MLA / Chicago / RIS / Endnote formats (BibTeX + APA only). Other formats are mechanical to add later.
- No Zotero RDF / CSL JSON export.
- No per-cell citation (cite at verb-level, not cell-level).
- No CrossRef DOI registration.

## Sequence

```
PREREQ → all existing capabilities         (we cite everything that's been built)
THIS   → add-bibliographic-citations
NEXT   → add-pronunciation                  (Phase 5)
```
