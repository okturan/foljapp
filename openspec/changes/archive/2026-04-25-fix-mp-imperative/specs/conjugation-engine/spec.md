## MODIFIED Requirements

### Requirement: Imperative mood coverage

The engine SHALL produce correct forms for the imperative mood, which is restricted to 2nd person singular and 2nd person plural cells. Other person/number cells SHALL produce a typed `UnsupportedCellError`. Active-voice imperative forms SHALL be derived from `paradigm.imperativeActive` (or per-verb `cellOverrides['imperative.present']`). Middle-passive imperative SHALL be supported only when the corpus entry carries explicit per-verb `cellOverrides['imperative.present.middle-passive']` for the requested cell; if no override exists, the engine SHALL throw `UnsupportedCellError`. The engine SHALL NOT silently fall back to active-voice forms for MP imperative requests.

#### Scenario: Imperative class 1

- **WHEN** `conjugate("punoj", { mood: "imperative", voice: "active", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` and the corresponding plural call are invoked
- **THEN** the engine SHALL return `puno` for 2sg and `punoni` for 2pl

#### Scenario: Imperative for an unsupported cell

- **WHEN** `conjugate("punoj", { mood: "imperative", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** the engine SHALL throw an `UnsupportedCellError`
- **AND** the error message SHALL identify the offending cell as `1sg`

#### Scenario: MP imperative throws for verbs without an explicit override

- **WHEN** `conjugate("punoj", { mood: "imperative", voice: "middle-passive", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** the engine SHALL throw an `UnsupportedCellError`
- **AND** the engine SHALL NOT return an active-voice form

#### Scenario: MP imperative for laj uses cellOverride

- **WHEN** `conjugate("laj", { mood: "imperative", voice: "middle-passive", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"lahu"`

- **WHEN** the same is called with `number: "plural"`
- **THEN** result.form SHALL equal `"lahuni"`

#### Scenario: MP imperative for shoh uses cellOverride

- **WHEN** `conjugate("shoh", { mood: "imperative", voice: "middle-passive", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"shihu"`

- **WHEN** the same is called with `number: "plural"`
- **THEN** result.form SHALL equal `"shihuni"`
