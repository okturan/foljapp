## Context

Two findings from the post-`fix-mp-aorist-3sg` audit drive this change. Both have the same shape as the aorist 3sg bug: the engine's paradigm produces a wrong form, the only ground-truth source that captures it is Husić-direct, and `verify-engine.ts` had been silently bucketing the cells as "no truth" rather than "mismatch."

### F1. Class 2B stem-mutation MP cells

Verbs whose stem mutates before consonant-cluster suffixes already carry per-verb `cellOverrides` for their ACTIVE mutated forms — e.g., `djeg.json` overrides `indicative.imperfect` to `digjja/digjje/digjte/...`. But the same verbs have NO MP overrides, so MP cells fall through to the paradigm default which uses the un-mutated `present` stem. The engine emits `djegem`/`pjekem`/`marrem`/`shohem`/`japem`; Husić-direct documents `digjem`/`piqem`/`merrem`/`shihem`/`jepem`.

The engine cannot accept MP cell overrides today: `SIMPLE_TENSE_OVERRIDE_KEY[middlePassivePresent]` and `[middlePassiveImperfect]` are explicitly set to `null` (see `packages/engine/src/conjugate.ts:92-105`), with a comment "users who need MP overrides can add a voice-axis later."

### F2. Stale `-shit` optative 2pl overrides

Five verbs (`bitis`, `djeg`, `gudulis`, `laj`, `pjek`) carry `cellOverrides['optative.present']['2pl']` ending in `-shit`. The class-1 / class-2 paradigm default already produces the correct `-shi` (no t) — verified against Husić-direct (for `djeg` / `pjek`) and Kaikki (for `bitis`). The overrides are mistakes that should be deleted. Three of these (`bitis`, `djeg`, `pjek`) account for three of the four "Kaikki anomalies" in `verify-engine`'s mismatch list.

### F3. `dua` irregular MP

The class-3 paradigm appends `-hem` to the present stem for MP present. For `dua` (stem `dua`), this produces `duahem` — clearly wrong (Husić: `duhem`). This isn't a Class 2B mutation; it's a verb-specific irregular where the MP stem shortens `dua → du`. Per-verb overrides handle it cleanly.

## Goals / Non-Goals

**Goals:**

- Engine: add a voice-aware override path for MP simple-tense cells without introducing new dispatch logic.
- Corpus: align MP cells of six verbs (djeg, pjek, marr, shoh, jap, dua) with Husić-direct ground truth.
- Corpus: delete the five stale `-shit` overrides.
- Verify: `scripts/verify-engine.ts` baseline rises; the four "Kaikki anomaly" mismatches resolve to one (only `hekuros`).

**Non-Goals:**

- Generalize Class 2B mutation as a paradigm-level rule. The per-verb override path already handles active mutation across the codebase; this change extends that pattern to MP, not invents a new one.
- Fix `pi` class-3 plural endings (`pijmë` vs `pimë`). Out of scope; needs separate investigation of class-3 vowel-final + plural-ending interaction.
- Fix `iki` Husić-cache contamination. The cache has jam-paradigm forms tagged as iki cells — that's a `parse-husic-pdf.py` issue.
- Add MP overrides for tenses not covered by Husić-direct ground truth. We add only what's confirmable.

## Decisions

### D1. Engine: extend SIMPLE_TENSE_OVERRIDE_KEY

Single change in `packages/engine/src/conjugate.ts`:

```ts
const SIMPLE_TENSE_OVERRIDE_KEY: Record<SimpleTenseKey, string | null> = {
  presentActive: 'indicative.present',
  imperfectActive: 'indicative.imperfect',
  aoristActive: 'indicative.aorist',
  subjunctivePresentActive: 'subjunctive.present',
  admirativePresentActive: 'admirative.present',
  admirativeImperfectActive: 'admirative.imperfect',
  optativePresentActive: 'optative.present',
  middlePassivePresent: 'indicative.present.middle-passive',     // was null
  middlePassiveImperfect: 'indicative.imperfect.middle-passive', // was null
};
```

Existing `buildSimpleCell` (line ~120-132) already does the override-key lookup; setting these strings makes MP overrides flow through.

**Cascade behavior** (intentional): a verb with `cellOverrides['indicative.imperfect.middle-passive']` automatically affects subjunctive-imperfect MP and conditional-present MP (both built from `middlePassiveImperfect`). This matches the linguistic reality that the inner stem in those compounds is the same MP imperfect form.

### D2. Override convention: full surface form, single `stem` segment

Existing override paths (`buildSimpleCell` line 127-130; imperative MP line 583-586; orchestrator line 805-815; the new MP aorist 3sg path from the prior change) all treat the override value as the full surface form and decompose to a single `stem` segment. MP cell overrides follow the same convention.

### D3. Corpus override scope per verb

Inferred from Husić-direct cache cells (only what we can verify):

| Verb | indicative.present | indicative.imperfect | subjunctive.present | subjunctive.imperfect |
|------|--------------------|----------------------|---------------------|-----------------------|
| djeg | digjem family     | digjesha family      | të digjem family    | të digjesha family    |
| pjek | piqem family      | piqesha family       | të piqem family     | të piqesha family     |
| marr | merrem family     | merresha family      | të merrem family    | të merresha family    |
| shoh | shihem family     | shihesha family      | të shihem family    | të shihesha family    |
| jap  | jepem family      | (absent)             | (absent)            | (absent)              |
| dua  | duhem family      | duhesha family       | të duhem family     | të duhesha family     |

For tenses absent from Husić-direct (jap MP imperfect/subjunctive), we add no override. Engine output for those cells will continue to be wrong, but we don't ship overrides without ground truth.

The `subjunctive.*` overrides in the table are NOT entered as `subjunctive.present.middle-passive` — they cascade automatically because subjunctive MP reuses `middlePassivePresent` (and same for imperfect). One override entry, multiple downstream cells corrected.

### D4. Optative MP and admirative MP: untouched by this change

`buildOptative` MP-present builds `u + active optative`. The active optative is correct after the `-shit` deletions; MP follows by composition. So we don't need MP overrides for optative.

`buildAdmirative` MP builds `u + active admirative` for present/imperfect, and `qenkam/qenkësha + participle` for perfect/pluperfect. These appear correct in spot-checks and remain out of scope.

### D5. `-shit` deletion scope

Five verbs have `optative.present.2pl` overrides ending in `-shit`. Husić-direct (djeg/pjek) and Kaikki (bitis) confirm the standard form is `-shi`. Deletion is safe: the paradigm default for class-1 (`'fshi'`, line 79 of class-1.ts) and class-2 (`'shi'`, line 81 of class-2.ts) emits the correct form.

### D6. Test coverage

New file `packages/engine/test/mp-mutation-cells.test.ts`:

- For each affected verb: assert MP indicative present 1sg/3pl, MP indicative imperfect 1sg/3pl, MP subjunctive present 1sg/3sg, MP subjunctive imperfect 1sg/3sg match Husić-direct.
- Synthetic verb test: cellOverride at `indicative.present.middle-passive` resolves to that override; same `<mood>.<tense>` key for active doesn't apply to MP.
- Regression: `djeg` / `pjek` / `bitis` / `laj` / `gudulis` optative 2pl active and MP both produce `-shi` (no t).

### D7. Cache regeneration

Same approach as `fix-mp-aorist-3sg`: regenerate the derived `.cache/husic/*.jsonl` files in place from the corrected engine output. Direct caches (djeg, pjek) are already correct (they're the source of truth) — they remain untouched.

The 40 derived caches don't include djeg/pjek/marr/shoh/jap/dua (those are direct or absent), so the cache regen for THIS change touches mostly the verbs whose paradigm dispatch involves these inner cells — minimal in practice. The regenerator script reuses the previous one.

### D8. verify-engine baseline

After the fix:

- Husić-direct matches: should INCREASE for djeg/pjek/marr/shoh/dua MP cells (currently bucketed as "no truth" or active mismatches).
- Mismatches: should DROP from 4 to 1 (only `hekuros` remains, the genuine Kaikki typo).
- Kaikki matches for `bitis`: gains 1 cell (optative 2pl now matches).

Estimated baseline lift: +20 to +60 cells.

### D9. Engine version

This is a paradigm-correctness fix and an additive engine extension (new override key valid; old behavior unchanged for verbs without MP overrides). Engine stays at 0.1.0. Corpus bumps 0.1.3 → 0.1.4.

## Tradeoffs

- **Per-verb overrides vs paradigm refactor.** Per-verb wins for the same reasons as the active-mutation case: the mutation is verb-specific lexical knowledge, the override mechanism is established, and we're consistent with existing data. A `mutatedStem` field would scale better if we add more Class 2B verbs, but that's premature now.
- **Cascade override semantics.** Setting `middlePassiveImperfect → 'indicative.imperfect.middle-passive'` means an override at that key affects subjunctive imperfect MP and conditional present MP without explicit per-tense entries. This is exactly what the linguistic data wants (those compound tenses share the inner stem) but it's a design choice — alternative would be per-tense override keys, more verbose.
- **Husić-only ground truth.** We add overrides only where Husić-direct documents the form. For jap, that means MP present only. Engine emits wrong forms for jap MP imperfect / subjunctive / etc.; we accept the gap rather than guess overrides.

## Resolved Questions

None.

## Open Questions

- **Q1.** Should `pi`'s class-3 plural endings (`pijmë`/`pijnë` vs paradigm-default `pimë`/`pinë`) become per-verb overrides too? Defer — needs investigation whether other class-3 verbs need it.
- **Q2.** The `iki.jsonl` Husić cache contains jam-paradigm forms (`jam`/`je`/`është`) tagged as iki present. Is this a `parse-husic-pdf.py` parser bug, a Husić manual layout that confused the parser, or intentional (iki uses `jam` aux extensively)? Defer to a parser audit.
