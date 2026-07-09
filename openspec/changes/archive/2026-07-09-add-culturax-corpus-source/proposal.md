## Why

CulturaX Albanian (`uonlp/CulturaX`, sq subset) was the one gated corpus
with a clean click-through license (no human-approval loop) and a
ready-made `culturax-sq` ledger entry left `gated-not-downloaded` since the
June acquisition sweep. Access was granted 2026-07-09; adding it broadens
the corpus with ~8.6 GB / 4 parquet shards of cleaned Common-Crawl-derived
Albanian web text, giving the attestation scan more surface to confirm
generated verb forms against.

Expectation is calibrated, not optimistic: CulturaX is CC-derived and
`resources.json` itself flags overlap with MaCoCu, CC100, mC4, and
FineWeb2 — all already cached — so net-new attestation will be modest. It
is worth doing because it is the cheapest available coverage (clean
download, no approval wait) and the ingestion path already exists.

## What Changes

- **Rust** — `culturax-sq` added to the `Parquet shards` arm of
  `source_kind` in `tools/corpus-indexer/src/sources.rs` (one line; reuses
  the existing `ParquetDir` reader that FineWeb2 and the hf-* sources use).
- **Ledger** — `data/corpora/resources.json`: `culturax-sq` status
  `gated-not-downloaded` → `downloaded`, with `localPath`
  (`.cache/datasets/monolingual-albanian/culturax-sq`) and a download date.
- **Local data** — 4 sq parquet shards downloaded under `.cache/` (not
  committed).
- **Corpus lab** — full scan chain re-run so the new 4 partitions flow into
  the split candidate cache, retained-examples DB, missing-forms audit,
  coverage/phrase-variant reports, and static playground examples. Deployed.

## Capabilities

Extends `corpus-lab`: downloaded corpus sources are registered in the ledger
and auto-discovered by the indexer.

## Impact

- **Code** — one line in `sources.rs`. No engine, verb-data, or app change.
- **Attestation** — the missing-forms audit's hit/miss split shifts by
  however many previously-raw-zero forms CulturaX attests; recorded exactly
  after the scan.
- **Cache size** — +8.6 GB under `.cache/` (gitignored); split cache gains
  4 partitions.
- **Secrets** — the HF token lives only in `.cache/hf.env` (chmod 600,
  gitignored); never committed, never echoed into artifacts.
- **Audience tier** — researchers/learners: any newly-attested form gains a
  real corpus example on the deployed site.

## Non-Goals

- **No other gated corpora** — OSCAR (manual approval), Albanian National
  Corpus / AlCo (no bulk download, email-a-human), Kosovo spoken
  (request-only) remain out until their access blockers are cleared.
- **No parquet-column tuning** — the shared `ParquetDir` reader's
  `useful_text` filter behavior is inherited as-is from the existing
  sources.

## Sequence

```
PREREQ → gated access granted on Hugging Face (manual)
THIS   → add-culturax-corpus-source
NEXT   → (optional) further gated corpora if their access is cleared
```
