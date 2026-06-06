## ADDED Requirements

### Requirement: Verbs flagged noMiddlePassive have no middle-passive voice

When `entry.flags?.noMiddlePassive === true`, the engine SHALL refuse to produce middle-passive cells for that verb. `conjugate()` SHALL raise `UnsupportedCellError` for any request with `voice: 'middle-passive'` regardless of mood, tense, person, or number. `table()` SHALL leave middle-passive cells as `undefined` for the affected verb.

The flag is per-verb explicit lexical knowledge, not derived from class or transitivity heuristics. Setting it asserts the verb has no MP voice in standard Albanian.

#### Scenario: jam MP request throws

- **GIVEN** verb `jam` has `flags.noMiddlePassive: true`
- **WHEN** `conjugate('jam', { mood: 'indicative', tense: 'present', voice: 'middle-passive', person: 1, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** the engine SHALL throw `UnsupportedCellError`
- **AND** the error message SHALL identify the cell and reference the flag

#### Scenario: table() leaves MP cells undefined for flagged verb

- **GIVEN** verb `iki` has `flags.noMiddlePassive: true`
- **WHEN** `table('iki').indicative.present['1sg.middle-passive']` is read
- **THEN** the value SHALL be `undefined`

#### Scenario: flag wins over MP cellOverrides

- **GIVEN** verb `vij` has `flags.noMiddlePassive: true` AND a hypothetical `cellOverrides['indicative.present.middle-passive']['1sg'] = 'XYZ'`
- **WHEN** the MP cell is requested
- **THEN** the engine SHALL throw `UnsupportedCellError` (the flag takes precedence over override lookups)

#### Scenario: Active voice unaffected

- **GIVEN** verb `jam` has `flags.noMiddlePassive: true`
- **WHEN** `conjugate('jam', { mood: 'indicative', tense: 'present', voice: 'active', person: 1, number: 'singular', ... })` is invoked
- **THEN** result.form SHALL equal `'jam'` (the standard active form)

#### Scenario: Verbs without the flag retain MP behavior

- **GIVEN** verb `lexoj` has no `noMiddlePassive` flag (or it is `false`)
- **WHEN** any MP cell is requested
- **THEN** the engine SHALL produce the form per the existing MP paradigm dispatch
