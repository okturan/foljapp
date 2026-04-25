## Context

Husić's "Albanian Verb Dictionary and Manual" (KU Libraries 2002, 234 pages) has two analytic sections:

1. **Paradigm-model section** (pages ~38–140): full conjugation tables for ~58 representative verbs, one per class-pattern (e.g., bëj is the model for "I-1", hap for "II-1", etc.).
2. **Alphabetical glossary section** (pages ~141–end): a long list of Albanian verbs, each with a class-pattern reference pointing back to the paradigm-model section. Format roughly:

```
arrij — I-3a
bëj — see paradigm
bjerr — Irr.
blej — I-2
caj — I-1
...
```

The current parser handles section 1. This change handles section 2 by cross-resolving each glossary entry's class-pattern to the matching paradigm model and applying the model's paradigm template to the target verb's stems.

The result: for any corpus verb whose lemma appears in Husić's glossary AND whose class-pattern resolves to a known model, we synthesize a Husić-implied paradigm. These are NOT directly tabulated by Husić, but they ARE Husić-aligned in the sense that Husić explicitly classifies the verb as following the model.

## Goals / Non-Goals

**Goals:**

- Expand Husić cache coverage from 31 to ~80–90 of 100 corpus verbs (depends on glossary completeness).
- Distinguish "direct" (paradigm-model-tabulated) from "derived" (glossary-cross-resolved) records via a `derived: true` field.
- verify-engine surfaces the distinction in its output annotations.
- Apply the same paradigm template logic the engine uses, but driven by Husić's classification (not the engine's own class assignment).

**Non-Goals:**

- No engine-side changes. Husić-derived forms are an external check against engine output.
- No automatic disambiguation when Husić's class-pattern disagrees with the engine's `class` field. Such conflicts surface as mismatches; humans triage.
- No GUI exposure of "derived" status.

## Decisions

### D1. Glossary section detection

The parser identifies the glossary section by scanning for a section heading. Husić's PDF uses headings like:
- "Albanian-English Verb Glossary"
- "Verb Paradigms Index"
- "English-Albanian Verb Glossary"

These appear at section starts. The parser searches for these strings (case-insensitive) and treats subsequent text as glossary content until either another section heading or end-of-document.

### D2. Class-pattern → paradigm-model index

Husić's notation:
- `I-1`, `I-2`, `I-3a`, `I-3b` — Class 1 sub-patterns
- `II-1`, `II-2`, `II-3` — Class 2 sub-patterns (mutating, regular, etc.)
- `III-1`, `III-2`, `III-3` — Class 3 sub-patterns
- `Irr.` — irregular (each entry needs individual model)

The parser builds the index by reading each paradigm-model verb's "header line" which carries the class-pattern (e.g., `bëj 'to do, to make'; bëhem ...; I-II-3 (trans.)`). The class-pattern segment (`I-II-3` here) becomes the key.

Some patterns map to multiple verbs in the paradigm-model section (e.g., I-1 might have both `bëj` and `çaj` listed). The parser picks the first alphabetically and documents the choice.

### D3. Lemma → principal parts derivation

Once a glossary entry's class-pattern resolves to a paradigm model, the parser must derive the target lemma's principal parts. This uses the same class-aware morphology as `scripts/ingest-kaikki-batch.ts`:

- Class 1 -oj: `<root>oj` → present `<root>o`, aorist `<root>ua`, participle `<root>uar`
- Class 1 -aj: typically irregular; if so, the cross-resolver SKIPS the entry (we can't reliably synthesize forms for irregulars without explicit Husić data).
- Class 2: `<lemma>` → present `<lemma>`, aorist `<lemma>`, participle `<lemma>+ur`
- Class 3: `<lemma>` → present `<lemma>`, aorist `<lemma>`, participle `<lemma>+rë`

Verbs whose principal parts can't be cleanly derived (irregulars, suppletives) are SKIPPED with a warning. This is conservative: we'd rather have no Husić data than wrong Husić data.

### D4. Paradigm-template application

The paradigm-model verb's `.cache/husic/<model>.jsonl` already contains forms tagged with mood/tense/person/number. To apply the model to a target:

```
For each form record in <model>.jsonl:
  1. Identify the morphological role of each substring (stem? ending? aux?).
  2. Replace the model's stem characters with the target's corresponding stem.
  3. Emit a new record with the same tags but the target's surface.
```

The simplest implementation: identify the model's stem by string-matching against the model's principal parts (e.g., `bëj`'s present stem is `bë`). Wherever `bë` appears in a form, replace with the target's present stem. This is brittle for forms where stems overlap with endings; mitigation: only do replacement at the start of each form word.

A more robust implementation: parse the model's form into segments via the engine's decomposition output, then re-emit segments using the target's stems. This requires importing engine logic into the Python script — non-trivial. As an alternative, run the engine on the target verb directly and treat its output as Husić-derived. But that's tautological — engine = Husić-derived, so the comparison is trivially 100% match.

**Resolution:** Use the engine to derive forms for the target verb (i.e., `engine.table(target.id)`), but ONLY apply this when:
- The glossary's class-pattern matches what we'd assign the verb anyway.
- AND the target verb's `cellOverrides` are empty (so the engine output equals the regular paradigm template).

Under those conditions, the derived data is correctly described as "Husić-classified-paradigm-model output" and is meaningfully different from "engine output for the same verb": the engine might disagree with Husić on which class-pattern to assign, in which case the derived forms surface as mismatches.

This is the cleanest path. Let me commit to it.

### D5. Provenance field on cache records

```jsonl
{"form": "bëj", "tags": ["indicative", "present", "first-person", "singular"]}                         # direct
{"form": "kërkoj", "tags": ["indicative", "present", "first-person", "singular"], "derived": true}    # derived
```

The `derived` field is a boolean. Absent or `false` = direct.

### D6. verify-engine annotation

```
indicative/present/1sg              M (h*)  engine="kërkoj"  husic="kërkoj"     [derived from I-1 model]
indicative/imperfect/3sg            M (h)   engine="bënte"    husic="bënte"
admirative/imperfect/1sg            M (k)   engine="bëkësha"  kaikki="bëkësha"
indicative/future-perfect/1sg       -       (no source)
```

In `--verbose` mode, derived records get a trailing `[derived from <pattern>]` annotation pointing to the model.

### D7. Mismatch handling for derived records

If engine output disagrees with a derived Husić record:
- Could mean engine has a real bug.
- Could mean Husić's class-pattern assignment for the target verb is wrong (Husić classifies kërkoj as I-1 but engine treats it differently).
- Could mean our derivation logic is wrong (paradigm template misapplied).

The script SHALL surface mismatches with full context (engine form + derived Husić form + which model + which class-pattern) so humans can triage.

### D8. Skip policy

The cross-resolver SHALL skip a glossary entry when:
1. Lemma's principal parts can't be cleanly derived (most -aj/-ej/-uaj irregulars, suppletives).
2. Class-pattern reference doesn't resolve to a known paradigm model.
3. Lemma already has direct paradigm-model entry (don't override direct with derived).
4. Lemma's corresponding corpus entry has non-empty `cellOverrides` (likely irregular; derived would be wrong).

## Tradeoffs

- **Derived data is "twice removed" from Husić's print source.** It's Husić's classification + our derivation logic. Mitigated by skipping irregulars and clearly marking the provenance.
- **The current parser doesn't decompose forms.** D4's resolution uses the engine for derivation, which trades some independence for correctness. Acceptable: the value is verifying against Husić's classification, not against arbitrary form-by-form data.
- **A class-pattern in the glossary that doesn't map to any paradigm model is dropped.** Some Husić class-patterns may be non-standard or PDF-specific. Mitigation: log all dropped entries; investigate if drop rate is > 20%.
- **Husić-derived data can hide engine bugs** if the engine and the cross-resolver use the same paradigm rules. Mitigated by Kaikki being primary and direct Husić being preferred over derived.
- **Glossary section may not have a clean parseable structure.** Husić's PDF formatting could break the parser. Mitigation: ship a quality threshold (e.g., "if < 80% of expected glossary entries parse cleanly, fail the change").

## Resolved Questions

_None._

## Open Questions

- **Q1.** Husić's glossary may use abbreviations (e.g., "trans.", "intrans.") for transitivity. Capture and propagate these to derived entries? Recommend: yes, store as metadata for future use; don't filter on them.
- **Q2.** What's the exact fallback when a verb is in BOTH the paradigm-model section and the glossary section? Direct wins (D8 condition 3). Document in husic-format.md.
- **Q3.** If we add tier-3/tier-4 verbs and they don't appear in Husić's glossary at all (e.g., very rare or modern coinages), they get no Husić data. Acceptable: not all verbs need to be in Husić.
