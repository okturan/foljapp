## ADDED Requirements

### Requirement: toIpa(text) maps Albanian text to its IPA transcription

`apps/web/lib/ipa.ts` SHALL export a pure function `toIpa(text: string): string` that returns the IPA transcription of the input. The function SHALL recognize Albanian digraphs (`dh`, `gj`, `ll`, `nj`, `rr`, `sh`, `th`, `xh`, `zh`) and the special character `ç` as units, mapping each to its phonemic IPA value. Single letters SHALL map per the standard Albanian phonemic inventory.

#### Scenario: Single-letter mapping

- **WHEN** `toIpa("punoj")` is invoked
- **THEN** the result SHALL equal `"punɔj"` (or contain that core, optionally bracketed)

#### Scenario: Digraph recognition

- **WHEN** `toIpa("shoh")` is invoked
- **THEN** the result SHALL equal `"ʃɔh"`

#### Scenario: ë maps to ə

- **WHEN** `toIpa("bëj")` is invoked
- **THEN** the result SHALL equal `"bəj"`

#### Scenario: Multiple digraphs in one word

- **WHEN** `toIpa("thashë")` is invoked
- **THEN** the result SHALL equal `"θaʃə"`

#### Scenario: Multi-word forms preserve word boundaries

- **WHEN** `toIpa("kam punuar")` is invoked
- **THEN** the result SHALL contain a space separating the two words' transcriptions
- **AND** SHALL equal `"kam punuaɾ"`

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
