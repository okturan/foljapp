## 1. Pre-flight

- [x] 1.1 Read the June-20 session findings, canonical report artifacts, and
      `phrase_variant_stress.rs`; confirm scope (this file + design.md).
- [x] 1.2 Preserve baselines: copy `all`/`chunk-018`/`chunk-019` report
      JSON+MD to `*.baseline-b6b001e.*`; stash a baseline binary built from
      b6b001e.

## 2. Parity harness

- [x] 2.1 Add `scripts/diff-phrase-variant-reports.ts`.
- [x] 2.2 Wire `npm run report:corpus-phrase-variants:diff`; verify identity
      case passes and a cross-chunk case fails with exit 1.

## 3. Hygiene fixes

- [x] 3.1 `#[serde(rename_all = "camelCase")]` on `MissingAuditFile` (audit
      key is `generatedAt`).
- [x] 3.2 Warm path: call `matches_normalized_after_anchor`; delete
      caller-less `matches_normalized`. (Both later subsumed by the
      single-pass `match_row` in task group 7.)
- [x] 3.3 Collector: move per-partition samples instead of cloning.
- [x] 3.4 Unit tests: pattern-generation snapshots for `nuk jam` (suppletive),
      `mos të digjet` (mutating), `mos të lexojë` (fold collisions) — caught
      that the particle "të" itself folds.
- [x] 3.5 Chunk-019 parity: baseline binary vs stage-1 binary, identical
      (169 targets / 1,046 samples / 1,480 raw matches).

## 4. Scheduling + setup

- [x] 4.1 Expose `cached_candidates_seen` from `candidate_cache.rs`.
- [x] 4.2 Sort scan deque longest-first; documented why order cannot change
      output.
- [x] 4.3 Parallelize `anchor_partition_counts` and
      `phrase_stress_scan_resources` via `parallel_map_resources`
      (input-order results, additive merges). Plan-only wall: 16.99s → 5.13s
      with identical plan counts.
- [x] 4.4 Chunk parity diffs vs baseline binary: chunk-018 and chunk-019 both
      identical. LPT verified noise-robustly: parallel-efficiency ratio
      8.02x → 10.6–10.8x (chunk-018), 6.5x → 10.6x (chunk-019).

## 5. Sparse counters

- [x] 5.1 Per-partition sparse match/sample counters; collector merges into
      the global dense vector.
- [x] 5.2 Chunk parity diff vs baseline: identical; max RSS 391MB → 305MB on
      chunk-018.

## 6. Prefilter

- [x] 6.1 `split(' ')` with a comment tying it to `normalized_text_v1`;
      first-byte/length mask; Fx hashing (added `rustc-hash`).
- [x] 6.2 Prefilter equivalence unit test vs naive oracle (multibyte anchors,
      >63-byte clamp).
- [x] 6.3 Chunk-018 interleaved A/B (stages 2–4 combined vs baseline):
      wall 279.0s → 173–226s, user-CPU 1703s → 1375–1525s.

## 7. Gated matcher experiment

- [x] 7.1 Per-anchor bucketed matcher behind the reference-matcher parity
      unit test (the test caught a real char-boundary panic in the
      single-pattern overlap scan before it ever ran on corpus data).
- [x] 7.2 Gate FAILED → stage reverted, as designed. Output parity held at
      every scale, but: chunk-018 user-CPU 1604–1634s vs stage-4's
      1375–1525s (loses); chunk-019 154.8s/1249s (wins); full run 477.3s
      wall / 2,660s user / 1.68GB RSS vs stage-4's 267.8s / 1,792s / 1.07GB
      (loses badly — at 9,115 anchors, rows trigger several full-row bucket
      scans and the ~9k automata add ~600MB). Recorded in the README
      architecture-decisions section so it is not re-attempted.

## 8. Final measurement + docs

- [x] 8.1 Full `report:corpus-phrase-variants:all` with the shipped binary:
      parity diff vs `all.baseline-b6b001e.json` PASSES (38,169 targets /
      51,904 samples / 83,161 raw matches identical); `audit_generated_at`
      now populated. Two additional full-run parity passes (stage-4 and
      stage-5 binaries) also passed.
- [x] 8.2 Full-run timing: 212.9s (quiet machine, shipped binary) and 267.8s
      / 522.5s (increasingly thermally-degraded session) vs 294.0s baseline;
      parallel-efficiency ratio 7.97x → 10.5–10.7x (noise-robust);
      scan core-seconds 2,343.7s → 2,227.1s.
- [x] 8.3 README: stale 393.4s figure replaced, noise-floor caveat added,
      architecture-decisions section records all refuted ideas with their
      measurements; parity-diff usage documented in both READMEs.
- [x] 8.4 Delete byte-duplicate `.cache/...chunk-014.direct.{json,md}`
      (verified byte-identical with `cmp` first).
- [x] 8.5 Reclaim dead chunk-era anchor-row sidecars (user-approved
      2026-07-07): deleted 33,261 `*.anchor-rows-*` files, ~54G; split cache
      142G → 88G, `.cache` total 231G. Inventory table and sidecar policy
      updated in `data/corpora/README.md`.
- [x] 8.6 Record the pre-existing verify-engine baseline drift in
      `packages/engine/docs/sources.md` (docs-only note: observed
      19,639/230/12,579 vs documented 19,100/19,109+9; investigation is a
      separate follow-up change).

## 9. Validation

- [x] 9.1 `cargo test` (29 passed), `npm run typecheck` (clean),
      `npm run lint` (clean), `npm test` (458 passed).
- [x] 9.2 `npx tsx scripts/verify-engine.ts` — this change touches no engine
      or verb-data files (git diff confirms tooling only). NOTE, pre-existing
      and out of scope: the live totals (19,639 matches / 230 mismatches /
      12,579 missing) have drifted from the documented 19,100/19,109 + 9
      anomalies baseline in `packages/engine/docs/sources.md` — the June
      corpus work (MP pruning, 204→203 verbs) never refreshed the doc.
      Needs its own follow-up change.
- [x] 9.3 `openspec validate phrase-variant-stress-throughput --strict`
      passes; spec deltas unchanged from proposal scope.
