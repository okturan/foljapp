## Why

`scripts/verify-engine.ts` records `missing-kaikki` for every conditional cell across the corpus. Kaikki tags conditional forms by the *verb form* used in the construction, not by the construction's name:

- `do të punoja` (conditional present, "I would work") is tagged `['conditional', 'imperfect', 'first-person', 'singular']` — `imperfect` because the verb form is the imperfect indicative.
- `do të kisha punuar` (conditional perfect, "I would have worked") is tagged `['conditional', 'past', 'perfect', ...]` — `past + perfect` because the auxiliary is `kisha` (imperfect of kam) plus participle.

Our `tagsFor` adds `present` for spec.tense='present' and `perfect` for spec.tense='perfect'. Neither matches the Kaikki tagset for conditional. Result: every conditional cell — 12 cells per verb — falls into `missing-kaikki` instead of being verified.

The pluperfect-disambiguation filter (added by `add-mp-admirative-coverage`) makes this worse: `if (spec.tense === 'perfect' && ftags.has('past')) continue` would skip Kaikki conditional perfect entries even after we map their tags correctly, because the filter is mood-blind.

This change makes the verify-engine tagging pass faithful to Kaikki's conventions for conditional, and refactors the past-disambiguation filter to be mood-agnostic and self-consistent.

Expected coverage gain: ~12 cells × ~19 verbs (excluding `duhet`) = **~228 newly-verified cells**, all 100% Kaikki-agreement (the engine output for these cells already matches Kaikki — they just weren't being compared).

## What Changes

- **Modify** `tagsFor(spec)` in `scripts/verify-engine.ts`:
  - For `(mood: 'conditional', tense: 'present')`: emit `['conditional', 'imperfect', <person>, <number>]`.
  - For `(mood: 'conditional', tense: 'perfect')`: emit `['conditional', 'past', 'perfect', <person>, <number>]`.
  - Other moods unchanged.
- **Refactor** the past-disambiguation filter in `findKaikkiForm`:
  - Replace the existing `if (spec.tense === 'perfect' && ftags.has('past')) continue;` with a mood-agnostic `if (!wanted.has('past') && ftags.has('past')) continue;`.
  - This auto-skips Kaikki forms tagged `past` whenever our search doesn't request `past`, regardless of mood. For indicative/subjunctive perfect (no past wanted), it skips pluperfect entries. For pluperfect (past wanted), it doesn't skip. For conditional perfect (now past wanted via the new tag mapping), it doesn't skip.
- **Update** `packages/engine/docs/sources.md` baseline from 1860/1860 to the new total after running verify-engine.
- **Add** scenarios verifying the new conditional cell matches under verify-engine probing.

## Capabilities

### Modified Capabilities

- `conjugation-engine`: The "verify-engine covers admirative imperfect and pluperfect" requirement (added by add-admirative-imperfect-pluperfect) gains a sister clause about conditional cell coverage and the mood-agnostic past-disambiguation filter.

## Impact

- **Code** — `scripts/verify-engine.ts` only.
- **Dependencies** — None.
- **APIs** — None.
- **Linguistic claims** — Each newly-verified cell already produces correct surface forms; this change only ensures those forms are part of the Kaikki-comparison baseline.
- **Audience tier** — Researchers (verification baseline credibility).

## Non-Goals

- No new cell types added to the cell list. Existing conditional present/perfect cells were already in the list — they just weren't matching.
- No engine logic changes. The conditional builder produces correct forms; only the verifier's filter logic changes.
- No fix for tense tags Kaikki uses that we don't yet probe (e.g., `present + future` for indicative future, `subjunctive + imperfect + past + perfect` for subjunctive pluperfect — those already work via current tagsFor + filter).
- No backfill of cells Kaikki doesn't list (future-perfect, future-in-past, etc.) — that's `add-husic-verification-source`.

## Sequence

```
PREREQ → add-admirative-imperfect-pluperfect   (introduced past-tag pluperfect mapping)
PREREQ → add-mp-admirative-coverage             (introduced past-disambiguation filter)
THIS   → refine-verify-engine-tagging
```
