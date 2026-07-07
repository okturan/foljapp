## Context

The phrase-variant stress scan is a two-stage per-row pipeline executed by 12
worker threads over 1,751 partitions (89 GB zstd split cache):

```
.norm.zst row ──► anchor prefilter ──► 1M-pattern Aho-Corasick ──► counters
   1.318 B          passes 264 M           83,161 raw matches        + samples
```

The full run's 9,115 anchors exceed the ≤64 gate on the anchor automaton, so
the prefilter is `split_whitespace` + `HashSet::contains` per token. Setup
(audit parse, two full token-inventory passes, pattern build, automaton
build) is serial, ~17 s. Workers pull whole partitions from a shared
`Mutex<VecDeque>` in directory order.

Recorded per-partition durations from the canonical run
(`.cache/corpus-phrase-variant-stress.all.baseline-b6b001e.json`) simulate to
a 307.5 s makespan in as-listed order vs 195.3 s under longest-first
ordering: the tail of the run strands workers behind a few giant partitions
(largest: 28.2 M rows, 171.8 s).

## Goals / Non-Goals

Goals: reduce full-run wall time with zero output drift; make parity checking
automated; record refuted ideas so they stay refuted.

Non-goals: pattern semantics, index architectures, sidecar/warm-path rework,
metric semantics (see proposal).

## Decisions

### D1. Keep the two-stage scan; optimize in risk order

The prior sessions measured the alternatives and they lost: dropping the
anchor prefilter ran 23 % slower (chunk-018.no-double-anchor 331.0 s vs
268.6 s); a co-token guard was a wash (276.6 s — clitic co-tokens are
ubiquitous); bigram resource filters were a wash or regression (chunk-019
247.5 s / 273.4 s) with ~29 GB of sidecars; forcing contiguous-NFA automaton
kinds was non-monotonic across scales (253.6 s chunk-018, 336.1 s chunk-019).
The remaining verified wins are scheduling, setup parallelism, counter
sparsity, and prefilter micro-cost — none touch match semantics.

### D2. LPT scheduling keyed on cached `candidates_seen`

`CacheMeta.candidates_seen` is already stored per partition and is a ~linear
duration proxy (~6 ms/1k candidates on large partitions). Sorting the deque
descending cannot change results: matches are additive across partitions,
sample caps are per-partition, and the report sorts `resource_stats` and
`samples` before writing. Worst case (proxy wrong) the shared deque
self-balances and the sort is neutral.

### D3. Sparse per-partition counters, dense global merge

Only ~83k matches exist across 1.86 T (partition × pattern) counter slots.
Per-partition `HashMap<usize, u32>` eliminates 1,751 × ~17 MB zeroed
allocations and shrinks mpsc payloads from ~8.6 MB to bytes; the collector
keeps the single global dense `Vec` so report building is unchanged.

### D4. Prefilter: `split(' ')` + length mask + FxHashSet

`normalized_text` (versioned `normalized_text_v1`, enforced by the cache
freshness check) emits lowercase tokens joined by single ASCII spaces with no
edge whitespace, so `split(' ')` is exactly equivalent to `split_whitespace`
on cache rows and skips its Unicode-whitespace scan. A `u64` bitmask of
anchor byte-lengths (bit `min(len, 63)`) skips the hash for the short
function words that dominate row tokens. `rustc-hash`'s `FxHashSet` replaces
SipHash for the membership test; the sidecar key (`anchor_set_hash`) hashes a
sorted list and is unaffected. An equivalence unit test pins the refactor to
a naive `split_whitespace` + `contains` oracle, including multibyte (ë/ç)
anchors and a >63-byte-token clamp case.

### D5. Per-anchor bucketed matcher is gated, not assumed — OUTCOME: refuted, reverted

Implemented, parity-verified at every scale, and rejected on measurement:
chunk-019 (37 anchors) won (154.8s vs 213.2s), but chunk-018 (154 anchors)
lost on user-CPU (1604–1634s vs 1375–1525s) and the canonical full run
(9,115 anchors) lost decisively — 477.3s wall / 2,660s user / 1.68GB RSS vs
267.8s / 1,792s / 1.07GB. Root cause: common anchors make rows trigger
several full-row bucket scans where the single big automaton amortizes one
walk, and ~9k small automata add ~600MB of per-automaton overhead. The
reference-matcher parity test also caught a char-boundary panic in the
single-pattern overlap scan before it ever touched corpus data. The original
gating rationale below is kept for the record.

Grouping the ~1M unique pattern strings by their anchor
(`anchor_for_stress_pattern` is a pure function of the token list, so each
unique pattern string has exactly one anchor) allows running only the small
automata whose anchor token appears in the row, instead of walking the
1M-pattern noncontiguous NFA over every anchor row. This is the only lever
that reduces per-partition scan cost itself — and therefore the ~172 s
largest-partition floor — but matcher experiments have historically inverted
between anchor scales. Ship gates: (1) reference-matcher unit test asserting
identical (pattern → count) multisets against a straight port of the current
matcher on adversarial synthetic inputs; (2) RSS and automaton build time
measured at chunk-018; (3) interleaved A/B wins at BOTH chunk-018 (154
anchors) and chunk-019 (37 anchors); (4) full-run parity. Any gate fails →
revert the stage; the other stages stand alone.

### D6. Benchmark protocol acknowledges the noise floor

The 89 GB cache exceeds RAM (24 GB); identical workloads measured 393.4 s and
294.0 s sixteen minutes apart. No single-run delta counts. Protocol:
interleave baseline/new runs back-to-back (B,N,B,N,B,N) under
`/usr/bin/time -l`, compare medians, and prefer user-CPU (page-cache
insensitive) as primary evidence for CPU-side stages. Scheduling gains are
verified with a noise-robust in-report metric instead: the
parallel-efficiency ratio `sum(resource_stats[].duration_ms) /
summary.duration_ms` must rise from ~8.0 toward the 12-thread ceiling.

## Data shape

The parity diff consumes the existing report JSON (no schema change):

```
{ summary: {…counts, duration_ms},          ← compared minus duration_ms
  pattern_kind_counts: [{key, patterns, raw_matches}],
  targets: [{id, matched, raw_matches, patterns: [{kind, pattern, raw_matches}]}],
  resource_stats: [{resource_id, used_anchor_rows, *_seen, duration_ms}],
                                            ← counts compared, durations ignored
  samples: [{target_id, kind, pattern, resource_id, doc_id, …}] ← sorted multiset }
```

## Tradeoffs

- **LPT needs a fresh meta read per partition at setup** — negligible (the
  setup passes already stream every partition's inventory) but adds one more
  reason setup must stay parallel.
- **Sparse counters trade per-match HashMap overhead for allocation-free
  no-match rows.** With 83k matches per 1.3 B rows this is overwhelmingly
  favorable, but a hypothetical pattern set with millions of matches would
  invert it; the counters are per-partition so the blast radius is local.
- **FxHash is not DoS-resistant** — irrelevant for a local batch tool over
  trusted cache files; noted so nobody copies the pattern into the web app.
- **The bucketed matcher multiplies automata (~9,115 small ones).** Build
  time and RSS are unmeasured; that is exactly why D5 gates on measuring them
  before any full run.
- **Keeping `candidates_seen`'s mixed fallback/warm semantics** preserves
  artifact comparability at the cost of a metric that needs a README
  footnote to interpret on mixed runs.
