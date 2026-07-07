## ADDED Requirements

### Requirement: Negation particles follow standard Albanian per mood

`conjugate()` with `polarity: 'negative'` SHALL negate the optative with
`mos` prefixed to the form, and the subjunctive with `mos` placed
immediately after the particle `të` (including compound tenses), per
Newmark, Hubbard & Prifti (1982) and Husić (2002). Indicative, admirative,
and conditional SHALL keep `nuk` (colloquial `s'`), and the imperative SHALL
keep `mos`. Decomposition segments SHALL reflect the same particle order.

#### Scenario: Suppletive verb optative negative uses mos

- **GIVEN** verb `jam` (suppletive)
- **WHEN** `conjugate('jam', { mood: 'optative', tense: 'present', voice:
  'active', person: 1, number: 'singular', polarity: 'negative' })` runs
- **THEN** the surface SHALL be `mos qofsha`
- **AND** no negated optative SHALL ever surface with `nuk`

#### Scenario: Subjunctive negative places mos after të

- **GIVEN** verb `punoj`
- **WHEN** the subjunctive present 1sg negative is conjugated
- **THEN** the surface SHALL be `të mos punoj`
- **AND** the segments SHALL order the `të` particle before the `mos`
  particle

#### Scenario: Phonologically-mutating verb, middle-passive subjunctive negative

- **GIVEN** verb `djeg` (g → gj/dj mutations)
- **WHEN** the subjunctive present 3sg middle-passive negative is conjugated
- **THEN** the surface SHALL be `të mos digjet`

#### Scenario: Compound subjunctive tense keeps the insertion point

- **WHEN** `punoj` subjunctive perfect 1sg negative is conjugated
- **THEN** the surface SHALL be `të mos kem punuar`

#### Scenario: Other moods are unchanged

- **WHEN** the indicative present 1sg negative of `punoj` is conjugated
- **THEN** the surface SHALL remain `nuk punoj`
- **AND** the imperative 2sg negative SHALL remain `mos puno`
- **AND** the conditional present 1sg negative SHALL remain `nuk do të
  punoja`
