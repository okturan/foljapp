## Why

With `add-project-foundation` in place, the project boots, builds, tests, and ships — but does nothing linguistically useful. This change adds the heart of foljapp: a pure-TypeScript engine that takes a verb identifier and a set of grammatical parameters and returns the fully-realized Albanian conjugation, broken down by morphological role (particle / auxiliary / stem / ending / voice marker). Without this engine, no verb page, no playground, no API, no export, and no practice mode can exist.

Albanian morphology is fusional, not agglutinative, so the engine must combine an algorithmic rules layer with a principal-parts dictionary. This change ships both: the rules engine in `packages/engine` and a curated 20-verb seed corpus in `packages/data` (or `data/verbs/`), large enough to cover all three conjugation classes, all five suppletives, both phonologically-mutating examples flagged in our config, and a representative sample of regulars.

## What Changes

- Add a pure-TypeScript conjugation engine in `packages/engine` with no runtime dependencies. Public surface is a single `conjugate(verbId, options)` function plus typed result objects.
- Add the verb-corpus shape in `packages/data` (Zod schemas + TypeScript types) for `VerbEntry`, `Paradigm`, `ConjugatedForm`, and `MorphologicalRole`.
- Add a seed dataset of 20 verbs at `data/verbs/<lemma>.json`:
  - One regular per conjugation class: `punoj` (Class 1, -j), `hap` (Class 2, consonant), `pi` (Class 3, vowel)
  - Five suppletives: `jam`, `jap`, `shoh`, `vij`, `them`
  - Two phonologically-mutating: `pjek` (k→q), `djeg` (g→gj)
  - Ten additional high-frequency regulars for breadth: `marr`, `bëj`, `flas`, `vij`, `dua`, `mund`, `duhet`, `ha`, `iki`, `rri`
- Add an auxiliary verb composer (`kam` / `jam` paradigms hardcoded as foundational) used to build all compound tenses.
- Add a particle composer that prefixes/suffixes the appropriate particle for each mood/tense combination: `të` (subjunctive), `do të` (conditional), `duke` (gerund), `pa` (privative), `me të` (temporal), `për të` (infinitive), `u` (passive aorist), `nuk` / `s'` / `mos` (negation), `a` (interrogative).
- Add a phonological mutation handler covering palatalization (k→q, g→gj, ll→j) and vowel-collision dropping at stem-suffix boundaries.
- Add a voice transformer for the active ↔ middle-passive switch.
- Add a build-time script `scripts/build-corpus.ts` that ingests source data (uniparser, Kaikki, Husić) into the shape `packages/data` defines. The script is invoked manually for v1; later changes may automate it.
- Add Vitest fixtures at `packages/engine/test/` covering all 6 moods × all tenses × 2 voices for each of the 20 seed verbs, asserting against expected forms drawn from Husić's paradigm tables.

## Capabilities

### New Capabilities
- `conjugation-engine`: Defines the contract of `conjugate(verbId, options)`: input shape, output shape, supported mood × tense × voice × polarity × person × number combinations, and the morphological role decomposition of each output form.
- `verb-corpus`: Defines the on-disk verb data shape, the Zod validation schema, the source-priority order for ingestion (uniparser → Kaikki → Husić), the seed-verb selection criteria, and the expectation that every verb in the corpus passes engine round-trip validation.

### Modified Capabilities
_None._ This change creates two new capabilities alongside `webapp-foundation`. It does not modify any requirement of the foundation spec — the new packages live inside the workspace structure that foundation already established, but the foundation's behaviors are unchanged.

## Impact

- **Code** — Adds `packages/engine/src/`, `packages/data/src/`, `data/verbs/*.json`, `scripts/build-corpus.ts`, and `packages/engine/test/`. No `apps/web` changes — the engine is consumed by the next change, not this one.
- **Dependencies** — Adds `zod` to `packages/data` (already pre-installed as a placeholder by foundation). Engine remains zero-dep.
- **APIs** — Defines the engine's public TypeScript API. No HTTP API yet.
- **Linguistic claims** — Heavy. Every paradigm rule, suppletive form, and phonological mutation must cite Husić paradigm IDs in source-code comments and in `packages/engine/docs/sources.md`. Cross-checks against Kadriu 2015 formulas and Wikipedia where applicable. Test fixtures reference uniparser-grammar-albanian as the secondary authority.
- **Audience tier** — Primarily serves **students** and **researchers** in this change (the engine output is the reference). Learner-facing UI arrives in `add-verb-reference-page`.

## Non-Goals

- No UI. No verb page, no playground, no search, no decomposition rendering.
- No HTTP API. The engine is in-process TypeScript only.
- No corpus completeness. 20 verbs is intentional — enough to exercise every code path with margin, not enough to ship a real product. Scaling to thousands belongs to a later change.
- No dialectal coverage. Tosk standard only. Geg lookups are explicitly out of scope until `dialect-support` (Phase 5).
- No IPA pronunciation. Output strings are orthographic Albanian only.
- No frequency data integration. The corpus knows nothing about UD-STAF or Kote/Biba in this change.
- No automated source ingestion. The build script runs manually; CI does not regenerate the corpus.

## Sequence

```
PREV  →  add-project-foundation         (provides the workspace + tooling)
THIS  →  add-conjugation-engine         (creates conjugation-engine, verb-corpus)
NEXT  →  add-verb-reference-page        (consumes both capabilities)
```

This change is implementable only after `add-project-foundation` is archived (the workspace must exist). It is a hard prerequisite for `add-verb-reference-page` (which imports the engine and reads the corpus) and for every subsequent capability in the roadmap.
