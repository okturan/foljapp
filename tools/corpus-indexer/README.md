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
npm run report:corpus-phrase-variants:plan
npm run report:corpus-phrase-variants:build-cache
npm run report:corpus-phrase-variants:all
npm run report:corpus-phrase-variants:all:plan
npm run report:corpus-phrase-variants:all:build-cache
npm run report:corpus-phrase-variants:all:chunk
npm run report:corpus-phrase-variants:all:chunk:plan
npm run report:corpus-phrase-variants:all:chunk:build-cache
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
  run keeps a ranked 200-target iteration slice; use
  `npm run report:corpus-phrase-variants:all` for the full eligible raw-zero
  multiword set. Explicit `--forms` and `--target-ids` runs are not capped
  unless `--limit-targets` is also passed. Pass `--plan-only` to inventory
  selection and anchor-row cache readiness without scanning candidate rows. Use
  `--build-anchor-rows` only when cold sidecar creation is intended. Use
  `--chunk-size-targets` with `--chunk-index` only when an interrupted/debug run
  needs smaller report files; the full single-pass run avoids rescanning the
  corpus for every chunk.
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

Full phrase-variant stress over every eligible raw-zero multiword target should
use the single-pass all-target report:

```sh
npm run report:corpus-phrase-variants:all
```

Measured on the full split cache (Apple M5, 10 cores, 12 jobs), the
single-pass all-target run selects 38,169 targets, generates 1,072,356 stress
patterns over 9,115 anchors, scans 1,317,987,563 candidates, and finds 83,161
raw variant matches. The b6b001e binary recorded 294.0s wall for this
workload; after longest-first partition scheduling, parallel setup, sparse
per-partition counters, and the masked anchor prefilter, the same workload
measured 212.9s (quiet machine; 267.8s in a warmer session), the plan-only
setup pass dropped from 17.0s to 5.1s, summed per-partition scan time
dropped from 2,343.7s to 2,227.1s core-seconds, and chunk-018 peak RSS
dropped from 391MB to 305MB.

Wall times here have a large noise floor: the 89G cache exceeds RAM and
sustained all-core load thermally degrades the machine (identical workloads
have measured 294.0s vs 393.4s sixteen minutes apart, and 267.8s vs 522.5s
within one session). Never trust a single-run delta; interleave
baseline/candidate runs and compare medians and user-CPU. The noise-robust
scheduling metric is the parallel-efficiency ratio
`sum(resource_stats[].duration_ms) / summary.duration_ms` inside the report
itself: directory-ordered scheduling sits near 8.0x, longest-first
scheduling at 10.5–10.8x against the 12-thread ceiling, regardless of
thermal state.

Verify any matcher or scheduler change with the parity diff before trusting
its numbers:

```sh
npm run report:corpus-phrase-variants:diff -- \
  .cache/corpus-phrase-variant-stress.all.baseline-b6b001e.json \
  .cache/corpus-phrase-variant-stress.all.json
```

The older 20-chunk aggregate found the same 83,161 matches, but its summed
chunk duration was 7,590.7s because it rescanned the corpus for every chunk.
Chunking is still useful for interrupted/debug runs, but it is not the fast
path. The chunk script uses 2,000 ranked targets per chunk:

```sh
npm run report:corpus-phrase-variants:all:chunk:plan -- \
  --chunk-index=0 \
  --out-json=.cache/corpus-phrase-variant-stress.chunk-000.plan.json \
  --out-md=.cache/corpus-phrase-variant-stress.chunk-000.plan.md
npm run report:corpus-phrase-variants:all:chunk:build-cache -- \
  --chunk-index=0 \
  --out-json=.cache/corpus-phrase-variant-stress.chunk-000.json \
  --out-md=.cache/corpus-phrase-variant-stress.chunk-000.md
npm run report:corpus-phrase-variants:all:chunk -- \
  --chunk-index=0 \
  --out-json=.cache/corpus-phrase-variant-stress.chunk-000.json \
  --out-md=.cache/corpus-phrase-variant-stress.chunk-000.md
```

Pass explicit `--out-json` and `--out-md` paths when keeping more than one chunk
report from the same run series.
Aggregate completed non-plan chunk reports with:

```sh
npm run report:corpus-phrase-variants:aggregate
```

The aggregate reports completed and missing chunks. Its candidate and partition
counts are chunk-summed operational metrics, not unique corpus totals.

Measured chunk-0 baseline on the full split cache: the plan selected 2,000 of
38,169 eligible targets, generated 59,460 stress patterns over 2,387 anchors,
skipped 1,686 partitions by token inventory, and needed 221 anchor-row sidecars.
The cold `--build-anchor-rows` run materialized those 221 sidecars, covered
1,106,185,613 source candidates behind them, checked 1,553 anchor rows, found 0
raw variant hits, and took 284.3s. The immediate warm rerun used the sidecars,
checked the same 1,553 anchor rows, found the same 0 hits, and took 17.9s.

## Architecture decisions: refuted phrase-variant optimizations

These were implemented or prototyped, measured, and rejected. Do not
re-attempt them without new evidence; every one produced identical output
(parity-verified), so the numbers below are pure performance. Benchmark
chunks: chunk-018 (154 common anchors, 29,479 patterns, prefilter fallback
path) and chunk-019 (37 anchors, 2,564 patterns, ≤64-anchor automaton path);
chunk-018 baseline 268.6s, chunk-019 baseline 249.2s.

- **Dropping the anchor prefilter** (run the pattern automaton on every row):
  chunk-018 331.0s vs 268.6s — 23% slower. The tokenize+hash prefilter is
  cheaper than walking the pattern automaton over non-anchor rows
  (`chunk-018.no-double-anchor` artifact). The full-scale single-pass variant
  measured 393.4s vs 294.0s (`all.single-pass` artifact).
- **Anchor + co-token guard** before the pattern automaton: chunk-018 276.6s
  — a wash; clitic co-tokens (e, i, më, u, …) are ubiquitous so the second
  token filters almost nothing (`chunk-018.cotoken`).
- **Bigram resource filters** (skip partitions lacking any pattern bigram):
  chunk-019 247.5s vs 249.2s (wash) as a resource filter, 273.4s (regression)
  as a per-row filter, and the sidecar family costs ~29G
  (`chunk-019.bigram-filter`, `chunk-019.row-anchor-bigram`).
- **Forcing contiguous-NFA automaton kinds**: non-monotonic across scales —
  253.6s on chunk-018 (win) but 336.1s on chunk-019 (big loss)
  (`chunk-01?.contiguous-nfa`). Let aho-corasick pick.
- **Per-anchor bucketed matcher** (group the ~1M unique patterns by anchor,
  run only the small automata whose anchor token appears in the row): wins
  where anchors are rare (chunk-019: 154.8s vs 213.2s) but loses where they
  are common — chunk-018 user-CPU 1604–1634s vs 1375–1525s, and the full
  9,115-anchor run lost decisively: 477.3s wall / 2,660s user-CPU / 1.68GB
  RSS vs 267.8s / 1,792s / 1.07GB. Rows containing several anchors trigger
  several full-row bucket scans where one big automaton amortizes a single
  walk, and ~9k small automata add ~600MB. Reverted in the
  `phrase-variant-stress-throughput` change after full parity verification.
- **Phrase-occurrence postings index** (SQLite/Tantivy) and **superset-keyed
  warm sidecar reworks**: analyzed, not built. Both trade a build comparable
  to the 1,343s cache build plus tens of GB for speedups that corpus growth
  or any audit change invalidates. Revisit only if the stress report becomes
  a routine gate run repeatedly against one frozen corpus+audit snapshot.

What DID work (same change, all parity-verified): longest-first (LPT)
partition scheduling keyed on cached `candidates_seen`
(parallel-efficiency 8.0x → 10.5–10.8x), parallelizing the two setup passes
over token inventories (plan-only 17.0s → 5.1s), sparse per-partition match
counters (chunk-018 RSS 391MB → 305MB), and a first-byte/length-masked
`FxHashSet` anchor prefilter over `split(' ')` tokens (exact under the
`normalized_text_v1` single-space invariant).
