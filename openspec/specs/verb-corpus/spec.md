# verb-corpus Specification

## Purpose
TBD - created by archiving change add-conjugation-engine. Update Purpose after archive.
## Requirements
### Requirement: Verb entry schema (Zod)

The `@foljapp/data` package SHALL export a Zod schema named `VerbEntry` that validates every verb's JSON record. The schema SHALL require: `id` (kebab-case unique identifier), `lemma` (1st person singular present, the canonical Albanian dictionary form), `translationEn` (English gloss), `class` (one of `1`, `2`, `3`), `auxiliary` (one of `"kam"`, `"jam"`), `principalParts` (object with `present`, `aorist`, `participle` string fields), `sources` (non-empty array of source citations), and OPTIONAL `flags`, `dialect`, `notes`.

#### Scenario: A valid corpus entry parses cleanly

- **WHEN** the consumer parses `data/verbs/punoj.json` through `VerbEntry.parse(json)`
- **THEN** parsing SHALL succeed
- **AND** the parsed object SHALL contain `id: "punoj"`, `class: 1`, `auxiliary: "kam"`, all three principal parts as strings, and at least one source

#### Scenario: An entry missing principal parts fails parsing

- **WHEN** the consumer parses an entry that omits `principalParts.aorist`
- **THEN** `VerbEntry.parse` SHALL throw a Zod validation error
- **AND** the error path SHALL include `principalParts.aorist`

### Requirement: Lemma uniqueness across the corpus

Every verb entry SHALL have a unique `id` and a unique `lemma` across the corpus. The build pipeline SHALL refuse to produce a corpus index when uniqueness is violated.

#### Scenario: Duplicate lemma fails the build

- **WHEN** two files in `data/verbs/` declare the same `lemma`
- **AND** the developer runs `node scripts/build-corpus.ts`
- **THEN** the script SHALL exit with a non-zero code
- **AND** the error output SHALL identify both offending file paths

### Requirement: Source attribution per verb

Every verb entry's `sources` field SHALL include at least one source citation. Each citation SHALL declare a `source` (one of `"uniparser"`, `"kaikki"`, `"husic"`, `"manual"`) and SHALL include a `reference` string identifying the location within that source (e.g., a uniparser paradigm name, a Kaikki entry URL, a Husić paradigm number, or `"manual"` for human-curated entries).

#### Scenario: A verb cites its Husić paradigm

- **WHEN** the corpus entry for `pjek` is parsed
- **THEN** the entry's `sources` SHALL contain at least one citation with `source: "husic"` and a `reference` matching `^[0-9]+[A-Z]?$` (Husić paradigm number format)

### Requirement: Engine round-trip validation gate

For every verb entry in the corpus, the build pipeline SHALL exercise `engine.table(verbId)` and SHALL refuse to produce a corpus index if any verb causes the engine to throw an error other than `UnsupportedCellError` (which is expected for cells like imperative 1sg).

#### Scenario: A corpus entry that breaks the engine fails the build

- **WHEN** a corpus entry declares `auxiliary: "kam"` but its participle is missing
- **AND** the developer runs `node scripts/build-corpus.ts`
- **THEN** the engine SHALL throw a `CorpusIntegrityError` while validating the entry
- **AND** the build script SHALL exit non-zero, naming the offending verbId and citing the missing field

### Requirement: Seed verb coverage

The seeded corpus SHALL contain at least **50** verb entries. The corpus SHALL include the 20 v0.1 seed verbs (`punoj`, `hap`, `pi`, `jam`, `jap`, `shoh`, `vij`, `them`, `pjek`, `djeg`, `marr`, `bëj`, `flas`, `dua`, `mund`, `duhet`, `ha`, `iki`, `rri`, `laj`) plus a tier-1 batch of high-frequency verbs covering common semantic domains: motion (`dal`, `hyj`, `vete`, `eci`, `kthej`), location/posture (`fle`, `ngrihem`), perception/cognition (`gjej`, `di`, `mendoj`, `mësoj`, `lexoj`, `shkruaj`), volition/action (`kërkoj`, `ndodh`, `ndaj`, `ndal`, `ndez`, `përdor`, `përfundoj`, `prish`, `qaj`, `fitoj`, `blej`), and additional commonly-used verbs (`lë`, `prit`, `lë`, etc., final list documented in design D2).

For each verb the entry SHALL include the same fields as v0.1 (`id`, `lemma`, `translationEn`, `class`, `auxiliary`, `principalParts`, `sources`, optional `flags`, `dialect`, `notes`, `cellOverrides`). Sources SHALL include at least Kaikki (URL reference); irregular verbs SHALL also cite Husić when available.

#### Scenario: The seed corpus contains every required tier-1 lemma

- **WHEN** the consumer reads `data/verbs/index.json` after running the build script
- **THEN** the index SHALL contain entries for every required lemma in the v0.1 seed
- **AND** the index SHALL contain entries for the tier-1 motion verbs (`dal`, `hyj`, `vete`, `eci`, `kthej`)
- **AND** the index SHALL contain entries for the tier-1 cognition/communication verbs (`gjej`, `di`, `mendoj`, `mësoj`, `lexoj`, `shkruaj`)
- **AND** the index SHALL contain entries for the tier-1 action verbs (`ndodh`, `ndaj`, `ndal`, `përdor`, `prish`)

#### Scenario: Total entry count is at least 50

- **WHEN** the consumer reads `data/verbs/index.json`
- **THEN** the index array SHALL have length ≥ 50

### Requirement: Per-verb file location and naming

Verb entries SHALL live at `data/verbs/<id>.json` where `<id>` matches the entry's `id` field. The file extension SHALL be `.json`; no other formats are accepted by the build pipeline.

#### Scenario: A verb file with mismatched id and filename fails the build

- **WHEN** `data/verbs/punoj.json` contains an entry with `id: "punoj"`
- **THEN** the build pipeline SHALL accept it
- **AND** if a separate file `data/verbs/wrong-name.json` contains `id: "different-id"`, the pipeline SHALL exit with an error

### Requirement: Corpus index manifest

The build pipeline SHALL emit a `data/verbs/index.json` file containing an array of `{ id, lemma, translationEn, class, auxiliary }` summaries for every verb in the corpus. The index SHALL be sorted by `id` ascending. Downstream consumers (the reference-pages capability, search index builders) SHALL read the corpus through this index, not by directory listing.

#### Scenario: Index is sorted and complete

- **WHEN** the build pipeline runs against the seeded corpus
- **THEN** `data/verbs/index.json` SHALL exist and contain exactly the same number of entries as files in `data/verbs/` (excluding `index.json` itself)
- **AND** the entries SHALL be sorted by `id` lexicographically ascending

### Requirement: Corpus version

The build pipeline SHALL emit a `data/verbs/version.json` file containing `{ version: string, generatedAt: ISO8601, engineVersion: string }`. Every consumer SHALL be able to surface this metadata for citation purposes. The corpus version SHALL bump (semver minor) whenever any verb entry is added or modified.

#### Scenario: Corpus version is emitted

- **WHEN** the build pipeline runs
- **THEN** `data/verbs/version.json` SHALL exist
- **AND** its `engineVersion` SHALL equal the version exposed by `@foljapp/engine`'s `VERSION` export

### Requirement: Build pipeline is idempotent

Running `node scripts/build-corpus.ts` twice in succession with no source changes SHALL produce byte-identical output files (`index.json`, `version.json`, and all `data/verbs/*.json` if they are regenerated). The `version.json`'s `generatedAt` field is the only permitted exception, and SHALL be deterministic when invoked with `--frozen-time`.

#### Scenario: Two consecutive builds produce identical output (frozen time)

- **WHEN** the developer runs `node scripts/build-corpus.ts --frozen-time` twice
- **THEN** the diff of the second run's output against the first SHALL be empty

### Requirement: Source ingestion priority

When the build pipeline ingests data from external sources, it SHALL respect the priority order defined in the project context: `uniparser` → `kaikki` → `husic` → `ud` → `kote-biba`. When two sources disagree on a verb's principal parts, the pipeline SHALL prefer the higher-priority source AND record the disagreement in the entry's `notes` field for human review.

#### Scenario: Disagreement is recorded, not silenced

- **WHEN** uniparser declares `marr`'s aorist stem as `mor` and Kaikki declares it as `mora`
- **AND** the build pipeline ingests both
- **THEN** the resulting `data/verbs/marr.json` SHALL use `mor` as `principalParts.aorist`
- **AND** the entry's `notes` SHALL contain a remark documenting the Kaikki disagreement

### Requirement: VerbEntry supports optional cellOverrides

The `VerbEntry` Zod schema SHALL accept an optional `cellOverrides` field of type `Record<string, Record<CellLabel, string>>`. The outer key is `<mood>.<tense>` (e.g., `indicative.aorist`, `subjunctive.present`, `optative.present`, `imperative.present`); the inner key is a cell label (`1sg`, `2sg`, `3sg`, `1pl`, `2pl`, `3pl`); the value is the fully-inflected surface form (including any required mood particles).

#### Scenario: A verb with cellOverrides parses cleanly

- **WHEN** the consumer parses an entry containing `cellOverrides: { "indicative.aorist": { "1sg": "desha" } }`
- **THEN** `verbEntrySchema.parse(...)` SHALL succeed
- **AND** the parsed result's `cellOverrides["indicative.aorist"]["1sg"]` SHALL equal `"desha"`

#### Scenario: cellOverrides with an unknown cell label fails parsing

- **WHEN** the consumer parses an entry containing `cellOverrides: { "indicative.aorist": { "9sg": "x" } }`
- **THEN** the schema SHALL reject the entry with a Zod validation error

### Requirement: All seed verbs match Kaikki at 100%

Every verb in the seed corpus SHALL produce engine output that matches Kaikki/Wiktionary's tagged conjugation tables for every cell Kaikki enumerates. The verification baseline is `scripts/verify-engine.ts`; the canonical match rate is documented in `packages/engine/docs/sources.md`.

#### Scenario: verify-engine reports 0 mismatches

- **WHEN** the developer runs `npx tsx scripts/verify-engine.ts` against the seeded corpus
- **THEN** the summary SHALL report `mismatches: 0` across all 20 verbs
- **AND** any subsequent corpus or engine change that introduces mismatches SHALL be either fixed or explicitly justified in its change proposal

### Requirement: Bulk-ingestion tooling

`scripts/ingest-kaikki-batch.ts` SHALL accept a JSON manifest of lemmas to ingest and SHALL produce one `data/verbs/<id>.json` file per lemma. The manifest entry shape: `{ lemma: string, class?: 1|2|3, auxiliary?: 'kam'|'jam', notes?: string }`. The script SHALL:
- Fetch the Kaikki JSONL for the lemma if not already cached.
- Parse the headword to derive `principalParts.present`, `principalParts.aorist`, `principalParts.participle`.
- Infer `class` from lemma morphology (default heuristic; manifest hint overrides).
- Default `auxiliary` to `kam` (manifest hint overrides for the ~10% of verbs that take `jam` for compound tenses).
- Scaffold the JSON file with sources: `[{ source: 'kaikki', reference: <url> }, { source: 'manual', reference: 'scaffolded by ingest-kaikki-batch' }]`.
- Run `verify-engine.ts --only-verb <id>` and emit either:
  - A "ready" entry — file written, no `TODO` markers.
  - A "needs review" entry — file written with a `TODO: needs cellOverrides — see verify-engine output` comment in the JSON's `notes` field.
- Exit non-zero if any manifest lemma fails to fetch from Kaikki.

#### Scenario: Bulk ingest succeeds for a regular Class 1 verb

- **WHEN** the manifest contains `{ lemma: "kërkoj", class: 1, auxiliary: "kam" }`
- **AND** `npx tsx scripts/ingest-kaikki-batch.ts <manifest>` is run
- **THEN** `data/verbs/kërkoj.json` SHALL be created with `class: 1`, `auxiliary: "kam"`, derived `principalParts`
- **AND** running `verify-engine.ts --only-verb kërkoj` SHALL report zero mismatches

#### Scenario: Bulk ingest scaffolds an irregular verb with TODO marker

- **WHEN** the manifest contains a verb whose Kaikki paradigm doesn't match the engine's default rules (e.g., a stem-alternating verb without an existing pattern)
- **AND** the script runs
- **THEN** `data/verbs/<id>.json` SHALL be created with a `notes` field containing `TODO: needs cellOverrides`
- **AND** the script's exit code SHALL be 0 (the file is a starting point for human review, not a failure)

#### Scenario: Bulk ingest fails on Kaikki fetch error

- **WHEN** the manifest contains a lemma not present in Kaikki
- **AND** the script runs
- **THEN** the script SHALL exit non-zero
- **AND** the script SHALL log the failing lemma's name and the fetch URL it tried

### Requirement: Frequency tier annotations for tier-1 verbs

Every newly-added tier-1 verb SHALL appear in `data/verbs/frequency.json` with a `tier` field of one of `core | common | uncommon | rare`. The annotation SHALL be hand-curated (not auto-derived); design D3 documents the criteria.

#### Scenario: Every tier-1 verb has a frequency tier

- **WHEN** the consumer reads `data/verbs/frequency.json`
- **THEN** every lemma in `data/verbs/index.json` SHALL have a corresponding entry in frequency.json with a non-empty `tier` field

### Requirement: Engine round-trip baseline grows with corpus

The `verify-engine.ts` baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to reflect the expanded corpus. The new total cell count SHALL be ≥ 4200 (50 verbs × 84 cells/verb minimum), with 100% match-rate maintained.

#### Scenario: Baseline reflects the expanded corpus

- **WHEN** the change is archived
- **THEN** `packages/engine/docs/sources.md` SHALL show a baseline like `4200 / 4200 cells across 50 verbs` (exact figure determined at archive time)
- **AND** the per-verb verification table SHALL list all 50 corpus verbs

