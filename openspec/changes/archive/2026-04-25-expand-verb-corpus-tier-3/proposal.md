## Why

The corpus is at 100 verbs, covering ~80% of Albanian textual usage. The next-priority distinction is the long tail: 200 verbs covers ~92%, the threshold where a learner reading typical news / textbook prose finds nearly every verb in the corpus.

The mechanical regular-paradigm space (Class 1 -oj, Class 2 consonant-stem regulars) was largely exhausted by tier-1 and tier-2. The remaining 100 most-frequent verbs are heavily skewed toward irregulars: Class 1 -aj/-ej/-uaj with stem changes, Class 2 mutating, Class 3 vowel-stem, and a handful of suppletive-only verbs. ~40-60 of the 100 new verbs will need hand-crafted cellOverrides.

This change closes that gap.

## What Changes

- **Author** `data/sources/tier-3-manifest.json` listing 100 lemmas chosen from Kote & Biba 2019 ranks 100–200, with class/auxiliary hints and `irregular: true` flags for verbs known to need cellOverrides.
- **Sub-batch the ingestion** into 4 stages so failures in one batch don't block the others:
  - 3a: Class 1 (40 verbs — mix of -oj continuation, -aj, -ej, -uaj)
  - 3b: Class 2 (35 verbs — consonant-stem regulars + mutating)
  - 3c: Class 3 (15 verbs — vowel-stem; almost all irregular)
  - 3d: Reflexive-stem / MP-only verbs (10 verbs — explicit MP lemma like `përgjigjem`, `lutem`, `kujtohem`)
- **Extend** `scripts/ingest-kaikki-batch.ts` only if a new derivation pattern surfaces. Most extensions should already be in place from tier-2; -ej and -uaj will hand-throw and require manual curation.
- **Hand-craft** the irregular subset with cellOverrides referencing both Kaikki and Husić.
- **Update** `data/verbs/frequency.json` with tier annotations for all 100 new verbs.
- **Update** `packages/engine/docs/sources.md` baseline (target: ~16,000 verified cells across 200 verbs, 99.9%+ match-rate).
- **Add** an e2e assertion that `/browse` lists ≥ 200 verbs.
- **No engine logic changes are anticipated.** If a paradigm-pattern bug surfaces during ingestion, it becomes a separate engine change.

## Capabilities

### Modified Capabilities

- `verb-corpus`: The "Seed verb coverage" requirement bumps to ≥ 200 with an explicit list of new tier-3 lemmas grouped by sub-batch.

## Impact

- **Code** — `scripts/ingest-kaikki-batch.ts` if extension needed (anticipated minimal). No engine changes expected.
- **Data** — 100 new `data/verbs/*.json`, extended `data/verbs/frequency.json`, `data/sources/tier-3-manifest.json`, regenerated `data/verbs/index.json` and `version.json`.
- **APIs** — `/api/verbs/index` and `/api/verbs/[lemma]` gain 100 new lemmas (additive).
- **Search index** — FlexSearch regenerates; bundle size grows by ~10–15KB.
- **Build pipeline** — unchanged.
- **Linguistic claims** — every new verb cites Kaikki + Husić (where applicable).
- **Audience tier** — All three. Learners get coverage of nearly every verb they encounter; researchers get a more representative sample.

## Non-Goals

- **No expansion beyond 200.** Tier-4 (200 → 500) is a separate workstream if pursued.
- **No engine logic changes.** Existing 3 classes + 2 auxiliaries + existing phonological mutation patterns are the assumed substrate.
- **No bulk-ingest of Kaikki's full Albanian verb list.** We curate.
- **No automatic cellOverride inference.** Irregularities surface via the ingestion script's heuristic; humans curate.
- **No commitment to capture every regional / dialectal variant.** Standard Albanian only.
- **No removal or restructuring of existing v0.1 / tier-1 / tier-2 verbs.** All 100 stay.
- **No tooling for archive/rotate per-batch.** The whole tier-3 lands as one OpenSpec change; sub-batches are an internal task organization.

## Sequence

```
PREREQ → expand-verb-corpus-tier-2          (100-verb base + class-aware ingest tooling)
PREREQ → complete-husic-verification         (Husić cache available for citations)
THIS   → expand-verb-corpus-tier-3
NEXT   → could-extend-tier-4 (eventual)
```
