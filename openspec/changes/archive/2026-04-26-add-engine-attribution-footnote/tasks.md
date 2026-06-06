## 1. Pre-flight

- [x] 1.1 Read `proposal.md`, `design.md`, `specs/reference-pages/spec.md` (delta + base).
- [x] 1.2 Confirm the current `CitationsFooter` shape in `apps/web/components/citations-footer.tsx`.

## 2. Implementation

- [x] 2.1 Import `Link` from `next/link` in `apps/web/components/citations-footer.tsx`.
- [x] 2.2 Add a `<p>` element after the Notes block (and before the version line) containing the attribution sentence per design D1: "Paradigm engine derived from uniparser-grammar-albanian, Husić (2002), Kadriu (2015), and Wikipedia. See References for full bibliography." with `References` as a `<Link href="/references">`.
- [x] 2.3 Style the paragraph with `mt-4 text-stone-500 italic`. Style the link with `underline underline-offset-2 hover:text-stone-700`.

## 3. Test coverage

- [x] 3.1 Add `apps/web/e2e/verb-page-engine-attribution.spec.ts`:
  - Visit `/verb/kooperoj` (a verb with NO per-verb Husić citation).
  - Assert the footer contains the substrings `Paradigm engine`, `uniparser-grammar-albanian`, `Husić`, `Kadriu`, `Wikipedia`.
  - Assert a link with text `References` exists with `href="/references"`.
  - Click the link and assert navigation to `/references`.
- [x] 3.2 Add a second scenario for `/verb/bashkoj` (a verb WITH per-verb Husić citation) — confirm the per-verb list still shows three entries AND the engine attribution line is also present (additive, not replacing).

## 4. Validation and archive

- [x] 4.1 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green.
- [x] 4.2 `openspec validate add-engine-attribution-footnote --strict` — zero errors.
- [x] 4.3 Manual sanity: visit `/verb/kooperoj` and `/verb/bashkoj` in dev. Confirm the engine attribution line is visible on both, between the sources list and the version line. Click `References` link and verify it navigates correctly.
- [x] 4.4 Archive.
