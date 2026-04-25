## Why

Tier-1 brought the corpus from 20 to 50 verbs by mass-ingesting regular Class 1 -oj verbs. The remaining frequency gap (60→100 most-common verbs) covers paradigm space the current ingestion script doesn't handle: Class 1 verbs ending in `-aj`, `-ej`, `-uaj`, `-yj`, plus Class 2 consonant-stem verbs and Class 3 vowel-stem verbs, plus a meaningful number of irregulars (multi-stem, suppletive aorist, etc.).

Reaching 100 verbs lifts Albanian's text-coverage from ~65% (50 verbs) to ~80%, a level where most learner texts have all their verbs covered. It also exercises engine paradigm rules that the seed corpus only thinly tested (Class 2 mutating outside `pjek/djeg`, Class 3 vowel-stem variations, more cellOverride patterns).

This change extends the ingestion tooling to handle the new patterns and ingests a curated batch of 50 new verbs.

## What Changes

- **Extend** `scripts/ingest-kaikki-batch.ts`:
  - Add `derivePrincipalParts` branches for Class 1 endings beyond `-oj`: `-aj` (drop -j → present stem; aorist stem typically `<root>+ va`; participle `<root>+ rë`), `-ej` (similar), `-uaj` (drop -j; aorist `<root>+a`; participle `<root>+ar`), `-yj`, `-yej`. Each branch documents its source verb-class.
  - Add Class 2 consonant-stem scaffolding: `present === aorist === lemma` for regular consonant-stem; participle `<lemma>ur`.
  - Add Class 3 vowel-stem scaffolding: `present === aorist === lemma`; participle varies by stem (vowel-final → `<lemma>rë`; some take `-jtur`).
  - Add a simple irregularity-detection heuristic: after scaffolding + verify, if any of the canonical 6-cell active-present cells mismatch against Kaikki, mark the verb's `notes` with a TODO and DO NOT delete the file (humans curate `cellOverrides`).
  - Surface a per-verb summary at end-of-run: scaffolded vs needs-review vs failed.
- **Manifest** `data/sources/tier-2-manifest.json` lists 50 lemmas with class/auxiliary hints. Composition by class:
  - Class 1: 25 verbs across `-oj` (10 more), `-aj` (5), `-ej` (5), `-uaj`/`-yj` (5).
  - Class 2: 15 consonant-stem verbs (regulars + a few mutating).
  - Class 3: 10 vowel-stem verbs.
- **Manual curation** of irregulars surfaced by the heuristic. Estimate: 8–12 verbs across the 50. Each gets a per-cell cellOverride; no engine-rule changes anticipated.
- **Frequency tier annotations** for all 50 new verbs in `data/verbs/frequency.json`.
- **Verify-engine** runs on the full 100-verb corpus; baseline grows accordingly.

## Capabilities

### Modified Capabilities

- `verb-corpus`: The "Seed verb coverage" requirement bumps to ≥ 100 with an explicit list of new tier-2 lemmas (organized by class).
- `verb-corpus`: The "Bulk-ingestion tooling" requirement (added by `expand-verb-corpus-tier-1`) gains scenarios covering the new derivation branches (Class 1 -aj/-ej/-uaj, Class 2, Class 3) and the irregularity-detection heuristic.

## Impact

- **Code** — `scripts/ingest-kaikki-batch.ts` (extended derivation logic + irregularity heuristic). No engine code changes.
- **Data** — 50 new `data/verbs/*.json`, extended `data/verbs/frequency.json`, `data/sources/tier-2-manifest.json` (new), regenerated `data/verbs/index.json` and `data/verbs/version.json`.
- **APIs** — `/api/verbs/index` JSON gains 50 new lemmas; `/api/verbs/[lemma]` gains 50 new endpoints. Additive, non-breaking.
- **Search index** — FlexSearch regenerates at build time; bundle size grows by ~5–8KB.
- **Build pipeline** — unchanged; existing schema validation + engine round-trip gate cover the new entries.
- **Audience tier** — All three. Learners get a meaningfully broader vocabulary; researchers get a more representative corpus.

## Non-Goals

- **No expansion beyond 100 verbs.** Tier-3 (100→200) is a separate workstream.
- **No new linguistic phenomena.** Existing 3 classes + 2 auxiliaries + existing phonological mutation patterns suffice. If a new paradigm pattern surfaces during ingestion, that's a separate engine change.
- **No engine logic changes.** The script handles new lemma endings via principal-parts derivation only; the paradigm rules already cover them.
- **No bulk-ingest of Husić data alongside.** Husić verification is a separate workstream (`complete-husic-verification`); tier-2 ingestion can land before or after Husić.
- **No coverage commitment for non-finite forms beyond what the engine already produces.** These come for free via existing engine logic.
- **No removal or restructuring of existing seed / tier-1 verbs.** All 50 stay.
- **No automatic cellOverride inference.** Irregularities surface via the heuristic; humans curate.

## Sequence

```
PREREQ → expand-verb-corpus-tier-1   (50-verb base + ingestion tooling)
THIS   → expand-verb-corpus-tier-2   (50 → 100)
NEXT   → expand-verb-corpus-tier-3   (100 → 200, eventual)
```

The change can land in stages within tier-2:

1. Tooling extension (script branches for new patterns).
2. First sub-batch: 25 Class 1 verbs.
3. Second sub-batch: 15 Class 2 verbs.
4. Third sub-batch: 10 Class 3 verbs.
5. Per-verb manual curation pass.
6. Frequency tiers + final verify.
