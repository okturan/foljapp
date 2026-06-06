## Why

`apps/web/lib/corpus-client.ts` statically imports only 20 verb JSONs (the original v0.1 seed). The full corpus has 204 verbs. Server-rendered surfaces (`/verb/<lemma>`, `/api/verbs/<lemma>`, `/browse`) read every file via `node:fs` so they expose the entire corpus, but the client-side playground only knows the 20 imported entries.

User-visible result: typing `dhemb` (or any of the other 184 corpus verbs) into the playground verb input fails with `Unknown verb: "dhemb". No corpus entry found.`, even though `/verb/dhemb` renders the full conjugation table for the same lemma. The mismatch is confusing and contradicts the existing spec requirement that "the page SHALL accept any verb in the foljapp corpus."

This is a regression that accumulated as the corpus grew through tier-1/2/3 expansions; the seed-era import list was never updated.

## What Changes

- **Add** an `emitClientBundle` step to `scripts/build-corpus.ts` that writes `data/verbs/_corpus.client.json` containing every validated verb entry as a JSON array. The file is regenerated alongside `index.json` and `version.json`.
- **Refactor** `apps/web/lib/corpus-client.ts` to import the single bundled file instead of 20 hand-listed per-verb JSONs. The component API (`ensureClientConfigured`, `findClientEntry`) is unchanged.
- **Update** `scripts/build-corpus.ts` to write `version: "0.1.1"` (matching the hand-bumped value in `data/verbs/version.json`), pulling it from a `CORPUS_VERSION` constant so future bumps are a one-line change.

## Capabilities

The change extends `interactive-playground` (a bug fix bringing the implementation into compliance with an existing requirement). No spec deltas to other capabilities.

## Impact

- **Code** — `scripts/build-corpus.ts` (one new emit step + version constant), `apps/web/lib/corpus-client.ts` (import simplification).
- **Data** — `data/verbs/_corpus.client.json` is a new generated file. Add to `.gitignore`? Currently `index.json` is checked in (per the existing pattern); for consistency `_corpus.client.json` is also checked in.
- **Bundle size** — the playground's First Load JS will grow by ~50–80 KB gzipped (the full corpus serialized). Currently 150 KB; new total ~200–230 KB. Acceptable for a learner-facing reference page; the page already loads the engine, IPA tables, and English-gloss machinery.
- **Performance** — single `import` instead of 20 separate import statements. Module count drops; webpack tree-shaking unaffected since all entries are needed.
- **No engine, API, or routing changes**.

## Non-Goals

- **No lazy / on-demand loading** of corpus entries. Static bundling is simpler and the size is bounded.
- **No change to the verb-picker UX or search index** (FlexSearch index already lives elsewhere).
- **No bundle-size optimization beyond switching from 20 separate JSON modules to one combined JSON module.**
- **No change to the corpus index (`index.json`) shape.**

## Sequence

```
PREREQ → add-conjugation-engine
PREREQ → improve-playground-option-grid
THIS   → fix-playground-full-corpus
NEXT   → could-add-corpus-source-citations  (separate, addresses Husić citation gap)
```
