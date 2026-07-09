## ADDED Requirements

### Requirement: Voice-flag decisions are grounded in full-corpus evidence

Voice-flag changes SHALL cite full-corpus attestation counts, and `udhetoj`
SHALL carry no middle-passive restriction: its non-active paradigm
(*udhëtohet*, *udhëtohej*, *udhëtohesh*, …) conjugates mechanically like
`shkoj`'s. Verbs whose non-active surfaces are homograph-contaminated
(`rri` via `rrah`, `vij` via `vë`) SHALL keep their flags with the
contamination recorded as the rationale.

#### Scenario: udhëtohet conjugates across persons

- **WHEN** the indicative present middle-passive of `udhetoj` is conjugated
  for 3sg and 2sg
- **THEN** the surfaces SHALL be `udhëtohet` and `udhëtohesh`
- **AND** neither SHALL throw `UnsupportedCellError`

#### Scenario: Suppletive and mutating controls unaffected

- **GIVEN** the suppletive verb `them` and the mutating verb `pjek`
- **WHEN** their present middle-passive 3sg cells are conjugated
- **THEN** the surfaces SHALL remain `thuhet` and `piqet`

#### Scenario: rri remains flagged with rationale

- **WHEN** a middle-passive cell of `rri` is requested
- **THEN** the engine SHALL throw `UnsupportedCellError`
- **AND** the corpora README SHALL record the rrihet/rrah homograph
  contamination as the reason
