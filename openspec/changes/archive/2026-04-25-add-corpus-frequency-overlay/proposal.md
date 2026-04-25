## Why

The verb page's reserved-actions row has shipped a disabled `Frequency: —` placeholder since Phase 1. Researchers and learners both want to know: how common is this verb? With only 20 verbs in v0.1.x, a numeric count from UD-Albanian-TSA (922 tokens) or UD-STAF (~3k tokens) yields mostly zeros and so isn't useful on its own. A four-tier classification — `core / common / uncommon / rare` — is more honest and immediately interpretable.

This change ships a hand-curated frequency tier per verb, citing the methodology, plus UI surfacing on the verb page and `/browse`.

## What Changes

- Add `data/verbs/frequency.json` mapping `verbId → { tier, udCount?, notes? }`. The 20 seed verbs are hand-tiered against:
  - Wikipedia "Most common Albanian words" lists
  - Husić's pedagogical ordering (high-frequency verbs introduced first)
  - Researcher consensus on Indo-European-style modal/auxiliary-like verbs
  - Observed counts in UD-Albanian-TSA + UD-Albanian-STAF (when non-zero, included as `udCount`)
- Add `apps/web/lib/frequency.ts` typed loader exposing `getFrequency(verbId): FrequencyEntry | undefined` for server and client.
- Update `apps/web/components/reserved-actions.tsx` to replace the disabled `Frequency: —` button with an enabled badge showing `Frequency: <tier>`. Tooltip explains the tier.
- Update `apps/web/components/browse-table.tsx` to add a sortable `Frequency` column.
- Update `/api/verbs/[lemma]` JSON response to include `frequency` field.
- Add a "Methodology" note on the `/references` page describing how tiers are assigned.

## Capabilities

### New Capabilities
- `corpus-frequency`: Defines the frequency-tier contract — tier values, methodology, surfacing on verb pages and /browse, API exposure.

### Modified Capabilities
- `reference-pages`: Frequency placeholder is now enabled with real data.
- `verb-corpus`: corpus is augmented by `data/verbs/frequency.json` (parallel to per-verb JSONs).
- `public-api`: JSON detail response includes `frequency`.

## Impact

- **Code** — `data/verbs/frequency.json`, `apps/web/lib/frequency.ts`, updates to `reserved-actions.tsx`, `browse-table.tsx`, `app/api/verbs/[lemma]/route.ts`, `app/references/page.tsx`.
- **Dependencies** — None.
- **APIs** — JSON detail response gains `frequency`. Backwards-compatible additive.
- **Linguistic claims** — Tier assignments are hand-curated. Methodology documented; reviewers can challenge specific tiers in PR.
- **Audience tier** — All three.

## Non-Goals

- No automatic UD-treebank fetching at build time (the data is sparse for our 20-verb sample; manual review suffices).
- No frequency *band* (e.g., percentile ranks) — just the four-tier system.
- No per-cell frequency (e.g., "1sg present is most frequent for jam"). Verb-level only.
- No corpus expansion beyond 20 verbs (separate change).

## Sequence

```
PREREQ → add-igt-export                       (frequency badge sits in reserved-actions)
PREREQ → add-public-api                        (API exposes frequency)
THIS   → add-corpus-frequency-overlay
NEXT   → add-corpus-expansion                   (scale beyond 20 verbs; per-verb frequencies will derive from a larger corpus)
```
