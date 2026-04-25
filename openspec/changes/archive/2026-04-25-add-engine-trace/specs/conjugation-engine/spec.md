## ADDED Requirements

### Requirement: trace(verbId, options) returns ordered construction steps

`@foljapp/engine` SHALL export a function `trace(verbId, options)` accepting the same parameters as `conjugate()` and returning an ordered `TraceStep[]` describing how the form was built. The first step SHALL describe the corpus lookup; the last step SHALL be a `final` step containing the surface form. Intermediate steps document stem selection, paradigm rule application, auxiliary recursion (for compound tenses), phonological adjustments, and particle prepending.

#### Scenario: Trace for a simple class-1 present cell

- **WHEN** `trace("punoj", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** the result SHALL be an array of `TraceStep` records
- **AND** the first step SHALL have `kind: "corpus-lookup"` referencing `verbId: "punoj"`
- **AND** at least one step SHALL have `kind: "paradigm-rule"`
- **AND** the last step SHALL have `kind: "final"` and `form: "punoj"`

#### Scenario: Trace for a compound-tense cell includes auxiliary recursion

- **WHEN** `trace("punoj", { mood: "indicative", tense: "perfect", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** at least one step SHALL have `kind: "auxiliary-recursion"` describing the kam present 1sg = "kam" lookup
- **AND** the final step's `form` SHALL equal `"kam punuar"`

#### Scenario: Trace for a suppletive verb shows the suppletive-lookup step

- **WHEN** `trace("jam", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** at least one step SHALL have `kind: "suppletive-lookup"` referencing `verbId: "jam"`

#### Scenario: Trace for a particle-prefixed mood includes particle-prepend

- **WHEN** `trace("punoj", { mood: "subjunctive", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** at least one step SHALL have `kind: "particle-prepend"` with `particle: "të"`

### Requirement: TraceStep types

`TraceStep` SHALL be a discriminated union with the following `kind` values:

- `corpus-lookup` — the engine read the verb's principal parts from the corpus
- `suppletive-lookup` — the engine read a suppletive form from the hardcoded table
- `paradigm-rule` — the engine applied a paradigm cell rule (stem + ending)
- `auxiliary-recursion` — the engine recursively conjugated kam or jam
- `phonology` — a phonological rule fired (rare in v1; mostly safety net)
- `particle-prepend` — a particle was added (subjunctive, conditional, future, gerund, privative, temporal, infinitive, negation, interrogative, voice marker)
- `cell-override` — a corpus `cellOverrides` entry short-circuited the paradigm
- `final` — the resolved form

Each step SHALL include `kind`, a `summary` string, and any structured fields specific to the step type.

#### Scenario: Trace for an iki cell uses cell-override

- **WHEN** `trace("iki", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** at least one step SHALL have `kind: "cell-override"` referencing the override `"iki"`

### Requirement: trace() and conjugate() agree on the surface form

For every `(verbId, options)` pair where `conjugate()` succeeds, `trace()` SHALL return an array whose final step's `form` field equals `conjugate()`'s `form` field. Both functions SHALL throw the same error type for the same invalid input.

#### Scenario: Trace and conjugate agree on a wide sample

- **WHEN** for every `Question` returned by `practice.generateQuestions({ count: 30 })`, both `conjugate()` and `trace()` are invoked
- **THEN** `conjugate(verbId, options).form` SHALL equal `trace(verbId, options).at(-1).form` for every cell
