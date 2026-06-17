# Corpus Resources

This directory tracks the local and candidate corpora used for foljapp example search experiments. The raw files live in `.cache/datasets` and are intentionally ignored by git.

## Downloaded locally

| Resource | Local cache | Size | What it has | Best use |
| --- | --- | ---: | --- | --- |
| OPUS `sq-en` Moses latest | `.cache/datasets/opus/en-sq/moses/latest` | 7.3G | 27 Albanian-English parallel corpora, 113,512,247 aligned sentence pairs | Examples with English translations, after source-aware ranking |
| MaCoCu-Genre Albanian | `.cache/datasets/monolingual-albanian/macocu-genre/MaCoCu-Genre.sq.jsonl.gz` | 1.5G | JSONL web documents with `id`, `title`, `text`, `url`, `domain`, `tld`, `genre` | Monolingual sentence examples with document provenance |
| MaCoCu-sq 1.0 XML | `.cache/datasets/monolingual-albanian/macocu-xml/MaCoCu-sq-1.0.xml.zip` | 1.6G | XML docs and paragraphs with URL/domain, language, quality, sensitivity, and fluency metadata | Filtered paragraph/sentence examples |
| CC100 Albanian | `.cache/datasets/monolingual-albanian/cc100/sq.txt.xz` | 1.3G | Raw line-oriented Albanian web text | Rare-form recall after aggressive filtering |
| SEEUniversity Albanian corpora for BERT | `.cache/datasets/monolingual-albanian/huggingface/SEEUniversity_albanian_corpora_bert/albanian_bert.txt` | 912M | 8,380,151 plain-text lines from mixed Albanian sources | Supplemental recall; separate grammar prose from natural examples |
| UD Albanian STAF | `.cache/datasets/universal-dependencies/UD_Albanian-STAF-main.zip` | 72K | CoNLL-U train/dev/test treebank | Morphology/syntax checks |
| UD Albanian TSA | `.cache/datasets/universal-dependencies/UD_Albanian-TSA-main.zip` | 20K | CoNLL-U test treebank | Morphology/syntax checks |

Current local cache total: about 13G.

## Candidate resources not downloaded

| Resource | Status | What it appears to have | Blocker |
| --- | --- | --- | --- |
| CulturaX Albanian | Gated on Hugging Face | `sq/checksum.sha256` plus four `sq/sq_part_*.parquet` shards | Accept terms and use an authenticated token |
| OSCAR Albanian | Manual-gated on Hugging Face | Albanian is listed as supported, but anonymous API exposes no files | Manual approval required |

## Quality notes

MaCoCu is the strongest next source for public examples because it carries provenance and quality metadata. OPUS is useful when the UI needs an English translation, but rare forms in OPUS skew toward mined/noisy corpora. CC100 expands recall for forms like `punuakam`, but the sample includes obvious web junk, so it should never feed the UI without filtering, sentence segmentation, and dedupe. SEEUniversity also finds rare forms, but some hits are grammar/reference prose rather than natural usage.

The machine-readable inventory is in `resources.json`.

## Local example index

The playground can read a local SQLite FTS5 index from `.cache/corpus-examples.sqlite`. This is for local development only; raw corpora and the SQLite DB are not committed or deployed to Cloudflare Pages.

Build the target list from the engine:

```bash
npm run build:example-targets
```

Build a focused local demo DB:

```bash
npm run build:example-targets -- '--forms=punoj,të punoj,punuakam,punuake,punuaka,punuakan,paskam punuar,punon,punojnë,punuar' --out=.cache/corpus-example-targets.demo.json
npm run build:local-examples -- --targets=.cache/corpus-example-targets.demo.json --sources=seeuniversity --matched-only --max-per-target=3
```

Append a late rare-form source without replacing the DB:

```bash
npm run build:example-targets -- '--forms=punuakam' --out=.cache/corpus-example-targets.punuakam.json
npm run build:local-examples -- --append --targets=.cache/corpus-example-targets.punuakam.json --sources=cc100 --matched-only --max-per-target=3 --stop-when-satisfied
```
