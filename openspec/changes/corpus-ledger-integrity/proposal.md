## Why

A full-repo audit (2026-08-05) found the corpus ledger and cache in good
shape overall — all 19 downloaded sources are registered at all three
points and every source family contributes to the 52.4% attestation rate —
but with four concrete defects that undermine the "every form sourced"
quality bar and the plan to archive the raw corpora to external media:

1. **No integrity manifest.** `sha256` is recorded for only 5 of 19
   sources and `checksumScope` for 2. The raw cache (78 GiB) is about to be
   backed up to external media; without per-file digests a restored copy
   cannot be verified, and silent bit-rot would surface as unexplained
   coverage drift rather than as a read error.
2. **Unverified and absent licenses.** Four sources carry no `license`
   field at all. Verification on 2026-08-05 found that three of them
   (`hf-bigmind-albanian`, `hf-albanian-wikiorca`,
   `hf-albanian-wiki-clean-lm`) have **no license specified by their
   publisher** — a redistribution risk that the ledger currently records as
   simply missing data, which reads as an oversight rather than a finding.
3. **`culturax-sq` is the one incomplete entry.** The most recent addition
   skipped six fields every other downloaded source carries, and its
   superseded "not downloaded" row was left in `README.md`, so the same
   corpus is documented as both downloaded and gated.
4. **A stale-cache footgun.** `main.rs` defaults the
   `build-candidate-cache` subcommand's `--cache-dir` to the legacy `v1`
   cache — the *writer*, not a reader. Every npm script passes
   `split-20260620` explicitly, so the default is only reachable from
   ad-hoc `cargo run` invocations, where it would spend hours rebuilding
   partitions into a superseded 65 GiB cache while leaving the live cache
   stale. The reading subcommands already default correctly.

Reported footprint figures had also drifted (`~231G` documented vs 252 GiB
actual), and `npm run lint` was reporting 45 errors from minified deploy
bundles because the ESLint ignore list covered `.next/` but not
`.cf-pages-output/` or `.vercel/output/`.

## What Changes

- **Integrity** — a `sha256` manifest over every raw dataset file, written
  to `data/corpora/checksums.sha256` (tracked; the digests are small even
  though the data they cover is not), plus a `verify:corpus-checksums`
  script that re-verifies a cache or a restored backup against it.
- **Ledger** — `data/corpora/resources.json`: complete `culturax-sq` to the
  standard field set; record verified license findings for the four sources
  that lacked one, distinguishing *no license published* from *not yet
  verified*; add `redistributionPolicy` to the two UD entries; refresh
  `updatedAt`; point every entry at the checksum manifest.
- **Docs** — drop the superseded CulturaX row from the README's
  "Candidate resources not downloaded" table; correct the footprint figures
  in `README.md` and `docs/ARCHITECTURE.md`; document the backup procedure
  and what is deliberately *not* backed up.
- **Rust** — repoint the `build-candidate-cache` default `--cache-dir` from
  `.cache/corpus-candidate-shards/v1` to `split-20260620`.
- **Lint** — add `.cf-pages-output/` and `.vercel/` to the ESLint ignores.
- **Cache hygiene** — delete the superseded `v1` candidate cache (65 GiB)
  and the spent bench/smoke shard directories (~1.9 GiB) once the default
  is repointed. Local disk is at 94%.

## Capabilities

Extends `corpus-lab`: ledger completeness, raw-cache integrity
verification, and candidate-cache defaults.

## Impact

- **Data** — no raw corpus is deleted. Only derived, regenerable caches are
  removed; every one is rebuildable via `npm run rescan`.
- **Attestation** — none. No engine, verb-data, target, or scan-logic
  change, so coverage and `verify-engine` numbers are untouched
  (19,517 / 168 held).
- **Disk** — frees ~67 GiB, taking the volume from 94% to roughly 86%.
- **Backup** — the manifest makes the 78 GiB raw-dataset archive verifiable
  after restore, which is the point of taking it.
- **Audience tier** — researchers: license provenance is part of the
  citability bar, and three sources are now known to be unlicensed rather
  than undocumented.

## Non-Goals

- **No corpus acquisition or removal.** The audit found the corpus
  sufficient: the 50,599 misses are dominated by middle-passive compound
  shapes (28,495) that are formally valid but textbook-only, so more web
  text would not move them. `opus-all-to-sq`'s poor yield (28 GiB for 4.2
  occurrences per 1M candidates) is recorded, not acted on — it is still
  the only source of parallel English pairs for many forms.
- **No re-scan.** Nothing here changes targets or scan behavior, so the
  rescan chain is deliberately not run.
- **No license remediation.** Recording that three HF sources publish no
  license is in scope; deciding whether to keep using them is a separate
  call with its own proposal.

## Sequence

```
THIS → corpus-ledger-integrity
NEXT → (user decision) external-SSD archive of .cache/datasets, verified
       against data/corpora/checksums.sha256
```
