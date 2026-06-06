## Context

Per-verb provenance lives in each `data/verbs/<id>.json`'s `sources` array. The schema (`packages/data/src/schema.ts`) accepts entries of shape `{ source: 'uniparser' | 'kaikki' | 'husic' | 'manual', reference: string }`.

How citations grew historically:

| Era | Method | Sources cited |
|-----|--------|---------------|
| Seed (20 verbs) | Hand-crafted with full bibliography | kaikki + uniparser + husic (paradigm-model references like "1A") |
| Tier-1/2/3 (184 verbs) | Scaffolded by `ingest-kaikki-batch.ts` | kaikki + manual ("scaffolded by ingest-kaikki-batch") |
| Husić cache | Parsed from PDF via `parse-husic-pdf.py` into `.cache/husic/<id>.jsonl` | NOT updated in `sources` retroactively |

`scripts/verify-engine.ts` consults the Husić cache for any corpus verb where the cache file exists. So 100 corpus verbs are factually being cross-checked against Husić, but only 14 of them advertise it in their `sources`.

Audit:

```
  Has Husić cache + cites it:                    14 verbs
  Has Husić cache but does NOT cite it:          41 verbs  ← the gap
  Cites Husić without cache (manual paradigm):    6 verbs  (jam, jap, shoh, them, vij + flas)
  No cache, no cite:                            149 verbs
```

The 41-verb gap is the focus of this change. The 6 manual-paradigm-citing verbs and the 149 no-Husić-data verbs are correctly attributed today.

## Goals / Non-Goals

**Goals:**

- Every corpus verb whose engine output is verified against Husić cites Husić.
- Drift protection: future cache additions/removals can't desync from citations.
- Correctness: only add citations where Husić data actually exists for the verb.

**Non-Goals:**

- Retroactive uniparser citations (separate concern).
- Husić citations for cross-resolved verbs without a direct cache file.
- UI redesign of the Sources panel.

## Decisions

### D1. Reference text for the new citations

The 14 existing Husić-cited verbs use paradigm references (e.g., `"1A"`, `"Auxiliary 2"`, `"2C (stem alternation flas/flet/flis + suppletive aorist fol)"`). These are hand-curated, drawn from the printed Husić manual's paradigm-model section.

For the 41 cache-only verbs, we don't have hand-curated paradigm numbers; we have a parsed cache file. The new citation reference SHALL be exactly:

```
Husić 2002 — parsed cache (.cache/husic/<id>.jsonl)
```

Where `<id>` is the verb's `id` field. This pattern:
- Cites the source (Husić 2002).
- Identifies the parsing pathway.
- Points to the concrete cache file for traceability.
- Is uniform across the 41 entries — easy to detect and update programmatically if the cache pathway changes.

**Rejected alternatives:**

- *Extract the paradigm number from each cache JSONL.* Would require parsing each cache file and inferring the paradigm. The cache stores conjugation tables, not paradigm metadata. Extra complexity for marginal precision.
- *Just `"parse-husic-pdf cache"`.* Loses the year/author. Less useful as a bibliographic citation.

### D2. Append-only modification

Each affected verb gains exactly ONE new entry, appended to the END of its `sources` array. Existing entries are not touched. Diffs are minimal and reviewable.

### D3. One-time programmatic addition

A script `scripts/add-husic-citations.ts` enumerates `data/verbs/<id>.json` files, checks each for the citation gap, and writes the addition. This is the cleanest way to apply the same change to 41 files atomically. Once committed, the script is kept under `scripts/` as a maintenance utility — re-runnable if a new corpus verb gains a cache file (though the CI test from D5 makes the test fail first, signaling the need to re-run).

The script output is deterministic: same input, same output. JSON pretty-print uses 2-space indentation matching the existing style.

### D4. Schema invariant: no new source enum value, no new field

The Zod schema already accepts `source: 'husic'`. No schema change needed.

### D5. CI guard test

`apps/web/lib/corpus-husic-citations.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const VERBS_DIR = join(__dirname, '..', '..', '..', 'data', 'verbs');
const HUSIC_CACHE_DIR = join(__dirname, '..', '..', '..', '.cache', 'husic');

describe('Husić citation completeness', () => {
  it('every verb with a cache file cites husic', () => {
    const cacheIds = new Set(
      readdirSync(HUSIC_CACHE_DIR)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => f.replace(/\.jsonl$/, '')),
    );

    const missing: string[] = [];
    for (const file of readdirSync(VERBS_DIR)) {
      if (!file.endsWith('.json')) continue;
      if (['index.json', 'version.json', 'frequency.json', '_corpus.client.json'].includes(file)) continue;
      const entry = JSON.parse(readFileSync(join(VERBS_DIR, file), 'utf8')) as {
        id: string;
        sources: Array<{ source: string }>;
      };
      if (!cacheIds.has(entry.id)) continue;
      const cites = entry.sources.some((s) => s.source === 'husic');
      if (!cites) missing.push(entry.id);
    }
    expect(missing, `verbs with cache files but no husic citation: ${missing.join(', ')}`).toEqual([]);
  });
});
```

This runs on every `npm test`, catching drift in either direction.

### D6. Corpus version bump

`0.1.1 → 0.1.2`. The change is additive (existing tooling unaffected) and non-breaking (no field removed or renamed). Patch bump is appropriate per the project's loose semver. Update `scripts/build-corpus.ts:CORPUS_VERSION = '0.1.2'`. `data/verbs/version.json` regenerates on the next `build:corpus` run.

### D7. Sources doc refresh

`packages/engine/docs/sources.md` currently states "Husić cache: 99 of 204 verbs with Husić data". After this change, 55 of 204 verbs will explicitly cite Husić in their `sources` field (14 existing + 41 new). The cache-vs-citation distinction is worth keeping in the doc — readers should understand "100 cache files / 55 citing verbs / 99 with verifiable Husić data via cache or cross-resolution". A short explanatory paragraph will be added.

## Tradeoffs

- **Reference text uniformity vs. paradigm-number specificity.** Uniform "parsed cache" reference is less informative than a paradigm number per verb but is correct and maintainable. Acceptable.
- **Append at end vs. insert grouped by source.** Append-only avoids existing-entry churn. Future readers see chronological order.
- **One-time script kept under scripts/ vs. deleted.** Keeping it adds maintainability when new cache files arrive; the CI test ensures it can't be forgotten. Worth keeping.

## Resolved Questions

- **Q.** Should the script also update sources.md? A: No — sources.md is hand-curated documentation; this change updates it manually.

## Open Questions

- **Q1.** When new verbs are ingested via `ingest-kaikki-batch.ts`, should the script auto-check for husic-cache and add the citation? Yes (recommended follow-up); out of scope here.
- **Q2.** Should the 44 cross-resolved Husić verbs (no cache file) also gain citations? They CAN cite Husić via paradigm-model + glossary cross-resolution but the citation reference would need a different shape. Defer — separate change.
