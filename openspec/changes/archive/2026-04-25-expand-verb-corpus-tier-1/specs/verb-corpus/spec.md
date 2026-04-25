## MODIFIED Requirements

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

## ADDED Requirements

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
