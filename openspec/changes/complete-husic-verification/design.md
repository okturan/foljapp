## Context

`add-husic-verification-source` archived with the architecture: parse-husic.ts skeleton with stub parser, verify-engine.ts Husić-fallback dispatch, format docs at `packages/engine/docs/husic-format.md`. Running `verify-engine.ts` today reports `Husić cache empty — see packages/engine/docs/husic-format.md to acquire source`. This change closes that gap with the data work.

The architecture is decided; the work here is execution. Three things must happen sequentially:

1. **Acquire**: a digital copy of Husić, in some parseable format.
2. **Parse**: implement `parseHusicSource` for the chosen format. Emit JSONL.
3. **Verify**: full corpus pass; reconcile mismatches.

Steps 1 and 3 are largely manual; step 2 is bounded code work whose shape depends entirely on step 1's outcome.

## Goals / Non-Goals

**Goals:**

- Every corpus verb has a populated `.cache/husic/<id>.jsonl`.
- Combined Kaikki+Husić match-rate exceeds 6000 cells, 100% match.
- Pilot validates the parser on 5 representative verbs before full corpus pass.
- Mismatch reconciliation policy is documented and applied.

**Non-Goals:**

- No new linguistic phenomena.
- No engine logic changes (only paradigm/cellOverride tweaks if Husić surfaces real bugs).
- No automatic source-format detection (the parser is bound to one format chosen at acquisition time).
- No retroactive update of historical baselines.

## Decisions

### D1. Source format selection (informs parser implementation)

The digital source format determines `parseHusicSource`'s shape. Top candidates ranked by ease:

| Format               | Pros                                       | Cons                                       |
|----------------------|--------------------------------------------|--------------------------------------------|
| **Hand-tabulated TSV** | Format-controllable; trivial to parse    | Slowest acquisition; error-prone re-typing |
| **Publisher PDF (text-extractable)** | Most direct; preserves layout    | Layout heuristics needed; OCR errors if scanned |
| **Library scan (image PDF) + OCR** | Available via ILL                  | OCR errors; manual cleanup required        |
| **Page-by-page hand-OCR**          | Per-section control                | Time-intensive                             |

Recommended ordering: TSV (if hand-tabulating fits the timeline) > publisher PDF (best long-term) > library scan with OCR > image-only.

Whichever format is picked, the parser must:
- Recognize verb-section boundaries (per-lemma blocks).
- Parse paradigm-table rows: tense label → 6 person/number cells.
- Map Albanian labels → engine tags via `mapHusicLabelToTags`.
- Filter Gheg / archaic / dialectal variants.
- Emit one `{form, tags}` record per cell to `.cache/husic/<id>.jsonl`.

### D2. Pilot before full pass

The 5 pilot verbs cover paradigm space:

| Verb  | Why                                                       |
|-------|-----------------------------------------------------------|
| punoj | Class 1 regular -j; the most-tested verb in the engine    |
| flas  | Class 2 with stem alternation (flas/flet/flis)           |
| pjek  | Class 2 with phonological mutation (k → q in aorist)     |
| jam   | Suppletive auxiliary; reuses jam table                   |
| pi    | Class 3 vowel-stem                                        |

After the pilot:
- Run `verify-engine.ts --verb=<each>` and inspect output.
- For any Kaikki-vs-Husić disagreement on shared cells, the parser is wrong (Kaikki and Husić agree on Standard Albanian). Fix parser.
- For any engine-vs-Husić disagreement, treat per the reconciliation policy (D5).

Iterate until the pilot's verify-engine output is clean.

### D3. Cache layout (already specified by the prior change)

```
.cache/
├── kaikki/
│   ├── punoj.jsonl
│   └── …
└── husic/
    ├── punoj.jsonl
    ├── flas.jsonl
    ├── pjek.jsonl
    ├── jam.jsonl
    ├── pi.jsonl
    └── … (50 total post-full-pass)
```

`.cache/` is git-ignored. The actual digital Husić source file lives outside the repo (per copyright).

### D4. Tag-vocabulary alignment

The parser must emit Kaikki-compatible tags so `findKaikkiForm` / `findHusicForm` can share filter logic:

- Pluperfect cells emit `past + perfect`, NOT `pluperfect`.
- Conditional present cells emit `imperfect + conditional`.
- Conditional perfect cells emit `past + perfect + conditional`.
- Future-perfect cells emit `future + perfect`.
- Past-anterior cells emit `past-anterior` (single tag; Kaikki has no equivalent, we own this).
- Future-perfect-in-past cells emit `future-perfect-in-past` (single tag).
- MP cells emit explicit `middle-passive`.
- Active cells omit voice tag (parallel to Kaikki).

`mapHusicLabelToTags` (already in parse-husic.ts) implements the Albanian-label → tag mapping; the format-specific parser calls it.

### D5. Mismatch reconciliation policy

When `verify-engine.ts` reports an engine-vs-Husić disagreement, the resolution path is per-cell:

```
Engine ≠ Husić disagreement
       │
       ├── Husić matches Kaikki for this cell?
       │     ├── yes → engine paradigm bug or missing cellOverride
       │     │            (commit fix, re-run; expect mismatch to clear)
       │     └── no  → Kaikki ≠ Husić — rare; usually means parse-husic bug
       │                (debug parser; commit fix; re-run)
       │
       └── Engine throws UnsupportedCellError + Husić has form?
             → "Potential override candidate" warning logged;
               human reviewer adds cellOverride if attested in
               actual usage; otherwise leave as deferred
```

Husić is authority #1 per `openspec/config.yaml`, so engine-vs-Husić disagreements are real bugs. Kaikki-vs-Husić disagreements (rare) usually surface parse-husic bugs.

### D6. Output format change

The combined-source baseline gets distinct presentation:

```
Summary:
  matches:    6312 (4866 via Kaikki + 1446 via Husić)
  mismatches: 0
  missing:    80   (no source has ground truth for that cell)
  errors:     0
```

The breakout is already implemented (`add-husic-verification-source` shipped this). When `totalMatchesH > 0`, the breakout displays.

### D7. Sources.md baseline format

```
| Match rate | 6312 / 6312 cells across 50 verbs    | 100%   |
|            | 4866 verified via Kaikki              |        |
|            | 1446 verified via Husić               |        |
| Verified   | …                                     | 50/50  |
```

### D8. Acceptable failure modes during ingestion

- **Some cells Husić tabulates that the engine doesn't produce**: out of scope. The engine's cell list is closed; we don't add cells just because Husić has them. (Exception: cells the engine threw `UnsupportedCellError` for AND that Husić tabulates — log the warning per D5; humans triage.)
- **Some Husić paradigms differ from current engine output by < 5 cells per verb**: expected. Reconcile each via paradigm fix or cellOverride.
- **One or two verbs in our 50 lacking Husić coverage**: documented in sources.md; marked as Husić-not-applicable.
- **Source format issues forcing a re-parse halfway through**: the parser is the only file-format-coupled component; re-implementing is bounded. Already accounted for in the format-agnostic boundary at JSONL.

## Tradeoffs

- **Source acquisition is the longest pole.** All other tasks are blocked until task 1.x completes. Mitigation: tasks 2.x (parser scaffolding refinement) and 3.x (test fixtures for cross-validation) can proceed in parallel based on a partial source.
- **The parser is bound to one format.** Re-acquiring in a different format means re-implementing the parser. Acceptable cost; the JSONL boundary keeps the rest stable.
- **Husić's print source has occasional dialect variants.** Filter at parse time per husic-format.md; document the filter rules in the parser.
- **Combined baseline obscures source-specific issues.** Per-source breakout in output mitigates; a verb-level "Husić-only verified cells" count is included in `--verbose` mode.

## Resolved Questions

_None._

## Open Questions

- **Q1.** What's the canonical source format? Defer until task 1.1 outcomes.
- **Q2.** Will the seed corpus's `cellOverrides` need any retroactive updates after Husić verification? Probably yes for a few verbs (irregularities Kaikki didn't surface). Treat each as a small per-verb fix.
- **Q3.** Should the warning policy for "potential override candidates" auto-fail CI if it surfaces a candidate that's clearly attested (e.g., MP imperative for laj before our explicit cellOverride landed)? Recommend: warning only, no CI fail; humans curate.
