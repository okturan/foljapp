## MODIFIED Requirements

### Requirement: Admirative mood coverage

The engine SHALL produce correct forms for every cell of the admirative mood across these 4 tenses: `present`, `imperfect`, `perfect`, `pluperfect`. Active-voice admirative forms SHALL be constructed by attaching the admirative endings (`-kam/-ke/-ka/-kemi/-keni/-kan` for present and `-kësha/-këshe/-kësh/-këshim/-këshit/-këshin` for imperfect) to the trimmed participle stem (per the admirative-trim policy that maps `-uar/-ar` → trim 1, `-ur` → trim 2, `-rë` → trim 2, `-rrë` → trim 1, `-ë` → trim 1). Compound admirative tenses (perfect, pluperfect) SHALL be composed as the appropriate admirative form of `kam` followed by the lexical verb's participle. The active simple admirative tenses SHALL be returned by the engine without external particles.

The middle-passive admirative imperfect and admirative pluperfect SHALL throw `UnsupportedCellError` in v0.1.0; full middle-passive admirative coverage is a separate, in-flight workstream and is intentionally out of scope for this requirement.

#### Scenario: Present admirative class 1 across all six cells

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "present", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each cell
- **THEN** the engine SHALL return forms `punuakam`, `punuake`, `punuaka`, `punuakemi`, `punuakeni`, `punuakan`

#### Scenario: Perfect admirative 1sg for class 1

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "perfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"paskam punuar"`

#### Scenario: Imperfect admirative class 1 across all six cells

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "imperfect", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each of the six person/number cells in order 1sg, 2sg, 3sg, 1pl, 2pl, 3pl
- **THEN** the engine SHALL return forms `punuakësha`, `punuakëshe`, `punuakësh`, `punuakëshim`, `punuakëshit`, `punuakëshin`

#### Scenario: Imperfect admirative for class 2 verb flas across all six cells

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "imperfect", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each of the six person/number cells in order 1sg, 2sg, 3sg, 1pl, 2pl, 3pl
- **THEN** the engine SHALL return forms `folkësha`, `folkëshe`, `folkësh`, `folkëshim`, `folkëshit`, `folkëshin`

#### Scenario: Imperfect admirative for phonologically-mutating verb pjek

- **WHEN** `conjugate("pjek", { mood: "admirative", tense: "imperfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"pjekkësha"` (no palatalization applies; admirative imperfect is built on the unmutated participle stem `pjek-`)

#### Scenario: Imperfect admirative for suppletive verb jam

- **WHEN** `conjugate("jam", { mood: "admirative", tense: "imperfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"qenkësha"`

#### Scenario: Imperfect admirative for suppletive verb shoh

- **WHEN** `conjugate("shoh", { mood: "admirative", tense: "imperfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"pakësha"` (suppletive root `pa-`, parallel to the existing admirative present `pakam`)

#### Scenario: Pluperfect admirative for class 1 across all six cells

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "pluperfect", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each of the six person/number cells in order 1sg, 2sg, 3sg, 1pl, 2pl, 3pl
- **THEN** the engine SHALL return forms `paskësha punuar`, `paskëshe punuar`, `paskësh punuar`, `paskëshim punuar`, `paskëshit punuar`, `paskëshin punuar`

#### Scenario: Pluperfect admirative for class 2 verb flas

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "pluperfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"paskësha folur"`

#### Scenario: Pluperfect admirative for suppletive verb jam (kam-aux compound path)

- **WHEN** `conjugate("jam", { mood: "admirative", tense: "pluperfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"paskësha qenë"` (using `jam`'s participle `qenë` and the kam-aux admirative imperfect `paskësha`)

#### Scenario: Decomposition of pluperfect admirative includes auxiliary and stem segments

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "pluperfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** `result.decomposition` SHALL contain a segment with `surface: "paskësha"` and `role: "auxiliary"`
- **AND** SHALL contain a segment with `surface: "punuar"` and `role: "stem"`

#### Scenario: Negative polarity composes with admirative imperfect

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "imperfect", voice: "active", person: 1, number: "singular", polarity: "negative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"nuk folkësha"` (the standard `nuk` negation prepends to the simple admirative imperfect form)

#### Scenario: Negative polarity composes with admirative pluperfect

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "pluperfect", voice: "active", person: 1, number: "singular", polarity: "negative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"nuk paskësha folur"` (the `nuk` particle precedes the auxiliary `paskësha` and the participle `folur`)

#### Scenario: Middle-passive admirative imperfect remains unsupported in v0.1.0

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "imperfect", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** the engine SHALL throw `UnsupportedCellError`

#### Scenario: Middle-passive admirative pluperfect remains unsupported in v0.1.0

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "pluperfect", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** the engine SHALL throw `UnsupportedCellError`

## ADDED Requirements

### Requirement: verify-engine covers admirative imperfect and pluperfect

The `scripts/verify-engine.ts` cell list SHALL include `{ mood: 'admirative', tense: 'imperfect' }` and `{ mood: 'admirative', tense: 'pluperfect' }` for active voice across all corpus verbs. The match-rate baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to the new total (current cells + new admirative cells), and the verification script SHALL maintain a 100% match against Kaikki for these new cells.

#### Scenario: verify-engine reports admirative imperfect for every corpus verb

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **THEN** the output SHALL include at least one match for `admirative.imperfect` per corpus verb that has Kaikki coverage
- **AND** zero mismatches SHALL be reported for `admirative.imperfect` and `admirative.pluperfect` cells

#### Scenario: Match-rate baseline is updated

- **WHEN** the change is archived
- **THEN** `packages/engine/docs/sources.md` SHALL no longer mention "admirative imperfect/pluperfect not implemented in v0.1.0" as a deferred item
- **AND** the recorded baseline match-rate SHALL reflect the expanded cell count
