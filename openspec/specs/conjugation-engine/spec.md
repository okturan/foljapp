# conjugation-engine Specification

## Purpose
TBD - created by archiving change add-conjugation-engine. Update Purpose after archive.
## Requirements
### Requirement: Public conjugation API surface

The `@foljapp/engine` package SHALL export a single primary function `conjugate(verbId, options)` plus typed result and error types. The function SHALL be synchronous, deterministic, and free of side effects (no I/O, no `Math.random`, no `Date.now`). Inputs SHALL be a `verbId` string matching a known corpus lemma and an `options` object specifying mood, tense, person, number, voice, polarity, and modality.

#### Scenario: Function is exported and callable

- **WHEN** a consumer imports `conjugate` from `@foljapp/engine`
- **AND** invokes `conjugate("punoj", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })`
- **THEN** the call SHALL return synchronously
- **AND** the result SHALL be a `ConjugationResult` object containing at minimum a `form` string and a `decomposition` array

#### Scenario: Determinism across repeated calls

- **WHEN** the same `conjugate(verbId, options)` call is made twice in the same process
- **THEN** both calls SHALL return deeply-equal results
- **AND** neither call SHALL mutate the input options or any module-level state

### Requirement: Morphological role decomposition

Every `ConjugationResult` SHALL include a `decomposition` array of segments. Each segment SHALL carry a `surface` string and a `role` label drawn from the closed set: `particle`, `auxiliary`, `stem`, `ending`, `voice-marker`. Concatenating all segment surfaces in order, separated by single spaces where the original form contains spaces, SHALL exactly reproduce the `form` string.

#### Scenario: Single-word indicative form decomposes into stem and ending

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "plural", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"punojmë"`
- **AND** result.decomposition SHALL contain exactly two segments
- **AND** the first segment SHALL be `{ surface: "puno", role: "stem" }`
- **AND** the second segment SHALL be `{ surface: "jmë", role: "ending" }`

#### Scenario: Compound perfect form decomposes into auxiliary, stem, ending

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "perfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"kam punuar"`
- **AND** result.decomposition SHALL contain a segment with role `auxiliary` and surface `"kam"`
- **AND** result.decomposition SHALL contain a segment with role `stem` and surface `"punu"`
- **AND** result.decomposition SHALL contain a segment with role `ending` and surface `"ar"`

#### Scenario: Subjunctive form decomposes including the particle

- **WHEN** `conjugate("punoj", { mood: "subjunctive", tense: "present", voice: "active", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"të punosh"`
- **AND** result.decomposition[0] SHALL equal `{ surface: "të", role: "particle" }`
- **AND** subsequent segments SHALL include stem `"puno"` and ending `"sh"`

### Requirement: Indicative mood coverage — all 9 finite tenses

The engine SHALL produce correct forms for every cell (6 person/number combinations, 2 voices, 2 polarities, 2 modalities) of the indicative mood across these 9 finite tenses: `present` (e tashme), `imperfect` (e pakryer), `aorist` (e kryer e thjeshtë), `perfect` (e kryer), `pluperfect` (e më se e kryer), `past-anterior` (e kryer e tejshkuar), `future` (e ardhme), `future-perfect` (e ardhme e përparme), `future-in-past` (e ardhme e së shkuarës).

#### Scenario: Class 1 present active across all six cells

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "present", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each of the six person/number combinations
- **THEN** the engine SHALL return forms `punoj`, `punon`, `punon`, `punojmë`, `punoni`, `punojnë` for 1sg, 2sg, 3sg, 1pl, 2pl, 3pl respectively

#### Scenario: Class 2 imperfect active across all six cells

- **WHEN** `conjugate("hap", { mood: "indicative", tense: "imperfect", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each cell
- **THEN** the engine SHALL return forms `hapja`, `hapje`, `hapte`, `hapnim`, `hapnit`, `hapnin`

#### Scenario: Aorist active for a phonologically-mutating verb pjek

- **WHEN** `conjugate("pjek", { mood: "indicative", tense: "aorist", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each cell
- **THEN** the engine SHALL return forms `poqa`, `poqe`, `poqi`, `poqëm`, `poqët`, `poqën`

#### Scenario: Perfect active for class 1 punoj 1sg

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "perfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"kam punuar"`

### Requirement: Subjunctive mood coverage

The engine SHALL produce correct forms for every cell of the subjunctive mood across these 4 tenses: `present`, `imperfect`, `perfect`, `pluperfect`. All subjunctive forms SHALL begin with the particle `të`, surfaced as a `particle`-role segment in the decomposition.

#### Scenario: Present subjunctive class 1 across all six cells

- **WHEN** `conjugate("punoj", { mood: "subjunctive", tense: "present", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each cell
- **THEN** the engine SHALL return forms `të punoj`, `të punosh`, `të punojë`, `të punojmë`, `të punoni`, `të punojnë`

#### Scenario: Imperfect subjunctive 1sg for class 2

- **WHEN** `conjugate("hap", { mood: "subjunctive", tense: "imperfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"të hapja"`

### Requirement: Conditional mood coverage

The engine SHALL produce correct forms for every cell of the conditional mood across these 2 tenses: `present` (do të + imperfect subjunctive), `perfect` (do të + pluperfect subjunctive). All conditional forms SHALL begin with the two-token particle `do të`, surfaced as a single `particle`-role segment.

#### Scenario: Present conditional class 1 across all six cells

- **WHEN** `conjugate("punoj", { mood: "conditional", tense: "present", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each cell
- **THEN** the engine SHALL return forms `do të punoja`, `do të punoje`, `do të punonte`, `do të punonim`, `do të punonit`, `do të punonin`

#### Scenario: Perfect conditional 1sg for class 1

- **WHEN** `conjugate("punoj", { mood: "conditional", tense: "perfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"do të kisha punuar"`

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

### Requirement: Imperative mood coverage

The engine SHALL produce correct forms for the imperative mood, which is restricted to 2nd person singular and 2nd person plural cells. Other person/number cells SHALL produce a typed `UnsupportedCellError`. Active-voice imperative forms SHALL be derived from `paradigm.imperativeActive` (or per-verb `cellOverrides['imperative.present']`). Middle-passive imperative SHALL be supported only when the corpus entry carries explicit per-verb `cellOverrides['imperative.present.middle-passive']` for the requested cell; if no override exists, the engine SHALL throw `UnsupportedCellError`. The engine SHALL NOT silently fall back to active-voice forms for MP imperative requests.

#### Scenario: Imperative class 1

- **WHEN** `conjugate("punoj", { mood: "imperative", voice: "active", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` and the corresponding plural call are invoked
- **THEN** the engine SHALL return `puno` for 2sg and `punoni` for 2pl

#### Scenario: Imperative for an unsupported cell

- **WHEN** `conjugate("punoj", { mood: "imperative", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** the engine SHALL throw an `UnsupportedCellError`
- **AND** the error message SHALL identify the offending cell as `1sg`

#### Scenario: MP imperative throws for verbs without an explicit override

- **WHEN** `conjugate("punoj", { mood: "imperative", voice: "middle-passive", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** the engine SHALL throw an `UnsupportedCellError`
- **AND** the engine SHALL NOT return an active-voice form

#### Scenario: MP imperative for laj uses cellOverride

- **WHEN** `conjugate("laj", { mood: "imperative", voice: "middle-passive", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"lahu"`

- **WHEN** the same is called with `number: "plural"`
- **THEN** result.form SHALL equal `"lahuni"`

#### Scenario: MP imperative for shoh uses cellOverride

- **WHEN** `conjugate("shoh", { mood: "imperative", voice: "middle-passive", person: 2, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"shihu"`

- **WHEN** the same is called with `number: "plural"`
- **THEN** result.form SHALL equal `"shihuni"`

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

### Requirement: Negative polarity particle selection

The engine SHALL support `affirmative` and `negative` polarity. For negative polarity, the engine SHALL select the correct negation particle by mood: `nuk` for declarative indicative/admirative, `s'` as a colloquial alternative form available when `colloquial: true` is set in options, `mos` for imperative and subjunctive moods. The selected particle SHALL appear before any other particles in surface order and SHALL be tagged `particle` in the decomposition.

#### Scenario: Negative indicative present uses "nuk"

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular", polarity: "negative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"nuk punoj"`

#### Scenario: Negative imperative uses "mos"

- **WHEN** `conjugate("punoj", { mood: "imperative", voice: "active", person: 2, number: "singular", polarity: "negative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"mos puno"`

#### Scenario: Negative subjunctive uses "mos" before "të"

- **WHEN** `conjugate("punoj", { mood: "subjunctive", tense: "present", voice: "active", person: 1, number: "singular", polarity: "negative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"mos të punoj"` or `"të mos punoj"` depending on standard usage; the engine SHALL document its chosen ordering and apply it consistently

### Requirement: Interrogative modality

The engine SHALL support `declarative` and `interrogative` modality. For interrogative modality, the engine SHALL prefix the form with the optional question particle `a` and SHALL set a `interrogative: true` flag on the result. The `a` particle SHALL appear as a `particle`-role segment in the decomposition.

#### Scenario: Interrogative indicative present 2sg

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "present", voice: "active", person: 2, number: "singular", polarity: "affirmative", modality: "interrogative" })` is invoked
- **THEN** result.form SHALL equal `"a punon"`
- **AND** result.interrogative SHALL be `true`

### Requirement: Compound tense composition with kam-auxiliary

For verbs whose corpus entry declares `auxiliary: "kam"`, the engine SHALL build all compound tenses (perfect, pluperfect, past anterior, future perfect, future-in-past, future-perfect-in-past, perfect subjunctive, pluperfect subjunctive, perfect conditional, perfect admirative, perfect optative) by recursively conjugating `kam` in the appropriate finite tense and concatenating the lexical verb's participle.

#### Scenario: Pluperfect indicative for class 1

- **WHEN** `conjugate("punoj", { mood: "indicative", tense: "pluperfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"kisha punuar"`
- **AND** result.decomposition SHALL contain an `auxiliary` segment whose surface is `"kisha"` (the imperfect of `kam`)

### Requirement: Compound tense composition with jam-auxiliary

For verbs whose corpus entry declares `auxiliary: "jam"` or for any verb in middle-passive voice, the engine SHALL build compound tenses by recursively conjugating `jam` in the appropriate finite tense and concatenating the lexical verb's participle.

#### Scenario: Perfect of an intransitive verb that takes jam (vij — to come)

- **WHEN** `conjugate("vij", { mood: "indicative", tense: "perfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"kam ardhur"` if the corpus entry for `vij` declares `auxiliary: "kam"`, or `"jam ardhur"` if it declares `auxiliary: "jam"` — the engine SHALL respect the corpus declaration without overriding it
- **AND** the corpus entry for `vij` SHALL document its choice with a Husić paradigm citation

### Requirement: Phonological mutation — palatalization

When a verb stem ends in `k`, `g`, or `ll` and meets a suffix beginning with a front vowel (`e`, `i`, `ë`-after-front), the engine SHALL apply palatalization: `k → q`, `g → gj`, `ll → j`. The mutation SHALL apply uniformly across moods and tenses. The decomposition's `stem` segment SHALL surface the mutated form.

#### Scenario: pjek aorist 1sg surfaces "poqa" (k → q)

- **WHEN** `conjugate("pjek", { mood: "indicative", tense: "aorist", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"poqa"`
- **AND** result.decomposition stem segment SHALL surface as `"poq"` (the mutated form), not `"pjek"`

#### Scenario: djeg aorist 1sg surfaces "dogja" (g → gj realized as "g" before "j")

- **WHEN** `conjugate("djeg", { mood: "indicative", tense: "aorist", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"dogja"` per Husić paradigm for `djeg`
- **AND** the engine SHALL document this case in `packages/engine/docs/sources.md` with Husić paradigm reference

### Requirement: Vowel-collision resolution at stem-suffix boundaries

When a stem ending in a vowel meets a suffix beginning with a vowel, the engine SHALL apply Albanian's standard collision rules: identical vowels collapse to one; certain dissimilar pairs are resolved per the Husić paradigm rules referenced in the corpus entry. The engine SHALL NOT introduce hiatus that does not appear in standard orthography.

#### Scenario: pi (Class 3, vowel-final) present 1pl surfaces "pimë" not "piimë"

- **WHEN** `conjugate("pi", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "plural", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"pimë"`

### Requirement: Suppletive verb support — full hardcoded paradigms

The engine SHALL support five suppletive verbs whose roots vary across tenses: `jam` (to be), `jap` (to give), `shoh` (to see), `vij` (to come), `them` (to say). For these verbs, the engine SHALL bypass the regular paradigm machinery and read forms from a hardcoded suppletion table embedded in the engine package, not from the corpus JSON.

#### Scenario: jam present indicative across all six cells

- **WHEN** `conjugate("jam", { mood: "indicative", tense: "present", voice: "active", polarity: "affirmative", modality: "declarative" })` is invoked for each cell
- **THEN** the engine SHALL return `jam`, `je`, `është`, `jemi`, `jeni`, `janë`

#### Scenario: jam aorist 1sg returns "qeshë"

- **WHEN** `conjugate("jam", { mood: "indicative", tense: "aorist", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"qeshë"`

#### Scenario: jap present indicative 1sg returns "jap"; aorist 1sg returns "dhashë"

- **WHEN** `conjugate("jap", ...)` is invoked for present 1sg and aorist 1sg
- **THEN** the engine SHALL return `"jap"` for present and `"dhashë"` for aorist

#### Scenario: shoh participle returns "parë"

- **WHEN** `conjugate("shoh", { mood: "indicative", tense: "perfect", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })` is invoked
- **THEN** result.form SHALL equal `"kam parë"`

### Requirement: Non-finite forms — pjesore (participle)

The engine SHALL expose a `participle(verbId)` helper returning the verb's participle string. The participle SHALL also be retrievable via `conjugate(verbId, { mood: "non-finite", form: "participle" })`. Suppletive participles SHALL come from the suppletion table; regular participles SHALL come from the corpus entry's principal-parts.

#### Scenario: Participle of class 1 punoj is "punuar"

- **WHEN** `participle("punoj")` is invoked
- **THEN** the engine SHALL return `"punuar"`

#### Scenario: Participle of suppletive shoh is "parë"

- **WHEN** `participle("shoh")` is invoked
- **THEN** the engine SHALL return `"parë"`

### Requirement: Non-finite forms — paskajore, përcjellore, mohore, kohore

The engine SHALL expose helpers (or `conjugate` form values) for the four particle-based non-finite constructions: `infinitive` (Tosk: `për të` + participle), `gerund` (`duke` + participle), `privative` (`pa` + participle), `temporal` (`me të` + participle). Each SHALL surface its particle as a `particle`-role segment in the decomposition.

#### Scenario: Gerund of punoj surfaces "duke punuar"

- **WHEN** `conjugate("punoj", { mood: "non-finite", form: "gerund" })` is invoked
- **THEN** result.form SHALL equal `"duke punuar"`
- **AND** result.decomposition[0] SHALL equal `{ surface: "duke", role: "particle" }`

### Requirement: Auxiliary kam and jam paradigms are first-class

The engine SHALL include hardcoded paradigm tables for `kam` and `jam` covering every cell required to build any compound tense. These two verbs SHALL also be conjugatable through the public `conjugate` API.

#### Scenario: kam present indicative across all cells

- **WHEN** `conjugate("kam", ...)` is invoked across all six present-indicative cells
- **THEN** the engine SHALL return `kam`, `ke`, `ka`, `kemi`, `keni`, `kanë`

#### Scenario: jam imperfect indicative across all cells

- **WHEN** `conjugate("jam", ...)` is invoked across all six imperfect-indicative cells
- **THEN** the engine SHALL return `isha`, `ishe`, `ishte`, `ishim`, `ishit`, `ishin`

### Requirement: Engine version is exposed

The engine package SHALL export a `VERSION` constant matching its `package.json` version. Every `ConjugationResult` SHALL include the `engineVersion` field set to this constant. Consumers SHALL use this for citations and for cache-busting downstream artifacts.

#### Scenario: Version constant matches package version

- **WHEN** the consumer reads `import { VERSION } from "@foljapp/engine"`
- **THEN** `VERSION` SHALL equal the `version` field of `packages/engine/package.json`

#### Scenario: Result carries engineVersion

- **WHEN** any `conjugate(...)` call returns a result
- **THEN** result.engineVersion SHALL equal the exported `VERSION`

### Requirement: Typed errors for invalid input

The engine SHALL throw a typed error class for each well-defined failure mode: `UnknownVerbError` (no corpus entry), `UnsupportedCellError` (e.g., 1sg imperative), `InvalidOptionsError` (malformed options), `CorpusIntegrityError` (corpus entry missing required fields). All error classes SHALL extend a common `EngineError` base class for consumer narrowing.

#### Scenario: Unknown verbId throws UnknownVerbError

- **WHEN** `conjugate("xyznotaverb", { ...validOptions })` is invoked
- **THEN** the engine SHALL throw an `UnknownVerbError`
- **AND** the error message SHALL contain the offending verbId

#### Scenario: Invalid options throws InvalidOptionsError

- **WHEN** `conjugate("punoj", { mood: "imperative", tense: "future" })` is invoked (imperative has no future)
- **THEN** the engine SHALL throw an `InvalidOptionsError` describing the invalid combination

### Requirement: Engine purity — zero runtime dependencies

The `packages/engine/package.json` SHALL declare zero runtime `dependencies`. All paradigms, suppletion tables, and rules SHALL be embedded as TypeScript source. Build-time `devDependencies` (Vitest, TypeScript) are permitted.

#### Scenario: Production install of engine adds nothing transitive

- **WHEN** a consumer adds `@foljapp/engine` to their `dependencies` and runs `npm install --production`
- **THEN** no packages other than `@foljapp/engine` itself SHALL be installed under `node_modules` as a result of the engine's transitive closure

### Requirement: Conjugation tables — full mood/tense matrix helper

The engine SHALL expose a `table(verbId, options?)` helper that returns the complete conjugation matrix for the verb across all moods, tenses, voices, and cells in a single result. This SHALL be the primary interface consumed by the verb reference page.

#### Scenario: table call returns all moods

- **WHEN** `table("punoj")` is invoked
- **THEN** the result SHALL contain entries for all 6 moods (`indicative`, `subjunctive`, `conditional`, `admirative`, `optative`, `imperative`) and all non-finite forms
- **AND** every cell that the engine supports SHALL have a populated `form` and `decomposition`
- **AND** unsupported cells (e.g., imperative 1sg) SHALL be marked with `unsupported: true` rather than omitted

### Requirement: Per-cell overrides are consulted before paradigm dispatch

The engine SHALL consult `entry.cellOverrides` before dispatching to mood handlers for active-voice, affirmative-polarity, declarative-modality finite cells. The override key is `${mood}.${tense}` (e.g., `indicative.aorist`); the cell key is the standard label (`1sg`, `2sg`, …, `3pl`). When an override exists, the engine SHALL return it as the form, with a single `stem`-role decomposition segment carrying the entire override text.

#### Scenario: Top-level override returns the verbatim form

- **WHEN** the corpus entry for `iki` declares `cellOverrides["indicative.present"]["1sg"] = "iki"`
- **AND** the consumer invokes `conjugate("iki", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular", polarity: "affirmative", modality: "declarative" })`
- **THEN** result.form SHALL equal `"iki"`
- **AND** result.decomposition SHALL contain exactly one segment with role `stem`

#### Scenario: Overrides do NOT apply for negative polarity

- **WHEN** an override exists for `indicative.present.1sg` of some verb
- **AND** the consumer invokes `conjugate(...)` with `polarity: "negative"`
- **THEN** the engine SHALL go through normal paradigm dispatch and prepend `nuk`/`s'` per the polarity rule
- **AND** the override is NOT consulted at the top level

### Requirement: Per-cell overrides propagate into compound tenses via buildSimpleCell

The engine SHALL also consult overrides for "simple" inner cells when composing compound tenses. Specifically, when `buildSimpleCell` is invoked with a `tenseKey` whose corresponding `<mood>.<tense>` key has an override, the override SHALL be returned as the inner form. A leading `të ` particle in the override value SHALL be stripped (the orchestrator re-prepends mood particles).

#### Scenario: Future-tense composition picks up subjunctive override

- **WHEN** `ha`'s `cellOverrides["subjunctive.present"]["3sg"]` is `"të haje"`
- **AND** the consumer invokes `conjugate("ha", { mood: "indicative", tense: "future", voice: "active", person: 3, number: "singular" })`
- **THEN** result.form SHALL equal `"do të haje"` (composed as `do` + `të haje` from the subjunctive override)

### Requirement: Smart admirative-stem trim from participle ending

The engine's admirative paradigm cell rule SHALL compute the trim count dynamically from the participle's surface ending, not from a fixed per-class constant. The mapping:

| Participle ends in | Trim |
| ------------------ | ---- |
| `-rrë`             | 1    |
| `-rë`              | 2    |
| `-ur`              | 2    |
| `-uar` or `-ar`    | 1    |
| `-ë` (other)       | 1    |
| else               | 1    |

#### Scenario: Class 1 punoj admirative (`-uar` participle)

- **WHEN** `conjugate("punoj", { mood: "admirative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** result.form SHALL equal `"punuakam"` (participle `punuar` minus 1 char = `punua`, plus `kam`)

#### Scenario: Class 1B laj admirative (`-rë` participle)

- **WHEN** `conjugate("laj", { mood: "admirative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** result.form SHALL equal `"lakam"` (participle `larë` minus 2 chars = `la`, plus `kam`)

#### Scenario: marr admirative (`-rrë` participle preserves the rr)

- **WHEN** `conjugate("marr", { mood: "admirative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** result.form SHALL equal `"marrkam"` (participle `marrë` minus 1 char = `marr`, plus `kam`)

#### Scenario: Class 2 hap admirative (`-ur` participle)

- **WHEN** `conjugate("hap", { mood: "admirative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** result.form SHALL equal `"hapkam"` (participle `hapur` minus 2 chars = `hap`, plus `kam`)

### Requirement: jam optative 2pl is qofshit

The hardcoded jam (and shared-with-the-suppletion-table) optative present 2pl form SHALL be `qofshit`, not `qofshi`. This corrects a v0.1.0 typo.

#### Scenario: jam optative across all six cells matches Kaikki

- **WHEN** `conjugate("jam", { mood: "optative", tense: "present", voice: "active" })` is invoked across all six cells
- **THEN** the engine SHALL return `qofsha`, `qofsh`, `qoftë`, `qofshim`, `qofshit`, `qofshin`

### Requirement: shoh suppletive admirative drops -rë from participle

The hardcoded shoh suppletive admirative present forms SHALL be derived from the participle `parë` minus its `-rë` suffix, giving stem `pa`, with admirative endings `kam/ke/ka/kemi/keni/kan`.

#### Scenario: shoh admirative across all six cells

- **WHEN** `conjugate("shoh", { mood: "admirative", tense: "present", voice: "active" })` is invoked across all six cells
- **THEN** the engine SHALL return `pakam`, `pake`, `paka`, `pakemi`, `pakeni`, `pakan`

### Requirement: trace(verbId, options) returns ordered construction steps

`@foljapp/engine` SHALL export a function `trace(verbId, options)` accepting the same parameters as `conjugate()` and returning an ordered `TraceStep[]` describing how the form was built. The first step SHALL describe the corpus lookup; the last step SHALL be a `final` step containing the surface form. Intermediate steps document stem selection, paradigm rule application, auxiliary recursion (for compound tenses), phonological adjustments, and particle prepending.

#### Scenario: Trace for a simple class-1 present cell

- **WHEN** `trace("punoj", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** the result SHALL be an array of `TraceStep` records
- **AND** the first step SHALL have `kind: "corpus-lookup"` referencing `verbId: "punoj"`
- **AND** at least one step SHALL have `kind: "paradigm-rule"`
- **AND** the last step SHALL have `kind: "final"` and `form: "punoj"`

#### Scenario: Trace for a compound-tense cell includes auxiliary recursion

- **WHEN** `trace("punoj", { mood: "indicative", tense: "perfect", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** at least one step SHALL have `kind: "auxiliary-recursion"` describing the kam present 1sg = "kam" lookup
- **AND** the final step's `form` SHALL equal `"kam punuar"`

#### Scenario: Trace for a suppletive verb shows the suppletive-lookup step

- **WHEN** `trace("jam", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** at least one step SHALL have `kind: "suppletive-lookup"` referencing `verbId: "jam"`

#### Scenario: Trace for a particle-prefixed mood includes particle-prepend

- **WHEN** `trace("punoj", { mood: "subjunctive", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** at least one step SHALL have `kind: "particle-prepend"` with `particle: "të"`

### Requirement: TraceStep types

`TraceStep` SHALL be a discriminated union with the following `kind` values:

- `corpus-lookup` — the engine read the verb's principal parts from the corpus
- `suppletive-lookup` — the engine read a suppletive form from the hardcoded table
- `paradigm-rule` — the engine applied a paradigm cell rule (stem + ending)
- `auxiliary-recursion` — the engine recursively conjugated kam or jam
- `phonology` — a phonological rule fired (rare in v1; mostly safety net)
- `particle-prepend` — a particle was added (subjunctive, conditional, future, gerund, privative, temporal, infinitive, negation, interrogative, voice marker)
- `cell-override` — a corpus `cellOverrides` entry short-circuited the paradigm
- `final` — the resolved form

Each step SHALL include `kind`, a `summary` string, and any structured fields specific to the step type.

#### Scenario: Trace for an iki cell uses cell-override

- **WHEN** `trace("iki", { mood: "indicative", tense: "present", voice: "active", person: 1, number: "singular" })` is invoked
- **THEN** at least one step SHALL have `kind: "cell-override"` referencing the override `"iki"`

### Requirement: trace() and conjugate() agree on the surface form

For every `(verbId, options)` pair where `conjugate()` succeeds, `trace()` SHALL return an array whose final step's `form` field equals `conjugate()`'s `form` field. Both functions SHALL throw the same error type for the same invalid input.

#### Scenario: Trace and conjugate agree on a wide sample

- **WHEN** for every `Question` returned by `practice.generateQuestions({ count: 30 })`, both `conjugate()` and `trace()` are invoked
- **THEN** `conjugate(verbId, options).form` SHALL equal `trace(verbId, options).at(-1).form` for every cell

### Requirement: verify-engine covers admirative imperfect and pluperfect

The `scripts/verify-engine.ts` cell list SHALL include `{ mood: 'admirative', tense: 'imperfect' }` and `{ mood: 'admirative', tense: 'pluperfect' }` for active voice across all corpus verbs. The match-rate baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to the new total (current cells + new admirative cells), and the verification script SHALL maintain a 100% match against Kaikki for these new cells.

The script SHALL ALSO maintain accurate Kaikki tag mapping for moods Kaikki tags non-canonically (conditional present → `imperfect`, conditional perfect → `past + perfect`), and the past-disambiguation filter SHALL be mood-agnostic (auto-skip Kaikki forms tagged `past` when the wanted tag set does not include `past`).

The script SHALL consult a secondary verification source — Husić's *Albanian Verb Dictionary and Manual* (KU Libraries, 2002) — for cells where Kaikki returns no form. Husić data SHALL be cached at `.cache/husic/<id>.jsonl` in the same shape as the Kaikki cache. The dispatch order is Kaikki → Husić → no-ground-truth. Cells matched by Husić SHALL count toward the match-rate baseline. The script's output SHALL annotate the source of each match (e.g., `M (k)` for Kaikki, `M (h)` for Husić).

After this change is implemented, every corpus verb SHALL have a populated `.cache/husic/<id>.jsonl` file produced by `scripts/parse-husic.ts`. The combined Kaikki+Husić baseline SHALL exceed 6000 cells across the corpus and SHALL show 100% match-rate (zero engine-vs-source mismatches).

#### Scenario: Husić cache populated for every corpus verb

- **WHEN** `scripts/parse-husic.ts --source <digital-husic>` has been run for the chosen source format
- **THEN** every `data/verbs/<id>.json` SHALL have a corresponding `.cache/husic/<id>.jsonl` file
- **AND** each `.cache/husic/<id>.jsonl` SHALL contain at least one JSON record per finite cell that Husić tabulates for that verb

#### Scenario: Husić matches the previously-missing cells

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after Husić cache is populated
- **THEN** the per-source match counts SHALL show a non-zero `M (h)` count
- **AND** the combined match-rate (`M (k) + M (h)`) SHALL exceed 6000 cells across the 50-verb corpus
- **AND** mismatches SHALL be zero

#### Scenario: Cell genuinely missing from both sources counts as missing

- **WHEN** Kaikki has no entry AND Husić has no entry for a cell
- **THEN** the script SHALL count the cell as `missing-kaikki` (no source has ground truth)

#### Scenario: Conditional present cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional present 1sg cell

#### Scenario: Conditional perfect cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional perfect 1sg cell

#### Scenario: Match-rate baseline reflects combined sources

- **WHEN** the change is archived
- **THEN** `packages/engine/docs/sources.md` SHALL list the combined baseline broken out by source (e.g., `M = X (Kaikki) + Y (Husić) = X+Y total`)

### Requirement: verify-engine treats Kaikki "u —" as no-ground-truth

The `scripts/verify-engine.ts` script SHALL handle Kaikki forms with surface `"u —"` (Kaikki's marker for "this cell is grammatically unattested") by treating them as equivalent to `kaikkiForm === null` — neither match nor mismatch. The engine MAY produce a derivable surface form for these cells; verify-engine SHALL NOT report a mismatch when our engine outputs a form that Kaikki marks as nonexistent.

#### Scenario: u-em-dash cells skip the comparison

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **AND** Kaikki contains an entry with surface `"u —"` for some cell of some verb
- **THEN** the script SHALL NOT count that cell as a mismatch
- **AND** the script SHALL NOT count that cell as a match
- **AND** the script SHALL log it as `missing-kaikki` or equivalent (consistent with cells where Kaikki has no entry at all)

### Requirement: verify-engine probes MP optative present

The `scripts/verify-engine.ts` cell list SHALL include `{ mood: 'optative', tense: 'present', voice: 'middle-passive' }`. The match-rate baseline SHALL be updated to reflect the new cell coverage.

#### Scenario: MP optative present matches Kaikki for laj

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **THEN** the script SHALL report a match for `laj` MP optative present 1sg (engine output `u lafsha` matches Kaikki `u lafsha`)
- **AND** the script SHALL report zero mismatches across all corpus verbs for MP optative present

### Requirement: parse-husic.ts emits JSONL parallel to Kaikki

The `scripts/parse-husic.ts` script SHALL accept a Husić digital-source input path and emit per-verb JSONL files at `.cache/husic/<id>.jsonl` in the same shape as the Kaikki cache (one JSON record per line, each with at least `form: string` and `tags: string[]` fields). The tag vocabulary SHALL include `indicative | subjunctive | conditional | admirative | optative | imperative`, `present | imperfect | aorist | perfect | pluperfect | future | past-anterior | future-perfect | future-in-past | future-perfect-in-past`, `first-person | second-person | third-person`, `singular | plural`, and `active | middle-passive` (when Husić distinguishes voice). The script SHALL document its input format expectations in `packages/engine/docs/husic-format.md`.

#### Scenario: parse-husic produces one JSONL line per cell

- **WHEN** `npx tsx scripts/parse-husic.ts <source-path>` is run
- **THEN** for each verb in the source, the script SHALL emit a `.cache/husic/<id>.jsonl` file
- **AND** each line SHALL be a parseable JSON record with `form` and `tags` fields
- **AND** the tag vocabulary SHALL match the convention defined in `packages/engine/docs/husic-format.md`

#### Scenario: parse-husic preserves voice distinctions where Husić marks them

- **WHEN** Husić's source contains both active and middle-passive paradigm tables for a verb
- **THEN** the emitted JSONL SHALL contain entries with `'middle-passive'` tag for the MP cells
- **AND** entries without an explicit voice tag SHALL be treated as active by `verify-engine.ts`

#### Scenario: parse-husic handles paradigm gaps

- **WHEN** Husić's source omits a particular cell (e.g., 1sg imperative, which doesn't exist in Albanian)
- **THEN** the emitted JSONL SHALL omit that cell entirely
- **AND** verify-engine SHALL treat its absence as no-ground-truth (consistent with Kaikki absence)

### Requirement: Husić mismatch surfaces as actionable diagnostic

When the engine output disagrees with a Husić-tabulated form (Husić is authority #1 per `openspec/config.yaml`), `verify-engine.ts` SHALL emit a mismatch annotation that distinguishes Husić mismatches from Kaikki mismatches in its output, so the per-cell resolution path is unambiguous.

#### Scenario: Husić mismatch is annotated distinctly

- **WHEN** `verify-engine.ts` runs and finds an engine output that disagrees with a Husić form for some cell
- **THEN** the per-cell line in `--verbose` mode SHALL show `kaikki=null` and `husic="<husic-form>"` and `engine="<engine-form>"`
- **AND** the per-verb verdict line SHALL include the mismatch in its mismatch count

### Requirement: "Potential override candidate" warnings

When the engine throws `UnsupportedCellError` for a cell where Husić has a form, `verify-engine.ts` SHALL log a warning line of the format `[?] <verbId> <cell> — engine throws; Husić has "<form>". Consider adding cellOverrides[<key>].`. The warning is informational; it SHALL NOT count as a mismatch.

#### Scenario: Engine-throws + Husić-has-form generates a candidate warning

- **WHEN** the engine throws for `verb_x` MP imperative 2sg
- **AND** Husić's cache has a form for that cell
- **THEN** the script SHALL log a `[?] verb_x imperative.present.middle-passive.2sg` warning
- **AND** the script's exit status SHALL still be 0 (warnings don't fail the run)

### Requirement: parse-husic.ts produces tagged JSONL per docs

`scripts/parse-husic.ts` (the format-specific parser, not the v1 scaffolding stub) SHALL emit JSONL records matching `packages/engine/docs/husic-format.md`. Tag vocabulary SHALL match Kaikki's convention to keep `findKaikkiForm`/`findHusicForm` filter logic shared. Pluperfect SHALL emit `past + perfect`; conditional present SHALL emit `imperfect + conditional`; future-perfect SHALL emit `future + perfect`.

#### Scenario: parse-husic produces well-formed JSONL for the pilot verbs

- **WHEN** the parser has been implemented and run on the digital Husić source
- **THEN** `.cache/husic/punoj.jsonl`, `.cache/husic/flas.jsonl`, `.cache/husic/pjek.jsonl`, `.cache/husic/jam.jsonl`, `.cache/husic/pi.jsonl` SHALL each exist
- **AND** each file SHALL contain valid JSONL (one JSON record per line; each record has `form` and `tags` fields)
- **AND** the tag vocabulary SHALL match the Albanian-label → engine-tag mapping in `husic-format.md`

#### Scenario: parse-husic filters Gheg / archaic variants at parse time

- **WHEN** Husić's source contains a Gheg or archaic variant for some cell
- **THEN** `parse-husic.ts` SHALL NOT emit that variant to the JSONL
- **AND** the standard Tosk-based form SHALL be the only entry for that cell

#### Scenario: Pilot cross-validation catches parser bugs

- **WHEN** the pilot run completes for the 5 pilot verbs
- **AND** `verify-engine.ts` is run with both Kaikki and Husić caches populated
- **THEN** for cells where Kaikki AND Husić both have data, the two sources SHALL agree (zero Kaikki-vs-Husić disagreement on shared cells)
- **AND** if any disagreement surfaces, the parser SHALL be debugged before the full corpus pass

