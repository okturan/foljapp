## Why

The verb-page Sources panel only shows per-verb data provenance (Kaikki + Manual + sometimes Husić). For 149 of 204 corpus verbs there's no per-verb Husić citation because Husić's manual doesn't include those lemmas — but the engine's *paradigms* (the rules that turn `kooperoj` into 80+ inflected forms) are still derived from Husić, uniparser, Kadriu, and Wikipedia. A user inspecting `/verb/kooperoj` sees only "Kaikki + Manual" and reasonably wonders why the linguistic basis seems so thin.

The engine-wide authorities are documented globally in `/references` and `packages/engine/docs/sources.md`, but never surfaced on individual verb pages. Adding a small attribution line in the citations footer closes the loop: per-verb data sources stay accurate, and engine-wide paradigm sources become discoverable from any verb page via a link to `/references`.

## What Changes

- **Add** an "engine attribution" line to `apps/web/components/citations-footer.tsx`, rendered between the per-verb sources list and the engine/corpus version line. Wording (single sentence, italic, subtle):

  > Paradigm engine derived from uniparser-grammar-albanian, Husić (2002), Kadriu (2015), and Wikipedia. See [References](/references) for full bibliography.

- **Link** the word "References" to `/references` (the existing global bibliography page).
- **No data changes**; the per-verb `sources` field is unchanged. This is a UI/copy-only change that complements per-verb provenance with engine-wide attribution.

## Capabilities

The change extends `reference-pages` with one new requirement (engine attribution visible on every verb page). No data or engine changes.

## Impact

- **Code** — `apps/web/components/citations-footer.tsx` (one new paragraph).
- **Tests** — one e2e in `apps/web/e2e/verb-page-engine-attribution.spec.ts` asserting the attribution line is visible on a verb page and the References link navigates to `/references`.
- **No engine, data, API, or routing changes.**
- **Audience tier** — Researchers and learners benefit from clearer engine-wide provenance. The /references page already exists with full bibliography; this surfaces the link from every verb page.

## Non-Goals

- **No change to the per-verb `sources` field.** Per-verb provenance accurately describes where each verb's data came from; engine-wide sources are a separate axis.
- **No restyling of the sources list** — only an addition, not a replacement.
- **No expansion of the source enum** (`'uniparser' | 'kaikki' | 'husic' | 'manual'`).
- **No mention of UD-TSA, UD-STAF, Kote/Biba** — those are verification corpora, not paradigm sources. The attribution focuses on what produces the conjugation rules.
- **No localization of the wording** — English-only per project policy.

## Sequence

```
PREREQ → improve-source-citations
THIS   → add-engine-attribution-footnote
```
