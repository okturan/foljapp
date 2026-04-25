## Why

Two related issues live in the middle-passive admirative path:

1. **Pre-existing bug**: `buildSimpleCell` in `packages/engine/src/conjugate.ts` ignores the `voice` argument. The `admirative.present` case in `buildAdmirative` (line 477) calls `buildSimpleCell(entry, 'admirativePresentActive', ...)` regardless of voice, so MP admirative present silently returns the **active** form (e.g., `flas` MP present 3sg returns `folka` instead of `u folka`).
2. **Coverage gap**: After `add-admirative-imperfect-pluperfect` lands, MP admirative imperfect and pluperfect remain `UnsupportedCellError` throws. They're parked there pending this change.

Both are scoped to the same surface-form pattern (the `u`-particle prefix for simple tenses, the `jam`-auxiliary path for compound tenses), so this change addresses them together. The forms are well-attested in Kaikki / Wiktionary across the corpus.

## What Changes

- **Fix** `buildAdmirative` `present` case to handle voice. For MP voice, produce `u + active-form` (active form retrieved via the existing paradigm rule + `admirativeTrim()`).
- **Implement** MP admirative imperfect: same shape — `u + active-form-of-admirative-imperfect`.
- **Implement** MP admirative perfect: `qenkam + participle` (jam admirative present + participle) for all 6 cells. The `aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary` line already exists; this just removes the imperfect/pluperfect throws and lets the existing compound-builder run.
- **Implement** MP admirative pluperfect: `qenkësha + participle` (jam admirative imperfect + participle) for all 6 cells. Depends on `add-admirative-imperfect-pluperfect` having added `jam.admirative.imperfect` to the auxiliary table.
- **Decompose** MP forms with the `u` particle as a `particle` segment with `particleName: 'u'` and `voice: 'middle-passive'`, mirroring how MP aorist already does it (`packages/engine/src/conjugate.ts` aorist case).
- **Extend** `scripts/verify-engine.ts` to probe the MP voice on admirative cells. When Kaikki shows `u —` for a cell (Kaikki's notation for "this cell does not exist"), treat the cell as "no Kaikki ground truth" rather than as a mismatch — equivalent to the existing `kaikkiForm === null` branch.

## Capabilities

### Modified Capabilities

- `conjugation-engine`: The "Admirative mood coverage" requirement gains MP-voice scenarios across all four tenses. The "Active and middle-passive voice" requirement gains a scenario clarifying the `u`-particle injection for MP admirative simple tenses.

## Impact

- **Code** — `packages/engine/src/conjugate.ts` (replace `buildSimpleCell` direct call in admirative present / imperfect with voice-aware wrapper that prepends `u`-particle for MP; remove imperfect/pluperfect MP throws), `scripts/verify-engine.ts` (probe MP voice; treat `u —` as no-ground-truth).
- **Tests** — vitest scenarios for MP admirative across 4 tenses on at least 4 verbs (one per class plus a suppletive); e2e regression that `/verb/flas` MP admirative rows render correctly.
- **Dependencies** — Depends on `add-admirative-imperfect-pluperfect` having landed (jam admirative imperfect must be in the auxiliary table).
- **APIs** — None broken. `/api/verbs/[lemma]` JSON now contains MP admirative cells where they were previously throwing.
- **Linguistic claims** — Each cell's form grounded in Kaikki / Wiktionary.
- **Audience tier** — Reference-quality bar; researchers and students benefit most.

## Non-Goals

- No re-modeling of admirative semantics (the MP admirative-simple has reportative / evidential restrictions that prescriptive grammar discusses; we produce the morphological form and leave usage notes for the grammar-articles capability).
- No 3sg `-shte` / Gheg `-kej` variants (out of scope, same as the active counterpart).
- No new admirative cells in any other mood — imperative/subjunctive/conditional admirative do not exist in standard Albanian.

## Sequence

```
PREREQ → add-admirative-imperfect-pluperfect   (jam admirative imperfect aux entry)
THIS   → add-mp-admirative-coverage
```
