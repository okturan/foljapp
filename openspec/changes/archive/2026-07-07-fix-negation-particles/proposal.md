## Why

The engine negates every non-imperative, non-subjunctive mood with `nuk`
(`selectNegation` in `packages/engine/src/compose/particle.ts`), and applies
subjunctive `mos` by prepending it to the whole phrase. Both disagree with
standard Albanian:

- **Optative** is negated with `mos`, not `nuk`: *mos qofsha*, *mos e pafsha
  më* — never \**nuk qofsha* (Newmark, Hubbard & Prifti 1982, *Standard
  Albanian*, §on the optative; Husić 2002 paradigm notes). The engine
  currently emits `nuk thënçim`, `nuk dhënçin`, `nuk paç thënë`.
- **Subjunctive** negation places `mos` after the particle `të`: *të mos
  punoj* (Newmark et al. 1982; the subjunctive negator follows `të` and
  precedes clitics). The engine emits `mos të punoj`.

The corpus lab independently corroborates both. Every engine-generated
negated-optative and `mos të …` target is raw-zero across 1.32B candidate
sentences, while the phrase-variant stress report's reorderings of those
same targets recovered 24,861 raw matches: `të mos …` variants scored 6,483
and bare `mos …` variants 18,378, against zero for the engine's canonical
order. A 45-form web spot-check (2026-07-07) found the engine's strings
nowhere in natural text, while the standard-order constructions appear
freely.

These forms render today on `/playground` (polarity is a user-facing
dimension) and in decomposition traces, so learners currently see
non-standard Albanian presented as reference-quality output.

## What Changes

- **`selectNegation`** — optative joins imperative and subjunctive in the
  `mos` branch. `colloquial` `s'` never applies to these moods (unchanged
  behavior for indicative/admirative/conditional).
- **Subjunctive placement** — `applyNegationAndModality` inserts the `mos`
  segment after the leading `të` particle instead of prepending, yielding
  `të mos punoj`, `të mos kem punuar`, `të mos digjet`. Defensive fallback:
  if a subjunctive cell ever lacks a leading `të` segment, prepend as
  before.
- **Trace** — `scripts`-facing derivation steps mirror the same particle
  choice and ordering so the decomposition panel narrates `të mos …`
  correctly.
- **Tests** — a dedicated negation-particles suite covering every mood ×
  polarity, both voices, compound tenses, suppletive (`jam`, `them`) and
  phonologically-mutating (`djeg`) verbs; existing golden tests updated
  where they pinned the old behavior.
- **Engine version** — 0.1.0 → 0.1.1 (behavior change); verification
  baseline note updated in `packages/engine/docs/sources.md`.

## Capabilities

Extends `conjugation-engine`: negation particle selection and placement
SHALL follow standard Albanian per mood.

## Impact

- **Code** — `packages/engine/src/compose/particle.ts`,
  `packages/engine/src/conjugate.ts` (negation application),
  `packages/engine/src/trace.ts`, `packages/engine/src/version.ts`, tests.
- **verify-engine** — Kaikki comparison tables cover affirmative cells only;
  the match-rate must hold exactly (run before/after to confirm).
- **Corpus lab** — generated negated-optative/subjunctive target keys change
  (`mos_të_X` → `të_mos_X`, `nuk_<optative>` → `mos_<optative>`).
  `.cache/corpus-targets.json` is regenerated; the missing-forms audit,
  target-hit sidecars, and static playground examples for those cells go
  stale until the next full scan — on that rescan, the ~24.9k phrase-variant
  matches become canonical exact hits, honestly shrinking the missing pile.
  The rescan is deliberately not part of this change.
- **Audience tier** — learners primarily (correct forms on the reference
  site); researchers get standard-conformant generated data.

## Non-Goals

- **No colloquial `mos të …` support.** The regional/colloquial inverted
  order stays out of the engine; the corpus lab's variant matching already
  tracks it as a variant, not a citation form.
- **No non-finite negation work** (`duke mos punuar`, `për të mos punuar`):
  the non-finite path does not accept polarity today; adding it is its own
  proposal.
- **No dubitative/interrogative `mos` semantics** (admirative `mos ardhka?!`
  readings) — negation only.
- **No corpus rescan or audit regeneration** in this change (see Impact).

## Sequence

```
PREREQ → (none)
THIS   → fix-negation-particles
NEXT   → full corpus rescan + audit refresh; middle-passive attestation
         review consumes the corrected target set
```
