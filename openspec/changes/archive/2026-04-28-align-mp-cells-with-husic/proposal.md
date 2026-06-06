## Why

Post-`fix-mp-aorist-3sg` audit (cell-by-cell Husić-direct vs engine output) surfaces a second class of MP-cell bugs that the verify-engine baseline silently bucketed as "no truth":

1. **Class 2B stem-mutation MP cells.** Verbs whose active forms with consonant-cluster suffixes use a mutated stem (`djeg→digj`, `pjek→piq`, `marr→merr`, `shoh→shih`, `jap→jep`) carry per-verb overrides for the active mutation, but their MP cells are NOT overridden. The engine therefore produces MP forms from the un-mutated `present` stem (`djegem`, `pjekem`, `marrem`, `shohem`, `japem`), where Husić-direct documents `digjem`, `piqem`, `merrem`, `shihem`, `jepem`. Same shape of bug as MP aorist 3sg: paradigm rule wrong for a cell class, masked because the only two ground-truth sources we have (Kaikki and Husić-direct) didn't surface it through `verify-engine.ts`.

2. **`dua` irregular MP.** Class 3 vowel-final stem `dua` produces nonsense `duahem`/`duahesh`/etc. when the paradigm appends `-hem`. Husić-direct shows the canonical `duhem`/`duhesh`/etc. (vowel-shortened stem `du`).

3. **Stale `-shit` optative 2pl overrides.** Five verbs (`bitis`, `djeg`, `gudulis`, `laj`, `pjek`) carry `cellOverrides['optative.present']['2pl']` ending in `-shit`. Husić-direct (for `djeg` / `pjek`) and Kaikki (for `bitis`) both show `-shi` (no t). The class-1/2 paradigm default already produces `-shi`; the overrides force a wrong form. Three of the four entries in `verify-engine`'s "Kaikki anomalies" list (`bitis`, `djeg`, `pjek` optative 2pl) are this same bug masquerading as a Kaikki problem.

The engine has had **no override path** for MP simple-tense cells (per the comment at `SIMPLE_TENSE_OVERRIDE_KEY` in `packages/engine/src/conjugate.ts:103-104`). That blocks the data-only fix for #1 and #2; addressing it requires a small engine extension first.

## What Changes

- **Engine** — extend `SIMPLE_TENSE_OVERRIDE_KEY` so the existing `buildSimpleCell` override-lookup path applies to MP simple-tense cells: map `middlePassivePresent → 'indicative.present.middle-passive'` and `middlePassiveImperfect → 'indicative.imperfect.middle-passive'`. No new code path; the existing `entry.cellOverrides?.[overrideKey]?.[cell]` lookup at line ~120-132 of `conjugate.ts` covers it. MP overrides flow through every dependent path that reuses these simple cells (subjunctive present/imperfect MP, conditional present MP).
- **Corpus** — add MP cell overrides on six verbs:
  - `djeg`, `pjek`, `marr`, `shoh` — Class 2B mutation. Add `indicative.present.middle-passive`, `indicative.imperfect.middle-passive`, `subjunctive.present.middle-passive`, `subjunctive.imperfect.middle-passive` overrides matching Husić-direct.
  - `jap` — suppletive Class 2B-style (`jap→jep`). Add `indicative.present.middle-passive` override. Other MP tenses absent from Husić-direct cache; out of scope.
  - `dua` — irregular vowel-final. Add MP overrides for `indicative.present`, `indicative.imperfect`, `subjunctive.present`, `subjunctive.imperfect` matching Husić-direct.
- **Corpus** — delete the wrong `optative.present.2pl` overrides on `bitis`, `djeg`, `gudulis`, `laj`, `pjek`. Paradigm default produces correct `-shi` form.
- **Tests** — add `packages/engine/test/mp-mutation-cells.test.ts` covering: each affected verb's MP present/imperfect cells; voice-axis override sanity (active and MP at the same `<mood>.<tense>` keys both resolve correctly); `-shit` regression for the cleaned verbs.
- **Cache regeneration** — re-run the derived-cache regeneration so any derived cache files for affected verbs reflect corrected output. (`djeg` and `pjek` are direct-cache; `marr`/`shoh`/`jap`/`dua` may or may not have direct caches; cross-resolution is mechanical.)
- **Baseline refresh** — record new `verify-engine` totals in `packages/engine/docs/sources.md`.
- **Corpus version bump** — 0.1.3 → 0.1.4 (data refresh + engine override-surface extension).

## Capabilities

Extends `conjugation-engine` with a new requirement: middle-passive simple-tense cells SHALL respect `cellOverrides` keyed at `<mood>.<tense>.middle-passive`. No other capabilities touched.

## Impact

- **Code** — `packages/engine/src/conjugate.ts` (one-line change to `SIMPLE_TENSE_OVERRIDE_KEY`).
- **Data** — six verb JSONs gain MP overrides (~120 new override entries); five lose stale `-shit` overrides.
- **Tests** — one new vitest file. Existing tests remain green.
- **Visible UX** — every MP cell on `/verb/{djeg,pjek,marr,shoh,jap,dua}` now shows the canonical mutated form. The `-shit` corrections cascade to `/verb/{bitis,djeg,gudulis,laj,pjek}` optative 2pl active+MP rows.
- **Audience tier** — researchers and learners both benefit. Standard Albanian printed grammars uniformly show the mutated forms.
- **No API or routing changes**; `cellOverrides` shape is unchanged (the new keys reuse the existing `Record<string, Partial<Record<CellLabel, string>>>` type).

## Non-Goals

- **No paradigm-level mutation generalization.** A `mutatedStem` field on `principalParts` would let the paradigm derive Class 2B MP cells without per-verb data, but the per-verb-override path is the established pattern for active mutation in this codebase and stays consistent. Defer until corpus growth makes per-verb data unwieldy.
- **No `pi` class-3 plural fix.** Engine produces `pimë`/`pinë` for `pi` present 1pl/3pl; Husić has `pijmë`/`pijnë`. Out of scope — needs separate investigation (j-glide rule for class-3 vowel-final stems).
- **No `iki` Husić-cache cleanup.** The iki cache contains jam-paradigm forms tagged as iki cells; that's a `parse-husic-pdf.py` issue, not an engine problem.
- **No new MP overrides for jap beyond present.** Husić-direct cache for jap doesn't carry MP imperfect/subjunctive/optative — without ground truth we don't add overrides.

## Sequence

```
PREREQ → fix-mp-aorist-3sg (archived 2026-04-28)
THIS   → align-mp-cells-with-husic
NEXT   → (optional) class-3 plural j-glide fix; iki cache parser fix
```
