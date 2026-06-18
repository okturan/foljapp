# Corpus Search Benchmark

This benchmark compares corpus-search candidates on one repeatable local sample.
Generated benchmark artifacts live in `.cache/benchmarks/corpus-search/` and are
not committed.

The candidate set is fit-based: phrase/full-text search engines were benchmarked,
and stores without native phrase/full-text search semantics were rejected before
implementation. This keeps key-value stores and generic embedded databases from
being mistaken for corpus-search engines.

## Current Sample

- Source DB: `.cache/corpus-local-full.sqlite`
- Sentences: 100,000 normalized stored example sentences
- Queries: 200 generated foljapp target phrases with existing hits
- Command:

```bash
npm run bench:corpus-search -- --sample-size=100000 --query-limit=200
```

That command reruns the local embedded contenders. Docker service probes are
recorded in the table below because they require separate service startup/import
steps.

## Result

| Engine | Status | Index time | Query time | Hits | Index size | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Rust Aho-Corasick batch | measured | 0 ms | 73 ms | 13,118 | 0 | Keep for full corpus coverage scans |
| Tantivy | measured | 874 ms | 16 ms | 13,118 | 12.0 MB | Current winner for indexed phrase lookup |
| SQLite FTS5 | measured | 371 ms | 55 ms | 13,118 | 26.9 MB | Keep only for compact app DB, not corpus search |
| PostgreSQL FTS | measured | 1,380 ms | 160 ms | 13,118 | 86.1 MB | Slower and larger than Tantivy |
| ClickHouse text index | measured | 370 ms | 890 ms | 13,118 | 14.9 MB | Useful analytics store, not phrase-lookup winner |
| Quickwit | measured | 1,510 ms | 223 ms | 13,118 | 12.9 MB | Exact, but service layer is slower than embedded Tantivy |
| Solr | measured | 2,850 ms | 431 ms | 13,118 | not captured | Exact but slower and operationally heavier |
| DuckDB FTS | measured | 27,802 ms | 2,986 ms | 10,760,867 | 20.2 MB | Disqualified: BM25 term semantics overcount |
| Meilisearch | measured | 6,269 ms | 166 ms | 182,169 | not captured | Disqualified: search-UX semantics overcount |
| Typesense | measured | 2,000 ms | 265 ms | 18,346 | not captured | Disqualified: token search is not exact phrase-equivalent |
| ripgrep fixed strings | measured | 17 ms | 51 ms | 143,815 | 15.3 MB | Disqualified: substring semantics overcount |
| OpenSearch / Elasticsearch family | failed local probe | n/a | n/a | n/a | n/a | Did not become HTTP-reachable in Docker probe; Solr covers Lucene-service baseline |
| RocksDB / LMDB | not benchmarked | n/a | n/a | n/a | n/a | Disqualified as direct candidates: not full-text engines |

## Decision

Use a split architecture:

1. Rust Aho-Corasick remains the production path for full generated-form
   coverage scans over raw corpora.
2. Tantivy is the current winner for local indexed phrase search over a stored
   sentence corpus.
3. SQLite remains only the compact app-facing examples database.

For local foljapp work, embedded Tantivy wins indexed phrase lookup. Quickwit may
be reconsidered only if we later need a distributed/object-storage search service.

Production corpus-search paths retained in this repo:

- `npm run scan:local-corpus` for raw-corpus coverage/example extraction.
- `npm run build:corpus-search-index` for the Tantivy phrase-search index.
- `npm run search:corpus -- --query="..."` for local exact phrase lookup.

The other engines are killed as production candidates here. They remain only as
benchmark evidence in this document.

## First-Pass Classification Check

The initial task is not interactive lookup; it is classifying raw corpus
sentences against the generated foljapp target set. On the current local target
file, the engine emits 108,764 grammar-specific targets and 97,488 unique
surface phrases.

For that shape, the one-pass Rust matcher remains better than Tantivy. A larger
sample using 100,000 stored sentences and all 45,615 hit-bearing surface phrases
from the current examples DB produced:

| Engine | Index time | Query / scan time | Hits | Decision |
| --- | ---: | ---: | ---: | --- |
| Rust Aho-Corasick batch | 21 ms | 247 ms | 550,208 | Keep for first-pass classification |
| Tantivy | 883 ms | 1,329 ms | 550,208 | Keep for interactive lookup, not classification |
| SQLite FTS5 | 385 ms | 5,673 ms | 550,208 | Not a classifier |
| ripgrep fixed strings | 22 ms | 179 ms | 727,709 | Disqualified: substring overcount |

Tantivy is therefore not the initial classifier. It is the retained-sentence
phrase-search index after the Rust scanner has already decided which corpus
sentences matter for foljapp targets.
