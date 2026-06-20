# Corpus Indexer

Rust tooling for the local corpus lab. It classifies downloaded Albanian corpus
candidates against generated foljapp target forms, writes retained examples, and
builds a small search index over those retained examples.

The heavy path is first-pass classification over raw or cached corpus
candidates. Interactive search over retained examples is separate and much
smaller.

## Inputs

- `.cache/corpus-targets.json`: generated target rows from
  `npm run build:corpus-targets`.
- `data/corpora/resources.json`: corpus resource ledger.
- `.cache/datasets/**`: downloaded raw corpora.
- `.cache/corpus-candidate-shards/v1`: optional legacy parsed candidate cache
  with v1 full-row JSONL shards.
- `.cache/corpus-candidate-shards/split-20260620`: current full split parsed
  candidate cache with normalized, metadata, and token-inventory shards.

## Outputs

- `.cache/corpus-local-full.sqlite`: retained sentence examples and occurrence
  metadata.
- `.cache/corpus-candidate-shards/split-20260620`: parsed split candidate cache
  for reruns and missing-form traces.
- `.cache/corpus-target-provenance.{json,md}`: raw trace evidence for selected
  missing targets.
- `.cache/corpus-search-tantivy`: phrase-search index over retained examples.

## Commands

```sh
npm run build:corpus-targets
npm run scan:local-corpus
npm run build:corpus-candidate-cache
npm run scan:local-corpus:cached
npm run report:corpus-raw-coverage
npm run report:corpus-phrase-variants
npm run report:corpus-phrase-variants:build-cache
npm run report:corpus-phrase-variants:all
npm run report:corpus-phrase-variants:all:build-cache
npm run trace:corpus-targets
npm run build:corpus-search-index
npm run search:corpus -- --query="të punoj"
npm run bench:corpus-search
```

Equivalent direct form:

```sh
CARGO_TARGET_DIR=.cache/cargo-target cargo run --release \
  --manifest-path tools/corpus-indexer/Cargo.toml -- match --sources=all
```

## Subcommands

- `match`: scan selected source partitions, retain quality-approved examples,
  and write the SQLite corpus DB.
- `build-candidate-cache`: parse raw resources once into zstd candidate shards
  for faster repeat scans. New builds write compact `.norm.zst` normalized-text
  shards plus `.rows.jsonl.zst` metadata shards. They also write exact
  `.target-hits.zst` sidecars for the generated target file, so no-hit traces can
  skip whole partitions without reading candidate rows.
- `trace-targets`: explain selected target IDs or forms by raw matches,
  rejected variants, quality rejection, and retained occurrences.
- `report-raw-coverage`: summarize exact raw target hits from
  `.target-hits.zst` sidecars and compare them with retained examples.
- `phrase-variant-stress`: test selected raw-zero multiword misses against
  clitic/order/contraction stress patterns using split-cache token inventories
  to skip partitions, then existing query-specific `.anchor-rows-*.jsonl.zst`
  sidecars to verify only rows containing selected lexical anchors. The default
  run keeps a ranked 200-target iteration slice; pass `--all-targets` for the
  full eligible raw-zero multiword set and `--build-anchor-rows` when cold
  sidecar creation is intended. Explicit `--forms` and `--target-ids` runs are
  not capped unless `--limit-targets` is also passed.
- `bench`: compare Aho-Corasick scanning, Tantivy, and SQLite FTS5 over retained
  examples.
- `build-search-index`: build the Tantivy index from retained SQLite examples.
- `search-index`: query the retained-example Tantivy index.

## Performance Notes

The current full local run scanned 1,317,991,933 candidates across 1,907
resource partitions. The scanner uses Aho-Corasick because this workload is
many known generated forms against a huge candidate stream. Tantivy is useful
after reduction, for interactive phrase search over retained examples; it is not
the replacement for first-pass classification.

Cached scans prefer split cache shards when present. If only older full-row
cache shards are fresh, the scanner falls back to them. The legacy
`.cache/corpus-candidate-shards/v1` cache has 1,907 v1 full-row shards. The
current full split cache lives at `.cache/corpus-candidate-shards/split-20260620`
and has 1,907 each of `.norm.zst`, `.rows.jsonl.zst`, `.tokens.zst`, and
`.target-hits.zst` files. It was built in a separate directory so the old v1
cache stayed usable:

```sh
CARGO_TARGET_DIR=.cache/cargo-target cargo run --release \
  --manifest-path tools/corpus-indexer/Cargo.toml -- build-candidate-cache \
  --sources=all --jobs=12 \
  --cache-dir=.cache/corpus-candidate-shards/split-20260620
```

Build result: 1,317,991,933 candidates from 1,907 partitions, 0 empty
normalized, 1,343.0 seconds, 89G on disk. An in-place `--refresh` under `v1`
writes split shards beside the old v1 shards; it does not delete the older
files.

Target-hit backfill result on the existing split cache: 1,317,991,933
candidates from 1,907 partitions, 0 empty normalized, 278.8 seconds. The 1,907
`.target-hits.zst` sidecars total 58.2 MiB.

Fresh split-cache builds also include `.tokens.zst` inventories and
`.target-hits.zst` sidecars. `trace-targets` first checks whether the selected
generated target IDs occurred in a partition during cache build. If a target-hit
sidecar is missing or older than `.cache/corpus-targets.json`, the trace falls
back to token inventories and then to scanning that partition. Running
`build-candidate-cache` against an existing fresh split cache backfills missing
target-hit sidecars from `.norm.zst` without reparsing raw sources.

Sanity trace with the full split cache:

```sh
CARGO_TARGET_DIR=.cache/cargo-target cargo run --release \
  --manifest-path tools/corpus-indexer/Cargo.toml -- trace-targets \
  --forms='mos të ledhatojë' --sources=all --jobs=12 \
  --candidate-cache-dir=.cache/corpus-candidate-shards/split-20260620 \
  --require-candidate-cache \
  --out-json=.cache/corpus-target-provenance.sanity-split-20260620.json \
  --out-md=.cache/corpus-target-provenance.sanity-split-20260620.md
```

Before exact target-hit inventories, that trace skipped 1,722 of 1,907
partitions by token inventory, scanned the remaining 185 partitions and
1,024,539,453 candidates, found no raw match for `mos të ledhatojë`, and
finished in 105,043 ms.

With exact target-hit inventories, the same trace skipped 1,907 of 1,907
partitions, scanned 0 candidates, found no raw or retained match, and reported a
5 ms trace duration.
