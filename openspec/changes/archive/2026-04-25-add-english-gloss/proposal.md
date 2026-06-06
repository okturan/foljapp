## Why

iMekMak (the Turkish verb conjugator that inspired this project) auto-generates English glosses for every conjugated form: `aldırmalıysam` → "If I should make someone take." Mechanism: Turkish is agglutinative, so each morpheme has a discrete English equivalent and they concatenate.

Albanian is **fusional**, not agglutinative — `punoj` packs first-person + singular + present + active + indicative into one ending. The morpheme-by-morpheme approach iMekMak uses doesn't apply.

But Albanian's **mood/tense/voice/polarity/modality grid** maps cleanly to English grammatical categories:

```
indicative.aorist.active.1sg            → "I worked"
indicative.perfect.active.1sg           → "I have worked"
indicative.pluperfect.active.1sg        → "I had worked"
indicative.future.active.1sg            → "I will work"
indicative.future-perfect.active.1sg    → "I will have worked"
conditional.perfect.active.1sg          → "I would have worked"
admirative.imperfect.active.1sg         → "I apparently was working"
optative.present.active.1sg             → "may I work"
imperative.present.active.2sg           → "work!"
indicative.aorist.middle-passive.1sg    → "I was worked"
conditional.perfect.middle-passive.1sg.negative → "I would not have been worked"
indicative.perfect.active.1sg.interrogative.negative → "Have I not worked?"
```

The grid has bounded cardinality. Templates compose. Verb-form inflection (work/worked/working) is mostly regular English with ~30 irregular overrides for our 204-verb corpus.

This change ships compositional gloss for every cell of every verb, exposed in the playground, verb-page (on hover), and JSON API.

## What Changes

- **Add** `apps/web/lib/english-gloss.ts` exporting `englishGloss(verb, options): string`. Builds a gloss from:
  1. Subject pronoun (per person/number).
  2. Tense skeleton (~15 base templates per mood/tense pair, e.g., perfect = "have <participle>").
  3. Voice transform (active stays, passive inserts "be/been/being + participle").
  4. Polarity transform (insert "not", with English do-support where needed).
  5. Modality transform (subject/aux inversion for interrogative).
  6. Verb form substitution (auto-derived from `translationEn`, overridable per verb).
- **Add** `data/english-irregulars.json` — registry of ~30 irregular English verbs (be, have, do, go, come, see, give, take, make, say, eat, drink, sleep, write, read, find, hold, leave, win, sell, buy, hear, learn, teach, think, know, etc.) with `{ base, past, participle, gerund }` per entry. Auto-applied when the corpus verb's `translationEn` (after `to ` strip and first-sense pick) matches an entry.
- **Extend** `packages/data/src/schema.ts` — `VerbEntry` gains optional `englishForms?: { base, past?, participle?, gerund? }` to override the auto-derivation per verb (for multi-sense lemmas like `dua` = "to want / to love" where the auto-pick is wrong).
- **Render** the gloss in three surfaces:
  1. **Playground result panel**: always-visible muted line beneath the IPA: `"I have worked"`.
  2. **Verb-page conjugation table**: gloss surfaces via the existing decomposition tooltip on hover/focus (tooltip text appended after the role labels).
  3. **JSON API** (`/api/verbs/[lemma]?format=json`): every cell gains an `englishGloss: string` field.
- **Test** every mood/tense/voice combo has a gloss; suppletive (`jam`, `jap`, `shoh`), mutating (`pjek`, `djeg`), MP-only (none currently in corpus but covered by tests), polarity + modality transforms all produce grammatically-correct English.
- **No engine changes.** Glosses are derived from engine output + verb metadata; the engine itself is unchanged.

## Capabilities

### New Capabilities

- `english-gloss`: defines the contract for compositional English gloss generation, including pronoun selection, tense templates, voice/polarity/modality transforms, and verb-form derivation.

## Impact

- **Code** — `apps/web/lib/english-gloss.ts` (new), `apps/web/lib/english-gloss.test.ts` (new), schema extension, UI integration in playground + verb page, API route extension.
- **Data** — `data/english-irregulars.json` (new, ~30 entries), per-verb `englishForms` overrides for ~10-20 corpus verbs (mostly suppletives + multi-sense).
- **APIs** — `/api/verbs/[lemma]` JSON gains `englishGloss` per cell. Additive, non-breaking.
- **Linguistic claims** — Each gloss is grammatically constructible; not idiomatic. Documented in design D10.
- **Audience tier** — Learners benefit most. Researchers gain a gloss-line for each cell that maps to standard grammatical categories. Students get learning support.

## Non-Goals

- **No idiomatic English translation.** Glosses are compositional and grammatically correct, not literary. "I apparently was working" for admirative imperfect is the right shape; "I gather I was working" or "I was working, it seems" are more natural English but not what we ship.
- **No morpheme-mirror approach.** Albanian's fusional morphology means we can't decompose endings into separate English morphemes. Composition happens at the cell level (mood/tense/voice/polarity/modality), not the suffix level.
- **No multi-sense disambiguation.** When a corpus verb has a multi-sense `translationEn` (e.g., "to look for / to ask"), the gloss uses the FIRST sense. Per-verb `englishForms` allows authors to pick a different sense if needed.
- **No grammatical-gender pronouns.** 3sg defaults to "s/he"; no per-verb gender selection.
- **No T-V distinction in 2nd person.** "you" is used for both 2sg and 2pl; the form-level distinction is preserved in the Albanian + the cell label.
- **No glosses for non-finite forms beyond participle/infinitive/gerund.** Privative ("pa punuar" = "without working") and temporal ("me të punuar" = "upon working") get glosses but they're approximations.
- **No agreement with object/argument.** Albanian has clitic doubling for direct/indirect objects ("e pashë" = "I saw it"); we don't model the clitics so the English gloss skips object pronouns.
- **No tense-aspect granularity beyond what English distinguishes.** Albanian's aorist/perfect distinction is preserved (different glosses) but not always natural in casual English.
- **No registry / formality marking.** Glosses use modern neutral English.

## Sequence

```
PREREQ → add-conjugation-engine             (engine output we gloss against)
PREREQ → add-public-api                      (JSON API surface to extend)
PREREQ (recommended) → add-pronunciation     (parallel feature; UI conventions)
THIS   → add-english-gloss
NEXT   → could-extend-multi-sense-glossing   (if user demand surfaces)
```
