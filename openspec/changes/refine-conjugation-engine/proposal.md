## Why

The v0.1.0 engine satisfies every spec scenario verbatim, but it ships with documented approximations that the corpus entries flag in their `notes` fields and that `packages/engine/docs/sources.md` calls out under the "linguistic-completeness disclaimer." Before the engine outputs are presented as authoritative on a public foljapp instance, those approximations must be replaced by Husić-verified forms — by an Albanian-fluent reviewer, not by inference.

This change scopes the audit. It identifies *exactly* what is approximate, why, and what spec-level changes are required to fix it. Implementation tasks land only after a fluent reviewer signs off on the proposed corrections.

## What Changes

### Class-paradigm refinements

- **Add sub-paradigm Class 1B** — vowel-stem regulars (`laj`, `bëj`) with aorist forms `lava/lave/lau/lamë/latë/lanë` rather than the stem+ending output the current Class 1 produces (`lava/lave/lai/lam/lat/lan`). The standard Class 1 paradigm is correct for Type-A consonant-stems (punoj-style); Type-B (laj-style) needs separate aorist endings: `-va/-ve/-u/-më/-të/-në`.
- **Add sub-paradigm Class 2D** — verbs whose 1sg present takes an extra `-i` (`iki`, possibly others). Currently classified as Class 2 with stem `ik`, producing `ik` for 1sg/2sg/3sg (canonical 1sg is `iki`).
- **Audit Class 2C aorist suppletion** — `marr` (aorist `mor`), `flas` (aorist `fol`), `dua` (aorist `desh`), `ha` (aorist `hëngr`), `rri` (aorist `ndenj`). Verify each cell against Husić's tables; the current paradigm just appends standard Class 2/3 endings to the stored aorist stem.

### Mood coverage gaps

- **Admirative imperfect** (e pakryer e habitores). Currently throws `UnsupportedCellError`. Husić documents forms like `punuakësha`. Engine SHOULD either:
  - Compose: admirative-stem + admirative-imperfect endings, OR
  - Compose: imperfect of admirative auxiliary `paskësha` + participle.
  Spec must declare which.
- **Admirative pluperfect** — same situation as imperfect; throws today.
- **Optative perfect** — currently composes via `paça` + participle. Verify this is correct surface output (`paça punuar`).

### Suppletive cell verification

- Audit every cell of `jam`, `jap`, `shoh`, `vij`, `them` in `packages/engine/src/suppletion.ts` against Husić. The five named-scenario cells are correct; surrounding cells were filled in best-effort.

### Phonology

- **Dropped vowel collisions** — current `resolveVowelCollision` only handles identical-vowel collapse. Husić documents asymmetric pairs (e.g., `ë + a → a`) that the engine does not yet handle. Audit which boundary patterns occur in seed-corpus output.
- **Imperative palatalization** — for `pjek`, the imperative 2sg should be `piq` (not `pjek`). Current engine produces `pjek` because the imperative uses the present stem and there is no runtime palatalization on the present stem. Add a runtime palatalization pass for imperative 2sg, OR surface a per-verb `imperativeStem` override.

### Engine API additions implied by the audit

- `engine.allCells()` SHALL include the admirative imperfect and pluperfect once they ship as supported cells.
- A new typed result flag `linguisticConfidence: 'verified' | 'approximate'` per cell, populated from per-paradigm metadata. The reference page can surface a small badge for `approximate` cells.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `conjugation-engine`: REQUIREMENTS for admirative-imperfect, admirative-pluperfect, imperative-with-mutating-stem, vowel-stem aorist sub-paradigm, asymmetric vowel collisions. Plus a new requirement on per-cell linguistic-confidence reporting.
- `verb-corpus`: a new optional `subParadigm` field on `VerbEntry` (e.g., `'1A' | '1B' | '2A' | '2B' | '2C' | '2D' | '3A'`) that the engine reads to dispatch to the right paradigm. Backwards-compatible — entries without the field default by `class`.

## Impact

- **Code** — `packages/engine/src/paradigms/class-1b.ts` (new), `class-2d.ts` (new), updates to `paradigms/index.ts` dispatcher, `auxiliaries.ts` (admirative imperfect of kam), `suppletion.ts` (audited cells), `phonology/palatalization.ts` (imperative pass), `phonology/vowel-collision.ts` (asymmetric pairs). Corpus entries updated with `subParadigm` field where applicable. Test fixtures grow significantly (one golden form per cell per audited verb).
- **Dependencies** — None.
- **APIs** — `ConjugationResult` gains `linguisticConfidence`. Backwards-compatible (additive).
- **Linguistic claims** — Every claim cited to Husić paradigm number; no fabrication. Disagreements with uniparser/Kaikki recorded in corpus `notes`.
- **Audience tier** — Primarily serves **researchers** (correctness is the entire point) and **students** (citations + confidence badges). Learners benefit indirectly.

## Non-Goals

- No corpus expansion beyond the 20 seed verbs. That is its own change (`expand-corpus`).
- No phonological IPA output. That is `add-pronunciation` (Phase 5).
- No dialectal Geg coverage. That is `add-dialect-support` (Phase 5).
- No new moods or tenses; the inventory is fixed.
- No change to the public engine API beyond the additive `linguisticConfidence` flag.

## Sequence

```
PREREQ → add-conjugation-engine                  (archived; provides current spec)
PREREQ → linguist review of v0.1.0 outputs        (manual; gating step before tasks land)
THIS   → refine-conjugation-engine                (modifies conjugation-engine + verb-corpus specs)
NEXT   → expand-corpus (future change)            (scales corpus from 20 to 100+ verbs once paradigms verified)
```

This proposal is intentionally proposal-only at this stage. Specs / design / tasks are deferred until a fluent Albanian linguist reviews the v0.1.0 outputs and the audit list above is reduced to specific, verified corrections.
