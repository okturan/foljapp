## Context

The engine throws `UnsupportedCellError` for admirative imperfect and pluperfect across every verb (`packages/engine/src/conjugate.ts:490–495`). The existing `conjugation-engine` spec already promises 4-tense admirative coverage; only 2 are implemented. Surfaced by external review of `/verb/flas` ("the only flaw is in the Admirative mood — Imperfect and Pluperfect render as blanks"). This design specifies the implementation that closes the gap.

### Source survey

Four independent authorities were consulted before locking the surface forms; all agree on Standard Albanian admirative imperfect endings.

| Source                                                | Verb(s) verified                                  | 3sg form  |
|-------------------------------------------------------|---------------------------------------------------|-----------|
| Kaikki / Wiktionary JSONL (cached `.cache/kaikki/`)   | flas, punoj, pjek, djeg, jam, jap, them, vij, shoh, dua | `-kësh`   |
| Wiktionary direct (`en.wiktionary.org/wiki/flas`, `/jap`) | flas, jap                                      | `-kësh`   |
| CoolJugator (`cooljugator.com/sq/punoj`)              | punoj                                             | `-kësh`   |
| `timarkh/uniparser-grammar-albanian` `paradigms.txt`  | paradigm `ipf-adm-act` (lines 5414–5424)          | `-kësh`   |
| Wikipedia *Albanian morphology*                       | summary statement: admirative endings "regular across conjugational classes and similar to kam" | (consistent) |

Endings: `-kësha, -këshe, -kësh, -këshim, -këshit, -këshin`.

The non-standard 3sg variants `-kështe` (older / prescriptive) and `-ke / -kej / -kij` (Gheg) appear in the uniparser file under explicitly-tagged `nonst` and `Gheg` paradigms. Both fall outside our scope (Standard Albanian only).

The compound-pluperfect path (`paskësha + participle`) is also confirmed across all four sources.

## Goals / Non-Goals

**Goals:**

- Active admirative imperfect: all 6 cells, all 3 verb classes, all suppletives, all phonologically-mutating verbs.
- Active admirative pluperfect: all 6 cells, kam-aux composition path.
- Match-rate against Kaikki holds at 100% for the new cells.
- Decomposition follows the existing role taxonomy (`auxiliary`, `stem`, `ending`, `particle`).

**Non-Goals:**

- Middle-passive admirative imperfect/pluperfect coverage. Kept as `UnsupportedCellError` in v0.1.0; a separate change addresses MP admirative holistically (also covers a pre-existing bug where MP admirative present silently returns the active form).
- The 3sg `-shte` variant (e.g., `folkështe`) — Kaikki gives the bare `-sh` form, which is what we produce.
- New cells in the public API beyond what this fills in. Schema is unchanged.

## Decisions

### D1. Active admirative imperfect = trim policy + new endings

The admirative imperfect surface is built exactly like the admirative present: take the participle, run it through `admirativeTrim()` (already exists at `conjugate.ts:189`), and append the new endings. Only the suffix table changes.

```
                Present              Imperfect
1sg             -kam                 -kësha
2sg             -ke                  -këshe
3sg             -ka                  -kësh
1pl             -kemi                -këshim
2pl             -keni                -këshit
3pl             -kan                 -këshin
```

Implementation: a new paradigm tense key `admirativeImperfectActive` with `stem: 'participle'` and the imperfect endings. The same `effectiveTrim` branch at `conjugate.ts:154–157` that special-cases `admirativePresentActive` widens to accept the new key:

```ts
const effectiveTrim =
  (tenseKey === 'admirativePresentActive' || tenseKey === 'admirativeImperfectActive')
  && rule.stem === 'participle'
    ? admirativeTrim(stem)
    : rule.trim ?? 0;
```

Decomposition produces `[stem, ending]` segments, identical in shape to admirative present.

### D2. Active admirative pluperfect = kam admirative imperfect + participle

The pluperfect mirrors the existing perfect (`conjugate.ts:479–488`) — the only change is the auxiliary tense key:

```ts
case 'pluperfect': {
  const auxForm = buildAuxiliaryCell(aux, 'admirative.imperfect', person, number);
  return {
    surface: `${auxForm} ${participle}`,
    segments: [
      buildSegment({ surface: auxForm, role: 'auxiliary', person, number }),
      buildSegment({ surface: participle, role: 'stem' }),
    ],
  };
}
```

For active voice, `aux === entry.auxiliary` (which in the seed corpus is always `kam`), so `paskësha + participle` is the result. The MP voice path would set `aux = 'jam'` and produce `qenkësha + participle`, but D5 below keeps that throwing `UnsupportedCellError` until a separate change addresses MP holistically.

### D3. Auxiliary table additions

`packages/engine/src/auxiliaries.ts` gains an `admirative.imperfect` entry per auxiliary. The set is closed and small:

```ts
// kam
'admirative.imperfect': {
  '1sg': 'paskësha',
  '2sg': 'paskëshe',
  '3sg': 'paskësh',
  '1pl': 'paskëshim',
  '2pl': 'paskëshit',
  '3pl': 'paskëshin',
},
// jam
'admirative.imperfect': {
  '1sg': 'qenkësha',
  '2sg': 'qenkëshe',
  '3sg': 'qenkësh',
  '1pl': 'qenkëshim',
  '2pl': 'qenkëshit',
  '3pl': 'qenkëshin',
},
```

The `AuxiliaryTenseKey` type union (line 15–24) gains a new member `'admirative.imperfect'`.

### D4. Suppletive overrides — likely none needed

I cross-checked all five suppletives against Kaikki to see whether any produce forms that diverge from the rule (admirative-trim of participle + new endings). Result: **all five admirative-imperfect forms are rule-derivable from the existing `admirativeTrim()` policy**.

| Verb   | Participle | Trim policy match              | Predicted form          | Kaikki ground truth     | Match? |
|--------|------------|--------------------------------|-------------------------|-------------------------|--------|
| `jam`  | `qenë`     | `-ë` → trim 1 → `qen-`         | `qenkësha`              | `qenkësha`              | ✓ (auxiliary table) |
| `jap`  | `dhënë`    | `-ë` → trim 1 → `dhën-`        | `dhënkësha`             | `dhënkësha`             | ✓      |
| `shoh` | `parë`     | `-rë` → trim 2 → `pa-`         | `pakësha`               | `pakësha`               | ✓      |
| `vij`  | `ardhur`   | `-ur` → trim 2 → `ardh-`       | `ardhkësha`             | `ardhkësha`             | ✓      |
| `them` | `thënë`    | `-ë` → trim 1 → `thën-`        | `thënkësha`             | `thënkësha`             | ✓      |
| `dua`  | `dashur`   | `-ur` → trim 2 → `dash-`       | `dashkësha`             | `dashkësha`             | ✓      |

Conclusion: no per-suppletive admirative-imperfect override is needed in `packages/engine/src/suppletion.ts`. The standard paradigm rule plus existing trim policy handles all suppletives correctly. (Task 5.2 in the task list remains as a guard — the verify-engine pass will catch any mismatch the survey missed; if one surfaces, we add a cellOverride.)

The pluperfect of suppletives is `paskësha + supp.participle`, which is automatic from D2 — no per-suppletive overrides needed.

### D5. MP admirative imperfect/pluperfect explicitly out of scope

The current MP admirative present silently produces the active form (a pre-existing bug — `buildSimpleCell` at `conjugate.ts:152` ignores the voice arg, and `buildAdmirative` at `conjugate.ts:476–477` never wraps the result with the `u` particle). Fixing that requires:

1. Threading voice through `buildSimpleCell` and adding `u`-prefix logic for MP admirative present.
2. The same MP logic for MP admirative imperfect.
3. Per-cell decisions about MP admirative pluperfect (Kaikki shows `qenkësha + participle` for all 6 cells; jam-aux compound path).
4. Reconciling Kaikki's 1sg/2sg/1pl/2pl-nonexistent stance for MP imperfect (`u —` notation) with our "produce all derivable forms" engine policy.

That's a non-trivial workstream that should not be bundled. This change keeps MP admirative imperfect/pluperfect throwing `UnsupportedCellError` — explicit, easy to spot in the table (renders as a dash placeholder), and consistent with the current state where MP admirative present's behavior is also waiting on a fix.

### D6. verify-engine extension

The cell list at `scripts/verify-engine.ts:200–214` gains two entries:

```ts
{ mood: 'admirative', tense: 'imperfect' },
{ mood: 'admirative', tense: 'pluperfect' },
```

These are probed at active voice (the only voice the script tests). The match-rate baseline goes from 1406 / 1406 to a higher denominator. The change MUST hold a 100% match against Kaikki for the new cells before it lands; any mismatch surfaces a real corpus or paradigm-rule bug to fix before merge.

The `packages/engine/docs/sources.md` file is updated:

- Remove the bullet "admirative imperfect/pluperfect not implemented in v0.1.0".
- Bump the recorded baseline from 1406/1406 to the new number (e.g., 1646/1646 if 240 new cells land — exact figure determined at implementation time after running the verify pass).

### D7. Phonological mutation does NOT apply to admirative imperfect

Verbs like `pjek` (k → q) and `djeg` (g → gj) carry their mutation in the aorist stem (`poq-`, `dogj-`). The participle stem (`pjek-`, `djeg-`) is unmutated. Since admirative imperfect builds on the participle, **no palatalization applies**: Kaikki gives `pjekkësha` (double-k) and `djegkësha` (g+k cluster). This may look orthographically uncomfortable but is the standard form. The engine's existing palatalization pass (`packages/engine/src/phonology/palatalization.ts`) operates only on aorist-stem-derived cells and is not invoked here.

The corresponding test scenario in the spec verifies `pjekkësha` to lock this behavior.

### D8. Decomposition shape

Active admirative imperfect (simple tense): `[stem, ending]` — same as admirative present.

Active admirative pluperfect (compound tense): `[auxiliary, stem]` — same as admirative perfect, just with `paskësha` instead of `paskam` as the auxiliary surface.

No new role types needed.

## Tradeoffs

- **Producing `pjekkësha` with double-k.** Linguistically correct but visually clunky. We could orthographically simplify to `pjekësha` (single k) — but Kaikki and other Albanian sources spell it with two k's, and altering would diverge from canonical orthography. Kept as-is.
- **MP admirative imperfect/pluperfect throws.** Inconsistent with MP admirative present (which silently returns active form) and MP admirative perfect (which uses jam-aux composition). Acceptable: the inconsistency is bounded to the admirative MP voice and gets resolved by the follow-up MP-admirative change. The throw is preferable to silently-wrong forms.
- **No `-shte` 3sg variant.** Some prescriptive grammars list `folkështe`, `paskështe folur` as valid alternatives. Kaikki and modern Standard Albanian usage favor the bare `-sh`. We pick the bare form for now; a future variant-coverage proposal can revisit.
- **verify-engine match-rate denominator changes.** Existing reporting and CI will see a different cell count. Acceptable: the number going up is the point; we update the recorded baseline atomically.
- **Auxiliary tense key string `'admirative.imperfect'`.** Consistent with the existing dot-separated format (`'admirative.present'`, `'subjunctive.imperfect'`). No surprise.

## Resolved Questions

_None._

## Open Questions

_None at the spec stage. Implementation may surface verb-specific corpus mismatches against Kaikki that need cellOverrides — the verify-engine pass is the gate._
