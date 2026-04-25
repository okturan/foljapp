## Why

`complete-husic-verification` ingested 31 of our 100 corpus verbs from Husić's paradigm-model section (PDF pages ~38–140). The remaining 69 corpus verbs are absent from the cache because Husić's "alphabetical glossary" section (pages ~141–end) lists them as lemma + class-pattern reference (e.g., "kërkoj — I-1") rather than as full paradigm tables.

To extend Husić coverage to those 69 verbs (plus any future tier-3/tier-4 additions), the parser needs to:

1. Parse the alphabetical glossary into `(lemma, class-pattern)` pairs.
2. Resolve each `class-pattern` against the paradigm-model section (e.g., "I-1" → `bëj`'s paradigm).
3. Apply the matched paradigm to the target lemma's principal-parts to derive Husić-implied forms.
4. Emit those forms as `.cache/husic/<id>.jsonl` records, marked with provenance so verify-engine knows they're indirectly derived.

This lifts Husić coverage from 31/100 toward most of the corpus and provides independent ground truth for cells Kaikki doesn't enumerate.

## What Changes

- **Extend** `scripts/parse-husic-pdf.py`:
  - Add a glossary-section parser that extracts `(lemma, class-pattern)` pairs from PDF pages identified by section heading.
  - Build an in-memory `class-pattern → paradigm-model-verb` index from the paradigm-model section already parsed.
  - For each glossary entry: look up the paradigm model, derive principal parts from the lemma's surface form (using the same morphology rules as `ingest-kaikki-batch.ts`), apply the paradigm template (i.e., concatenate target's stems with the model's endings), emit a JSONL record per cell.
  - Mark derived records with a `derived: true` field in the JSONL (separate from directly-tabulated forms) so the consumer can distinguish.
- **Extend** `scripts/verify-engine.ts`:
  - When loading Husić cache, track per-record provenance (`direct` from paradigm-model vs `derived` via glossary).
  - Output annotation: `M (h*)` for derived matches vs `M (h)` for direct matches.
  - Match-rate counts both as Husić matches but breaks them out for transparency.
- **Update** `packages/engine/docs/husic-format.md` to document the glossary-resolution layer + derived-vs-direct distinction.
- **Update** the recorded Husić baseline in `sources.md` to reflect the expanded coverage.

## Capabilities

### Modified Capabilities

- `conjugation-engine`: The "verify-engine covers admirative imperfect and pluperfect" requirement (which already covers Husić consultation) gains scenarios for glossary-derived Husić matches and the per-record provenance tracking.

## Impact

- **Code** — `scripts/parse-husic-pdf.py` (extended), `scripts/verify-engine.ts` (provenance tracking + output).
- **Cache** — `.cache/husic/<id>.jsonl` files now contain a mix of `derived: false` (paradigm-model-tabulated) and `derived: true` (glossary-cross-resolved) records.
- **Linguistic claims** — derived records' Husić "ground truth" is the model verb's paradigm applied to the target's stems. This is one degree removed from direct tabulation; the spec calls this out explicitly.
- **Baseline impact** — Husić coverage rises from 31 to potentially ~80 of 100 corpus verbs (depends on how many corpus lemmas appear in Husić's glossary).
- **Audience tier** — Researchers (verification credibility for the long tail).

## Non-Goals

- **No retroactive change to verify-engine's match-rate computation rules.** Derived matches count the same as direct matches; the distinction is informational.
- **No engine logic changes.** Husić-derived forms are checked against engine output, not used to generate engine output.
- **No automatic engine cellOverride suggestion** when Husić-derived disagrees with engine output. Such disagreements surface as warnings; humans triage.
- **No cross-resolution beyond the paradigm models in Husić's PDF.** If the glossary references a class-pattern not in the paradigm-model section, that entry is skipped with a warning.
- **No Gheg / dialectal forms.** Standard Albanian only.
- **No exposure of "derived" vs "direct" provenance in user-facing UI.** Internal to verify-engine output.

## Sequence

```
PREREQ → complete-husic-verification        (paradigm-model parsing + Husić cache infrastructure)
PREREQ (recommended) → expand-verb-corpus-tier-3   (more corpus verbs to verify against)
THIS   → add-husic-glossary-resolution
```
