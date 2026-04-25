## Why

The seed corpus is 20 verbs. Kaikki has thousands. The seed was sized to exercise every paradigm class, every suppletive, every phonological mutation pattern, and a few common regulars — proof of correctness for the engine. With the engine now at 1860/1860 against Kaikki and 100% verifiable, the next-priority constraint on usefulness is breadth: a learner searching for `dal` (to leave) or `marr` (already in corpus) finds the second but not the first.

This change expands the seed corpus from 20 verbs to **50 verbs** (a +30 batch) prioritized by usage frequency per Kote & Biba (2019). The expansion ships:

1. Bulk-ingestion tooling (`scripts/ingest-kaikki-batch.ts`) that converts a list of lemmas into populated `data/verbs/*.json` files with verified principal parts, classes, and (where attested) cellOverrides.
2. The 30 new corpus entries themselves, each verified by `verify-engine.ts` against Kaikki.
3. Frequency-tier annotations for the new entries.

This tier-1 batch covers the most-frequent native verbs not already in the seed. Tier-2 (50→100) is a follow-up.

## What Changes

- **Add** `scripts/ingest-kaikki-batch.ts` — accepts a TSV/JSON list of lemmas with optional class/auxiliary hints; for each lemma, fetches Kaikki JSONL, derives `principalParts` from the headword/inflection table, infers `class` and `auxiliary`, scaffolds a `data/verbs/<id>.json` file with `sources: [{ source: "kaikki", reference: <kaikki-url> }, { source: "manual", reference: "scaffolded by ingest-kaikki-batch" }]`, and runs `verify-engine.ts --only-verb <id>` to confirm 100% match. Verbs that fail verification get a stub file with a `TODO: needs cellOverrides` comment for human follow-up.
- **Add** the 30 tier-1 verbs as `data/verbs/*.json` entries. Curated list (see design D2):
  - dal, hyj, vete, eci, ngrihem, kthej, gjej, lë, mësoj, lexoj, shkruaj, fle, prish, di, kërkoj, ndodh, mendoj, ndaj, ndal, ndez, ngreh, përfundoj, përdor, prishet, prit, qaj, them, fitoj, blej, ble (final list trimmed/refined during ingestion based on Kaikki coverage).
- **Update** `data/verbs/frequency.json` with tier annotations for the new entries (most are `common`; some `core`; rare `uncommon`).
- **Update** the `verb-corpus` spec's "Seed verb coverage" requirement to require ≥ 50 entries (the +30 batch).
- **Run** `verify-engine.ts` on the full 50-verb corpus; baseline grows from 1860/1860 to roughly 4200/4200 (50 verbs × 84 cells/verb avg).
- **Update** `packages/engine/docs/sources.md` baseline.

## Capabilities

### Modified Capabilities

- `verb-corpus`: The "Seed verb coverage" requirement bumps to ≥ 50 with an explicit list of new tier-1 lemmas.

## Impact

- **Code** — `scripts/ingest-kaikki-batch.ts` (new). No engine code changes.
- **Data** — `data/verbs/*.json` (+30 files), `data/verbs/frequency.json` (extended), `data/verbs/index.json` (regenerated).
- **Build pipeline** — `scripts/build-corpus.ts` already handles arbitrary verb counts; no changes needed.
- **Search index** — FlexSearch index regenerates at build time; no code changes.
- **APIs** — `/api/verbs/index` JSON gains 30 new lemmas. Additive.
- **Linguistic claims** — Each new verb cites Kaikki as its primary source; manual review for irregulars adds Husić citation when available.
- **Audience tier** — All three. Learners gain searchable coverage; researchers gain a more representative corpus; students gain more practice options.

## Non-Goals

- **No expansion beyond 50 verbs in this change.** Tier-2 is a follow-up.
- **No claim of perfect coverage of Albanian's most-frequent verbs.** The Kote & Biba ranking is one corpus; rankings vary across genres. We pick a reasonable batch.
- **No bulk-ingestion of Husić data.** That's `add-husic-verification-source`.
- **No automatic cellOverrides inference.** When a verb has irregularities Kaikki and the engine disagree on, the ingestion script flags the verb for human review with a `TODO` rather than guessing.
- **No new linguistic phenomena.** All 30 new verbs should fit existing paradigm rules (3 classes, 2 auxiliaries, the existing phonological mutation patterns). If a new pattern surfaces during ingestion, that's a separate engine change.
- **No coverage commitment for non-finite forms beyond what the engine already produces** (participle, infinitive, gerund, privative, temporal). These come for free via the engine.
- **No removal of any existing seed verb.** All 20 stay.

## Sequence

```
PREREQ → refine-verify-engine-tagging         (clean baseline; conditional cells matching)
PREREQ (recommended) → add-husic-verification-source  (so new verbs verify against both sources)
THIS   → expand-verb-corpus-tier-1
NEXT   → expand-verb-corpus-tier-2 (50→100)
```

`add-husic-verification-source` is a soft prereq — without it, new verbs verify against Kaikki only, with the same 740-cell missing rate per verb. Acceptable; we can ingest tier-1 first and ratchet verification later.
