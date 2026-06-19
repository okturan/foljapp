# Corpus Resources

This directory tracks the local and candidate corpora used for foljapp example search experiments. The raw files live in `.cache/datasets` and are intentionally ignored by git.

## Downloaded locally

| Resource                                | Local cache                                                                                              | Size | What it has                                                                                   | Best use                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---: | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| OPUS `sq-en` Moses latest               | `.cache/datasets/opus/en-sq/moses/latest`                                                                | 7.3G | 27 Albanian-English parallel corpora, 113,512,247 aligned sentence pairs                      | Examples with English translations, after source-aware ranking    |
| OPUS all Albanian-paired Moses latest   | `.cache/datasets/opus/all-to-sq/moses/latest`                                                            |  28G | 1,721 OPUS Moses zip files, 462,057,730 aligned sentence pairs                                | Maximum OPUS recall across every language paired with Albanian    |
| MaCoCu-Genre Albanian                   | `.cache/datasets/monolingual-albanian/macocu-genre/MaCoCu-Genre.sq.jsonl.gz`                             | 1.5G | JSONL web documents with `id`, `title`, `text`, `url`, `domain`, `tld`, `genre`               | Monolingual sentence examples with document provenance            |
| MaCoCu-sq 1.0 XML                       | `.cache/datasets/monolingual-albanian/macocu-xml/MaCoCu-sq-1.0.xml.zip`                                  | 1.6G | XML docs and paragraphs with URL/domain, language, quality, sensitivity, and fluency metadata | Filtered paragraph/sentence examples                              |
| CC100 Albanian                          | `.cache/datasets/monolingual-albanian/cc100/sq.txt.xz`                                                   | 1.3G | Raw line-oriented Albanian web text                                                           | Rare-form recall after aggressive filtering                       |
| mC4 Albanian                            | `.cache/datasets/monolingual-albanian/mc4-sq`                                                            | 5.1G | 129 JSON.GZ shards of Albanian web documents with URL and timestamp                           | Broad monolingual sentence recall with basic provenance           |
| Albanian Wiki clean LM                  | `.cache/datasets/huggingface/albanian-wiki-clean-lm`                                                     | 230M | Tokenized parquet shards with `input_ids`, `attention_mask`, and `labels` only                | Not searchable as text without tokenizer/source text              |
| Albanian-English bundled                | `.cache/datasets/huggingface/albanian-english-bundled`                                                   | 232M | Public parquet shards for Albanian-English translation/fill-mask tasks                        | Rust generic parquet text reader; license review before public use |
| BigMind Albanian                        | `.cache/datasets/huggingface/bigmind-albanian`                                                           | 991M | Public instruction-style parquet shards                                                       | Rust generic parquet text reader; not direct corpus evidence      |
| Albanian WikiOrca                       | `.cache/datasets/huggingface/albanian-wikiorca`                                                          | 220M | Public question/response parquet shards                                                       | Rust generic parquet text reader; not direct attestation evidence |
| FineWeb2 Albanian varieties             | `.cache/datasets/monolingual-albanian/fineweb2`                                                          | 8.5G | Public FineWeb2 `als_Latn` and `aln_Latn` parquet shards                                      | Rust generic parquet text reader                                 |
| HPLT v3 Albanian `als_Latn`             | `.cache/datasets/monolingual-albanian/hplt-v3/als_Latn`                                                  |  12G | Six JSONL.ZST shards of Albanian web documents with URL/crawl metadata                        | Broad web examples with provenance after filtering                |
| Leipzig Albanian corpora                | `.cache/datasets/monolingual-albanian/leipzig`                                                           | 1.9G | 23 Albanian community/news/Wikipedia sentence archives                                        | Sentence examples after dedupe                                    |
| Tatoeba full exports                    | `.cache/datasets/tatoeba`                                                                                | 433M | Full sentence, link, and tag exports                                                          | Small attributed sentence examples                                |
| Wikimedia Albanian latest dumps         | `.cache/datasets/wikimedia`                                                                              | 167M | `sqwiki`, `sqwiktionary`, `sqwikiquote`, `sqwikibooks`, and `sqwikinews` article XML dumps    | Rust MediaWiki XML bz2 reader with simple namespace-0 extraction  |
| SEEUniversity Albanian corpora for BERT | `.cache/datasets/monolingual-albanian/huggingface/SEEUniversity_albanian_corpora_bert/albanian_bert.txt` | 912M | 8,380,151 plain-text lines from mixed Albanian sources                                        | Supplemental recall; separate grammar prose from natural examples |
| UD Albanian STAF                        | `.cache/datasets/universal-dependencies/UD_Albanian-STAF-main.zip`                                       |  72K | CoNLL-U train/dev/test treebank                                                               | Morphology/syntax checks                                          |
| UD Albanian TSA                         | `.cache/datasets/universal-dependencies/UD_Albanian-TSA-main.zip`                                        |  20K | CoNLL-U test treebank                                                                         | Morphology/syntax checks                                          |

Current local cache total: about 71G.

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

Build local examples from every downloaded corpus:

```bash
npm run build:local-corpus-index
```

Changing the target set requires rescanning raw corpora when no candidate cache
exists, because the examples DB stores only matching sentences:

```bash
npm run build:corpus-targets
npm run scan:local-corpus
```

For repeated full-corpus work, first materialize the target-independent
candidate cache. It stores each parsed candidate sentence with its normalized
text in compressed local shards under `.cache/corpus-candidate-shards/v1`;
target matches, quality decisions, scores, and occurrences are still computed
fresh by the scanner.

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

Explain the misses without rerunning the raw-corpus scan:

```bash
npm run audit:corpus-misses
```

The same audit command also writes a compact missing-form dossier to
`.cache/corpus-missing-dossier.json` and `.cache/corpus-missing-dossier.md`.
The audit explains retained-evidence misses in `.cache/corpus-local-full.sqlite`;
it is not a proof that a form is absent from every scanned raw sentence.

Trace raw scanner-stage provenance for selected target IDs or forms:

```bash
npm run trace:corpus-targets -- --forms='mos të ledhatojë,punuakam' --sources=all --jobs=12
```

This writes `.cache/corpus-target-provenance.json` and
`.cache/corpus-target-provenance.md`. It scans the raw local resources for only
the selected generated targets and separates raw pattern matches,
variant-guard rejects, source-partition cap drops, quality rejects,
worker-emitted matches, and retained SQLite occurrences.

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
{"targetId":"punoj:admirative.present.1sg.active.affirmative.declarative:punuakam","targetKey":"punuakam","signature":"admirative.present.1sg.active.affirmative.declarative","targetGeneratedAt":"2026-06-19T00:49:28.079Z","corpusVersion":"0.1.5","coverageTargetGeneratedAt":"2026-06-19T00:49:28.079Z","mode":"strict","token":"punuakam","analyses":[{"lemma":"punoj","pos":"V","tags":["V","adm","pres","1","sg","act"]}]}
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
