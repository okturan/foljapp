## Context

Examples flow today:

```
playground → CorpusExamples ──fetch──► /api/examples (nodejs + sqlite3 shell-out)
                                          │ local rows from .cache/corpus-local-full.sqlite
                                          │ + OPUS parallel fallback (data/opus/examples.json, 9 forms)
                                          ▼
                              dev: works · Pages: impossible (no node runtime, no binary, no DB)
```

The retained DB holds 106,199 targets / 159,625 occurrences (already capped
~3 per target at scan time) / 120,340 sentences for 203 verbs; 159,613
occurrences pass the API's public-example quality filter, covering 55,271
targets.

## Goals / Non-Goals

Goal: real corpus examples on the deployed playground with zero runtime
infrastructure, without changing dev behavior when the local DB exists.
Non-goals: see proposal (no OPUS expansion, no backend, no verb-page UI).

## Decisions

### D1. Static per-verb assets, fetched lazily — not a bundled import

The full quality-filtered export is ~45MB naive JSON; one bundled file is
impossible (the June "Reduce Pages verb artifact size" lesson) and one file
per verb is the natural request unit: the playground shows one verb at a
time. Files live in `apps/web/public/examples/` so `next build` ships them
as immutable static assets and the dev server serves them identically.
Files are named by corpus entry id (`verbSlug === entry.id === sqlite
verb_id`, ASCII-safe).

### D2. Cap 2 examples per target, keep the API's ordering and quality filter

The panel shows one cell at a time; the DB itself retains ≤3 per target.
Top-2 by `score DESC, length(sentence) ASC, id ASC` (the API's ORDER BY)
keeps 108,645 rows covering all 55,271 attested targets — coverage is
untouched, only depth is trimmed. The quality WHERE clause is copied verbatim
from `app/api/examples/route.ts`; both sites carry a cross-reference comment
so drift is caught in review.

### D3. Dictionary + tuple encoding

Measured field weights for the capped export: sentences 13.9MB, urls 6.6MB,
signatures 6.1MB, corpus titles 4.8MB, doc titles 2.1MB, domains 1.6MB,
match kinds 1.3MB. Signatures/corpus/domains/kinds are low-cardinality per
verb → per-file dictionaries; rows become tuples (no repeated key names).
Doc titles are dropped (the panel's context column falls back to
genre/quality/"local corpus"). URLs are kept — provenance is a core product
value. Result: ~20-25MB total, ~115KB average per verb, worst verb (`bej`,
983 rows) a few hundred KB raw and far less gzipped over the wire.

```
apps/web/public/examples/<verbId>.json (minified):
{ v: 1, verbId, generatedAt,
  sigs:    [signature, ...],          ← dictionary
  corpora: [corpus title, ...],       ← dictionary
  domains: [domain, ...],             ← dictionary
  kinds:   [match kind, ...],         ← dictionary
  targets: {
    [targetKey]: [ [sigIdx, corpusIdx, domainIdx|-1, kindIdx, score, url|"", sentence], ... ]
  } }

apps/web/public/examples/index.json:
{ v: 1, generatedAt, verbs: { [verbId]: { targets, rows } } }
```

### D4. Fallback trigger: API failure, or API-without-DB and zero local rows

`CorpusExamples` keeps the API as the primary source (dev freshness). The
static path activates when (a) the fetch rejects or returns non-OK — the
deployed site, where the route 404s/500s — or (b) the API responds but
reports `local.available === false` and returned no local rows — dev without
`.cache`, where the checked-in assets are strictly better than nothing. The
static path then mirrors the API's composition: local rows first
(signature-first lookup, target-key fallback), then OPUS parallel pairs via
the same `lookupParallelExamples` lib imported client-side (20KB), capped at
the same limit of 8.

### D5. Artifacts are committed

CI (`typecheck · lint · test · build`) and Pages builds have no `.cache`;
the generator is a manual, local corpus-lab step like `build:corpus`, and
its output is runtime surface — the same policy as `data/opus/examples.json`
and `data/verbs/`. Regeneration is deterministic (stable ordering, optional
`--frozen-time`) so diffs stay reviewable.

## Tradeoffs

- **Staleness**: assets freeze at generation time; acceptable for a
  reference site, and regenerating is one command. The manifest records
  `generatedAt` and the panel labels the source as prebuilt.
- **~20-25MB in git**: buys zero-infrastructure production examples;
  minified JSON packs well. If it ever bothers, dropping URLs halves it at
  the cost of provenance links.
- **Duplicated quality SQL** between the API route and the generator:
  a shared module across `apps/web` and `scripts/` is more coupling than a
  12-line WHERE clause justifies; mitigated with cross-reference comments.
- **Tuple format is less self-describing** than objects; mitigated by a
  typed decoder in one place with a unit-tested fixture.
- **Client bundle grows ~20KB** (parallel-examples JSON import) only for
  users whose session hits the fallback path — it is code-split with the
  panel's dynamic import boundary.
