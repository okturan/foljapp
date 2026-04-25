## MODIFIED Requirements

### Requirement: Default stress placement is penultimate

`apps/web/lib/stress.ts` SHALL export a pure function `placeStress(syllables: Syllable[], override?: { stressedSyllableIndex: number }): number` returning the 0-based index of the stressed syllable. When `override` is supplied and `stressedSyllableIndex` is in range, that index SHALL be returned. Otherwise:

- For monosyllabic words (`syllables.length === 1`), the stressed index is `0`.
- For polysyllabic words (`syllables.length >= 2`), the default stressed index is `syllables.length - 2` (the penultimate syllable).

The implementation SHALL include a documented heuristic exception for words whose final syllable has coda `j` and a vowel nucleus (covers Class 1 -j-verb lemmas + most -j-ending derivations); such words receive final stress. Additional systematic exceptions identified during audit SHALL be encoded in the heuristic when their applicability is clear (e.g., aorist 3sg of Class 1 -j verbs); ambiguous one-off exceptions stay in the override registry.

#### Scenario: Penultimate stress on a longer word (no exception)

- **WHEN** `placeStress(syllabify("punuar"))` is invoked
- **THEN** the result SHALL point to the syllable `nu` (penultimate of `pu.nu.aɾ`), index `1`

#### Scenario: Monosyllabic returns 0

- **WHEN** `placeStress(syllabify("kam"))` is invoked
- **THEN** the result SHALL be `0`

#### Scenario: Override wins over default

- **WHEN** `placeStress(syllabify("kafe"), { stressedSyllableIndex: 1 })` is invoked
- **THEN** the result SHALL be `1` regardless of the default rule

#### Scenario: Penultimate stress on a 2-syllable -j-lemma uses the heuristic

- **WHEN** `placeStress(syllabify("punoj"))` is invoked
- **THEN** the result SHALL be `1` (final via -j-lemma exception; the active "punoj" lemma is final-stressed)

#### Scenario: Aorist 3sg of -j verbs may use a documented systematic exception

- **WHEN** `placeStress(syllabify("punoi"))` is invoked AND the heuristic for "Class 1 -j aorist 3sg final stress" is encoded in the implementation
- **THEN** the result SHALL be the index of the final syllable (`oi`), so the IPA emits `puˈnoi`

If the systematic exception is NOT yet encoded, this scenario SHALL be backed by an explicit override entry in `data/stress-overrides.json`.

### Requirement: Stress override registry data file

`data/stress-overrides.json` SHALL be a JSON-formatted registry of per-form stress overrides. Each entry SHALL have `form: string` (the surface lemma or conjugated form), `stressedSyllableIndex: number` (0-based), and a `source: string` field documenting why the override exists (typically a citation to a grammar reference). The registry SHALL be loaded at IPA-pipeline initialization and consulted by `toIpa` when a matching form is requested.

After this change is implemented, the registry SHALL contain entries documenting every stress divergence identified by the corpus-wide audit (target: 15–30 entries covering Latin/Greek borrowings, irregular natives, and aorist 3sg patterns until the heuristic absorbs them). Every entry's `source` field SHALL cite Newmark (1982) §2.4, Buchholz & Fiedler (1987) §1.2.3, or another comparable authority.

#### Scenario: Override registry is non-empty for known irregulars

- **WHEN** `data/stress-overrides.json` is loaded
- **THEN** it SHALL contain at least one entry for each of: a Class 1 -j verb lemma whose lemma stress is final (e.g., `punoj` → final), a final-stressed Latin borrowing if attested in our corpus, and at least one MP-stem irregular if attested
- **AND** every entry SHALL have a `source` field referencing Newmark (1982), Buchholz & Fiedler (1987), or a comparable authority

#### Scenario: toIpa consults the registry before applying defaults

- **WHEN** the registry contains `{ form: "punoj", stressedSyllableIndex: 1 }` and `toIpa("punoj")` is called
- **THEN** the resulting IPA SHALL place `ˈ` before the second syllable's onset (`puˈnɔj`)

## ADDED Requirements

### Requirement: scripts/audit-stress.ts surfaces stress divergences

`scripts/audit-stress.ts` SHALL iterate every corpus verb and emit a tabular report comparing the engine's IPA output (with current default rule + registry) against a hand-curated reference set documenting expected stress placement for each form. The reference set is encoded in the script (sourced from Newmark, Buchholz & Fiedler).

For each divergence between engine output and reference, the script SHALL print a diagnostic line including: verb id, form, engine IPA, expected IPA, recommended action (add to registry / fix heuristic / known exception).

The script SHALL also be runnable as a vitest "audit-stress" scenario that fails CI if any unflagged divergence is detected.

#### Scenario: audit-stress runs cleanly when registry is up-to-date

- **WHEN** `npx tsx scripts/audit-stress.ts` is run
- **AND** `data/stress-overrides.json` covers every documented divergence
- **THEN** the script SHALL exit zero with output `✓ Stress audit clean: <N> forms checked, 0 unflagged divergences`

#### Scenario: audit-stress flags an unflagged divergence

- **WHEN** the script encounters a verb form whose engine IPA differs from the reference AND no registry entry covers it
- **THEN** the script SHALL exit non-zero
- **AND** print a diagnostic line with the form, engine output, expected output, and recommended override entry

#### Scenario: audit-stress is integrated as a vitest scenario

- **WHEN** the unit test suite runs (`npm test`)
- **THEN** the audit-stress scenario SHALL be included in the test files
- **AND** SHALL run within ~5 seconds against the 100/200-verb corpus
- **AND** SHALL fail the suite if unflagged divergences exist
