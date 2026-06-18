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

## Local full-corpus index

The playground reads a local SQLite FTS5 index from `.cache/corpus-local-full.sqlite` by default. This is for local development only; raw corpora and the SQLite DB are not committed or deployed to Cloudflare Pages. Local corpus scanning runs through the Rust indexer in `tools/corpus-indexer` and requires Cargo.

This is a sentence/text-fragment index, not a frequency corpus. It stores accepted local corpus rows for search, plus generated-form occurrences materialized from FTS. Duplicate suppression happens during example materialization, not during bulk corpus ingest. The scanner writes per-source accounting to `resource_stats`, including candidates seen, inserted sentences, quality rejects, unmatched rejects, occurrences, and duration. The default full-index command uses `--max-db-gib=160` so the generated SQLite artifact stays bounded against the 300GB local corpus budget after the 70GB raw cache and FTS rebuild overhead are included.

The durable path is two-phase:

1. Build the full sentence FTS index from the downloaded raw corpora.
2. Materialize foljapp targets from that existing FTS index.

Build the target list from the engine:

```bash
npm run build:example-targets
```

Build the full local sentence index, then materialize the generated targets:

```bash
npm run build:local-corpus-index
```

Changing the target set should use materialization only; it should not rescan raw corpora:

```bash
npm run build:example-targets
npm run materialize:local-corpus -- --max-per-target=3
```

Build a focused smoke-test index:

```bash
npm run build:example-targets -- '--forms=punoj,të punoj,punuakam,punuake,punuaka,punuakan,paskam punuar,punon,punojnë,punuar' --out=.cache/corpus-example-targets.demo.json
npm run scan:local-examples -- --out=.cache/corpus-smoke.sqlite --targets=.cache/corpus-example-targets.demo.json --sources=seeuniversity --matched-only --max-per-target=3
npm run materialize:local-examples -- --db=.cache/corpus-smoke.sqlite --targets=.cache/corpus-example-targets.demo.json --max-per-target=3
```

Append a late rare-form source without replacing the DB:

```bash
npm run build:example-targets -- '--forms=punuakam' --out=.cache/corpus-example-targets.punuakam.json
npm run scan:local-examples -- --append --out=.cache/corpus-local-full.sqlite --targets=.cache/corpus-example-targets.punuakam.json --sources=cc100 --matched-only --max-per-target=3 --stop-when-satisfied
npm run materialize:local-corpus -- --max-per-target=3
```

On the current local FTS index, materializing the full generated target set covers 97,488 unique surfaces in about 3.5 seconds. The slow operation is now corpus extraction, not adding or changing foljapp targets.
