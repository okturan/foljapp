## Context

The conjugation engine is the canonical authority for what foljapp says any Albanian verb means in any cell of the conjugation matrix. Every other capability — reference pages, search, playground, IGT export, public API — is a presentation layer over this engine's output. Getting it wrong corrupts the entire product. Getting it right means every downstream feature inherits correctness for free.

Albanian morphology is fusional, not agglutinative. There is no clean stem-plus-suffix algorithm that derives the aorist from the present. Verbs change roots; suffixes are class-dependent; phonological rules apply at boundaries; five high-frequency verbs are fully suppletive; and the entire system is layered with multi-word particle constructions for compound tenses. A pure rule-based engine cannot succeed alone, and a pure dictionary-of-forms cannot scale. We need both: an algorithmic core driven by paradigm data, with hardcoded escape hatches for the irregulars Husić and uniparser have already catalogued.

This design commits to that hybrid architecture, locks down its data shapes, and explains the tradeoffs.

## Goals / Non-Goals

**Goals:**

- A pure-TypeScript engine with zero runtime dependencies, importable identically server-side and client-side.
- Deterministic, side-effect-free `conjugate(verbId, options)` that returns both the surface form AND its morphological role decomposition.
- Paradigms expressed as data, not code, so adding a new paradigm is editing JSON/TS data files, not modifying control flow.
- Suppletive verbs supported via hardcoded full-form tables that bypass paradigm logic entirely.
- Phonological mutation handled as a final post-processing pass with documented rule citations.
- Corpus integrity enforced by an engine-round-trip gate at build time: a corpus entry that the engine cannot consume cannot ship.
- Engine version surfaced on every result for citation and cache-keying downstream.

**Non-Goals:**

- No tokenization, lemmatization, or surface-form-to-lemma reverse lookup. The engine is forward-only (lemma → forms). Reverse lookup is a separate capability deferred to `add-search-and-browse`.
- No phonemic or IPA output. That is `add-pronunciation`'s problem.
- No dialectal variants. Tosk standard only. Geg lookups are out of scope until `dialect-support`.
- No HTTP, no caching, no async. The engine is a synchronous pure function.
- No completeness guarantee for the corpus. 20 seed verbs, no more. Scale is `add-corpus-expansion` (a future change not yet enumerated).
- No graphical morphological tree, no Leipzig glossing string, no CoNLL-U output. All of those are layers built on the decomposition output by later changes.

## Decisions

### D1. Hybrid architecture: paradigm data + suppletion table + phonological pass

Considered: pure rule-based, pure forms-table, hybrid.

Chosen: **Hybrid**. Three layers:

```
   Layer 1 — SUPPLETION TABLE
   ┌───────────────────────────────────────┐
   │  jam, jap, shoh, vij, them            │
   │  Hardcoded full-form lookup tables.   │
   │  If verbId is in this set, return     │
   │  directly; do not run the rules.      │
   └───────────────────────────────────────┘
                    │
                    ▼  (otherwise)
   Layer 2 — PARADIGM ENGINE
   ┌───────────────────────────────────────┐
   │  Read the verb's class + principal    │
   │  parts from the corpus entry.         │
   │  Apply class-specific endings from    │
   │  paradigm tables.                     │
   │  Compose particles for compound       │
   │  tenses by recursively conjugating    │
   │  the auxiliary (kam or jam).          │
   └───────────────────────────────────────┘
                    │
                    ▼
   Layer 3 — PHONOLOGICAL POST-PROCESS
   ┌───────────────────────────────────────┐
   │  Palatalization (k→q, g→gj, ll→j)     │
   │  Vowel-collision dropping at stem-    │
   │  suffix boundaries.                   │
   │  Final orthographic normalization.    │
   └───────────────────────────────────────┘
                    │
                    ▼
              ConjugationResult
```

Rationale: this matches the actual structure of Albanian morphology as catalogued by Husić. Suppletives don't follow paradigms. Regulars do. Phonology is uniform across both. Trying to do all three in one pass produces unmaintainable code; separating them produces three reasonably-small modules.

### D2. Paradigms as data

Considered: paradigms as switch statements, paradigms as data tables.

Chosen: **Data tables** in `packages/engine/src/paradigms/{class-1,class-2,class-3}.ts`. Each paradigm exports a typed object mapping `{ mood, tense, voice, person, number } → ending` plus per-cell stem-selector instructions (which principal part to use).

Rationale: adding a paradigm or fixing a wrong cell is a one-line data edit, not a logic change. Reviewing paradigm correctness against Husić is also data-comparison, which is mechanical.

Trade-off: typed paradigm tables are verbose (≈100 entries × 3 classes ≈ 300 typed records). Mitigation: the records are auto-validated by the engine against `engine.table()` for every seed verb at test time; a drift surfaces as a failing test, not as runtime corruption.

### D3. Auxiliaries as first-class verbs

Considered: hardcode auxiliary forms directly into the compound-tense composer; treat `kam` and `jam` as first-class verbs in the engine.

Chosen: **First-class verbs**. `kam` and `jam` ship with hardcoded paradigms in `packages/engine/src/auxiliaries.ts` and are conjugated through the same public `conjugate(verbId, ...)` API as any other verb. Compound-tense composition recursively calls `conjugate("kam" | "jam", ...)`.

Rationale: auxiliaries are themselves available to users as standalone verbs (people want to conjugate "to be" and "to have"). Treating them as just-another-verb means we ship one mental model, not two. The recursion bottoms out on the hardcoded table, so there's no infinite regress.

### D4. Suppletion table is hardcoded TypeScript, not corpus JSON

Considered: store suppletive forms in the corpus JSON files; embed them as TypeScript constants in the engine.

Chosen: **Embed in the engine**. `packages/engine/src/suppletion.ts` contains the full form tables for `jam`, `jap`, `shoh`, `vij`, `them`. The corpus entries for these verbs DO exist (so they appear in the index, search, etc.) but their `principalParts` are vestigial — the engine never reads them.

Rationale: suppletives are a property of the *engine's* knowledge of Albanian, not of the corpus. Two engines built against the same corpus would still need to know jam's aorist is qeshë. Putting suppletion tables in the engine package keeps the knowledge co-located with the code that uses it.

Trade-off: editing a suppletive form requires an engine version bump, not a corpus-only PR. Acceptable: suppletive forms are ancient Indo-European inheritance; they are not going to change.

### D5. Decomposition is a structured array, not a marker string

Considered: emit a single string like `"<aux>kam</aux> <stem>punu</stem><end>ar</end>"`; emit a structured array of `{ surface, role, ... }` objects.

Chosen: **Structured array**. Every consumer (reference page, IGT exporter, decomposition visualizer, public API) needs to programmatically reason about roles. A marker string forces every consumer to write its own parser.

The mapping back to surface text is trivial: `result.decomposition.map(s => s.surface).join(separator)` reproduces the form, where the separator is a single space for multi-word forms (auxiliary + lexical) and empty otherwise.

### D6. Errors are typed classes, not error codes

Considered: return `{ ok: true, ... } | { ok: false, error: string }`; throw plain `Error`s; throw typed error classes.

Chosen: **Typed error classes** (`UnknownVerbError`, `UnsupportedCellError`, `InvalidOptionsError`, `CorpusIntegrityError`) all extending `EngineError`.

Rationale: callers can write `if (e instanceof UnsupportedCellError)` without parsing strings. The Result pattern is cleaner in some ways but doubles the API surface (every method needs an Err narrowing); throws keep the happy path concise.

### D7. Build script lives at repo root, not in a package

`scripts/build-corpus.ts` is a Node-runnable TypeScript file invoked via `tsx` from the root `package.json`. It is not part of any workspace package. It imports from `@foljapp/engine` and `@foljapp/data` to do its work.

Rationale: build scripts are repo-level concerns, not library concerns. Putting them at the root keeps the engine package's dependency surface clean.

### D8. Corpus disagreement is recorded, not silenced

When sources disagree (uniparser says `mor`, Kaikki says `mora`), the build pipeline picks the higher-priority source AND writes a `notes` field documenting the divergence. This makes corpus quality a thing reviewers can SEE in PRs without running diffs against external sources.

## Data Shapes

### VerbEntry (Zod schema)

```
{
  id            : string         // kebab-case, unique, matches filename
  lemma         : string         // 1sg present, e.g., "punoj"
  translationEn : string         // "to work"
  class         : 1 | 2 | 3      // Zgjedhimi
  auxiliary     : "kam" | "jam"  // for compound tenses
  principalParts: {
    present   : string           // e.g., "puno"
    aorist    : string           // e.g., "punua"
    participle: string           // e.g., "punuar"
  }
  sources       : Array<{
    source    : "uniparser" | "kaikki" | "husic" | "manual"
    reference : string           // paradigm name, URL, paradigm number, or "manual"
  }>
  flags?        : {
    isSuppletive    : boolean
    hasMutation     : boolean    // k→q, g→gj, ll→j
    irregularAorist : boolean
  }
  dialect?      : "tosk" | "geg"  // default: "tosk"
  notes?        : string         // human review notes, source disagreements
}
```

### ConjugationResult

```
{
  form          : string                          // "kam punuar"
  decomposition : Array<{
    surface : string                              // "kam" | "punu" | "ar"
    role    : "particle" | "auxiliary" |
              "stem" | "ending" | "voice-marker"
    meta?   : { person?, number?, tense?, ... }
  }>
  options       : ConjugateOptions                // echo of input
  unsupported   : boolean                         // for cells engine cannot fill
  interrogative : boolean                         // when modality === "interrogative"
  engineVersion : string                          // == VERSION constant
  corpusVersion : string                          // pulled at conjugation time
}
```

### Engine module layout

```
packages/engine/src/
├── index.ts                        (public exports: conjugate, table, participle, VERSION, errors)
├── types.ts                        (ConjugateOptions, ConjugationResult, role enum)
├── errors.ts                       (EngineError, UnknownVerbError, UnsupportedCellError, ...)
├── corpus-loader.ts                (reads from @foljapp/data — abstraction over fs/json import)
├── auxiliaries.ts                  (hardcoded kam, jam paradigms)
├── suppletion.ts                   (hardcoded jam, jap, shoh, vij, them tables)
├── paradigms/
│   ├── class-1.ts                  (Zgjedhimi 1, -j ending)
│   ├── class-2.ts                  (Zgjedhimi 2, consonant ending)
│   └── class-3.ts                  (Zgjedhimi 3, vowel ending)
├── compose/
│   ├── particle.ts                 (të, do të, duke, pa, me të, për të, u, nuk, mos, a)
│   ├── compound-tense.ts           (auxiliary + participle)
│   ├── voice.ts                    (active ↔ middle-passive)
│   └── decomposition.ts            (assembles segments into the array form)
├── phonology/
│   ├── palatalization.ts           (k→q, g→gj, ll→j)
│   ├── vowel-collision.ts
│   └── normalize.ts                (final orthographic pass)
└── conjugate.ts                    (orchestrator: suppletion → paradigm → phonology)
```

### Conjugation flow (one call)

```
   conjugate(verbId, options)
        │
        ▼
   ┌─────────────────────┐
   │ Validate options    │  → throws InvalidOptionsError on mismatch
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ Lookup corpus entry │  → throws UnknownVerbError if missing
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ In suppletion?      │
   │   yes → table read  │
   │   no  → continue    │
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ Pick paradigm by    │
   │ class               │
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ Pick stem from      │
   │ principal parts     │
   │ (which depends on   │
   │  mood + tense)      │
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ Compose ending      │
   │ from paradigm       │
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ For compound tenses:│
   │  recurse into       │
   │  conjugate(aux,...) │
   │  + concat participle│
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ Apply voice         │
   │ (active passthrough,│
   │  passive transform) │
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ Apply phonology     │
   │ (palatalization +   │
   │  vowel collision)   │
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ Compose particles   │
   │ (negation, mood     │
   │  marker, question)  │
   └─────────┬───────────┘
             ▼
   ┌─────────────────────┐
   │ Build decomposition │
   │ array               │
   └─────────┬───────────┘
             ▼
       ConjugationResult
```

## Risks / Trade-offs

- **[Risk]** Paradigm tables encode dozens of cells × three classes; a single typo silently produces wrong forms for a whole class. → **Mitigation:** Test fixtures include the full present/aorist/participle expected forms for every seed verb in every class; tests fail loudly on drift. Husić paradigm citations are required in each paradigm file's header comment.

- **[Risk]** Suppletion tables embed forms in TypeScript that disagree with what Husić actually says. → **Mitigation:** Each suppletion table file's header lists the Husić paradigm number; the test fixtures assert specific forms (e.g., `jam` 1sg aorist === `qeshë`); reviewers can grep paradigm numbers and audit.

- **[Risk]** Phonological mutations are easy to over-apply. Albanian's k→q rule fires only before front vowels in suffix-initial position, not everywhere. → **Mitigation:** Phonology functions take both stem and suffix as inputs and apply rules conditionally; unit tests include negative cases (k that does NOT mutate) drawn from Husić examples.

- **[Risk]** Engine and corpus drift independently. A corpus update could declare a verb's auxiliary that conflicts with the engine's expectations. → **Mitigation:** Build-time round-trip gate: every corpus entry is conjugated through `engine.table()` before the index is emitted; mismatches fail the build.

- **[Risk]** Recursion through compound-tense composition might overflow if a corpus error declares an auxiliary that itself declares a non-finite primary form. → **Mitigation:** Compound-tense composer asserts `auxiliary === "kam" || auxiliary === "jam"` for the recursive call's verbId; any other value throws `CorpusIntegrityError`. The two auxiliaries' own paradigms terminate at hardcoded suppletion-style tables, eliminating recursion.

- **[Trade-off]** Engine version baked into every result inflates result objects when consumers conjugate thousands of forms. → **Acceptance:** A 30-byte string per result is acceptable. If profiling later shows it dominates, callers can opt into a `compact: true` option that omits metadata.

- **[Trade-off]** The middle-passive voice has multiple competing analyses in Albanian linguistics; we commit to the Husić analysis (particle `u` in aorist; jam-aux for compound; dedicated `-em` endings for present/imperfect). Other sources may disagree at the margins. → **Acceptance:** We document the chosen analysis in `packages/engine/docs/voice-analysis.md` so disagreements are arguable rather than unstated.

## Migration Plan

Not applicable — `add-project-foundation`'s placeholder `packages/engine/src/index.ts` is replaced wholesale. No prior engine state to preserve.

## Resolved Questions

- **Q1.** Negative subjunctive ordering — **Resolved: `mos të punoj`.** The negation particle `mos` precedes the subjunctive marker `të`. This is the order Husić uses; alternative `të mos punoj` exists in colloquial speech but the engine commits to one canonical ordering for v1.
- **Q2.** `allCells()` helper — **Resolved: YES.** Exposed as `engine.allCells(): CellKey[]`. The reference-page renderer (change C) needs this; adding it post-publication is a breaking minor.
- **Q3.** ESM-only — **Resolved: YES.** Next.js 15 consumes ESM natively; CJS callers are not in v1's audience.
- **Q4.** Paradigm tables as TypeScript — **Resolved: YES.** Authored as TS data files so the type-checker validates structural integrity; runtime revalidation of JSON paradigms would be re-work for no gain.
