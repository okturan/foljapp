## Context

Sparse data (UD-Albanian-TSA = 922 tokens, UD-STAF = ~3k tokens) doesn't yield reliable per-verb counts for our 20-verb seed. A four-tier hand-curation is honest, immediately useful, and easy to refine as the corpus grows.

## Goals / Non-Goals

**Goals:**

- Tier per verb, machine-readable.
- Surfacing on verb pages, /browse, API.
- Documented methodology so reviewers can challenge specific tiers.

**Non-Goals:**

- Automatic UD-treebank ingestion (sparse, would obscure rather than clarify).
- Numeric percentile / band ranks.
- Per-cell frequency.
- Frequency over time / register-conditioned (e.g., literary vs colloquial).

## Decisions

### D1. Four-tier system

`core` (top ~50 most common verbs) / `common` (next ~500) / `uncommon` (next ~1500) / `rare`. The tiers are conceptually rooted in the Zipfian distribution of language; the sizes are approximate.

### D2. Hand-curated per-verb tier

Each of the 20 seed verbs is assigned a tier based on:
- Wikipedia frequency lists for Albanian
- Pedagogical ordering in major textbooks (Newmark/Hubbard, Husić's ordering)
- The researcher author's domain intuition

Rationale recorded in each entry's `notes` field. Future PRs can challenge a specific assignment with evidence.

### D3. UD count optional

When a verb's lemma occurs in UD-Albanian-TSA or UD-STAF, the count is recorded in `udCount`. When zero, the field is omitted. This lets researchers cite specific occurrences if available.

### D4. Storage parallel to per-verb JSONs

`data/verbs/frequency.json` is a single file, not embedded in each verb's JSON. Reasoning: it's a different ontology (frequency is a property of the language, not the verb's morphology); reviewers may want to challenge frequency tiers independently of paradigm data.

## Tradeoffs

- **Hand-curation drifts** — language usage shifts over time. Mitigated: tiers are coarse; small drift doesn't change the tier.
- **Subjective** — a researcher might disagree with `iki` being `common` vs `uncommon`. Mitigated: rationale documented; each PR can challenge one tier with one line.
- **No numeric counts shown** — by design, since the data is sparse. Once the corpus grows, we can show counts and even percentiles.

## Resolved Questions

_None._
