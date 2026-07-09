## ADDED Requirements

### Requirement: Downloaded corpus sources are ledger-registered and auto-discovered

A corpus source SHALL be usable by the indexer once its `resources.json`
entry has `status: "downloaded"`, a `localPath`, and a `format` recognized
by `source_kind`. Parquet-shard web corpora (CulturaX, FineWeb2, and the
hf-* sources) SHALL be read through the shared `ParquetDir` reader without
per-source code beyond the `source_kind` registration.

#### Scenario: CulturaX Albanian is discovered after download

- **GIVEN** `culturax-sq` in `resources.json` has `status: "downloaded"`,
  a `localPath` to its parquet shards, and `format: "Parquet shards"`
- **WHEN** the indexer loads downloaded resources
- **THEN** it SHALL expand the shard directory into one partition per
  `.parquet` file and stream their text through the parquet reader

#### Scenario: Gated-not-downloaded sources are skipped

- **GIVEN** a `resources.json` entry with `status` other than
  `"downloaded"` (e.g. `gated-not-downloaded`)
- **WHEN** the indexer loads downloaded resources
- **THEN** that entry SHALL be skipped and SHALL NOT be scanned
