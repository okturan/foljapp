## Why

`add-husic-verification-source` shipped the architecture for consulting Husić as a fallback verification source — `parse-husic.ts` skeleton, `verify-engine.ts` dispatch hook with per-cell source-provenance tracking, and `packages/engine/docs/husic-format.md`. What it did NOT ship is the data: the format-specific parser is a stub, no `.cache/husic/<id>.jsonl` files exist, and `verify-engine.ts` reports "Husić cache empty — see packages/engine/docs/husic-format.md to acquire source."

The 1526 cells our engine produces that Kaikki / Wiktionary tables don't enumerate (future-perfect, future-in-past, past-anterior, future-perfect-in-past, optative perfect for some verbs, MP indicative aorist non-3rd-person, etc.) sit unverified. Husić tabulates them all. Closing the gap requires:

1. A digital copy of Husić (manual prerequisite).
2. A working `parseHusicSource` for that copy's format.
3. A pilot run on 5 verbs to validate the parser.
4. Iteration on parser bugs.
5. Full corpus pass with mismatch reconciliation.
6. Combined-baseline update.

This change is the data-work follow-up to the architecture change.

## What Changes

- **Acquire** a digital copy of Husić's *Albanian Verb Dictionary and Manual* (KU Libraries, 2002). Documented options: publisher PDF, library scan / ILL, or hand-tabulated TSV. Acquisition is task 1.1; do NOT commit copyrighted source content to the repo.
- **Implement** `parseHusicSource(sourcePath, options)` in `scripts/parse-husic.ts` for the chosen format. Replace the stub with real logic. Output JSONL records matching the Kaikki shape per `packages/engine/docs/husic-format.md`.
- **Pilot** the parser on 5 representative verbs first: `punoj` (Class 1 regular), `flas` (Class 2 with stem alternation), `pjek` (Class 2 mutating), `jam` (suppletive), `pi` (Class 3). Cross-validate against Kaikki for the cells where both have data; mismatches there indicate parser bugs.
- **Iterate** on parser bugs surfaced by the pilot until cross-validation is clean.
- **Run** the parser on the full Husić source for all 50 corpus verbs. Emit `.cache/husic/<id>.jsonl`.
- **Reconcile** any engine-vs-Husić mismatches surfaced by `verify-engine.ts`. Resolution per cell: paradigm rule fix, per-verb cellOverride, or (rarely) parser tweak when Husić's print source has genuine ambiguity.
- **Update** `packages/engine/docs/sources.md` baseline to the combined Kaikki+Husić figure (e.g., `4866 (k) + 1500 (h) ≈ 6300+ / 6300+`).
- **Surface** the "Potential override candidate" warning per `husic-format.md` when Husić has a form for a cell where the engine throws `UnsupportedCellError`.

## Capabilities

### Modified Capabilities

- `conjugation-engine`: The "verify-engine covers admirative imperfect and pluperfect" requirement (which already mentioned Husić consultation per `add-husic-verification-source`) gains scenarios that lock in the implementation: Husić cache files exist for all 50 corpus verbs; the verify-engine output annotates per-cell match source; the combined match-rate baseline is recorded.

## Impact

- **Code** — `scripts/parse-husic.ts` (replace stub with real parser).
- **Cache** — `.cache/husic/<id>.jsonl` files populated for all 50 verbs.
- **Source artifact** — the digital Husić file lives outside the repo (per copyright).
- **Engine** — possibly `packages/engine/src/paradigms/*.ts` and per-verb `data/verbs/*.json` if Husić surfaces real bugs (paradigm corrections, missing cellOverrides). Each fix is its own diff with cited source.
- **Linguistic claims** — every previously-missing cell now has a Husić citation backing it.
- **Audience tier** — researchers (verification credibility), students (correctness confidence).

## Non-Goals

- **No replacement of Kaikki.** Kaikki stays primary; Husić is fallback for cells Kaikki lacks.
- **No automatic OCR.** The digital source must already be parseable. OCR is a human prerequisite.
- **No retroactive update of historical baselines.** v0.1.x baselines stay Kaikki-only. The new combined figure is recorded separately.
- **No exposure of Husić in user-facing UI.** Per-cell sources stay internal to verify-engine output.
- **No `cellOverride` auto-generation.** Mismatches surface as warnings; humans curate the fix.
- **No expansion of cell types.** verify-engine probes the same cells as today; Husić just provides ground truth where Kaikki was silent.
- **No Gheg / dialectal forms.** parse-husic.ts filters at parse time per `husic-format.md`.

## Sequence

```
PREREQ → add-husic-verification-source   (architecture + verify-engine dispatch)
PREREQ → expand-verb-corpus-tier-1        (50-verb corpus to verify against)
THIS   → complete-husic-verification
```

The change can land in stages:

1. Source acquisition (manual; tasks 1.x).
2. Pilot parser on 5 verbs (tasks 3.x).
3. Full parser + cache emission (tasks 4.x).
4. Mismatch reconciliation (tasks 5.x).
5. Baseline update + archive (tasks 6.x–7.x).
