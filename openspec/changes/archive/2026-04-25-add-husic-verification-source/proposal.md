## Why

`scripts/verify-engine.ts` reports 740 cells per the current baseline as `missing-kaikki` — forms our engine produces (future-perfect, future-in-past, past-anterior, future-perfect-in-past, optative perfect for some verbs, MP indicative aorist non-3rd-person, etc.) that Kaikki / Wiktionary's tables don't enumerate. These cells remain best-effort against Husić's *Albanian Verb Dictionary and Manual* (KU Libraries, 2002) — listed as authority #1 in `openspec/config.yaml` — but Husić has never been ingested in a machine-readable form. The result: ~30% of our claimed engine output sits without independent verification.

This change adds Husić as a secondary verification source. With both Kaikki and Husić, every cell our engine produces should fall into one of three categories:
- Verified by Kaikki (current 1860 cells).
- Verified by Husić (the ~740 currently-missing cells, fully or partly).
- Genuinely unattested (rare cells; expected to be < 50).

The change is an architecture + tooling change, not a one-shot implementation. The Husić source is print-only as of this writing; task 1 is acquiring a digital copy. Subsequent tasks describe parsing, caching, and integration with verify-engine.

## What Changes

- **Add** `scripts/parse-husic.ts` — converts a digital copy of Husić's tables into JSONL with shape `{ form: string, tags: string[] }` per cell, parallel to Kaikki. Cache directory `.cache/husic/<id>.jsonl`.
- **Extend** `verify-engine.ts` to consult Husić when Kaikki returns `null` (missing-kaikki cells). The dispatch order is Kaikki → Husić → no-ground-truth. Cells matched by Husić count toward the match-rate baseline.
- **Document** the Husić source format expectations in `packages/engine/docs/husic-format.md` (new file): expected per-verb tag conventions, paradigm-table layout, mapping rules between Husić's notation and our tag namespace.
- **Update** `packages/engine/docs/sources.md` match-rate baseline once Husić integration completes.
- **Tag** Husić-verified cells distinctly in verify-engine output (e.g., `M (k)` for Kaikki match, `M (h)` for Husić match) so a reader can audit which source backs each cell.

## Capabilities

### Modified Capabilities

- `conjugation-engine`: The "verify-engine covers admirative imperfect and pluperfect" requirement (and its sister conditional clause from `refine-verify-engine-tagging`) gains a new clause about Husić consultation order, output annotations for source provenance, and the policy that match-rate counts Husić matches alongside Kaikki matches.

## Impact

- **Code** — `scripts/parse-husic.ts` (new), `scripts/verify-engine.ts` (Husić dispatch). No engine code changes.
- **Cache** — `.cache/husic/<id>.jsonl` per verb. Cache is git-ignored (consistent with `.cache/kaikki/`).
- **Source acquisition** — Acquiring a digital copy of Husić is a human task that gates implementation. Task 1.1 documents the options (purchase, ILL, OCR of a print copy).
- **APIs** — None.
- **Linguistic claims** — The newly-verified cells gain explicit provenance: cell X matches Husić paradigm Y. Documented per cell in source comments where useful.
- **Audience tier** — Researchers (verification credibility); students benefit indirectly from increased coverage confidence.

## Non-Goals

- No replacement of Kaikki as a source. Kaikki remains primary; Husić is fallback.
- No per-cell Husić citation in the rendered HTML. Provenance is for verification, not user-facing display.
- No expansion of the engine's cell production. Cells the engine doesn't produce won't be checked, regardless of which source has them.
- No claim of 100% Husić agreement up-front. Initial integration may surface engine-vs-Husić mismatches that require paradigm fixes or `cellOverrides` additions; those are normal verify-engine reconciliation.
- No support for Husić's paradigm-numbering scheme (1A/1B/2A/2B...) as user-visible metadata beyond what `verbEntry.sources[].reference` already records.
- No automatic ingestion from a non-digital source. PDF or structured-text input only.
- No retroactive update of historical match-rate baselines; the v0.1.0 figure stays 1860/1860 (Kaikki-only); this change introduces a separate combined-source baseline.

## Sequence

```
PREREQ → refine-verify-engine-tagging      (improved past-disambiguation; clean baseline)
THIS   → add-husic-verification-source
```

Implementation depends on having a digital copy of Husić. The change can land in stages:

1. Architecture scaffolding (parse-husic.ts skeleton, verify-engine dispatch hook).
2. First-batch verification (10 verbs through Husić to validate the integration).
3. Full corpus pass once parse-husic.ts handles the full Husić corpus.
