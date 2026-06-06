## ADDED Requirements

### Requirement: Middle-passive aorist 3sg uses the bare aorist stem

When the engine builds indicative aorist for `voice: 'middle-passive'` and `person: 3` with `number: 'singular'`, the produced surface form SHALL equal `u <aorist-stem>` where `<aorist-stem>` is the verb's `principalParts.aorist`. The form SHALL NOT use the active 3sg ending (which surfaces as `-i` for Class 1 `-oj` and Class 2 verbs, `-u` for Class 1B `-aj`/`-ej` and Class 3, etc.).

The decomposition SHALL contain exactly two segments: a `voice-marker` segment with surface `u` and `particleName: 'u'`, followed by a `stem` segment with the aorist-stem surface.

For other `(person, number)` combinations under indicative aorist MP — `1sg`, `2sg`, `1pl`, `2pl`, `3pl` — the form SHALL remain `u <active-form>` as before.

If the verb entry defines `cellOverrides['indicative.aorist.middle-passive']['3sg']`, that override value SHALL win over the default bare-stem rule.

#### Scenario: Class 1 -oj verb produces u <aorist-stem>

- **WHEN** `conjugate('lexoj', { mood: 'indicative', tense: 'aorist', voice: 'middle-passive', person: 3, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** result.form SHALL equal `'u lexua'`
- **AND** the decomposition SHALL contain exactly the segments `[{ surface: 'u', role: 'voice-marker' }, { surface: 'lexua', role: 'stem' }]`

#### Scenario: Class 1A polysyllabic verb (punoj) is unaffected by stem alternation

- **WHEN** `conjugate('punoj', { mood: 'indicative', tense: 'aorist', voice: 'middle-passive', person: 3, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** result.form SHALL equal `'u punua'`

#### Scenario: Class 1B monosyllabic verb (bëj) emits the suppletive aorist stem

- **WHEN** `conjugate('bej', { mood: 'indicative', tense: 'aorist', voice: 'middle-passive', person: 3, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** result.form SHALL equal `'u bë'`

#### Scenario: Class 1B (laj) — bare aorist stem

- **WHEN** `conjugate('laj', { mood: 'indicative', tense: 'aorist', voice: 'middle-passive', person: 3, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** result.form SHALL equal `'u la'`

#### Scenario: Class 2 verb (hap) — bare aorist stem

- **WHEN** `conjugate('hap', { mood: 'indicative', tense: 'aorist', voice: 'middle-passive', person: 3, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** result.form SHALL equal `'u hap'`

#### Scenario: Class 3 vowel-stem (pi) — bare aorist stem

- **WHEN** `conjugate('pi', { mood: 'indicative', tense: 'aorist', voice: 'middle-passive', person: 3, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** result.form SHALL equal `'u pi'`

#### Scenario: Other persons under MP aorist remain u + active-form

- **WHEN** `conjugate('lexoj', { mood: 'indicative', tense: 'aorist', voice: 'middle-passive', person: 1, number: 'singular', ... })` is invoked
- **THEN** result.form SHALL equal `'u lexova'`

- **WHEN** the same call but `person: 3, number: 'plural'`
- **THEN** result.form SHALL equal `'u lexuan'`

#### Scenario: cellOverride wins over the default

- **GIVEN** a corpus verb whose entry includes `cellOverrides: { 'indicative.aorist.middle-passive': { '3sg': 'u special-form' } }`
- **WHEN** the MP aorist 3sg is conjugated
- **THEN** result.form SHALL equal `'u special-form'`
