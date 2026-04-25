## ADDED Requirements

### Requirement: API JSON detail includes frequency

`GET /api/verbs/[lemma]` (default JSON format) SHALL include a `frequency` field whose shape matches the entries in `data/verbs/frequency.json`.

#### Scenario: API JSON includes frequency.tier

- **WHEN** the user requests `GET /api/verbs/punoj`
- **THEN** `body.frequency.tier` SHALL be one of `"core"`, `"common"`, `"uncommon"`, `"rare"`
