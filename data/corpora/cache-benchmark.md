# Candidate Cache Benchmark

Local benchmark artifacts live in `.cache/` and are not committed. This file
records the current evidence for the parsed candidate-cache formats used by the
Rust corpus indexer.

## Leipzig Split-Cache Check

Sample:

- Source: `leipzig-sqi`
- Partitions: 23
- Candidates: 8,521,673
- Target set: `.cache/sherlock-trace-target-ids.priority-1000.txt`
- Command shape: `trace-targets --sources=leipzig-sqi --jobs=12`

| Cache | Internal duration | Wall time | User CPU | Output |
| --- | ---: | ---: | ---: | --- |
| v1 full JSON rows | 6,052 ms | 6.85 s | 13.18 s | baseline |
| v2 split normalized/metadata rows | 3,648 ms | 4.42 s | 6.76 s | same normalized trace JSON |
| v2 split rows + trace anchor prefilter | 3,075 ms | 3.77 s | 7.18 s | same zero-match totals |
| v2 split rows + token inventory skip | 25 ms | 1.01 s | 0.49 s | 23/23 partitions skipped; same zero-match totals |

The v2 trace was 39.7% faster by internal duration, 35.5% faster by wall time,
and 48.7% lower by user CPU. The normalized JSON outputs matched after removing
timestamps, duration, cache path, and source DB path.

With the trace-only anchor prefilter, the same raw-zero trace is 49.2% faster
than v1 by internal duration and 45.0% faster by wall time. The prefilter is
kept out of the full match scanner because a hit-heavy Leipzig match benchmark
showed no reliable benefit from paying the extra token scan on every candidate.

With split-cache token inventories, the same raw-zero trace can skip all Leipzig
partitions before reading candidate rows. This is 99.6% faster than v1 by
internal duration and 85.3% faster by wall time for this selected-target trace.
The wall time still includes CLI startup, target loading, cache metadata checks,
and writing the trace report.

The same source does not show a meaningful speedup for hit-heavy matching:

| Workload | v1 | v2 | Output |
| --- | ---: | ---: | --- |
| `match --jobs=1` | 19.61 s wall | 19.36 s wall | 52,384 sentences / 72,072 occurrences |
| `match --jobs=12` | 13.31 s wall | 13.26 s wall | 72,072 occurrences; sentence retention differs by parallel cap ordering |

Disk tradeoff on the same source:

| Cache | Size |
| --- | ---: |
| v1 full-row shards | 516 MiB |
| v2 split shards | about 731 MiB logical file total / 755M by `du` |
| v2 split shards plus token inventories | 768M by `du`; token inventories are 12M |

## Decision

The split cache is useful for missing-form forensics because raw-zero and
low-hit traces scan normalized text without deserializing full sentence
metadata. It is not a universal match-scan accelerator and is larger on disk for
Leipzig.

The token inventory check is exact for trace pruning because it only skips a
partition when none of the selected target anchor tokens occur in that
partition's normalized token inventory. If an inventory is missing, stale, or
v1-only, trace falls back to scanning the partition.
