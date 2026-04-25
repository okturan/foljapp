# pronunciation Specification

## Purpose
TBD - created by archiving change add-pronunciation. Update Purpose after archive.
## Requirements
### Requirement: toIpa(text) maps Albanian text to its IPA transcription

`apps/web/lib/ipa.ts` SHALL export a pure function `toIpa(text: string, options?: ToIpaOptions): string` that returns the IPA transcription of the input. The function SHALL recognize Albanian digraphs (`dh`, `gj`, `ll`, `nj`, `rr`, `sh`, `th`, `xh`, `zh`) and the special character `ç` as units, mapping each to its phonemic IPA value. Single letters SHALL map per the standard Albanian phonemic inventory. The output SHALL include a primary-stress marker `ˈ` placed immediately before the onset of the stressed syllable in each word. Stress placement SHALL follow the rules in the "Default stress placement" requirement and the per-form override mechanism.

The optional second argument `options` SHALL support an `overrides?: StressOverride[]` field which the function consults before falling back to the default placement rule.

#### Scenario: Single-letter mapping with stress

- **WHEN** `toIpa("punoj")` is invoked
- **THEN** the result SHALL equal `"puˈnɔj"` (penultimate-stress default; here the stressed syllable is `nɔj` because the word is `pu.nɔj`)

Note: when stress falls on the first syllable of a polysyllabic word, the stress mark precedes that syllable: `toIpa("hapur")` → `"ˈhapuɾ"`.

#### Scenario: Digraph recognition with stress

- **WHEN** `toIpa("shoh")` is invoked
- **THEN** the result SHALL equal `"ˈʃɔh"` (monosyllabic; primary stress on the only syllable)

#### Scenario: ë maps to ə with stress

- **WHEN** `toIpa("bëj")` is invoked
- **THEN** the result SHALL equal `"ˈbəj"` (monosyllabic)

#### Scenario: Multiple digraphs in one word with stress

- **WHEN** `toIpa("thashë")` is invoked
- **THEN** the result SHALL equal `"ˈθaʃə"` (penultimate stress on `θa`)

#### Scenario: Multi-word forms preserve word boundaries and per-word stress

- **WHEN** `toIpa("kam punuar")` is invoked
- **THEN** the result SHALL contain a space separating the two words' transcriptions
- **AND** SHALL equal `"ˈkam puˈnuaɾ"` (each word independently stressed)

#### Scenario: Stress overrides override the default rule

- **WHEN** `toIpa("kafé", { overrides: [{ form: "kafé", stressedSyllableIndex: 1 }] })` is invoked (hypothetical Latin-borrowing example)
- **THEN** the resulting IPA SHALL place `ˈ` before the second syllable's onset, not the default penultimate

### Requirement: Verb page surfaces IPA in the header

The `VerbHeader` component SHALL render the lemma's IPA transcription in slashes (`/.../`) directly beneath the lemma. It SHALL also render the IPA next to each principal part (present, aorist, participle).

#### Scenario: punoj page shows /punɔj/ under the lemma

- **WHEN** the user visits `/verb/punoj`
- **THEN** the rendered HTML SHALL contain the text `/punɔj/`
- **AND** the principal-parts row SHALL show IPA for each of `puno`, `punua`, `punuar`

### Requirement: API exposes IPA in the JSON detail response

`GET /api/verbs/[lemma]` (default JSON format) SHALL include an `ipa` field on the response containing the lemma's IPA and each principal part's IPA. Backwards-compatible additive change.

#### Scenario: API JSON includes ipa field

- **WHEN** the user requests `GET /api/verbs/punoj`
- **THEN** the JSON response SHALL contain `ipa.lemma === "punɔj"`
- **AND** SHALL contain IPA values for `principalParts.present`, `principalParts.aorist`, `principalParts.participle`

### Requirement: syllabify(word) splits an Albanian word into syllables

`apps/web/lib/syllabify.ts` SHALL export a pure function `syllabify(word: string): Syllable[]` that splits an Albanian word into syllables according to standard Albanian phonotactics. The implementation SHALL apply the maximum-onset principle: consonants between vowels attach to the following syllable as long as the resulting onset is a permissible Albanian onset cluster. Each `Syllable` SHALL be an object with at least `onset: string`, `nucleus: string`, `coda: string`, and the original `surface: string`.

#### Scenario: Open syllables

- **WHEN** `syllabify("punoj")` is invoked
- **THEN** the result SHALL be `[{ surface: "pu", onset: "p", nucleus: "u", coda: "" }, { surface: "noj", onset: "n", nucleus: "ɔ", coda: "j" }]` (or equivalent representation; the split is between `pu` and `noj`)

#### Scenario: Single-syllable word

- **WHEN** `syllabify("kam")` is invoked
- **THEN** the result SHALL be a single-element array `[{ surface: "kam", onset: "k", nucleus: "a", coda: "m" }]`

#### Scenario: Initial vowel (no onset)

- **WHEN** `syllabify("është")` is invoked
- **THEN** the first syllable SHALL have `onset: ""`, `nucleus: "ë"`, `coda: ""` (open) or `coda: "sht"` depending on syllable boundary; the boundary SHALL respect maximum-onset, so the result is `[{ surface: "ë", ... }, { surface: "shtë", onset: "sht", nucleus: "ë", coda: "" }]`

#### Scenario: Digraph-internal split is not allowed

- **WHEN** `syllabify("punohem")` is invoked
- **THEN** the digraph `sh` from a hypothetical input SHALL NOT be split; digraphs are atomic. (This scenario is illustrative; `punohem` has no digraph but the rule applies generally.)

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

### Requirement: API JSON includes stress-marked IPA

The `/api/verbs/[lemma]?format=json` response's `ipa` field SHALL contain stress-marked IPA strings. Consumers parsing the IPA SHALL accept the `ˈ` character as a valid IPA primary-stress marker per the IPA convention.

#### Scenario: punoj API response includes stress-marked IPA

- **WHEN** `GET /api/verbs/punoj` is invoked
- **THEN** the response body's `ipa.lemma` field SHALL contain the `ˈ` character at the correct stress position
- **AND** the IPA value SHALL include the `ˈ` marker before the stressed syllable

### Requirement: Verb header surfaces stress-marked IPA

The `VerbHeader` component (already specified by `add-pronunciation`) SHALL render the stress-marked IPA. No additional UI is required beyond what `toIpa` returns.

#### Scenario: punoj header shows /puˈnɔj/

- **WHEN** the user visits `/verb/punoj`
- **THEN** the rendered header SHALL contain the substring `puˈnɔj` somewhere within the `/.../` IPA brackets

#### Scenario: kam header shows /ˈkam/

- **WHEN** the user visits `/verb/jam` (whose principal part includes `kam` if it appears as auxiliary; or whose lemma `jam` IPA is `/ˈjam/`)
- **THEN** the rendered IPA SHALL include the `ˈ` mark before the relevant syllable

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

