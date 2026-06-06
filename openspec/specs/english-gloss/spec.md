# english-gloss Specification

## Purpose
TBD - created by archiving change add-english-gloss. Update Purpose after archive.
## Requirements
### Requirement: englishGloss(verb, options) returns a compositional English gloss

`apps/web/lib/english-gloss.ts` SHALL export a pure function `englishGloss(verb: VerbEntry, options: ConjugateOptions): string` that returns an English gloss for the given conjugation cell. The gloss SHALL be grammatically correct compositional English (subject pronoun + tense skeleton + voice / polarity / modality transforms + verb forms substituted).

The function SHALL be deterministic: same `(verb, options)` input always returns the same output. The function SHALL handle every cell the engine produces (every supported `(mood, tense, voice, person, number, polarity, modality)` combination) plus non-finite forms (participle, infinitive, gerund, privative, temporal).

#### Scenario: Simple indicative present, 1sg

- **WHEN** `englishGloss(punoj, { mood: 'indicative', tense: 'present', voice: 'active', person: 1, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** the result SHALL equal `"I work"`

#### Scenario: Indicative aorist, 3sg

- **WHEN** `englishGloss(punoj, { mood: 'indicative', tense: 'aorist', voice: 'active', person: 3, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** the result SHALL equal `"s/he worked"`

#### Scenario: Indicative perfect, 1sg active

- **WHEN** `englishGloss(punoj, { mood: 'indicative', tense: 'perfect', voice: 'active', person: 1, number: 'singular', polarity: 'affirmative', modality: 'declarative' })` is invoked
- **THEN** the result SHALL equal `"I have worked"`

#### Scenario: Indicative pluperfect, 1sg active

- **WHEN** invoked for `(punoj, indicative.pluperfect.active.1sg)`
- **THEN** the result SHALL equal `"I had worked"`

#### Scenario: Indicative future, 1sg active

- **WHEN** invoked for `(punoj, indicative.future.active.1sg)`
- **THEN** the result SHALL equal `"I will work"`

#### Scenario: Indicative future-perfect, 1sg active

- **WHEN** invoked for `(punoj, indicative.future-perfect.active.1sg)`
- **THEN** the result SHALL equal `"I will have worked"`

#### Scenario: Indicative future-in-past, 1sg active

- **WHEN** invoked for `(punoj, indicative.future-in-past.active.1sg)`
- **THEN** the result SHALL equal `"I was going to work"`

#### Scenario: Conditional present, 1sg active

- **WHEN** invoked for `(punoj, conditional.present.active.1sg)`
- **THEN** the result SHALL equal `"I would work"`

#### Scenario: Conditional perfect, 1sg active

- **WHEN** invoked for `(punoj, conditional.perfect.active.1sg)`
- **THEN** the result SHALL equal `"I would have worked"`

#### Scenario: Subjunctive present, 1sg active

- **WHEN** invoked for `(punoj, subjunctive.present.active.1sg)`
- **THEN** the result SHALL equal `"(that) I work"`

#### Scenario: Admirative present, 1sg active

- **WHEN** invoked for `(punoj, admirative.present.active.1sg)`
- **THEN** the result SHALL equal `"I apparently work"`

#### Scenario: Admirative imperfect, 1sg active

- **WHEN** invoked for `(punoj, admirative.imperfect.active.1sg)`
- **THEN** the result SHALL equal `"I apparently was working"`

#### Scenario: Admirative pluperfect, 1sg active

- **WHEN** invoked for `(punoj, admirative.pluperfect.active.1sg)`
- **THEN** the result SHALL equal `"I apparently had worked"`

#### Scenario: Optative present, 1sg active

- **WHEN** invoked for `(punoj, optative.present.active.1sg)`
- **THEN** the result SHALL equal `"may I work"`

#### Scenario: Imperative 2sg active

- **WHEN** invoked for `(punoj, imperative.present.active.2sg)`
- **THEN** the result SHALL equal `"work!"`

#### Scenario: Negative polarity inserts "not" with do-support where needed

- **WHEN** invoked for `(punoj, indicative.present.active.1sg.negative)`
- **THEN** the result SHALL equal `"I do not work"`

- **WHEN** invoked for `(punoj, indicative.aorist.active.1sg.negative)`
- **THEN** the result SHALL equal `"I did not work"`

- **WHEN** invoked for `(punoj, indicative.perfect.active.1sg.negative)`
- **THEN** the result SHALL equal `"I have not worked"` (no do-support; "have" already there)

- **WHEN** invoked for `(punoj, indicative.future.active.1sg.negative)`
- **THEN** the result SHALL equal `"I will not work"`

- **WHEN** invoked for `(punoj, conditional.present.active.1sg.negative)`
- **THEN** the result SHALL equal `"I would not work"`

#### Scenario: Interrogative modality inverts subject and aux

- **WHEN** invoked for `(punoj, indicative.present.active.1sg.affirmative.interrogative)`
- **THEN** the result SHALL equal `"do I work?"`

- **WHEN** invoked for `(punoj, indicative.perfect.active.1sg.affirmative.interrogative)`
- **THEN** the result SHALL equal `"have I worked?"`

- **WHEN** invoked for `(punoj, indicative.future.active.1sg.affirmative.interrogative)`
- **THEN** the result SHALL equal `"will I work?"`

#### Scenario: Negative + interrogative compose

- **WHEN** invoked for `(punoj, indicative.perfect.active.1sg.negative.interrogative)`
- **THEN** the result SHALL equal `"have I not worked?"`

#### Scenario: Middle-passive voice yields English passive construction

- **WHEN** invoked for `(punoj, indicative.present.middle-passive.1sg)`
- **THEN** the result SHALL equal `"I am worked"` (or equivalent passive English)

- **WHEN** invoked for `(punoj, indicative.imperfect.middle-passive.1sg)`
- **THEN** the result SHALL equal `"I was being worked"` (passive imperfect)

- **WHEN** invoked for `(punoj, indicative.perfect.middle-passive.1sg)`
- **THEN** the result SHALL equal `"I have been worked"`

#### Scenario: Suppletive English-form override applies

- **WHEN** the verb `jam` (Albanian "to be", `englishForms.base = "be"`) is glossed for `indicative.present.active.1sg`
- **THEN** the result SHALL equal `"I am"` (using the irregular present-1sg form, not the regular `"I be"`)

#### Scenario: Suppletive past-tense override applies

- **WHEN** the verb `shoh` (Albanian "to see", `englishForms.past = "saw"`, `participle = "seen"`) is glossed for `indicative.aorist.active.1sg`
- **THEN** the result SHALL equal `"I saw"`

- **WHEN** glossed for `indicative.perfect.active.1sg`
- **THEN** the result SHALL equal `"I have seen"`

#### Scenario: Phonologically-mutating verb glosses use English regular forms

- **WHEN** `pjek` (Albanian "to bake", regular English) is glossed for `indicative.aorist.active.1sg`
- **THEN** the result SHALL equal `"I baked"` (English regular)

- **WHEN** `djeg` (Albanian "to burn", regular English) is glossed for `indicative.aorist.active.1sg`
- **THEN** the result SHALL equal `"I burned"` (English regular)

### Requirement: Pronoun selection per person/number

`englishGloss` SHALL select a subject pronoun by person and number. The default mapping:

| person | number    | pronoun |
|--------|-----------|---------|
| 1      | singular  | I       |
| 2      | singular  | you     |
| 3      | singular  | s/he    |
| 1      | plural    | we      |
| 2      | plural    | you     |
| 3      | plural    | they    |

Imperative SHALL render without an explicit subject (English imperative is bare). Non-finite forms (participle, infinitive, gerund) SHALL render without a subject.

Pronouns are lowercase except at the start of an interrogative gloss where they appear after the inverted aux.

#### Scenario: Pronoun mapping

- **WHEN** `englishGloss` is called for any (verb, options) combo with `person: 3` and `number: 'singular'`
- **THEN** the gloss SHALL contain `"s/he"` as the subject pronoun (or `"S/he"` at sentence start in interrogative inversion)

#### Scenario: Imperative omits subject

- **WHEN** invoked for an imperative cell
- **THEN** the gloss SHALL NOT contain a subject pronoun

### Requirement: Verb-form derivation from translationEn + irregular registry

`englishGloss` SHALL derive English principal parts (`base`, `past`, `participle`, `gerund`) for the verb in this priority order:

1. The verb's `englishForms` field if present (per-verb override; supports partial overrides — only specified forms override the defaults).
2. An entry in `data/english-irregulars.json` if `base` (after stripping `to ` from the verb's `translationEn` and picking the first sense) matches an irregular's key.
3. Auto-derivation rules:
   - `past = base + "ed"` (with English orthography rules: e→ed, y→ied, double-consonant before -ed, etc.)
   - `participle = past` (most regular verbs)
   - `gerund = base + "ing"` (with English orthography: e→ing, double-consonant before -ing)

#### Scenario: Regular verb auto-derives correctly

- **WHEN** `getEnglishForms({ translationEn: "to work" })` is invoked
- **THEN** the result SHALL be `{ base: "work", past: "worked", participle: "worked", gerund: "working" }`

#### Scenario: Verb with -e ending follows the drop-e rule for -ing

- **WHEN** `getEnglishForms({ translationEn: "to love" })` is invoked
- **THEN** the result SHALL be `{ base: "love", past: "loved", participle: "loved", gerund: "loving" }` (drop-e for -ing; keep-e for -ed via the regular pattern)

#### Scenario: Verb in irregulars registry uses registered forms

- **WHEN** the verb's translationEn-derived base is `"see"` and `data/english-irregulars.json` has `{ base: "see", past: "saw", participle: "seen", gerund: "seeing" }`
- **THEN** `getEnglishForms` SHALL return that registered entry

#### Scenario: Per-verb override wins over irregulars registry

- **WHEN** the verb has `englishForms: { base: "look for" }` AND the registry has an entry for `"look"`
- **THEN** the per-verb override SHALL win; result SHALL use `"look for"` as base

#### Scenario: Multi-sense translationEn picks the first sense

- **WHEN** the verb's `translationEn` is `"to look for / to ask"`
- **THEN** `getEnglishForms` SHALL use `"look for"` (the first sense after stripping "to "), unless overridden by `englishForms`

### Requirement: data/english-irregulars.json registry shape

The irregulars registry SHALL be a JSON array of objects matching the type:

```ts
{
  base: string;
  past: string;
  participle: string;
  gerund: string;
  source: string;
}
```

The `source` field SHALL cite a standard English reference (Cambridge Grammar of the English Language, Oxford English Dictionary, or a comparable authority).

The registry SHALL contain at least these entries (the irregulars likely needed for the corpus): `be`, `have`, `do`, `go`, `come`, `see`, `give`, `take`, `make`, `say`, `eat`, `drink`, `sleep`, `write`, `read`, `find`, `hold`, `leave`, `win`, `sell`, `buy`, `hear`, `learn`, `teach`, `think`, `know`, `become`, `understand`, `bring`, `forget`. Additional entries MAY be added as new corpus verbs surface them.

#### Scenario: Registry covers common irregulars

- **WHEN** `data/english-irregulars.json` is loaded
- **THEN** it SHALL contain entries for at least the 30 verbs listed above
- **AND** every entry SHALL have a non-empty `source` field

### Requirement: Voice transform (active ↔ passive)

When `voice === 'middle-passive'`, the gloss SHALL be transformed to English passive voice using the appropriate form of "be" plus the participle:

| Tense skeleton (active)        | Passive equivalent                     |
|--------------------------------|----------------------------------------|
| `I <base>`                     | `I am <participle>`                    |
| `I <past>`                     | `I was <participle>`                   |
| `I have <participle>`          | `I have been <participle>`             |
| `I had <participle>`           | `I had been <participle>`              |
| `I will <base>`                | `I will be <participle>`               |
| `I would <base>`               | `I would be <participle>`              |
| `I would have <participle>`    | `I would have been <participle>`       |
| `I was <gerund>` (imperfect)   | `I was being <participle>`             |
| `I will have <participle>`     | `I will have been <participle>`        |

Imperative MP SHALL render as `be <participle>!` (e.g., "be washed!" for `lahu`). Optative MP SHALL render with "may I be <participle>" semantics.

#### Scenario: Active and passive 1sg present differ correctly

- **WHEN** `englishGloss` is called for `(punoj, indicative.present.active.1sg)`
- **THEN** the result SHALL be `"I work"`

- **WHEN** the same call but with `voice: 'middle-passive'`
- **THEN** the result SHALL be `"I am worked"`

### Requirement: Polarity transform (negation with English do-support)

When `polarity === 'negative'`, the gloss SHALL insert "not" at the appropriate position. English do-support rules apply:

- **Auxiliary present** (have, had, will, would, am, was, will have, etc.): insert "not" after the auxiliary. e.g., "I have not worked".
- **No auxiliary** (simple present, simple past indicative): insert "do/does/did" + "not" before the base verb. e.g., "I do not work" / "s/he does not work" / "I did not work".
- **Subjunctive**: same do-support rule.
- **Imperative**: "do not" + base. e.g., "do not work!" or "don't work!".

#### Scenario: Simple present negation uses do-support

- **WHEN** `englishGloss` is called for `(punoj, indicative.present.active.1sg.negative)`
- **THEN** the result SHALL equal `"I do not work"`

#### Scenario: Compound tenses negate after the auxiliary

- **WHEN** `englishGloss` is called for `(punoj, indicative.perfect.active.1sg.negative)`
- **THEN** the result SHALL equal `"I have not worked"`

### Requirement: Modality transform (interrogative inversion)

When `modality === 'interrogative'`, the gloss SHALL invert the subject and the (possibly do-support) auxiliary. The result SHALL end with `?`.

- Simple present: `"I work"` → `"do I work?"`
- Simple past: `"I worked"` → `"did I work?"`
- Compound: `"I have worked"` → `"have I worked?"`
- Future: `"I will work"` → `"will I work?"`
- Negative interrogative compose: `"I have not worked"` → `"have I not worked?"`

#### Scenario: Simple present interrogative

- **WHEN** invoked for `(punoj, indicative.present.active.1sg.affirmative.interrogative)`
- **THEN** the result SHALL equal `"do I work?"`

### Requirement: API JSON includes englishGloss per cell

The `/api/verbs/[lemma]?format=json` response's `table` field SHALL include an `englishGloss: string` field for every cell. Multi-word forms get a single gloss covering the whole construction.

#### Scenario: API gloss for compound form

- **WHEN** the consumer fetches `GET /api/verbs/punoj`
- **THEN** the response body's `table.indicative.perfect["1sg.active"].englishGloss` SHALL equal `"I have worked"`

### Requirement: Playground result panel shows the gloss

`/playground` SHALL render the English gloss as a muted line beneath the IPA in the result panel. The gloss SHALL update reactively as the user changes mood/tense/voice/polarity/modality controls.

#### Scenario: Playground shows gloss

- **WHEN** the user visits `/playground` with default config (`punoj`, indicative present 1sg active)
- **THEN** the result panel SHALL contain the text `"I work"` somewhere visible

#### Scenario: Gloss updates on control change

- **WHEN** the user changes mood from `indicative` to `conditional` and tense from `present` to `perfect`
- **THEN** the gloss SHALL update to `"I would have worked"`

### Requirement: Verb-page tooltips include the gloss

The verb-page conjugation tables SHALL include the English gloss in the existing decomposition tooltip on each cell, appended after the segment role descriptions.

#### Scenario: Verb-page cell tooltip contains gloss

- **WHEN** the user visits `/verb/punoj` and hovers / focuses on the cell at indicative.perfect.1sg
- **THEN** the tooltip SHALL contain the substring `"I have worked"`

### Requirement: VerbEntry schema gains optional englishForms field

`packages/data/src/schema.ts` SHALL extend `VerbEntry` with an optional `englishForms` field of shape:

```ts
englishForms?: {
  base: string;
  past?: string;
  participle?: string;
  gerund?: string;
}
```

When present, the `englishForms` field overrides the `translationEn`-derived auto-form and the irregulars registry. Partial overrides are allowed: only the specified fields override; the rest fall through to the default derivation chain.

#### Scenario: Schema accepts englishForms

- **WHEN** a verb entry includes `englishForms: { base: "be", past: "was", participle: "been", gerund: "being" }`
- **THEN** the Zod schema SHALL parse without error
- **AND** the verb SHALL use the override for gloss generation
