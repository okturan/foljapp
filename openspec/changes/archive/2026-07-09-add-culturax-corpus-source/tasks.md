## 1. Pre-flight

- [x] 1.1 HF access granted (user skymorphosis); token in `.cache/hf.env`
      (chmod 600, gitignored — verified `git check-ignore`).
- [x] 1.2 Shard sizes verified (4 × ~2.1 GB = 8.6 GB; 197 GB free);
      parquet reader path confirmed (shared `ParquetDir` +
      `useful_text` filter, same as FineWeb2).

## 2. Wire + download

- [x] 2.1 `culturax-sq` registered at BOTH required points (a no-op 2s
      candidate-cache run exposed the second): the `Parquet shards` arm of
      `source_kind` (sources.rs) AND `ALL_SOURCE_IDS` + `alias_source`
      (main.rs) — `--sources=all` expands the curated ID list, not the
      ledger, so a source missing from `ALL_SOURCE_IDS` is silently
      skipped. Indexer rebuilt.
- [x] 2.2 `resources.json`: `culturax-sq` → `downloaded` + `localPath` +
      date.
- [x] 2.3 Downloaded the 4 sq parquet shards (8.5 GB, PAR1-verified) to
      `.cache/datasets/monolingual-albanian/culturax-sq/`; cached into 4
      split-cache partitions = 130,624,980 candidates (291.8s).

## 3. Ingest + verify

- [x] 3.1 Chain complete: candidate-cache (culturax fresh) → scan (1.449B
      candidates, +130.6M) → coverage+audit → raw-coverage →
      phrase-variants → static examples.
- [x] 3.2 Attestation delta recorded: **+69 net-new attested targets**
      (55,707 → 55,776; missing 50,668 → 50,599). CulturaX retained 2,093
      sentences touching 2,555 targets, but ~97% were already attested by
      the overlapping CC-derived sets — the modest net-new confirms the
      pre-flight prediction exactly. Cheapest coverage available; worth the
      clean download.
- [x] 3.3 cargo test (29), typecheck clean, lint clean, 484 unit tests,
      build compiles. Static examples 161,549 rows / 41.4MB.
- [x] 3.4 Commit (3-line Rust + ledger + docs + regenerated assets), push,
      CI, deploy.
- [x] 3.5 `openspec validate add-culturax-corpus-source --strict`; archive.
