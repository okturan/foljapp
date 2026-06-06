## ADDED Requirements

### Requirement: Middle-passive simple-tense cells respect cellOverrides keyed by voice

When the engine builds a middle-passive simple-tense cell — `indicative.present`, `indicative.imperfect`, and any compound that reuses these inner cells (subjunctive present/imperfect, conditional present) — and the verb entry defines `cellOverrides[<inner-key>]['<cellLabel>']` where `<inner-key>` is `'indicative.present.middle-passive'` or `'indicative.imperfect.middle-passive'`, that override value SHALL be the surface form returned for the inner cell. The decomposition SHALL contain a single `stem` segment with the override surface.

Override values are full surface forms (matching the existing convention used by `buildSimpleCell`'s active override path, the imperative MP override path, and the orchestrator-level override path).

If no MP override is present, the engine SHALL fall through to the paradigm-table dispatch as before.

#### Scenario: Class 2B mutation verb with MP present override

- **GIVEN** verb `djeg` with `cellOverrides['indicative.present.middle-passive']['1sg'] = 'digjem'`
- **WHEN** `conjugate('djeg', { mood: 'indicative', tense: 'present', voice: 'middle-passive', person: 1, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** result.form SHALL equal `'digjem'`
- **AND** the decomposition SHALL contain exactly one segment with `surface: 'digjem'` and `role: 'stem'`

#### Scenario: MP imperfect override cascades to subjunctive imperfect MP

- **GIVEN** verb `marr` with `cellOverrides['indicative.imperfect.middle-passive']['1sg'] = 'merresha'`
- **WHEN** `conjugate('marr', { mood: 'subjunctive', tense: 'imperfect', voice: 'middle-passive', person: 1, number: 'singular', ... })` is invoked
- **THEN** result.form SHALL equal `'të merresha'` (the orchestrator prepends the `të` particle)

#### Scenario: MP override does NOT bleed into active

- **GIVEN** verb `djeg` with both `cellOverrides['indicative.present']['2pl'] = 'digjni'` (active) and `cellOverrides['indicative.present.middle-passive']['2pl'] = 'digjeni'` (MP)
- **WHEN** active 2pl is requested
- **THEN** result.form SHALL equal `'digjni'`
- **WHEN** MP 2pl is requested
- **THEN** result.form SHALL equal `'digjeni'`

#### Scenario: No MP override falls through to paradigm

- **GIVEN** verb `lexoj` with no `indicative.present.middle-passive` override
- **WHEN** MP indicative present 1sg is requested
- **THEN** result.form SHALL equal `'lexohem'` (the class-1 paradigm default)
