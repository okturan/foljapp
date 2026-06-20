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
- `.cache/corpus-candidate-shards/v1`: optional parsed candidate cache. Current
  builds use split normalized/metadata shards; older full-row shards are still
  readable.

## Outputs

- `.cache/corpus-local-full.sqlite`: retained sentence examples and occurrence
  metadata.
- `.cache/corpus-candidate-shards/v1`: parsed candidate cache for reruns.
- `.cache/corpus-target-provenance.{json,md}`: raw trace evidence for selected
  missing targets.
- `.cache/corpus-search-tantivy`: phrase-search index over retained examples.

## Commands

```sh
npm run build:corpus-targets
npm run scan:local-corpus
npm run build:corpus-candidate-cache
npm run scan:local-corpus:cached
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
  shards plus `.rows.jsonl.zst` metadata shards, so no-hit candidates avoid
  full metadata deserialization during cached scans.
- `trace-targets`: explain selected target IDs or forms by raw matches,
  rejected variants, quality rejection, and retained occurrences.
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
cache shards are fresh, the scanner falls back to them. Rebuild with
`npm run build:corpus-candidate-cache -- --refresh` to get the split format for
the selected sources.
