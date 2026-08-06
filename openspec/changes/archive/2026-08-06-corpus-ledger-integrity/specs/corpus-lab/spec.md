## ADDED Requirements

### Requirement: Raw corpus caches are checksum-verifiable

The repository SHALL track a `sha256` manifest
(`data/corpora/checksums.sha256`) covering every raw data file under the
cache root declared by `resources.json`, and SHALL provide
`npm run verify:corpus-checksums` to re-verify a local cache or a restored
backup against it. The manifest SHALL be tracked in git even though the
data it covers is not, so that a cache restored onto a fresh clone can be
validated without network access.

#### Scenario: An intact cache verifies clean

- **GIVEN** a raw dataset cache matching the tracked manifest
- **WHEN** `npm run verify:corpus-checksums` runs
- **THEN** it SHALL exit 0 and report the number of files verified

#### Scenario: A corrupted or truncated file is detected

- **GIVEN** a cached corpus file whose contents differ from its recorded
  digest — for example a parquet shard truncated by an interrupted copy to
  external media
- **WHEN** `npm run verify:corpus-checksums` runs
- **THEN** it SHALL exit non-zero and name the failing path

#### Scenario: A missing file is distinguished from a corrupt one

- **GIVEN** a manifest entry whose path is absent from the cache
- **WHEN** `npm run verify:corpus-checksums` runs
- **THEN** it SHALL exit non-zero and report that path as missing rather
  than as a digest mismatch

### Requirement: Downloaded sources carry complete provenance metadata

Every `resources.json` entry with `status: "downloaded"` SHALL carry
`license`, `provenanceGranularity`, `redistributionPolicy`, `localPath`,
`format`, and a recorded on-disk size. Where a publisher states no license,
the `license` field SHALL record that finding explicitly, with the date it
was verified, rather than being omitted — an absent field SHALL NOT be used
to mean "unlicensed".

#### Scenario: A source whose publisher states no license

- **GIVEN** a Hugging Face source whose dataset card specifies no license
- **WHEN** its ledger entry is written
- **THEN** `license` SHALL record that no license is published and the
  verification date, and `redistributionPolicy` SHALL forbid redistribution

#### Scenario: A source whose license could not be verified

- **GIVEN** a source whose license page could not be retrieved
- **WHEN** its ledger entry is written
- **THEN** `license` SHALL mark the terms unverified and cite the
  authoritative URL to check, distinctly from a confirmed absence

### Requirement: Candidate-cache defaults point at the current cache

Indexer subcommands that read or write a candidate cache SHALL default to
the current split candidate cache. No subcommand SHALL default to a
superseded cache directory, so that an ad-hoc invocation without the flag
cannot write partitions into a stale cache while leaving the live one
unrefreshed, nor scan stale candidates and report plausible but wrong
coverage.

#### Scenario: An ad-hoc cache build targets the current cache

- **GIVEN** `cargo run -- build-candidate-cache` invoked with no
  `--cache-dir`
- **WHEN** the builder resolves its output cache directory
- **THEN** it SHALL resolve to the current split cache, matching what
  `npm run build:corpus-candidate-cache` passes explicitly

#### Scenario: Reader defaults agree with the builder default

- **GIVEN** any subcommand taking `--candidate-cache-dir`
- **WHEN** its default value is resolved
- **THEN** it SHALL equal the `build-candidate-cache` default, so a build
  followed by a read with no flags operates on one cache
