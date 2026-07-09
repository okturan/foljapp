# Corpus Resources

This directory tracks the local and candidate corpora used for foljapp example search experiments. The raw files live in `.cache/datasets` and are intentionally ignored by git.

## Downloaded locally

| Resource                                | Local cache                                                                                              | Size | What it has                                                                                   | Best use                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---: | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| OPUS `sq-en` Moses latest               | `.cache/datasets/opus/en-sq/moses/latest`                                                                | 7.3G | 27 Albanian-English parallel corpora, 113,512,247 aligned sentence pairs                      | Examples with English translations, after source-aware ranking     |
| OPUS all Albanian-paired Moses latest   | `.cache/datasets/opus/all-to-sq/moses/latest`                                                            |  28G | 1,721 OPUS Moses zip files, 462,057,730 aligned sentence pairs                                | Maximum OPUS recall across every language paired with Albanian     |
| MaCoCu-Genre Albanian                   | `.cache/datasets/monolingual-albanian/macocu-genre/MaCoCu-Genre.sq.jsonl.gz`                             | 1.5G | JSONL web documents with `id`, `title`, `text`, `url`, `domain`, `tld`, `genre`               | Monolingual sentence examples with document provenance             |
| MaCoCu-sq 1.0 XML                       | `.cache/datasets/monolingual-albanian/macocu-xml/MaCoCu-sq-1.0.xml.zip`                                  | 1.6G | XML docs and paragraphs with URL/domain, language, quality, sensitivity, and fluency metadata | Filtered paragraph/sentence examples                               |
| CC100 Albanian                          | `.cache/datasets/monolingual-albanian/cc100/sq.txt.xz`                                                   | 1.3G | Raw line-oriented Albanian web text                                                           | Rare-form recall after aggressive filtering                        |
| mC4 Albanian                            | `.cache/datasets/monolingual-albanian/mc4-sq`                                                            | 5.1G | 129 JSON.GZ shards of Albanian web documents with URL and timestamp                           | Broad monolingual sentence recall with basic provenance            |
| Albanian Wiki clean LM                  | `.cache/datasets/huggingface/albanian-wiki-clean-lm`                                                     | 230M | Tokenized parquet shards with `input_ids`, `attention_mask`, and `labels` only                | Not searchable as text without tokenizer/source text               |
| Albanian-English bundled                | `.cache/datasets/huggingface/albanian-english-bundled`                                                   | 232M | Public parquet shards for Albanian-English translation/fill-mask tasks                        | Rust generic parquet text reader; license review before public use |
| BigMind Albanian                        | `.cache/datasets/huggingface/bigmind-albanian`                                                           | 991M | Public instruction-style parquet shards                                                       | Rust generic parquet text reader; not direct corpus evidence       |
| Albanian WikiOrca                       | `.cache/datasets/huggingface/albanian-wikiorca`                                                          | 220M | Public question/response parquet shards                                                       | Rust generic parquet text reader; not direct attestation evidence  |
| FineWeb2 Albanian varieties             | `.cache/datasets/monolingual-albanian/fineweb2`                                                          | 8.5G | Public FineWeb2 `als_Latn` and `aln_Latn` parquet shards                                      | Rust generic parquet text reader                                   |
| CulturaX Albanian                       | `.cache/datasets/monolingual-albanian/culturax-sq`                                                       | 8.5G | 4 `sq` parquet shards of cleaned Common-Crawl Albanian web text (130.6M candidates)           | Rust generic parquet text reader; CC-derived, overlaps existing web sets |
| HPLT v3 Albanian `als_Latn`             | `.cache/datasets/monolingual-albanian/hplt-v3/als_Latn`                                                  |  12G | Six JSONL.ZST shards of Albanian web documents with URL/crawl metadata                        | Broad web examples with provenance after filtering                 |
| Leipzig Albanian corpora                | `.cache/datasets/monolingual-albanian/leipzig`                                                           | 1.9G | 23 Albanian community/news/Wikipedia sentence archives                                        | Sentence examples after dedupe                                     |
| Tatoeba full exports                    | `.cache/datasets/tatoeba`                                                                                | 433M | Full sentence, link, and tag exports                                                          | Small attributed sentence examples                                 |
| Wikimedia Albanian latest dumps         | `.cache/datasets/wikimedia`                                                                              | 167M | `sqwiki`, `sqwiktionary`, `sqwikiquote`, `sqwikibooks`, and `sqwikinews` article XML dumps    | Rust MediaWiki XML bz2 reader with simple namespace-0 extraction   |
| SEEUniversity Albanian corpora for BERT | `.cache/datasets/monolingual-albanian/huggingface/SEEUniversity_albanian_corpora_bert/albanian_bert.txt` | 912M | 8,380,151 plain-text lines from mixed Albanian sources                                        | Supplemental recall; separate grammar prose from natural examples  |
| UD Albanian STAF                        | `.cache/datasets/universal-dependencies/UD_Albanian-STAF-main.zip`                                       |  72K | CoNLL-U train/dev/test treebank                                                               | Morphology/syntax checks                                           |
| UD Albanian TSA                         | `.cache/datasets/universal-dependencies/UD_Albanian-TSA-main.zip`                                        |  20K | CoNLL-U test treebank                                                                         | Morphology/syntax checks                                           |

Current raw dataset cache total: about 78G (CulturaX Albanian sq shards added 2026-07-09, +8.5G).

Derived local artifacts snapshot (verified 2026-07-07):

| Artifact               | Local cache                                     | Size | Purpose                                                  |
| ---------------------- | ----------------------------------------------- | ---: | -------------------------------------------------------- |
| Legacy candidate cache | `.cache/corpus-candidate-shards/v1`             |  65G | Full-row v1 candidate shards retained as fallback        |
| Split candidate cache  | `.cache/corpus-candidate-shards/split-20260620` |  98G | Current normalized/metadata/token shards for fast traces |
| Retained examples DB   | `.cache/corpus-local-full.sqlite`               | 192M | Compact app-facing examples and occurrence rows          |
| Tantivy search index   | `.cache/corpus-search-tantivy`                  |  36M | Interactive local phrase lookup over retained examples   |

Current `.cache` footprint is about 231G, including raw datasets, candidate
caches, retained DBs, search indexes, benchmarks, and build artifacts.

The chunk-era `.anchor-rows-*` sidecar family (33,261 files, ~54G, built by
2026-06-20 chunked phrase-variant runs and keyed to anchor sets the canonical
all-target run never matches) was deleted on 2026-07-07. Anchor-row sidecars
are rebuilt on demand, and only by an explicit `--build-anchor-rows` run.

Voice-flag evidence pass (2026-07-07, full-corpus scan over all 1,907
partitions): `udhetoj` unflagged entirely — *udhëtohet* ×4,967,
*udhëtohej* ×296, folded ×225, *udhëtohen* ×38, generic-2sg *udhëtohesh*
×62 (corpus 0.1.8, `restore-udhetoj-middle-passive`). `iki`/`gjezdis`/
`qendroj` are `middlePassiveThirdPersonOnly` (corpus 0.1.7). `rri` stays
`noMiddlePassive` despite a real stay-sense impersonal ("s'rrihet pa
komentuar") because *rrihet* is homograph-contaminated by `rrah` "beat"
(12,995 mixed hits — e.g. "rrihet një maturant … me lopata") and unflagging
would attach beat-sense sentences as rri's example evidence; `vij` likewise
(*vihet* = `vë`), `jam`/`duhet` on grammatical grounds.

Middle-passive review conclusion (2026-07-07): of the 28,193
`needs_middle_passive_attestation` misses, 99% are compound MP shapes
(admirative/optative/negated/perfect combinations) — formally valid,
textbook-only, correctly labeled, no pruning warranted beyond the June
flags. Only 324 plain-indicative MP cells miss, spread 6–12 each across 87
rare verbs (genuine rarity), except one fixable defect: `flas`/`tërheq`
middle-passive stems, corrected in corpus 0.1.6
(`fix-flas-terheq-mp-stems`: *flitet*/*tërhiqet* via cellOverrides). Open
follow-up: `qendroj` is flagged `noMiddlePassive` while its Husić cache
documents 132 middle rows (incl. impersonal *qëndrohet*) — resolving it
needs an impersonal-only MP concept in the engine.

Engine 0.1.1 (`fix-negation-particles`, 2026-07-07) corrected negated
subjunctive/optative surfaces (`mos të X` → `të mos X`; `nuk <optative>` →
`mos <optative>`). The full rescan the same day refreshed every dependent
artifact: match scan (~8 min), coverage report, UniParser-joined missing
audit, target-hit sidecars (~4 min rebuild), raw-coverage, phrase-variant
report, and static playground examples. Results: 55,514 / 105,847 targets
attested (+244 vs June), retained occurrences 159,625 → 160,243 with 12,198
on corrected `të mos …` targets; the phrase-variant report's raw matches
dropped 83,161 → 56,680 because ~26.5k reordered-negation variant matches
became canonical exact hits, its raw-zero selection shrank 38,169 → 29,785
targets, and the full report now completes in ~168 s. `audit:corpus-misses:
full` now regenerates `report:corpus-coverage` first, so the audit chain can
no longer run against a stale coverage snapshot.

## Candidate resources not downloaded

| Resource                      | Status                       | What it appears to have                                             | Blocker                                                          |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| CulturaX Albanian             | Gated on Hugging Face        | `sq/checksum.sha256` plus four `sq/sq_part_*.parquet` shards        | Accept terms and use an authenticated token                      |
| OSCAR Albanian                | Manual-gated on Hugging Face | Albanian is listed as supported, but anonymous API exposes no files | Manual approval required                                         |
| Albanian news instructions    | Gated on Hugging Face        | Two parquet shards listed by the dataset API                        | Anonymous file download returns 401                              |
| Albanian National Corpus      | Public search UI only        | Main corpus has 232 million words plus early Albanian corpus        | No anonymous bulk download found                                 |
| Albanian Corpus / AlCo        | Public description only      | AlCo, AlCo-Press, tweets, literature, parliament corpora            | CQPweb/search access described; no anonymous bulk download found |
| Kosovo spoken Albanian corpus | Request-only                 | Spoken Albanian recordings/transcriptions                           | Speech recordings are available on request                       |

## Quality notes

MaCoCu is the strongest source for public examples because it carries provenance and quality metadata. OPUS is useful when the UI needs a parallel sentence, but rare forms in OPUS skew toward mined/noisy corpora. CC100 and mC4 expand recall for forms like `punuakam`, but both include obvious web junk, so they should never feed the UI without filtering, sentence segmentation, and dedupe. SEEUniversity also finds rare forms, but some hits are grammar/reference prose rather than natural usage.

The machine-readable inventory is in `resources.json`.
Candidate-cache performance notes are in
[`cache-benchmark.md`](./cache-benchmark.md).

## Local corpus examples

The playground reads local examples from `.cache/corpus-local-full.sqlite` by default. This is for local development only; raw corpora and the SQLite DB are not committed or deployed to Cloudflare Pages. Local corpus scanning runs through the Rust indexer in `tools/corpus-indexer` and requires Cargo.

The scanner is the first-pass classifier. It expands shardable corpora to their
natural file partitions, streams selected raw corpus partitions with a worker
pool, matches all generated foljapp forms with Aho-Corasick in Rust, and stores
only matching example sentences plus occurrence rows. This avoids writing tens
or hundreds of gigabytes of non-matching sentences. The scanner writes
per-source accounting to `resource_stats`, including candidates seen,
scanner-emitted hit sentences after global target saturation, retained
occurrences, quality rejects, unmatched rejects, and duration. OPUS all-to-sq
skips exact `*-en-sq-<number>.zip` partitions because the dedicated OPUS
`sq-en` resource already covers that duplicate subset; regional English and
non-English Albanian-paired OPUS partitions remain included.

Build the target list from the engine:

```bash
npm run build:corpus-targets
```

Build local examples from every scanner-configured downloaded corpus partition:

```bash
npm run build:local-corpus-index
```

This produces retained example evidence, not proof that missing forms are absent
from all raw Albanian text.

Changing the target set requires rescanning raw corpora when no candidate cache
exists, because the examples DB stores only matching sentences:

```bash
npm run build:corpus-targets
npm run scan:local-corpus
```

For repeated full-corpus work, use the candidate cache. Target matches, quality
decisions, scores, and occurrences are still computed fresh by the scanner. The
legacy `.cache/corpus-candidate-shards/v1` cache is the older full-row format:
1,907 `.jsonl.zst` shards plus 1,907 metadata files. The current full split
cache is `.cache/corpus-candidate-shards/split-20260620`: 1,907 `.norm.zst`,
1,907 `.rows.jsonl.zst`, 1,907 `.tokens.zst`, and 1,907 `.target-hits.zst`
shards, built from 1,317,991,933 candidates in 1,343.0 seconds. The target-hit
sidecars were backfilled from existing `.norm.zst` shards in 278.8 seconds and
total 58.2 MiB.

Current cache builds store normalized text separately from full sentence
metadata, so cached scans can run the matcher over compact normalized shards
and load full metadata only after a raw match. Existing v1 full-row shards
remain readable. The split cache was built into a separate directory instead of
refreshing `v1` in place, because the writer does not delete old v1 shards:

```bash
CARGO_TARGET_DIR=.cache/cargo-target cargo run --release \
  --manifest-path tools/corpus-indexer/Cargo.toml -- build-candidate-cache \
  --sources=all --jobs=12 \
  --cache-dir=.cache/corpus-candidate-shards/split-20260620
```

The post-build verification found 1,907 each of `.norm.zst`,
`.rows.jsonl.zst`, `.tokens.zst`, and `.target-hits.zst` files and zero temp
files. In-place
`npm run build:corpus-candidate-cache -- --refresh` is valid, but it writes the
split files beside the old v1 files and can temporarily push the cache directory
toward the old plus new cache sizes.

Sanity trace with `--candidate-cache-dir=.cache/corpus-candidate-shards/split-20260620`
and `--require-candidate-cache` previously skipped 1,722 of 1,907 partitions by
token inventory for `mos të ledhatojë`, scanned the remaining 185 partitions and
1,024,539,453 candidates, found no raw match, and finished in 105,043 ms.
With exact target-hit sidecars, the same trace skipped 1,907 of 1,907
partitions, scanned 0 candidates, found no raw or retained match, and reported a
5 ms trace duration.

The split format is mainly a missing-form forensics optimization. It speeds up
raw-zero and low-hit traces because the scanner can avoid metadata
deserialization for most candidates. It is not expected to produce a large gain
on hit-heavy match scans, and it can be larger on disk than the old full-row
cache.

Fresh split-cache builds also write compressed token inventories and exact
target-hit sidecars. `trace-targets` uses target-hit sidecars first: if none of
the selected generated target IDs occurred in a partition during cache build, the
trace skips that partition. Older split caches without target-hit sidecars, stale
sidecars from an older target file, and v1 full-row caches still fall back to
token inventories or normal scans; rerun `build-candidate-cache` to backfill
missing `.target-hits.zst` files from existing `.norm.zst` shards, or rebuild a
selected source with `--refresh`.

```bash
npm run build:corpus-candidate-cache
npm run scan:local-corpus:cached
```

The cached scan fails if any selected resource partition is missing or stale in
the cache. Use `npm run scan:local-corpus` to fall back to raw resources.

After a full scan, write the hit/miss coverage report:

```bash
npm run report:corpus-coverage
```

After target-hit sidecars exist, write the exact raw-hit coverage report:

```bash
npm run report:corpus-raw-coverage
```

This reads `.target-hits.zst` sidecars only; it does not rescan raw corpora.
It fails if any scanner-configured downloaded partition is missing a fresh
target-hit sidecar.

Explain the misses without rerunning the raw-corpus scan:

```bash
npm run audit:corpus-misses
```

The same audit command also writes a compact missing-form dossier to
`.cache/corpus-missing-dossier.json` and `.cache/corpus-missing-dossier.md`.
The audit explains retained-evidence misses in `.cache/corpus-local-full.sqlite`;
it is not a proof that a form is absent from every scanned raw sentence.

After tracing misses, summarize why the current miss set remains uncovered:

```bash
npm run report:corpus-missing-forensics
```

This writes `.cache/corpus-missing-forensics.json` and `.md`, grouped by trace
status, likely reason, mood, tense, voice, polarity, modality, phrase shape, and
lemma. It also includes a raw-zero UniParser-accepted dossier that separates
morphologically accepted but unattested forms from likely generation bugs. It
does not rescan corpora.

Stress-test broader phrase variants for the highest-priority raw-zero
multiword misses:

```bash
npm run report:corpus-phrase-variants
```

The default report is a ranked 200-target iteration slice. Run the full eligible
raw-zero multiword set explicitly:

```bash
npm run report:corpus-phrase-variants:all
```

The full script writes `.cache/corpus-phrase-variant-stress.all.json` and `.md`.
Check any two report runs for output parity (summary counts, per-target and
per-pattern matches, samples; timing ignored) with:

```bash
npm run report:corpus-phrase-variants:diff -- <baseline.json> <candidate.json>
```

Direct `--forms` or `--target-ids` runs are not implicitly capped; add
`--limit-targets` only when a filtered run should be truncated.
Do not use the all-target build-cache command as the default full-scale path:
anchor-row sidecars are keyed by the full selected anchor set, so one monolithic
all-target build can create a large sidecar family that smaller follow-up runs
cannot reuse.

Use target chunks only for interrupted or debug phrase-variant work:

```bash
npm run report:corpus-phrase-variants:all:chunk:plan -- --chunk-index=0
npm run report:corpus-phrase-variants:all:chunk:build-cache -- \
  --chunk-index=0 \
  --out-json=.cache/corpus-phrase-variant-stress.chunk-000.json \
  --out-md=.cache/corpus-phrase-variant-stress.chunk-000.md
npm run report:corpus-phrase-variants:all:chunk -- \
  --chunk-index=0 \
  --out-json=.cache/corpus-phrase-variant-stress.chunk-000.json \
  --out-md=.cache/corpus-phrase-variant-stress.chunk-000.md
```

The convenience chunk script defaults to 2,000 ranked targets and the base
command's default output paths. Pass unique `--out-json` and `--out-md` paths
when retaining multiple chunks from the same plan. A chunked full result is a
fallback artifact only, and is complete only when every chunk is produced from
the same audit and target cache snapshot.
Aggregate completed non-plan chunk reports:

```bash
npm run report:corpus-phrase-variants:aggregate
```

The aggregate writes `.cache/corpus-phrase-variant-stress.aggregate.json` and
`.md`. It fails on duplicate chunk indexes and reports missing chunks. Candidate
and partition counts in the aggregate are chunk-summed operational metrics, not
unique corpus totals.

Plan a run without scanning candidate rows or building sidecars:

```bash
npm run report:corpus-phrase-variants:plan
npm run report:corpus-phrase-variants:all:plan
```

The plan reports selected targets, stress patterns, anchor tokens, token-inventory
skips, and existing versus missing anchor-row sidecar partitions.

This uses the Rust split-cache path. It skips partitions through `.tokens.zst`
inventories, then reuses query-specific `.anchor-rows-*.jsonl.zst` sidecars when
they already exist. Partitions that need a missing anchor-row sidecar fall back
to streaming the existing `.norm.zst` split cache, so ordinary reports stay
write-free without dropping coverage. Generated clitic/order/contraction
patterns are verified against checked anchor rows. These are exploratory variant
hits, not canonical target attestations.

Build missing anchor-row sidecars explicitly only when deliberately warming
sidecars for a debug or fallback run:

```bash
npm run report:corpus-phrase-variants:build-cache
npm run report:corpus-phrase-variants:all:chunk:build-cache -- --chunk-index=0
```

For example, the `mos të ledhatojë` stress check covered 1,024,539,453 source
rows and materialized 1,990 anchor rows; the warm run then completed in 17-19s
while preserving the same 26 raw variant hits.

For the strongest local review, join the full UniParser analyzer pass before
writing the missing-form audit:

```bash
npm run audit:corpus-misses:full
```

The main audit is `.cache/corpus-missing-audit.md` / `.json`. Read it as an
aggregate investigation report:

- `Corpus Source-Family Contribution` shows which downloaded corpus families
  produced retained evidence and how many candidates each family scanned.
- `UniParser-Accepted Missing Forms` separates exact single-token analyzer
  acceptance from head-token-only validation inside generated multiword forms.
- `Next Review Worklist` groups misses into conservative human-review actions,
  such as rare-valid unattested forms, middle-passive eligibility review,
  scanner-variant absences, near-empty grammatical cells, lemma outliers, and
  component-supported full-phrase gaps.
- The middle-passive sections split the largest bucket by committed review
  coverage, direct local Husić/Kaikki cache evidence, and joined morphology
  action. The shortlist is only an entry point; the complete queue lists every
  action-by-lemma group with active and middle-passive coverage plus direct
  cache evidence when those caches expose middle-passive forms or templates.
  `Direct Cache Support` separates exact generated-surface support from
  head-token-only support, so a cached form like `punuar` is not overclaimed as
  support for a full generated phrase.

The dossier remains sample-only. Use it when you need specific target rows,
joined morphology fields, and SQL lookup snippets; use the main audit for
aggregate counts and review priorities.

One focused source-review follow-up is tracked in
[`middle-passive-eligibility-review.json`](./middle-passive-eligibility-review.json):
8 intransitive-tagged lemmas, 1,296 middle-passive misses, current flags, sample
target IDs, UniParser lexeme/analyzer evidence, and explicit `decision` values.
Resolved decisions must include `decisionEvidence`; unresolved rows stay
`needs_source`. Do not change generation from this file alone; use it as the
review queue for source-backed voice-eligibility decisions.

Exact source-cache-backed middle-passive decisions are tracked separately in
[`middle-passive-source-cache-review.json`](./middle-passive-source-cache-review.json).
Rows in that file mean Husić/Kaikki source-cache paradigm support, not corpus
usage attestation. They keep source-backed forms out of the unresolved
overgeneration queue without claiming the forms are common.

High-volume lexicon-only groups with no direct source-cache support are tracked
in [`middle-passive-lexicon-review.json`](./middle-passive-lexicon-review.json).
Those rows use UniParser lexeme/analyzer evidence plus retained local corpus
distribution to distinguish `keep`, `middlePassiveThirdPersonOnly`, and
`needs_source` cases.

After rerunning the full local audit, validate that tracked review queue against
the current ignored `.cache` artifacts:

```bash
npm run check:middle-passive-review
```

Trace raw scanner-stage provenance for selected target IDs or forms:

```bash
npm run trace:corpus-targets -- --forms='mos të ledhatojë,punuakam' --sources=all --jobs=12
npm run trace:corpus-targets -- --target-ids-file=.cache/sherlock-trace-target-ids.txt --sources=all --jobs=12
```

This writes `.cache/corpus-target-provenance.json` and
`.cache/corpus-target-provenance.md`. It scans the raw local resources for only
the selected generated targets and separates raw pattern matches,
variant-guard rejects, source-partition cap drops, quality rejects,
worker-emitted matches, and retained SQLite occurrences.
`npm run audit:corpus-misses` auto-joins the default trace sidecar when it
exists, labeling untraced misses as `not_traced` and traced rows by scanner
stage. A selected trace is therefore target-specific evidence, not a full
absence scan for every missing form.

Build an optional local morphology review artifact:

```bash
npm run audit:external-morphology
```

The audit auto-detects a UniParser Albanian verb lexeme file at either
`.cache/uniparser-grammar-albanian/sqi_lexemes_V.txt` or
`.cache/sqi_lexemes_V.txt`. If the file lives elsewhere, pass it explicitly:

```bash
npm run audit:external-morphology -- --uniparser-lexemes=/path/to/uniparser-grammar-albanian/sqi_lexemes_V.txt
```

This writes `.cache/external-morphology-audit.json` and
`.cache/external-morphology-audit.md`. It is review evidence only: it does not
run in the app, prove real usage, or auto-edit `data/verbs/*.json`.

If a local UniParser analyzer pass has already been normalized to JSONL, join it
by target ID. Analyzer evidence is never auto-loaded; pass it explicitly:

```bash
npm run build:uniparser-analysis-requests
npm run audit:external-morphology -- --uniparser-analysis=.cache/uniparser-analysis.jsonl
```

`build:uniparser-analysis-requests` writes
`.cache/uniparser-analysis-requests.jsonl` and a Markdown companion. By default
it includes active, single-token corpus misses, keeping one request row per
target ID and ranking with `.cache/corpus-missing-audit.json` when that audit
exists. Use
`-- --kind=all`, `-- --kind=middle-passive`, `-- --kind=raw-zero-traced`,
`-- --forms=punuakam,abstenuakam`, `-- --limit=1000`, `-- --per-verb=2`, or
`-- --dedupe-target-key=true` for smaller triage batches. Fill the emitted
`analyses: []` arrays with normalized UniParser output, then save that filled
file as `.cache/uniparser-analysis.jsonl` before rerunning the external
morphology audit.

If the `uniparser-albanian` Python package is installed locally, the runner can
fill the request file directly:

```bash
pip3 install uniparser-albanian
npm run run:uniparser-analysis
npm run audit:external-morphology -- --uniparser-analysis=.cache/uniparser-analysis.jsonl
```

The runner uses UniParser's documented `AlbanianAnalyzer` modes: `strict` for
standard orthography and `nodiacritics` for folded `ë`/`ç` request rows. It
caches duplicate token/mode lookups while still writing one row per target ID.

The JSONL shape is one row per generated target and mode:

```json
{
  "targetId": "punoj:admirative.present.1sg.active.affirmative.declarative:punuakam",
  "targetKey": "punuakam",
  "signature": "admirative.present.1sg.active.affirmative.declarative",
  "targetGeneratedAt": "2026-06-19T00:49:28.079Z",
  "corpusVersion": "0.1.5",
  "coverageTargetGeneratedAt": "2026-06-19T00:49:28.079Z",
  "mode": "strict",
  "token": "punuakam",
  "analyses": [
    {
      "lemma": "punoj",
      "pos": "V",
      "tags": ["V", "adm", "pres", "1", "sg", "act"]
    }
  ]
}
```

For multiword targets, `token` is the generated head token, not the full phrase.
Rows whose `targetKey`, `signature`, generation metadata, corpus version, or
token do not match the current target are skipped as stale evidence.

Build a focused smoke-test index:

```bash
npm run build:corpus-targets -- '--forms=punoj,të punoj,punuakam,punuake,punuaka,punuakan,paskam punuar,punon,punojnë,punuar' --out=.cache/corpus-targets.smoke.json
npm run scan:local-corpus -- --out=.cache/corpus-smoke.sqlite --targets=.cache/corpus-targets.smoke.json --sources=seeuniversity --max-per-target=3 --jobs=4
```

Append a late rare-form source without replacing the DB:

```bash
npm run build:corpus-targets -- '--forms=punuakam' --out=.cache/corpus-targets.punuakam.json
npm run scan:local-corpus -- --append --out=.cache/corpus-local-full.sqlite --targets=.cache/corpus-targets.punuakam.json --sources=cc100 --max-per-target=3 --jobs=4
```

The generated target list is compact. Without the candidate cache, changing it
still requires rescanning raw corpora because the local app index stores only
matching sentences.

An absence is meaningful for the generated canonical target plus any scanner
variants recorded in the SQLite DB. Schema-2 occurrence rows include
`variant_kind` and `matched_pattern`, so retained hits can distinguish canonical
matches from `të mos ...` word order, apostrophe-negation probes, and
diacritic-fold probes. Diacritic-fold evidence is useful recall evidence, but it
can be ambiguous and should not be treated as clean canonical attestation.
OCR splits and variants not generated by the scanner remain outside the checked
surface space.

## Local corpus search

The retained indexed-search engine is Tantivy. It is for lookup over retained
sentences, not the initial generated-form classification pass. Build it from the
local examples DB:

```bash
npm run build:corpus-search-index
```

Search it with exact phrase semantics:

```bash
npm run search:corpus -- --query="mos të ledhatojë" --limit=5
```

SQLite is kept as the compact app-facing examples database. SQLite FTS,
Postgres, ClickHouse, Quickwit, Solr, Meilisearch, Typesense, DuckDB, ripgrep,
RocksDB, and LMDB are not production corpus-search paths in this repo.

## Search engine benchmark

Run the local corpus-search benchmark with:

```bash
npm run bench:corpus-search -- --sample-size=100000 --query-limit=200
```

The current measured decision is tracked in [`search-benchmark.md`](./search-benchmark.md).
