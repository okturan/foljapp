## Why

The phrase-variant stress report (`npm run report:corpus-phrase-variants:all`)
is the corpus lab's tool for recovering attestations of generated verb forms
that have zero exact hits in the 1.32B-candidate local corpus: it expands
38,169 raw-zero multiword targets into 1,072,356 clitic/particle/diacritic
variants and scans every cached partition for them. The 2026-06-20 working
sessions left it correct but slow (~294 s per full run, with a measured
~15–30 % run-to-run noise floor) and identified — but did not implement —
several verified inefficiencies:

- The partition work queue is drained in directory order. Re-simulating the
  recorded per-partition durations from the canonical report shows an LPT
  (longest-first) ordering completes the same work in 195.3 s vs 307.5 s —
  roughly 100 s of wall time recoverable by sorting a queue.
- Two serial setup passes decompress all 1,907 token inventories twice
  (~17 s single-threaded) before any scan work starts.
- Every partition zeroes two 1,072,356-entry counter vectors (~17 MB) even
  though the whole run produces only 83,161 matches, and the collector merges
  1.8 B mostly-zero additions serially.
- The per-row anchor prefilter — the only filter the full run can use, since
  the ≤64-anchor automaton gate never applies at 9,115 anchors — tokenizes
  with `split_whitespace` and hashes every token against a std `HashSet`.
- The warm sidecar path re-runs the anchor check on rows that are
  anchor-bearing by construction (the same redundancy commit b6b001e removed
  from the fallback path).
- `MissingAuditFile.generated_at` deserializes the wrong key casing
  (`generated_at` vs the audit's `generatedAt`), so `audit_generated_at` is
  always `null` in report artifacts and the aggregate script's
  chunk-consistency check passes vacuously.
- There is no automated parity check: the report's headline numbers have only
  ever been compared by hand, and pattern generation has zero unit tests.

This change is the missing OpenSpec umbrella for that work: it lands the
verified optimizations in risk order behind an automated parity gate, plus a
gated matcher experiment (per-anchor bucketed automata) that is the only
lever below the largest-partition floor.

## What Changes

- **Parity harness** — new `scripts/diff-phrase-variant-reports.ts` +
  `npm run report:corpus-phrase-variants:diff` comparing two report JSONs on
  everything that must be invariant (summary counts, pattern kind counts,
  per-target and per-pattern raw matches, per-resource counts, samples as a
  sorted multiset), ignoring timing fields. Non-zero exit on any difference.
- **Hygiene fixes** — `generatedAt` serde rename; warm path calls
  `matches_normalized_after_anchor` and the caller-less `matches_normalized`
  is deleted; per-partition sample vectors are moved, not cloned, in the
  collector.
- **Scheduling** — partitions are sorted longest-first (by cached
  `candidates_seen`) before the work deque is built; the two serial setup
  passes over token inventories are parallelized over `--jobs` threads.
- **Sparse counters** — per-partition match/sample counters become sparse
  maps merged into one global dense vector by the collector.
- **Cheaper prefilter** — `split(' ')` (guaranteed by the
  `normalized_text_v1` invariant), a byte-length mask to skip impossible
  tokens, and a faster hash set for the 9,115-anchor membership test.
- **Gated matcher experiment** — per-anchor bucketed automata replacing the
  single 1M-pattern automaton walk over 264M anchor rows; ships only if a
  reference-matcher parity test plus interleaved A/B benchmarks at both
  chunk-018 and chunk-019 scales pass, with acceptable memory.
- **First unit tests** for pattern generation and prefilter equivalence.
- **Docs** — corpus-indexer README gains measured baselines (replacing one
  stale figure), the noise-floor caveat, and an architecture-decisions
  section recording refuted optimization ideas with their measurements so
  they are not re-attempted.

## Capabilities

Adds a new `corpus-lab` capability spec covering the phrase-variant stress
report's output-parity contract and scheduling-independence requirement.
Existing runtime capabilities are untouched.

## Impact

- **Code** — `tools/corpus-indexer/src/phrase_variant_stress.rs`,
  `tools/corpus-indexer/src/candidate_cache.rs` (one new accessor),
  `scripts/diff-phrase-variant-reports.ts` (new), `package.json` (one script),
  `tools/corpus-indexer/README.md`.
- **Engine / webapp / verb data** — none. `scripts/verify-engine.ts` baseline
  is unaffected (report tooling only); run once before archive to confirm.
  One docs-only touch: `packages/engine/docs/sources.md` gains a note
  recording the pre-existing baseline drift observed during validation (no
  engine or data change).
- **Local cache** — with user sign-off, the dead chunk-era `.anchor-rows-*`
  sidecar family was deleted (33,261 files, ~54G reclaimed; split cache back
  to 88G). Sidecars rebuild on demand via `--build-anchor-rows`.
- **Report artifacts** — `audit_generated_at` becomes populated; mixing
  pre-fix and post-fix chunk artifacts in one aggregate run will now
  correctly fail its consistency check instead of passing vacuously.
- **Audience tier** — researchers (corpus evidence tooling); indirectly
  learners/students through faster iteration on attestation coverage.

## Non-Goals

- **No pattern-generation changes.** Variant kinds, clitic lists, and anchor
  selection are frozen; output parity against the b6b001e baseline is a hard
  gate for every stage.
- **No postings index / no new index artifacts.** A full phrase-occurrence
  index costs a build comparable to the 1,343 s cache build plus tens of GB,
  and is invalidated by corpus growth while the pattern set changes with
  every audit iteration. Revisit only if the stress report becomes a routine
  gate run repeatedly against one frozen corpus+audit snapshot.
- **No warm-path/sidecar rework.** The canonical run is cold-by-design;
  sidecars are keyed to the exact anchor set and any audit change invalidates
  them. Same revisit trigger as the postings index.
- **No re-sharding of giant partitions.** Touches partition identity and
  every sidecar family for a tail-latency problem that LPT + matcher work may
  already solve; revisit only if post-change profiles still show a
  single-partition tail dominating wall time.
- **No metric semantics changes.** `candidates_seen` keeps its differing
  fallback/warm meanings (documented in the README) to preserve
  comparability with existing artifacts.

## Sequence

```
PREREQ → (none — corpus lab tooling, evidence artifacts only)
THIS   → phrase-variant-stress-throughput
NEXT   → (optional) postings index or warm-path rework, only if the revisit
         triggers above fire
```
