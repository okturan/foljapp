## Context

Negation is applied late in the compose pipeline
(`applyNegationAndModality`): the resolved cell arrives with mood particles
already attached (`të punoj`, `do të punoja`, `qofsha`), and the negator is
prepended as a segment + surface prefix. `selectNegation` picks the particle
by mood; trace.ts re-derives the same choice for the derivation panel.

## Goals / Non-Goals

Goal: standard-Albanian negation for optative and subjunctive with no other
behavioral drift (indicative/admirative/conditional `nuk`, colloquial `s'`,
imperative `mos` all unchanged).
Non-goals: colloquial inverted order, non-finite polarity, dubitative `mos`.

## Decisions

### D1. Optative is a `selectNegation` branch change only

`mos qofsha` is a plain prefix, same as imperative — one line in the mood
condition. `colloquial: true` keeps returning `mos` for these moods (the
`s'` clitic replaces `nuk`, never `mos`).

### D2. Subjunctive `mos` is inserted after the leading `të` segment

The subjunctive cell always begins with the `të` particle segment (including
compound tenses: `të kem punuar`). The negation step becomes:

```
segments: [të] [rest…]        →  [të] [mos] [rest…]
surface:  "të " + rest        →  "të mos " + rest
```

Interrogative `a` still wraps the whole phrase afterwards (`a të mos
punoj`), preserving current particle ordering semantics. Defensive fallback:
if the first segment is not the `të` particle (unexpected), prepend `mos` as
today rather than corrupt the segment list — a unit test pins the normal
path so the fallback cannot mask a regression silently.

### D3. Trace mirrors compose instead of duplicating logic drift

`trace.ts` currently hardcodes the same mood→particle mapping; it gains the
optative branch and, for subjunctive, emits the negation step after the
`të` particle step with an "insert after 'të'" summary, so the panel's
narrated order matches the actual surface.

### D4. Version and baseline bookkeeping

Engine `VERSION` 0.1.0 → 0.1.1. `verify-engine` compares affirmative cells
against Kaikki only, so the 19,639-match observed state must be identical
before/after; the run is part of the change's gates. Corpus-lab artifacts
keyed to generated negative targets go stale by design (see proposal
Impact).

## Data shape

`TraceStep` and `DecompositionSegment` shapes are unchanged; only segment
order within subjunctive-negative cells differs (`të`, `mos`, …rest).

## Tradeoffs

- **Insertion vs recomposing the particle chain**: a full particle-ordering
  refactor (compose all particles in one ordered pass) would be cleaner in
  the abstract but touches every mood for a two-mood fix; the targeted
  insertion keeps the diff reviewable and deletable.
- **Stale corpus artifacts until rescan**: accepted consciously — the stale
  keys were raw-zero garbage anyway, and the rescan converts ~24.9k variant
  matches into canonical hits when it runs.
