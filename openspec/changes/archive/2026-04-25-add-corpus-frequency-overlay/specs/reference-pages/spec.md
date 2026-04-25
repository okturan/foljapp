## ADDED Requirements

### Requirement: Frequency placeholder is enabled with tier data

The verb-page reserved-actions row SHALL replace the disabled `Frequency: —` placeholder with an enabled badge displaying `Frequency: <tier>` where tier is one of `core`, `common`, `uncommon`, `rare`. The tier value comes from `data/verbs/frequency.json`.

#### Scenario: jam is core, djeg is rare or uncommon

- **WHEN** the user visits `/verb/jam`
- **THEN** the page SHALL contain `Frequency: core`
- **WHEN** the user visits `/verb/djeg`
- **THEN** the page SHALL contain `Frequency:` followed by one of `uncommon` or `rare`
