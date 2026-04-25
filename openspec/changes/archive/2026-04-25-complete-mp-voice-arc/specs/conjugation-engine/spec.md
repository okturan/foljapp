## MODIFIED Requirements

### Requirement: Optative mood coverage

The engine SHALL produce correct forms for every cell of the optative mood across these 2 tenses: `present`, `perfect`. The optative is built on the optative-stem ending `-fsh-` family for the present, and on `paça`-style auxiliary plus participle for the perfect. Middle-passive optative forms SHALL be constructed by prefixing the `u` voice-marker to the active form for the simple tense (`present`), and by composing `qofsha`/`qofshim`/etc. (jam optative present) plus the participle for the compound tense (`perfect`).

#### Scenario: Present optative class 1 across all six cells

- **WHEN** `conjugate("punoj", { mood: "optative", tense: "present", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each cell
- **THEN** the engine SHALL return forms `punofsha`, `punofsh`, `punoftë`, `punofshim`, `punofshi`, `punofshin`

#### Scenario: MP optative present prefixes u-marker

- **WHEN** `conjugate("punoj", { mood: "optative", tense: "present", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"u punofsha"`
- **AND** the decomposition SHALL begin with a segment with `surface: "u"` and `role: "voice-marker"` and `meta.particleName: "u"`

#### Scenario: MP optative present 6-cell coverage for laj (matches Kaikki)

- **WHEN** `conjugate("laj", { mood: "optative", tense: "present", voice: "middle-passive", polarity: "affirmative", modality: "declarative" })` is invoked for each of the six person/number cells in order 1sg, 2sg, 3sg, 1pl, 2pl, 3pl
- **THEN** the engine SHALL return forms `u lafsha`, `u lafsh`, `u laftë`, `u lafshim`, `u lafshit`, `u lafshin`

#### Scenario: MP optative perfect uses jam-aux composition

- **WHEN** `conjugate("punoj", { mood: "optative", tense: "perfect", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"qofsha punuar"`

### Requirement: Active and middle-passive voice

The engine SHALL support both `active` and `middle-passive` voices. Middle-passive simple tenses SHALL surface with the `u` particle prefixing the form (admirative simple tenses, aorist, optative present); middle-passive compound tenses SHALL use `jam` as the auxiliary regardless of the verb's declared `auxiliary`. The `u` particle SHALL appear as a decomposition segment with `role: "voice-marker"` and `particleName: "u"`. The engine SHALL NOT silently return active forms for MP requests on any cell — every MP cell either renders with a voice-distinguishing surface (`u`-prefix or `jam`-aux) or throws `UnsupportedCellError`.

#### Scenario: Middle-passive aorist injects "u" particle

- **WHEN** `conjugate("laj", { mood: "indicative", tense: "aorist", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL begin with `"u "`
- **AND** the decomposition SHALL contain a segment with `role: "voice-marker"` and `particleName: "u"`

#### Scenario: Middle-passive perfect uses jam-auxiliary

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "perfect", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"jam punuar"`

#### Scenario: Middle-passive present uses dedicated endings

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "present", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"punohem"`

#### Scenario: MP admirative simple tenses prefix u-particle (regression check for the buildSimpleCell bug)

- **WHEN** `conjugate(verb, { mood: "admirative", tense: "present" | "imperfect", voice: "middle-passive", person, number, polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL begin with `"u "`
- **AND** the decomposition SHALL contain a segment with `role: "voice-marker"` and `particleName: "u"`
- **AND** the surface form after the `u ` prefix SHALL match the active-voice equivalent (e.g., MP `u folkësha` shares its non-particle segments with active `folkësha`)

#### Scenario: No MP cell silently returns the active form (audit)

- **WHEN** the audit test iterates every cell of `engine.table(verb)` for `verb` in `['punoj', 'flas', 'shoh', 'pjek']`
- **THEN** for every cell present at key `<cell>.middle-passive`, the cell's surface form SHALL satisfy at least one of these:
  1. The form starts with `'u '` (u-prefixed simple tense), OR
  2. The form starts with one of `'qenkam'`, `'qenke'`, `'qenka'`, `'qenkemi'`, `'qenkeni'`, `'qenkan'`, `'qenkësha'`, `'qenkëshe'`, `'qenkësh'`, `'qenkëshim'`, `'qenkëshit'`, `'qenkëshin'`, `'jam'`, `'je'`, `'është'`, `'jemi'`, `'jeni'`, `'janë'`, `'isha'`, `'ishe'`, `'ishte'`, `'ishim'`, `'ishit'`, `'ishin'`, `'qofsha'`, `'qofsh'`, `'qoftë'`, `'qofshim'`, `'qofshit'`, `'qofshin'`, `'qe'`, `'qeshë'`, `'qemë'`, `'qetë'`, `'qenë'` (jam-paradigm-derived auxiliary), OR
  3. The form ends in MP-specific endings `-em`, `-esh`, `-et`, `-emi`, `-eni`, `-en`, `-esha`, `-eshe`, `-ej`, `-eshim`, `-eshit`, `-eshin`, `-hem`, `-hesh`, `-het`, `-hemi`, `-heni`, `-hen`, `-hesha`, `-heshe`, `-hej`, `-heshim`, `-heshit`, `-heshin` (the dedicated MP indicative present/imperfect endings)
- **AND** if none of these patterns match, the test SHALL fail with a clear "MP cell silently returned active form" diagnostic

## ADDED Requirements

### Requirement: verify-engine probes MP optative present

The `scripts/verify-engine.ts` cell list SHALL include `{ mood: 'optative', tense: 'present', voice: 'middle-passive' }`. The match-rate baseline SHALL be updated to reflect the new cell coverage.

#### Scenario: MP optative present matches Kaikki for laj

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **THEN** the script SHALL report a match for `laj` MP optative present 1sg (engine output `u lafsha` matches Kaikki `u lafsha`)
- **AND** the script SHALL report zero mismatches across all corpus verbs for MP optative present
