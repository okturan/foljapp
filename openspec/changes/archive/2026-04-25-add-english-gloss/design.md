## Context

iMekMak (Turkish verb conjugator) auto-generates English glosses by walking each Turkish form's morpheme list and mapping each morpheme to a discrete English fragment, then concatenating. Turkish's agglutinative morphology — one morpheme = one meaning, fixed slot order — makes this work. `aldırmalıysam` decomposes as `al-dır-malı-y-sa-m` = `take + causative + necessitative + (conditional+1sg)` and each unit has a clean English equivalent.

Albanian is **fusional**, not agglutinative. The ending `-oj` in `punoj` packs *first-person + singular + present + active + indicative* into one morpheme. We can't decompose it. So iMekMak's approach is structurally inapplicable.

But the **construction-level** morphology — Albanian's mood, tense, voice, polarity, modality grid that we already model in the engine — maps cleanly to English grammatical structures. Each (mood, tense, voice) combination has a canonical English shape; polarity / modality apply systematic transforms. Composition happens at this layer.

## Goals / Non-Goals

**Goals:**

- Compositional gloss for every cell of every corpus verb.
- Grammatically correct English (not necessarily idiomatic).
- Bounded engineering: ~15 templates + 4 transforms + ~30 irregulars + per-verb overrides.
- Visible in playground (always), verb-page (tooltip), and API JSON.
- 100% of cells have a gloss; no `null` or "TBD".

**Non-Goals:**

- No idiomatic / literary translation.
- No morpheme-mirror approach (Albanian is fusional).
- No multi-sense disambiguation; first sense wins.
- No grammatical-gender pronoun selection.
- No object/argument cliticization in the gloss.
- No T-V politeness distinction.

## Decisions

### D1. Cell-template approach (not morpheme-mirror)

Albanian's morphology fuses features. A morpheme-mirror approach (segment → English fragment) hits problems immediately:

- The voice marker `u` (in MP aorist) has no English equivalent — passive in English is built differently (`be + participle`).
- The particle `do të` is "will" for indicative future but "would" for conditional present. Same particle, different gloss depending on the construction it's part of.
- The auxiliary `paskësha` is one morpheme but conveys "had apparently" — two English words, in a specific position.

These all collapse under a cell-template approach: the (mood, tense, voice, polarity, modality) tuple is the unit of composition. ~15 base templates handle the core grid; voice/polarity/modality are parametric transforms.

### D2. Pronoun selection

Default mapping:

| person | number    | pronoun |
|--------|-----------|---------|
| 1      | singular  | I       |
| 2      | singular  | you     |
| 3      | singular  | s/he    |
| 1      | plural    | we      |
| 2      | plural    | you     |
| 3      | plural    | they    |

Choices:
- 3sg = "s/he" — explicit non-binary representation. Alternatives considered: "he" (masculine bias, dated), "they" (singular they, modern but ambiguous with plural), "he/she" (typographically heavier than "s/he"). "S/he" wins on neutrality + brevity.
- 2sg = 2pl = "you" — English merges them; the form-level distinction is preserved in the Albanian + the cell label.
- Imperative omits subject.
- Non-finite forms omit subject.

Pronoun is lowercase except at sentence start (interrogatives where pronoun follows the inverted aux: "Do I work?" — "I" is naturally cap'd as a pronoun, not as sentence start).

### D3. Verb-form derivation chain

Per-verb resolution priority:

```
1. verb.englishForms (per-verb override; partial allowed)
   ↓
2. data/english-irregulars.json (matched by base; auto-applied)
   ↓
3. Auto-derivation rules from translationEn:
    a. Strip "to " prefix
    b. Pick first sense (split on " / ")
    c. Apply regular English morphology:
       past = base + "ed"        (with e→ed, y→ied, CVC→Cced rules)
       participle = past         (regular verbs)
       gerund = base + "ing"     (with e→ing, CVC→Cing rules)
```

The auto-derivation handles ~85% of English verbs. The irregular registry covers ~30 high-frequency irregulars (be, have, do, go, come, see, give, take, make, say, eat, drink, sleep, write, read, find, hold, leave, win, sell, buy, hear, learn, teach, think, know, become, understand, bring, forget). The per-verb override field handles multi-sense lemmas where the first-sense pick is wrong.

### D4. Voice transform

Active → Passive transformation table:

| Active skeleton                | Passive equivalent                       |
|--------------------------------|------------------------------------------|
| `<S> <base>`                   | `<S> am/are/is <participle>`             |
| `<S> <past>`                   | `<S> was/were <participle>`              |
| `<S> have/has <participle>`    | `<S> have/has been <participle>`         |
| `<S> had <participle>`         | `<S> had been <participle>`              |
| `<S> will <base>`              | `<S> will be <participle>`               |
| `<S> would <base>`             | `<S> would be <participle>`              |
| `<S> would have <participle>`  | `<S> would have been <participle>`       |
| `<S> was/were <gerund>`        | `<S> was/were being <participle>`        |
| `<S> will have <participle>`   | `<S> will have been <participle>`        |
| `<S> apparently <base>`        | `<S> apparently am/are/is <participle>`  |

The `am/are/is` and `was/were` agreement is handled by a be-form lookup keyed on (person, number) for the appropriate tense.

### D5. Polarity transform (do-support)

English negation with do-support:

```
1. Identify whether the active form has an auxiliary already:
   - Auxiliaries: have/has, had, will, would, would have, will have,
     was/were (in imperfect/passive), am/are/is (in passive present),
     will be, would be, apparently, may
   - No auxiliary: simple present (works), simple past (worked)

2. If aux present: insert "not" after the first aux.
   "I have worked" → "I have not worked"
   "I will be worked" → "I will not be worked"

3. If no aux: insert "do/does/did" + "not" before the base verb.
   "I work" → "I do not work"
   "s/he works" → "s/he does not work"   (but our 3sg is "s/he", so "s/he does not work")
   "I worked" → "I did not work"

4. Imperative: prepend "do not" (or "don't" — pick one consistently).
   "work!" → "do not work!"
```

Subject-verb agreement note: 3sg "s/he" takes "does", everything else takes "do". Implemented via a small lookup keyed on person+number.

### D6. Modality transform (interrogative)

English yes/no question = subject/aux inversion. After polarity transform:

```
1. Take the (possibly negated) active form.
2. If the form has an aux (post-D5, including do/did/does), invert subject and aux.
   "I do not work" → "do I not work?"
   "I have worked" → "have I worked?"
   "I will not work" → "will I not work?"
3. Append "?".
4. Capitalize the inverted aux.
```

The aux-fronting handles compound forms cleanly. Negative + interrogative composes naturally: "have I not worked?" / "did I not work?".

### D7. Template enumeration (~15 base templates)

Indexed by `(mood, tense)`:

```ts
const TEMPLATES: Record<string, BaseTemplate> = {
  'indicative.present':                  { aux: '',         verbForm: 'base' },
  'indicative.imperfect':                { aux: 'was/were', verbForm: 'gerund' },        // "I was working"
  'indicative.aorist':                   { aux: '',         verbForm: 'past' },          // "I worked"
  'indicative.perfect':                  { aux: 'have/has', verbForm: 'participle' },    // "I have worked"
  'indicative.pluperfect':               { aux: 'had',      verbForm: 'participle' },    // "I had worked"
  'indicative.past-anterior':            { aux: 'had',      verbForm: 'participle' },    // glossed same as pluperfect
  'indicative.future':                   { aux: 'will',     verbForm: 'base' },
  'indicative.future-perfect':           { aux: 'will have',verbForm: 'participle' },
  'indicative.future-in-past':           { aux: 'was going to', verbForm: 'base' },
  'indicative.future-perfect-in-past':   { aux: 'would have',   verbForm: 'participle' }, // approximation
  'subjunctive.present':                 { aux: '(that)',   verbForm: 'base' },
  'subjunctive.imperfect':               { aux: '(that) was/were', verbForm: 'gerund' },
  'subjunctive.perfect':                 { aux: '(that) have/has', verbForm: 'participle' },
  'subjunctive.pluperfect':              { aux: '(that) had', verbForm: 'participle' },
  'conditional.present':                 { aux: 'would',    verbForm: 'base' },
  'conditional.perfect':                 { aux: 'would have', verbForm: 'participle' },
  'admirative.present':                  { aux: 'apparently', verbForm: 'base' },
  'admirative.imperfect':                { aux: 'apparently was/were', verbForm: 'gerund' },
  'admirative.perfect':                  { aux: 'apparently have/has', verbForm: 'participle' },
  'admirative.pluperfect':               { aux: 'apparently had', verbForm: 'participle' },
  'optative.present':                    { aux: 'may',      verbForm: 'base' },
  'optative.perfect':                    { aux: 'may have', verbForm: 'participle' },
  'imperative.present':                  { aux: '',         verbForm: 'base', noPronoun: true, suffix: '!' },
  'non-finite.participle':               { aux: '',         verbForm: 'participle', noPronoun: true },
  'non-finite.infinitive':               { aux: 'to',       verbForm: 'base', noPronoun: true },
  'non-finite.gerund':                   { aux: '',         verbForm: 'gerund', noPronoun: true },
  'non-finite.privative':                { aux: 'without',  verbForm: 'gerund', noPronoun: true },
  'non-finite.temporal':                 { aux: 'upon',     verbForm: 'gerund', noPronoun: true },
};
```

The `aux` slash-form (`have/has`, `was/were`, `am/are/is`) gets resolved by person/number lookup at gloss-build time.

### D8. UI surfaces

**Playground result panel** (always-visible muted gloss line):

```
Form:
  do të kisha punuar
  /dɔ tə ˈkiʃa puˈnuaɾ/
  "I would have worked"          ← gloss in muted color
  ▶ How is this built?
  [Copy] [See full →]
```

**Verb-page conjugation table** (tooltip-extension only — keeps row height):

```
Cell content (Albanian decomposed form, role-coded)
On hover/focus → existing tooltip extends with:
  "auxiliary: kam (1sg present)
   stem: punuar
   English: I have worked"
```

This avoids doubling row height while making the gloss available on demand.

**JSON API** (`/api/verbs/[lemma]?format=json`): every cell record gains `englishGloss: string`.

### D9. Multi-sense lemmas

Albanian lemmas with multi-sense `translationEn` (e.g., `dua` = "to want / to love", `kërkoj` = "to look for / to ask"):

- Auto-pick: first sense after splitting on " / ".
- Per-verb override via `englishForms.base`: explicit pick.
- Result: glosses use one consistent English verb per lemma.

Trade-off accepted: users who care about the second sense need to read the lemma's `translationEn`. The gloss is for grammatical-structure illustration, not exhaustive sense coverage.

### D10. Quality reservations (honest)

- **Admirative** has no clean English equivalent. "Apparently <verb>" / "evidently <verb>" / "I gather <verb>" are approximations. We pick "apparently" consistently.
- **English subjunctive** is largely dead. "(that) I work" is the form; standalone it sounds odd.
- **Optative** is archaic in English ("may I work" is grammatical but rare). Acceptable.
- **Aorist vs perfect** — Albanian distinguishes; English mostly merges. We preserve the distinction (aorist→simple past, perfect→present perfect) in the gloss for grammatical clarity.
- **Future-perfect-in-past** is rare/awkward in English. "I would have worked" is closer than literal translation; documented.
- **MP voice** sometimes has reflexive meaning (e.g., `ngrihem` = "I rise" not "I am risen"). Default gloss uses passive English; users see possible mismatch; per-verb `englishForms` can override.
- **No object cliticization.** Albanian's `e pashë` ("I saw it") loses the "it"; we gloss as "I saw" and note this.
- **Multi-sense first-pick** loses second senses; documented.

These are content limitations, not engineering ones. iMekMak presumably has similar quirks for Turkish→English; we accept them as the cost of the feature.

### D11. Capability boundary

The `english-gloss` capability is purely about gloss derivation. It depends on `conjugation-engine` for the cell metadata but doesn't touch engine logic. It depends on `verb-corpus` for `translationEn` and `englishForms` but doesn't change the corpus shape beyond adding the optional field.

UI integrations (playground, verb-page tooltip) are owned by `interactive-playground` and `reference-pages` capabilities respectively; this change extends them rather than modifying them.

The API JSON change is owned by `public-api`; this change extends the response shape additively.

So while only one new capability `english-gloss` is created, four capabilities receive minor extensions in this change: `english-gloss` (new), `verb-corpus` (schema), `interactive-playground` (gloss in result panel), `reference-pages` (gloss in tooltip), `public-api` (englishGloss field).

To honor "one capability per proposal": the new capability is `english-gloss`. Extensions to other capabilities are downstream; their specs MAY be updated in the same change since the extensions are minimal and tightly coupled.

## Tradeoffs

- **Cell-template instead of morpheme-mirror.** Loses some "magic" of the iMekMak experience but gains correctness for fusional Albanian. Acceptable: structure is fundamentally different.
- **Hand-curated irregulars.** ~30 entries needed for our corpus. Maintenance is small; growth tracks corpus growth.
- **Compositional, not idiomatic.** Glosses will sometimes feel stilted. Acceptable: pedagogical clarity > literary translation.
- **Aux ordering for negation + voice + interrogative is subtle.** Mitigated by composing in a fixed order (voice → polarity → modality) and testing the full grid.
- **Tooltip-only on verb-page.** Some users won't discover the gloss in the table. Mitigated by always-visible playground gloss + API field. Could revisit with a "show translations" toggle later.
- **3sg "s/he" looks odd.** Alternative pronouns considered; "s/he" balances neutrality and brevity. Could become a user preference in a follow-up if demanded.

## Resolved Questions

_None._

## Open Questions

- **Q1.** Should the gloss include the form's ASPECT in some way (e.g., distinguishing imperfective from perfective)? Albanian's aorist vs imperfect maps to English simple-past vs progressive-past — already handled by templates. No additional aspect marking needed.
- **Q2.** Should the gloss be localized (e.g., to other languages)? Out of scope — `openspec/config.yaml` says English-only UI. If demand surfaces, the architecture supports it (swap template tables) but no current commitment.
- **Q3.** Should multi-sense lemmas optionally show ALL senses (e.g., "I look for / I ask")? Initial implementation: first sense only. Per-verb `englishForms` override handles the most-common needs.
- **Q4.** Should the per-verb `englishForms` override be sourceable (cite a dictionary entry)? Recommend: yes, in the verb's `notes` field; the schema doesn't enforce.
