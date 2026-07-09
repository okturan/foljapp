## ADDED Requirements

### Requirement: Mutated middle-passive stems are sourced cellOverrides

Mutated middle-passive stems SHALL be carried as sourced `cellOverrides`
when the engine cannot derive them from the principal parts, each verb
citing a source for the paradigm. `flas` SHALL use the **flit-** stem
(*flitem, flitet, flitej, …*) and `tërheq` the **tërhiq-** stem
(*tërhiqem, tërhiqet, tërhiqej, …*) for middle-passive present and
imperfect, per Newmark, Hubbard & Prifti (1982) and FGJSH.

#### Scenario: flas middle-passive present uses the flit- stem

- **WHEN** `conjugate('flas', { mood: 'indicative', tense: 'present',
  voice: 'middle-passive', person: 3, number: 'singular' })` runs
- **THEN** the surface SHALL be `flitet`, never \*`flaset`
- **AND** the subjunctive present MP SHALL derive as `të flitet`

#### Scenario: tërheq middle-passive imperfect uses the tërhiq- stem

- **WHEN** the indicative imperfect middle-passive 3sg of `tërheq` is
  conjugated
- **THEN** the surface SHALL be `tërhiqej`, never \*`tërheqej`

#### Scenario: aorist middle-passive is unchanged

- **WHEN** the indicative aorist middle-passive 3sg of `flas` and `tërheq`
  are conjugated
- **THEN** the surfaces SHALL remain `u fol` and `u tërhoq`

#### Scenario: suppletive and mutating controls are unaffected

- **GIVEN** the suppletive verb `them` and the phonologically-mutating verb
  `djeg`
- **WHEN** their indicative present middle-passive 3sg cells are conjugated
- **THEN** the surfaces SHALL remain `thuhet` and `digjet`
