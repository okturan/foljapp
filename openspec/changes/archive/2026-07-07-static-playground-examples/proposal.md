## Why

The playground's Examples panel is powered by `/api/examples`, a
`runtime = 'nodejs'` route that shells out to the `sqlite3` binary against
`.cache/corpus-local-full.sqlite` (192M, not committed, not deployed). On
Cloudflare Pages neither the Node runtime, the binary, nor the database
exists, so production visitors get at most the checked-in OPUS parallel
fallback — which currently covers exactly 9 demo forms of `punoj`/`mësoj`.
The corpus lab retains 159,613 quality-filtered example occurrences across
55,271 attested targets for all 203 verbs; none of that reaches the deployed
site.

This change precomputes that evidence into small per-verb static assets and
teaches the Examples panel to fall back to them when the API is unavailable,
so the deployed playground shows real corpus attestations — the point of the
corpus-lab work — with zero servers (the user's "Tier 0 + Tier 1" decision,
2026-07-07).

## What Changes

- **New generator** — `scripts/build-static-examples.ts`
  (`npm run build:static-examples`): reads the retained-examples SQLite with
  the same public-example quality filter as `/api/examples`, keeps the top 2
  occurrences per target (score DESC, shorter sentence first — the API's
  ordering), and writes one minified JSON per verb to
  `apps/web/public/examples/<verbId>.json` plus an `index.json` manifest.
  Signatures, corpus names, domains, and match kinds are dictionary-encoded
  and rows are tuples, cutting the artifact roughly in half (~45MB naive →
  28.7MB measured across 203 files, largest verb `bej` at 253KB).
- **New client lib** — `apps/web/lib/static-examples.ts`: fetches and decodes
  a verb's asset, looks up examples by target key with signature-first,
  key-only-fallback semantics (mirroring the API), and shapes rows into the
  panel's existing `ApiExample` structure.
- **Panel fallback** — `CorpusExamples` gains a `verbId` prop (threaded from
  `PlaygroundResult`, which already has the id as `verbSlug`). When the API
  fetch fails (deployed site) or reports the local DB unavailable with no
  local rows (dev without `.cache`), the panel loads the static asset and
  appends the OPUS parallel fallback client-side, preserving the current
  local-then-translated composition and the 8-example cap.
- **Checked-in artifacts** — the 203 generated files + manifest are committed
  (they are runtime surface, like `data/opus/examples.json`), so CI and Pages
  builds stay hermetic with no `.cache` dependency.

## Capabilities

Extends `interactive-playground`: corpus examples SHALL render in production
from precomputed per-verb assets when the live examples API is unavailable.

## Impact

- **Code** — `scripts/build-static-examples.ts` (new),
  `apps/web/lib/static-examples.ts` (new + unit test),
  `apps/web/components/corpus-examples.tsx`,
  `apps/web/components/playground-result.tsx`, `package.json`.
- **Repo size** — 28.7MB of minified JSON under `apps/web/public/examples/`
  (compresses well in git packs and over the wire; every file far below the
  Pages 25MB per-file limit).
- **Behavior** — dev with the local DB: unchanged (API wins). Dev without the
  DB and production: Examples panel now shows retained corpus sentences with
  provenance links instead of "local DB not built" + empty table.
- **Engine / verb data / corpus lab** — untouched.
- **Audience tier** — learners primarily (see real usage of every form);
  students/researchers get provenance links on the deployed site.

## Non-Goals

- **No expansion of the OPUS parallel index.** `data/opus/examples.json`
  stays at its current demo scope; translated pairs at full scale would need
  the same per-verb treatment and is a separate proposal if wanted.
- **No live search or API service.** That is the deferred "Tier 2" (small
  backend serving the SQLite + Tantivy index); these assets are frozen per
  generation run.
- **No verb-page examples section.** Only the playground panel consumes the
  assets here; surfacing examples on `/verb/<lemma>` pages is its own UI
  proposal.
- **No regeneration automation.** The generator runs manually like the other
  corpus-lab exports; wiring it into corpus rebuild pipelines can come later.

## Sequence

```
PREREQ → local corpus lab artifacts (.cache/corpus-local-full.sqlite)
THIS   → static-playground-examples
NEXT   → (optional) Tier 2 examples backend; verb-page examples UI
```
