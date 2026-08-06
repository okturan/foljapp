# Tasks

## 1. Scope and sources

- [x] 1.1 Read `data/corpora/README.md`, `resources.json`, and
      `docs/ARCHITECTURE.md`; confirm the audit findings and that no raw
      corpus is in scope for deletion.
- [x] 1.2 Verify publisher license terms for the four sources lacking a
      `license` field; record findings and which could not be retrieved.

## 2. Integrity manifest

- [x] 2.1 Generate `sha256` digests over every raw file under
      `.cache/datasets` (1,944 files, 78.1 GiB).
- [x] 2.2 Write `data/corpora/checksums.sha256` with cache-root-relative
      paths.
- [x] 2.3 Add `scripts/verify-corpus-checksums.sh` and wire
      `verify:corpus-checksums` into `package.json`.
- [x] 2.4 Confirm the verifier exits 0 on the intact cache, 1 on missing
      files, 1 on corruption, and 2 on a bad path.

## 3. Ledger completeness

- [x] 3.1 Complete the `culturax-sq` entry to the standard field set.
- [x] 3.2 Record verified license findings for `hf-bigmind-albanian`,
      `hf-albanian-wikiorca`, `hf-albanian-wiki-clean-lm`, `leipzig-sqi`.
- [x] 3.3 Add `redistributionPolicy` to `ud-albanian-staf` and
      `ud-albanian-tsa`.
- [x] 3.4 Refresh `updatedAt` and reference the checksum manifest.

## 4. Docs

- [x] 4.1 Remove the superseded CulturaX row from the README's
      "Candidate resources not downloaded" table.
- [x] 4.2 Correct footprint figures in `README.md` and
      `docs/ARCHITECTURE.md` (231G → 185G).
- [x] 4.3 Document the backup procedure, the licensing status, and what is
      deliberately not backed up.
- [x] 4.4 Capture the ledger and backup rules in `CLAUDE.md`.

## 5. Code fixes

- [x] 5.1 Repoint the `build-candidate-cache` default `--cache-dir` to the
      live split cache, via a shared `DEFAULT_CANDIDATE_CACHE_DIR` const so
      the three call sites cannot drift apart.
- [x] 5.2 Add `.cf-pages-output/` and `.vercel/` to the ESLint ignores.
- [x] 5.3 Add a Rust test asserting every candidate-cache default resolves
      to the live cache; mutation-check that it fails when reverted.

## 6. Cache hygiene

- [x] 6.1 Delete `.cache/corpus-candidate-shards/v1` after 5.1 landed.
- [x] 6.2 Delete the spent bench/smoke shard directories.
      Freed 67 GiB total; volume 94% → 87%.

## 7. Validate

- [x] 7.1 Run typecheck, lint, unit tests, build, Rust tests, and
      `verify-engine --check`; confirm the engine baseline is unmoved
      (19,517 / 168 held; lint now clean at 0 errors, was 45).
- [x] 7.2 Update `openspec/specs/corpus-lab/spec.md` and run
      `openspec validate corpus-ledger-integrity --strict`.
