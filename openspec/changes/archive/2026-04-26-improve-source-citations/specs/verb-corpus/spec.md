## ADDED Requirements

### Requirement: Husić cache citations are complete

For every corpus verb whose `id` matches a Husić paradigm cache file at `.cache/husic/<id>.jsonl`, the verb's `sources` field SHALL include at least one entry with `source: 'husic'`. The corresponding `reference` SHALL be either a hand-curated paradigm-model citation (e.g., `"1A"`, `"Auxiliary 2"`) or the parsed-cache canonical form `Husić 2002 — parsed cache (.cache/husic/<id>.jsonl)`.

This invariant is enforced by a unit test (`apps/web/lib/corpus-husic-citations.test.ts`) that fails the build if a corpus verb has a cache file but no `husic` citation, or vice versa.

#### Scenario: A corpus verb with a cache file cites Husić

- **GIVEN** a corpus verb with `id` `bashkoj` and a file at `.cache/husic/bashkoj.jsonl`
- **WHEN** the verb's JSON is loaded
- **THEN** `bashkoj.sources` SHALL include an entry with `source: 'husic'`
- **AND** that entry's `reference` SHALL match either a paradigm-model citation OR the canonical parsed-cache form

#### Scenario: A corpus verb without a cache file is unaffected

- **GIVEN** a corpus verb with `id` `fejoj` and no file at `.cache/husic/fejoj.jsonl`
- **WHEN** the verb's JSON is loaded
- **THEN** the absence of a `husic` citation SHALL NOT cause a build error
