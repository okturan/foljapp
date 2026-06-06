## ADDED Requirements

### Requirement: verify-engine compares both voices across all supported moods/tenses

`scripts/verify-engine.ts` SHALL probe the engine for `voice: 'active'` AND `voice: 'middle-passive'` for every supported (mood, tense) combination, including indicative {present, imperfect, aorist, perfect, pluperfect, future}, subjunctive {present, imperfect, perfect, pluperfect}, conditional {present, perfect}, optative present, and admirative {present, imperfect, perfect, pluperfect}. Cells where the engine raises `UnsupportedCellError` SHALL count as `missing-kaikki` rather than `mismatch`.

The verifier's surface-shape filter SHALL recognize MP forms behind mood particles `të`, `do të`, and `do` so that subjunctive-, conditional-, and future-MP forms in Kaikki/Husić caches successfully match against engine output.

#### Scenario: indicative aorist MP probe lands

- **GIVEN** the corpus contains a verb whose Husić-direct cache has `{"form": "u bë", "tags": ["aorist", "indicative", "middle-passive", "singular", "third-person"]}`
- **WHEN** `verify-engine.ts` runs against that verb
- **THEN** the cell `indicative/aorist/middle-passive/3sg` SHALL be probed
- **AND** if the engine emits `'u bë'`, the outcome SHALL be `match` with `matchSource: 'h'`

#### Scenario: subjunctive present MP form is recognized

- **GIVEN** Kaikki has a form `'të lexohem'` tagged `[first-person, present, singular, subjunctive]`
- **WHEN** the verifier asks for `subjunctive.present.middle-passive.1sg`
- **THEN** `formMatchesVoice('të lexohem', 'middle-passive', { mood: 'subjunctive', tense: 'present' })` SHALL return `true`
- **AND** the form SHALL be available to match against engine output

#### Scenario: conditional present MP form is recognized

- **GIVEN** Kaikki has a form `'do të lexohem'` tagged `[conditional, first-person, imperfect, singular]` (Kaikki uses imperfect-shape tag for conditional present)
- **WHEN** the verifier asks for `conditional.present.middle-passive.1sg`
- **THEN** `formMatchesVoice('do të lexohem', 'middle-passive', { mood: 'conditional', tense: 'present' })` SHALL return `true`

#### Scenario: active form is not falsely flagged as MP

- **GIVEN** an active subjunctive form `'të lexoj'`
- **WHEN** voice='active' is requested
- **THEN** `formMatchesVoice('të lexoj', 'active', { mood: 'subjunctive', tense: 'present' })` SHALL return `true` (peeling `të ` leaves `lexoj`, which has no MP shape)
