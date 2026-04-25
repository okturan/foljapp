## Context

`add-ipa-stress-marking` shipped a stress-placement implementation with two layers:

1. **Default rule** — penultimate (or 0 for monosyllabic) with a heuristic exception for words whose last syllable has `coda='j'` and a vowel nucleus (covers Class 1 -j-verb lemmas).
2. **Override registry** — `data/stress-overrides.json`, hand-curated, currently with one entry (`është`).

Two gaps:
- The override registry is sparse. Many forms in our 100-verb corpus have non-default stress not caught by the heuristic.
- There's no audit script to detect drift, so forms can render incorrectly without anyone noticing.

This change closes both gaps.

## Goals / Non-Goals

**Goals:**

- Comprehensive stress-correctness audit across the corpus.
- Registry growth to ~15–30 entries covering documented exceptions.
- Heuristic refinement where a clear systematic pattern emerges.
- Standing CI gate against future drift.

**Non-Goals:**

- No secondary stress (`ˌ`).
- No phonetic detail (vowel reduction, length).
- No prosodic / phrasal stress.
- No dialectal variants.
- No automated detection beyond hand-curated reference data.

## Decisions

### D1. Audit script architecture

`scripts/audit-stress.ts` walks every corpus verb. For each verb it generates these forms:

- Lemma (already in principalParts.present + class-specific suffix)
- Principal parts (present, aorist, participle stems)
- Indicative present 1sg, 2sg, 3sg
- Indicative imperfect 3sg
- Indicative aorist 1sg, 3sg, 1pl
- Subjunctive present 1sg
- Imperative 2sg
- Participle (non-finite)

That's ~12 forms per verb × 100 verbs = ~1200 stress placements to audit.

For each form: compute engine IPA via `toIpa(form)` (which goes through syllabify + placeStress), compare against an expected stress index drawn from the reference set.

### D2. Reference set encoding

The reference set is encoded in the audit script as a TypeScript constant — a map from form-text to expected stressed syllable index. Initial population:

```typescript
const STRESS_REFERENCE: Record<string, number> = {
  // From Newmark 1982 §2.4
  "punoj": 1,           // Class 1 -j lemma final stress
  "punon": 0,           // 2sg/3sg present penultimate
  "punuam": 1,          // aorist 1pl penultimate (-am)
  "punuat": 1,          // aorist 2pl penultimate
  "punuar": 1,          // participle penultimate
  "punoi": 1,           // aorist 3sg final (-j-aorist exception)
  // ... continues for ~50–100 forms initially; grows as audit reveals divergences
};
```

This dataset is human-curated and citable. Whenever a new corpus verb is added, the reference set must include its expected stress placements.

### D3. Heuristic refinement for systematic patterns

Some patterns might be elevated from registry entries to the heuristic if they apply uniformly. Candidate: "Class 1 -j verb aorist 3sg ends in -oi or -ei → final stress".

This requires:
- Detecting the form's tense/person/number context (which syllabify+stress doesn't have — they receive only the surface form).
- Either passing context through to placeStress, or doing pure surface-level pattern matching.

Surface-level: words ending in `-oi`, `-ai`, `-ei`, `-ui` and containing 2 syllables → final stress. This is verb-specific morphology, but the surface pattern is unique enough to encode safely.

Implementation:
```typescript
// In placeStress:
const lastSyllable = syllables[syllables.length - 1]!;
if (last.coda === '' && /^[aeio]i$/.test(last.surface)) {
  // ends in -ai/-ei/-oi (aorist 3sg of Class 1 -j verbs)
  return syllables.length - 1;
}
```

Caveat: this might over-trigger on non-aorist forms ending in -ui or -oi. Mitigation: the audit script verifies after the heuristic is added; if false-positives surface, narrow the heuristic.

### D4. Override entry shape (extended)

```json
{
  "form": "kafe",
  "stressedSyllableIndex": 1,
  "source": "Buchholz & Fiedler 1987 §1.2.3 (final-stressed Latin borrowing)"
},
{
  "form": "ndodhem",
  "stressedSyllableIndex": 1,
  "source": "Newmark 1982 §2.4 (MP-stem with penultimate stress on -em ending)",
  "notes": "MP-only verb; lemma surface is MP form"
}
```

`notes` is optional; useful for context that doesn't fit the source citation.

### D5. CI gate via vitest

A vitest test file at `apps/web/lib/audit-stress.test.ts` imports the audit script's check function and runs it during `npm test`. Failure mode: the test fails with a clear diagnostic listing each unflagged divergence.

Performance: ~1200 form computations × ~1ms each = ~1.2 seconds. Acceptable for CI.

### D6. Audit workflow per session

```
1. Author the reference set additions for any new verbs.
2. Run audit-stress.ts; inspect output.
3. For each divergence:
   a. If systematic: refine heuristic in stress.ts; rerun.
   b. If one-off: add registry entry with citation.
   c. If reference set is wrong: fix reference, document.
4. Iterate until audit passes clean.
5. Confirm vitest runs clean.
```

### D7. Reference-set sources

- **Newmark, Hubbard, Prifti** (1982). *Standard Albanian: A Reference Grammar for Students*. §2.4 covers stress.
- **Buchholz & Fiedler** (1987). *Albanische Grammatik*. §1.2.3 covers stress.
- **Wikipedia, Albanian phonology** as accessible cross-reference.
- **Kaikki / Wiktionary** does NOT mark stress directly, so isn't a reference for this audit.

Each reference set entry cites its source.

## Tradeoffs

- **Hand-curation cost.** ~1200 form audits × ~1 minute per divergent form ≈ ~5 minutes if the divergence rate is 25%, or ~20 minutes if the rate is 100% (extreme case). Realistic estimate: ~30 minutes one-time + small additions when corpus grows.
- **Reference set grows linearly with corpus.** Mitigated by encoding rules (penultimate is the default; only divergent forms need explicit entries).
- **Heuristic refinements risk over-triggering.** Mitigation: audit script verifies before/after each refinement.
- **CI gate adds ~1.2 seconds to test run.** Acceptable.
- **Reference sources are print-only.** Not a blocker — we cite them; future contributors can verify.

## Resolved Questions

_None._

## Open Questions

- **Q1.** Should the audit script also check unstressed-syllable vowel quality (allophonic differences)? Recommend: NO — that's phonetic, not phonemic, and out of scope for our IPA implementation.
- **Q2.** What's the policy for forms where Newmark and Buchholz disagree on stress? Recommend: Newmark wins (more recent / more focused on student-friendly Standard Albanian); document any disagreement in `notes`.
- **Q3.** Does the audit cover compound forms (`do të punoja`, `kam punuar`)? Yes — each word is stressed independently per `toIpa`'s implementation; the audit checks each word.
