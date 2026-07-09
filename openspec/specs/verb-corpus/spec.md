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

The seeded corpus SHALL contain at least **200** verb entries spanning all three classes and both auxiliaries. The corpus SHALL include the v0.1 seed (20), the tier-1 batch (30), the tier-2 batch (50), and a tier-3 batch of 100 lemmas drawn from Kote & Biba 2019 ranks 100–200, organized into four sub-batches:

- **Tier-3a, Class 1 (40 verbs)** — mix of -oj continuation (~10 lemmas), -aj (~10 with hand-crafted cellOverrides), -ej (~10 with hand-crafted), -uaj (~5 with hand-crafted), -yj/-yej (~5).
- **Tier-3b, Class 2 (35 verbs)** — consonant-stem regulars (~20) + mutating (k→q, g→gj) (~10) + irregular suppletive (~5: e.g., `bie`, `pres`, `vdes`).
- **Tier-3c, Class 3 (15 verbs)** — vowel-stem; almost all need hand-crafting due to irregular aorist or participle (e.g., `bie`, `lë`, `eci`, `ngjej`, `ec`).
- **Tier-3d, Reflexive-stem / MP-only (10 verbs)** — verbs whose dictionary lemma is explicitly MP form (e.g., `përgjigjem` "to answer", `lutem` "to pray", `kujtohem` "to remember", `mësohem` "to be taught"). The corpus entry's `lemma` field carries the MP form; `principalParts` reflects the MP-stem morphology; engine treats MP as the active path for these verbs.

For each verb the entry SHALL include the standard fields (`id`, `lemma`, `translationEn`, `class`, `auxiliary`, `principalParts`, `sources`, optional `flags`, `dialect`, `notes`, `cellOverrides`). Sources SHALL include at least Kaikki; irregular verbs (those with cellOverrides) SHALL also cite Husić when available in the cache.

#### Scenario: Total entry count is at least 200

- **WHEN** the consumer reads `data/verbs/index.json`
- **THEN** the index array SHALL have length ≥ 200

#### Scenario: All three classes represented in tier-3 lemmas

- **WHEN** the consumer aggregates the tier-3 lemmas (NOT in v0.1, tier-1, or tier-2)
- **THEN** at least 40 SHALL have `class: 1`
- **AND** at least 35 SHALL have `class: 2`
- **AND** at least 15 SHALL have `class: 3`

#### Scenario: Tier-3 includes reflexive-stem MP-only verbs

- **WHEN** the index lists tier-3 lemmas
- **THEN** at least 5 lemmas SHALL end in `-em` or `-hem` indicating MP-only morphology (e.g., `përgjigjem`, `lutem`, `kujtohem`)

#### Scenario: Verify-engine matches all 200 verbs

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change
- **THEN** the script SHALL report a baseline of ≥ 16,000 cells matched (200 verbs × ~80 cells/verb avg)
- **AND** mismatches SHALL be ≤ 5 (documented Kaikki↔Husić disagreements only; engine bugs SHALL be zero)

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

`scripts/ingest-kaikki-batch.ts` SHALL accept a JSON manifest of lemmas and produce one `data/verbs/<id>.json` file per lemma. The manifest entry shape: `{ lemma: string, translationEn: string, class?: 1|2|3, auxiliary?: 'kam'|'jam', notes?: string, irregular?: boolean }`. The script SHALL:

- Derive `principalParts` from the lemma using class-specific rules:
  - Class 1 -oj: `present = lemma - "j"`, `aorist = root + "ua"`, `participle = root + "uar"`.
  - Class 1 -aj: `present = lemma - "j"`, `aorist = root + "jt"`, `participle = root + "jtur"` (regular -aj pattern; irregulars flagged).
  - Class 1 -ej: `present = lemma - "j"`, `aorist = root + "jt"` or `root + "v"`, `participle = root + "jtur"` or root-specific (most -ej are irregular; manifest hints required).
  - Class 1 -uaj: `present = lemma - "j"`, `aorist = root + "jt"`, `participle = root + "jtur"`.
  - Class 2 consonant-stem: `present = aorist = lemma`, `participle = lemma + "ur"`.
  - Class 3 vowel-stem: `present = aorist = lemma`, `participle = lemma + "rë"` (with per-verb variations).
- Default `auxiliary` to `kam` (manifest hint overrides for the rare `jam`-aux verbs).
- Scaffold the JSON file with sources `[{ source: 'kaikki', reference: <kaikki-url> }, { source: 'manual', reference: 'scaffolded by ingest-kaikki-batch' }]`.
- Run `verify-engine.ts --only-verb <id>` and emit either:
  - **Ready**: file written, verify-engine passes, no `TODO` markers.
  - **Needs review**: file written with `notes: "TODO: needs cellOverrides — see verify-engine output"` AND a snapshot of the mismatching cells included in the notes for human review.
- Exit non-zero if any manifest lemma fails to fetch from Kaikki.

#### Scenario: Bulk ingest succeeds for a regular Class 2 verb

- **WHEN** the manifest contains `{ lemma: "prish", class: 2, auxiliary: "kam", translationEn: "to spoil" }`
- **AND** `npx tsx scripts/ingest-kaikki-batch.ts <manifest>` is run
- **THEN** `data/verbs/prish.json` SHALL be created with `class: 2`, `auxiliary: "kam"`, `principalParts: { present: "prish", aorist: "prish", participle: "prishur" }`
- **AND** `verify-engine.ts --only-verb prish` SHALL report zero mismatches

#### Scenario: Bulk ingest succeeds for a regular Class 3 verb

- **WHEN** the manifest contains `{ lemma: "fle", class: 3, auxiliary: "kam", translationEn: "to sleep", irregular: true }`
- **THEN** the script SHALL skip auto-scaffolding (`fle` is irregular per Kaikki) and SHALL log a clear hand-craft directive

#### Scenario: Bulk ingest scaffolds an irregular verb with TODO marker

- **WHEN** the manifest contains a verb without the `irregular` flag whose Kaikki paradigm doesn't match the engine's default rules
- **AND** the script runs
- **THEN** `data/verbs/<id>.json` SHALL be created with a `notes` field containing `TODO: needs cellOverrides`
- **AND** the script's exit code SHALL be 0

#### Scenario: Bulk ingest fails on Kaikki fetch error

- **WHEN** the manifest contains a lemma not present in Kaikki
- **AND** the script runs
- **THEN** the script SHALL exit non-zero
- **AND** the script SHALL log the failing lemma's name and the fetch URL it tried

### Requirement: Frequency tier annotations for tier-1 verbs

Every newly-added tier-1 AND tier-2 verb SHALL appear in `data/verbs/frequency.json` with a `tier` field of one of `core | common | uncommon | rare`. The annotation SHALL be hand-curated (not auto-derived); design D3 of the originating change documents the criteria.

#### Scenario: Every tier-1 verb has a frequency tier

- **WHEN** the consumer reads `data/verbs/frequency.json`
- **THEN** every lemma in `data/verbs/index.json` SHALL have a corresponding entry in frequency.json with a non-empty `tier` field

### Requirement: Engine round-trip baseline grows with corpus

The `verify-engine.ts` baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to reflect the expanded corpus. The new total cell count SHALL be ≥ 8500 (100 verbs × 85 cells/verb minimum), with 100% match-rate maintained.

#### Scenario: Baseline reflects the expanded corpus

- **WHEN** the change is archived
- **THEN** `packages/engine/docs/sources.md` SHALL show a baseline like `8500+ / 8500+ cells across 100 verbs` (exact figure determined at archive time)
- **AND** the per-class breakdown SHALL list verb counts per class

### Requirement: Sub-batch ingestion workflow

`expand-verb-corpus-tier-3` ingestion SHALL proceed in four sub-batches (3a–3d). Each sub-batch SHALL:
1. Author its portion of `data/sources/tier-3-manifest.json` with `irregular: true` flags for verbs known to need cellOverrides.
2. Run `npx tsx scripts/ingest-kaikki-batch.ts` for that sub-batch.
3. Hand-curate cellOverrides for verbs flagged as irregular OR for verbs surfaced by the script's irregularity-detection heuristic.
4. Run `verify-engine.ts --only-verb <id>` for each new verb until clean.
5. Add tier annotations to `frequency.json`.

The script SHALL skip verbs already present in the corpus (idempotent reruns are safe).

#### Scenario: Sub-batch 3a (Class 1) ingestion

- **WHEN** sub-batch 3a is run with its 40-verb manifest
- **THEN** at least 25 verbs SHALL auto-scaffold cleanly (the regulars: -oj continuation + a few -uaj)
- **AND** ~15 verbs SHALL be flagged for hand-crafting (most -aj/-ej and some -uaj)
- **AND** after manual curation pass, all 40 SHALL pass `verify-engine.ts --only-verb <id>` with zero mismatches

#### Scenario: Sub-batch 3d (MP-only) handling

- **WHEN** the manifest contains `{ lemma: "përgjigjem", class: 1, irregular: true, ... }`
- **AND** the ingest script encounters it
- **THEN** the script SHALL skip auto-scaffolding (per existing `irregular: true` policy)
- **AND** a human SHALL hand-craft the entry with the MP-stem morphology + cellOverrides for all 6 cells of present/imperfect/aorist where the engine's class-1 paradigm rules don't fit

### Requirement: Tier-3 frequency tier annotations

Every newly-added tier-3 verb SHALL have an entry in `data/verbs/frequency.json` with a `tier` field of one of `core | common | uncommon | rare`. Most tier-3 verbs SHALL land in `common` or `uncommon` (top-50 verbs landed in v0.1 / tier-1 already; tier-3 is mostly mid-frequency).

#### Scenario: Every tier-3 verb has a frequency tier

- **WHEN** the consumer reads `data/verbs/frequency.json`
- **THEN** every lemma in `data/verbs/index.json` SHALL have a corresponding entry in frequency.json with a non-empty `tier` field

### Requirement: Expanded test surface

E2E coverage SHALL be updated to reflect the 200-verb corpus.

#### Scenario: Browse page lists at least 200 verbs

- **WHEN** the user visits `/browse`
- **THEN** the rendered table SHALL have at least 200 verb rows

#### Scenario: Tier-3 sample verbs render correctly

- **WHEN** the user visits `/verb/<sample>` for at least one tier-3 lemma per sub-batch (3a/3b/3c/3d)
- **THEN** the page SHALL render with full conjugation tables, IPA in the header, and reserved actions enabled

### Requirement: Husić cache citations are complete

For every corpus verb whose `id` matches a Husić paradigm cache file at `.cache/husic/<id>.jsonl`, the verb's `sources` field SHALL include at least one entry with `source: 'husic'`. The corresponding `reference` SHALL be either a hand-curated paradigm-model citation (e.g., `"1A"`, `"Auxiliary 2"`) or the parsed-cache canonical form `Husić 2002 — parsed cache (.cache/husic/<id>.jsonl)`.

This invariant is enforced by a unit test (`apps/web/lib/corpus-husic-citations.test.ts`) that fails the build if a corpus verb has a cache file but no `husic` citation, or vice versa.

#### Scenario: A corpus verb with a cache file cites Husić

- **GIVEN** a corpus verb with `id` `bashkoj` and a file at `.cache/husic/bashkoj.jsonl`
- **WHEN** the verb's JSON is loaded
- **THEN** `bashkoj.sources` SHALL include an entry with `source: 'husic'`
- **AND** that entry's `reference` SHALL match either a paradigm-model citation OR the canonical parsed-cache form

#### Scenario: A corpus verb without a cache file is unaffected

- **GIVEN** a corpus verb with `id` `fejoj` and no file at `.cache/husic/fejoj.jsonl`
- **WHEN** the verb's JSON is loaded
- **THEN** the absence of a `husic` citation SHALL NOT cause a build error

### Requirement: Mutated middle-passive stems are sourced cellOverrides

Mutated middle-passive stems SHALL be carried as sourced `cellOverrides`
when the engine cannot derive them from the principal parts, each verb
citing a source for the paradigm. `flas` SHALL use the **flit-** stem
(*flitem, flitet, flitej, …*) and `tërheq` the **tërhiq-** stem
(*tërhiqem, tërhiqet, tërhiqej, …*) for middle-passive present and
imperfect, per Newmark, Hubbard & Prifti (1982) and FGJSH.

#### Scenario: flas middle-passive present uses the flit- stem

- **WHEN** `conjugate('flas', { mood: 'indicative', tense: 'present',
  voice: 'middle-passive', person: 3, number: 'singular' })` runs
- **THEN** the surface SHALL be `flitet`, never \*`flaset`
- **AND** the subjunctive present MP SHALL derive as `të flitet`

#### Scenario: tërheq middle-passive imperfect uses the tërhiq- stem

- **WHEN** the indicative imperfect middle-passive 3sg of `tërheq` is
  conjugated
- **THEN** the surface SHALL be `tërhiqej`, never \*`tërheqej`

#### Scenario: aorist middle-passive is unchanged

- **WHEN** the indicative aorist middle-passive 3sg of `flas` and `tërheq`
  are conjugated
- **THEN** the surfaces SHALL remain `u fol` and `u tërhoq`

#### Scenario: suppletive and mutating controls are unaffected

- **GIVEN** the suppletive verb `them` and the phonologically-mutating verb
  `djeg`
- **WHEN** their indicative present middle-passive 3sg cells are conjugated
- **THEN** the surfaces SHALL remain `thuhet` and `digjet`

### Requirement: Impersonal middle-passive verbs use the third-person flag

Verbs whose middle-passive SHALL be restricted to impersonal (third-person)
use — per FGJSH *vetv.* marking and corpus attestation — carry
`flags.middlePassiveThirdPersonOnly` rather than `noMiddlePassive`. `iki`,
`gjezdis`, and `qendroj` SHALL conjugate third-person middle-passive cells
(*iket*, *gjezdiset*, *qëndrohet*) and SHALL refuse first/second-person
middle-passive cells with `UnsupportedCellError`.

#### Scenario: iket conjugates, ikem refuses

- **WHEN** the indicative present middle-passive 3sg of `iki` is conjugated
- **THEN** the surface SHALL be `iket`
- **AND** the same cell with person 1 SHALL throw `UnsupportedCellError`

#### Scenario: qëndrohet resolves the Husić conflict

- **WHEN** the indicative present middle-passive 3sg of `qendroj` is
  conjugated
- **THEN** the surface SHALL be `qëndrohet`, matching the Husić cache row

#### Scenario: suppletive and mutating full-MP verbs are unaffected

- **GIVEN** the suppletive verb `them` and the phonologically-mutating verb
  `djeg`
- **WHEN** their first-person middle-passive present cells are conjugated
- **THEN** they SHALL conjugate normally (`thuhem`, `digjem`) — the
  restriction applies only to flagged verbs

### Requirement: Verification treats voice-flag refusals as decisions

`scripts/verify-engine.ts` SHALL count a cell as a match when the engine
refuses it due to an editorial voice flag (`noMiddlePassive`, or
`middlePassiveThirdPersonOnly` on a non-third-person middle-passive cell),
regardless of mechanically-generated source-cache rows, and SHALL report
the number of such flag-suppressed cells (and how many carried source
data) so the conflicts stay visible.

#### Scenario: Flagged verb with Husić rows verifies clean

- **GIVEN** a verb flagged `middlePassiveThirdPersonOnly` whose Husić cache
  carries first-person middle-passive rows
- **WHEN** verify-engine probes those cells
- **THEN** they SHALL count as flag-suppressed matches, not mismatches
- **AND** the summary SHALL report the flag-suppressed total

### Requirement: Voice-flag decisions are grounded in full-corpus evidence

Voice-flag changes SHALL cite full-corpus attestation counts, and `udhetoj`
SHALL carry no middle-passive restriction: its non-active paradigm
(*udhëtohet*, *udhëtohej*, *udhëtohesh*, …) conjugates mechanically like
`shkoj`'s. Verbs whose non-active surfaces are homograph-contaminated
(`rri` via `rrah`, `vij` via `vë`) SHALL keep their flags with the
contamination recorded as the rationale.

#### Scenario: udhëtohet conjugates across persons

- **WHEN** the indicative present middle-passive of `udhetoj` is conjugated
  for 3sg and 2sg
- **THEN** the surfaces SHALL be `udhëtohet` and `udhëtohesh`
- **AND** neither SHALL throw `UnsupportedCellError`

#### Scenario: Suppletive and mutating controls unaffected

- **GIVEN** the suppletive verb `them` and the mutating verb `pjek`
- **WHEN** their present middle-passive 3sg cells are conjugated
- **THEN** the surfaces SHALL remain `thuhet` and `piqet`

#### Scenario: rri remains flagged with rationale

- **WHEN** a middle-passive cell of `rri` is requested
- **THEN** the engine SHALL throw `UnsupportedCellError`
- **AND** the corpora README SHALL record the rrihet/rrah homograph
  contamination as the reason

