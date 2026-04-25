## ADDED Requirements

### Requirement: Frequency tier per corpus verb

`data/verbs/frequency.json` SHALL exist and contain an entry for every verb in the corpus. Each entry SHALL have a `tier` field with one of the values `"core"`, `"common"`, `"uncommon"`, `"rare"`. Optional fields: `udCount` (integer count from UD-Albanian treebanks when non-zero), `notes` (rationale).

#### Scenario: Every corpus verb has a tier

- **WHEN** the build pipeline reads `data/verbs/index.json`
- **AND** also reads `data/verbs/frequency.json`
- **THEN** every `id` in the index SHALL have a corresponding entry in frequency.json
- **AND** the tier SHALL be one of the four allowed values

### Requirement: Frequency loader

`apps/web/lib/frequency.ts` SHALL export `getFrequency(verbId)` returning the entry or `undefined`. The loader works in both Server and Client Components (the JSON ships in the bundle).

#### Scenario: getFrequency returns the tier for a known verb

- **WHEN** `getFrequency("punoj")` is invoked
- **THEN** the result SHALL have a defined `tier` field

### Requirement: Verb page surfaces the frequency badge

The verb page's reserved-actions row SHALL replace the v0.1.x disabled `Frequency: —` button with an enabled badge `Frequency: <tier>`. Hovering SHALL surface a tooltip explaining what the tier means.

#### Scenario: Frequency badge renders on /verb/jam

- **WHEN** the user visits `/verb/jam`
- **THEN** the rendered HTML SHALL contain text matching `Frequency: core` (jam is hand-tiered as core)

### Requirement: /browse adds a Frequency column

The `/browse` page's table SHALL include a sortable `Frequency` column displaying each verb's tier.

#### Scenario: Browse table has Frequency column

- **WHEN** the user requests `GET /browse`
- **THEN** the rendered HTML SHALL contain a column header `Frequency` (case-insensitive)

### Requirement: API JSON detail includes frequency

`GET /api/verbs/[lemma]` (default JSON format) SHALL include a `frequency` field on the response.

#### Scenario: API JSON includes frequency tier

- **WHEN** the user requests `GET /api/verbs/jam`
- **THEN** the JSON response SHALL contain `frequency.tier === "core"`
