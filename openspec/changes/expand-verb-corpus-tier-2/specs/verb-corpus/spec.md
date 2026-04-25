## MODIFIED Requirements

### Requirement: Seed verb coverage

The seeded corpus SHALL contain at least **100** verb entries spanning all three classes and both auxiliaries. The corpus SHALL include the v0.1 seed (20 verbs), the tier-1 batch (30 verbs from `expand-verb-corpus-tier-1`), and a tier-2 batch of 50 high-frequency verbs across the following sub-batches:

- **Class 1, additional patterns**: at least 25 verbs covering `-oj` (the next 10 most-common after tier-1), `-aj` (e.g., `mbaj`, `ndaj`, `paguaj`), `-ej` (e.g., `gjej`, `kthej`, `pëlqej`), `-uaj` / `-yj` (e.g., `shkruaj`, `përshkruaj`).
- **Class 2, consonant stems**: at least 15 verbs covering regular (`prish`, `nis`, `vesh`, `ndal`, `ndez`, `përdor`) and additional mutating (`pres`, `vjedh`, `ec` patterns where applicable).
- **Class 3, vowel stems**: at least 10 verbs covering monosyllabic (`fle`, `lë`, `di`) and disyllabic (`vete`, `eci`) stems.

For each verb the entry SHALL include the same fields as v0.1 (`id`, `lemma`, `translationEn`, `class`, `auxiliary`, `principalParts`, `sources`, optional `flags`, `dialect`, `notes`, `cellOverrides`). Sources SHALL include at least Kaikki; irregular verbs (those with cellOverrides) SHALL also cite Husić when available.

#### Scenario: Total entry count is at least 100

- **WHEN** the consumer reads `data/verbs/index.json`
- **THEN** the index array SHALL have length ≥ 100

#### Scenario: All three classes are represented in tier-2 lemmas

- **WHEN** the consumer aggregates the tier-2 lemmas (those NOT in v0.1 seed and NOT in tier-1)
- **THEN** at least 25 SHALL have `class: 1`
- **AND** at least 15 SHALL have `class: 2`
- **AND** at least 10 SHALL have `class: 3`

#### Scenario: Tier-2 includes representative non--oj Class 1 endings

- **WHEN** the index lists tier-2 Class 1 verbs
- **THEN** at least one lemma SHALL end in `-aj` (e.g., `mbaj`)
- **AND** at least one SHALL end in `-ej` (e.g., `gjej`)
- **AND** at least one SHALL end in `-uaj` (e.g., `shkruaj`)

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

### Requirement: Frequency tier annotations for tier-2 verbs

Every newly-added tier-2 verb SHALL appear in `data/verbs/frequency.json` with a `tier` field of one of `core | common | uncommon | rare`. The annotation SHALL be hand-curated against Kote & Biba 2019 ranks; design D3 documents the criteria.

#### Scenario: Every tier-2 verb has a frequency tier

- **WHEN** the consumer reads `data/verbs/frequency.json`
- **THEN** every lemma in `data/verbs/index.json` SHALL have a corresponding entry in frequency.json with a non-empty `tier` field

### Requirement: Engine round-trip baseline grows with corpus

The `verify-engine.ts` baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to reflect the expanded corpus. The new total cell count SHALL be ≥ 8500 (100 verbs × 85 cells/verb minimum), with 100% match-rate maintained.

#### Scenario: Baseline reflects the expanded corpus

- **WHEN** the change is archived
- **THEN** `packages/engine/docs/sources.md` SHALL show a baseline like `8500+ / 8500+ cells across 100 verbs` (exact figure determined at archive time)
- **AND** the per-class breakdown SHALL list verb counts per class
