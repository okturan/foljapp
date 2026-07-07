## ADDED Requirements

### Requirement: Corpus examples render without the live examples API

The playground's Examples panel SHALL fall back to precomputed per-verb
example assets (`/examples/<verbId>.json`) when the examples API is
unavailable (request fails) or reports the local database absent while
returning no local rows. The fallback SHALL preserve the panel's composition
rules: retained-corpus rows first — matching the requested target key, with
signature-restricted lookup tried before the key-wide fallback — followed by
OPUS parallel pairs, within the same total example cap as the API path.

#### Scenario: Deployed playground shows attested examples for a suppletive verb

- **GIVEN** the deployed site has no `/api/examples` route and `jam` has
  retained corpus examples in `/examples/jam.json`
- **WHEN** the user selects a `jam` cell whose target key has retained
  examples
- **THEN** the Examples panel SHALL render those sentences with their corpus
  provenance (source name, and link when a URL was retained)
- **AND** the panel SHALL indicate that prebuilt examples are being shown

#### Scenario: Phonologically-mutating verb falls back by target key

- **GIVEN** the static asset for `djeg` contains rows for target key
  `digjet` under a different signature than the one requested
- **WHEN** signature-restricted lookup finds no rows
- **THEN** the panel SHALL fall back to all rows for the target key, exactly
  as the API path does

#### Scenario: Dev with the local database is unchanged

- **GIVEN** a developer runs the site with `.cache/corpus-local-full.sqlite`
  present
- **WHEN** the Examples panel loads any form
- **THEN** results SHALL come from the live API and the static asset SHALL
  not be fetched

### Requirement: Per-verb example assets are generated from the retained corpus

`npm run build:static-examples` SHALL regenerate
`apps/web/public/examples/<verbId>.json` for every corpus verb plus an
`index.json` manifest, applying the same public-example quality filter as
the examples API, capping stored examples per target, and producing
deterministic output for a given database state. The assets SHALL be
committed so production builds require no local corpus artifacts.

#### Scenario: Regeneration is deterministic

- **WHEN** the generator runs twice against the same database with
  `--frozen-time`
- **THEN** the emitted files SHALL be byte-identical
