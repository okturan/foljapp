## ADDED Requirements

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
