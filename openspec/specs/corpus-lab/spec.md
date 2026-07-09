# corpus-lab Specification

## Purpose
TBD - created by archiving change phrase-variant-stress-throughput. Update Purpose after archive.
## Requirements
### Requirement: Phrase-variant stress reports are parity-checkable

The repository SHALL provide an automated diff
(`npm run report:corpus-phrase-variants:diff <baseline> <candidate>`) that
compares two phrase-variant stress report JSONs on all output-invariant
content — summary counts, pattern kind counts, per-target and per-pattern raw
matches, per-resource candidate counts, and samples as a sorted multiset —
while ignoring timing fields, and exits non-zero on any difference.

#### Scenario: Identical reports pass

- **GIVEN** two runs of the same binary over the same cache and audit
- **WHEN** the diff script compares their JSON outputs
- **THEN** it SHALL exit 0 and report the compared target and sample counts

#### Scenario: Diverging match counts fail

- **GIVEN** a candidate report where any target's `raw_matches` differs from
  the baseline — for example the suppletive-verb target
  `jam:optative.perfect…:qofshi_bekuar` or a phonologically-mutating verb's
  target such as one for `djeg`
- **WHEN** the diff script compares the reports
- **THEN** it SHALL exit 1 and name the diverging target

### Requirement: Scan output is independent of partition scheduling

The phrase-variant stress scan SHALL produce identical report content (per
the parity diff) regardless of the order in which partitions are scheduled
onto worker threads. Sample selection SHALL be capped per pattern per
partition so that reordering partitions cannot change which samples are
collected.

#### Scenario: Longest-first ordering matches directory ordering

- **GIVEN** the same binary run twice over the same cache, once with the
  work deque in directory order and once sorted longest-first
- **WHEN** the two report JSONs are diffed
- **THEN** the parity diff SHALL exit 0

### Requirement: Refuted optimizations are recorded with measurements

`tools/corpus-indexer/README.md` SHALL record optimization ideas that were
tried or analyzed and refuted, each with the measurement that refuted it, so
they are not re-attempted. At minimum: dropping the anchor prefilter,
co-token guards, bigram resource filters, and forced automaton kinds.

#### Scenario: A refuted idea is documented

- **WHEN** a reader consults the corpus-indexer README's architecture
  decisions section
- **THEN** each listed refuted idea SHALL include the benchmark artifact or
  measured timing that refuted it

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

