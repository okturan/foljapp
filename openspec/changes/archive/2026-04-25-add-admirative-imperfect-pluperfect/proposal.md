## Why

The conjugation engine currently throws `UnsupportedCellError` for every cell of admirative imperfect and admirative pluperfect (`packages/engine/src/conjugate.ts:490–495`). The existing `conjugation-engine` spec already promises coverage of all four admirative tenses — *present, imperfect, perfect, pluperfect* — but only the first and third are implemented. This gap surfaced in external review of `/verb/flas` ("the only flaw is in the Admirative mood — Imperfect and Pluperfect render as blanks"), and it applies uniformly to all 20 corpus verbs.

The forms exist in Standard Albanian and are listed in our authoritative Kaikki source for every verb in the seed corpus. Sample (verified for `flas`):

- Imperfect: `folkësha, folkëshe, folkësh, folkëshim, folkëshit, folkëshin`
- Pluperfect: `paskësha folur, paskëshe folur, paskësh folur, paskëshim folur, paskëshit folur, paskëshin folur`

The engine architecture already supports the fix: `admirativeTrim()` provides the stem for class-driven cells, and the auxiliary table at `packages/engine/src/auxiliaries.ts` is the right place for `kam`/`jam` admirative imperfect entries. The throw at conjugate.ts:490 is a placeholder, not a linguistic decision.

## What Changes

- **Add** `admirativeImperfectActive` paradigm rule to class-1, class-2, class-3 paradigm tables (`packages/engine/src/paradigms/class-{1,2,3}.ts`). The rule reuses the existing admirative-trim policy on the participle and attaches the admirative imperfect endings `-kësha, -këshe, -kësh, -këshim, -këshit, -këshin`.
- **Add** `admirative.imperfect` to the `kam` and `jam` auxiliary tables (`packages/engine/src/auxiliaries.ts`). Values:
  - `kam`: `paskësha, paskëshe, paskësh, paskëshim, paskëshit, paskëshin`
  - `jam`: `qenkësha, qenkëshe, qenkësh, qenkëshim, qenkëshit, qenkëshin`
- **Replace** the `UnsupportedCellError` throws in `buildAdmirative` for imperfect and pluperfect cases with real builders:
  - **imperfect (active)** dispatches to the paradigm rule via `buildSimpleCell`; for kam/jam-as-lexical and other suppletives, dispatch via the auxiliary / suppletion table.
  - **imperfect (middle-passive)** prefixes the active form with the `u` particle (mirroring the existing aorist MP construction).
  - **pluperfect (active)** is `paskësha + participle` for kam-aux verbs; same shape as the already-implemented perfect (`paskam + participle`), just with the imperfect auxiliary form.
  - **pluperfect (middle-passive)** is `qenkësha + participle` for both kam-aux and jam-aux verbs.
- **Add** suppletive admirative imperfect/pluperfect entries to `packages/engine/src/suppletion.ts` for `jam`, `jap`, `shoh`, `vij`, `them` (where they diverge from rule-derived forms — verified per-verb against Kaikki).
- **Extend** `scripts/verify-engine.ts` to probe both new tenses. Add `{ mood: 'admirative', tense: 'imperfect' }` and `{ mood: 'admirative', tense: 'pluperfect' }` to the `CellSpec[]` list. The current Kaikki match-rate baseline (1406 / 1406) moves up by the new cell count; the change MUST hold a 100% match against Kaikki for the new cells before it lands.
- **Update** `packages/engine/docs/sources.md` to remove the v0.1.0 deferral note for these tenses and bump the recorded match-rate baseline.

## Capabilities

### Modified Capabilities

- `conjugation-engine`: The "Admirative mood coverage" requirement gains scenarios that exercise admirative imperfect and pluperfect across class 1, class 2 (with the externally-flagged `flas`), a suppletive (`jam`), a phonologically-mutating verb (`pjek`), the active/middle-passive split, and the kam-aux / jam-aux composition paths.

## Impact

- **Code** — `packages/engine/src/conjugate.ts` (replace throws), `packages/engine/src/auxiliaries.ts` (kam/jam admirative imperfect), `packages/engine/src/paradigms/class-{1,2,3}.ts` (new paradigm rules), `packages/engine/src/suppletion.ts` (verb-specific surface forms), `scripts/verify-engine.ts` (extended cell list), `packages/engine/docs/sources.md` (deferral removal + new baseline).
- **Tests** — vitest scenarios for engine; e2e regression that `/verb/flas` no longer renders the dash placeholder in admirative imperfect/pluperfect rows.
- **Dependencies** — None.
- **APIs** — None broken. The `/api/verbs/[lemma]` JSON response now contains real forms in the `admirative.imperfect` and `admirative.pluperfect` keys instead of cells flagged as unsupported. Additive in spirit; consumers that filtered out `unsupported: true` cells will see new content.
- **Linguistic claims** — Each surface form is grounded in Kaikki / Wiktionary; the verify-engine pass prevents regressions.
- **Audience tier** — All three. Students and researchers were the most affected by the gap; learners will see the cells fill in without changing how they navigate the table.

## Non-Goals

- No change to admirative present or admirative perfect cells (already correct).
- No 3sg `-shte` variant (e.g., `folkështe`, `paskështe folur`). Some grammars list these alongside the bare `-sh` form. We produce only the bare form, which is what Kaikki / Wiktionary record and is the modern Standard Albanian default. The variant can be added later if a separate proposal makes the case.
- No new admirative cells for the `imperative` mood. The imperative has no admirative analogue.
- No change to the conjugation table UI beyond filling in the existing dash placeholders. Layout, decomposition, and styling are unchanged.
- No change to the verify-engine script's command-line interface or output format — only its internal cell list grows.

## Sequence

```
PREREQ → add-conjugation-engine        (admirative present + perfect + framework)
PREREQ → refine-conjugation-engine     (admirativeTrim policy, paradigm scaffolding)
THIS   → add-admirative-imperfect-pluperfect
NEXT   → optional: 3sg -shte variant proposal (if linguistic case is made)
```
