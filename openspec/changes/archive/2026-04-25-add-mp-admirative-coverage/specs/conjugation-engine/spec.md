## MODIFIED Requirements

### Requirement: Admirative mood coverage

The engine SHALL produce correct forms for every cell of the admirative mood across these 4 tenses: `present`, `imperfect`, `perfect`, `pluperfect`. Active-voice admirative forms SHALL be constructed by attaching the admirative endings (`-kam/-ke/-ka/-kemi/-keni/-kan` for present and `-kësha/-këshe/-kësh/-këshim/-këshit/-këshin` for imperfect) to the trimmed participle stem (per the admirative-trim policy that maps `-uar/-ar` → trim 1, `-ur` → trim 2, `-rë` → trim 2, `-rrë` → trim 1, `-ë` → trim 1). Compound admirative tenses (perfect, pluperfect) SHALL be composed as the appropriate admirative form of `kam` followed by the lexical verb's participle. The active simple admirative tenses SHALL be returned by the engine without external particles.

Middle-passive admirative forms SHALL be constructed as follows:
- **Simple tenses** (present, imperfect): the `u` particle SHALL prefix the active form. E.g., `u folkam` for MP admirative present 1sg of `flas`; `u folkësha` for MP admirative imperfect 1sg.
- **Compound tenses** (perfect, pluperfect): the auxiliary SHALL be `jam` regardless of `entry.auxiliary`. Perfect uses `qenkam + participle` (jam admirative present + participle); pluperfect uses `qenkësha + participle` (jam admirative imperfect + participle).

#### Scenario: Present admirative class 1 across all six cells

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "present", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each cell
- **THEN** the engine SHALL return forms `punuakam`, `punuake`, `punuaka`, `punuakemi`, `punuakeni`, `punuakan`

#### Scenario: Perfect admirative 1sg for class 1

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "perfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"paskam punuar"`

#### Scenario: MP admirative present prefixes u-particle

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "present", voice: "middle-passive", person: 3, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"u folka"`
- **AND** the decomposition SHALL contain a segment with `surface: "u"` and `role: "voice-marker"` and `particleName: "u"`

#### Scenario: MP admirative imperfect prefixes u-particle

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "imperfect", voice: "middle-passive", person: 3, number: "plural", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"u folkëshin"`

#### Scenario: MP admirative perfect uses jam-aux composition

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "perfect", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"qenkam folur"`

#### Scenario: MP admirative pluperfect uses jam-aux composition

- **WHEN** `conjugate("flas", { mood: "admirative", tense: "pluperfect", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"qenkësha folur"`

#### Scenario: MP admirative present 1sg works for all corpus verbs (no longer silently returns active form)

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "present", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"u punuakam"` (NOT `"punuakam"`, which was the pre-fix bug behavior)

#### Scenario: MP admirative for suppletive verb shoh

- **WHEN** `conjugate("shoh", { mood: "admirative", tense: "imperfect", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"u pakësha"`

### Requirement: Active and middle-passive voice

The engine SHALL support both `active` and `middle-passive` voices. Middle-passive simple tenses SHALL surface with the `u` particle prefixing the form (admirative simple tenses, aorist, imperfect of certain verbs); middle-passive compound tenses SHALL use `jam` as the auxiliary regardless of the verb's declared `auxiliary`. The `u` particle SHALL appear as a decomposition segment with `role: "voice-marker"` and `particleName: "u"`.

#### Scenario: Middle-passive aorist injects "u" particle

- **WHEN** `conjugate("laj", { mood: "indicative", tense: "aorist", voice: "middle-passive", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL begin with `"u "`
- **AND** the decomposition SHALL contain a segment with `role: "voice-marker"` and `particleName: "u"` (consistent with MP aorist)

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

## ADDED Requirements

### Requirement: verify-engine treats Kaikki "u —" as no-ground-truth

The `scripts/verify-engine.ts` script SHALL handle Kaikki forms with surface `"u —"` (Kaikki's marker for "this cell is grammatically unattested") by treating them as equivalent to `kaikkiForm === null` — neither match nor mismatch. The engine MAY produce a derivable surface form for these cells; verify-engine SHALL NOT report a mismatch when our engine outputs a form that Kaikki marks as nonexistent.

#### Scenario: u-em-dash cells skip the comparison

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **AND** Kaikki contains an entry with surface `"u —"` for some cell of some verb
- **THEN** the script SHALL NOT count that cell as a mismatch
- **AND** the script SHALL NOT count that cell as a match
- **AND** the script SHALL log it as `missing-kaikki` or equivalent (consistent with cells where Kaikki has no entry at all)
