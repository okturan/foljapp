## MODIFIED Requirements

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

## ADDED Requirements

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
