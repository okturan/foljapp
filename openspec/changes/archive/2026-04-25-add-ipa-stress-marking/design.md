## Context

Albanian stress is largely rule-governed but with patterned exceptions. The fundamental observation: most native polysyllabic Albanian words carry penultimate stress. A meaningful set of exceptions covers Class 1 -j-final verbs (lemma stress on final), Latin/Greek borrowings (often final-stress), some kinship terms, and a handful of irregularly-stressed natives. Comprehensive references: Newmark (1982) §2.4, Buchholz & Fiedler (1987) §1.2.3, Paçarizi (2008) "Word stress in Albanian".

The `add-pronunciation` design (D1) deliberately deferred stress because "rule-based but with edge cases that benefit from review." Two pieces are needed to remove the deferral: a syllabifier, and a stress placer. The syllabifier is purely phonotactic. The stress placer applies a default rule plus a per-form override registry for documented exceptions.

## Goals / Non-Goals

**Goals:**

- Mark primary stress (`ˈ`) on every IPA-rendered word.
- Default rule: penultimate (with the documented Class 1 -j-verb exception).
- Per-form override mechanism for documented irregulars.
- All existing IPA test scenarios continue to pass after stress marks are added (with marker insertions where appropriate).
- The override registry is hand-curated and audit-friendly.

**Non-Goals:**

- No allophonic phonetic detail.
- No secondary stress.
- No prosodic phrasing.
- No Gheg variants.
- No user-facing stress toggle.

## Decisions

### D1. Syllabification follows the maximum-onset principle

For each word, walk left-to-right: a syllable begins at a vowel (or vowel-cluster like `ie`, `ye` in some borrowings — Albanian permits these only marginally; we treat them as single nuclei). The onset of a syllable is the maximal consonant cluster preceding the nucleus that forms a permissible Albanian onset.

Permissible onset clusters in Albanian (rough inventory):

```
single C:       any of /b d f g h j k l m n p ɾ r s t v z ʃ ʒ θ ð c ɟ ɲ ʎ ɫ ts dz tʃ dʒ/
C+l/r:          /pl pr bl br tr dr kr kl ɡr ɡl fl fr vl vr sl sr ʃp ʃt ʃk ʃl ʃr/
sC clusters:    /sp st sk sl sr/
```

Forbidden onsets (split required): geminate consonants, /sn/, /tn/, etc. — the parser falls back to maximal-onset that's permissible.

The syllabifier respects digraph atomicity (e.g., `sh`, `dh`, `gj`, `ll`) — a digraph is one phoneme and is never split across syllable boundaries.

### D2. Default stress = penultimate, with Class 1 -j-verb exception

For `punoj` the surface ends in `-oj`. Albanian Class 1 -j-verb LEMMAS carry stress on the final syllable (the `-oj` syllable). All conjugated forms of these verbs follow the regular rule once they're polysyllabic without the `-j` ending — `punuar` is penultimate-stressed (`puˈnuaɾ`), `punoja` is penultimate (`puˈnɔja`), but the bare lemma `punoj` is final-stressed (`puˈnɔj`).

Implementation:

```ts
function placeStress(syllables: Syllable[], override?: ...): number {
  if (override?.stressedSyllableIndex !== undefined) return override.stressedSyllableIndex;
  if (syllables.length <= 1) return 0;
  // Class 1 -j lemma exception: word ending in /j/ with vowel-final present stem
  // → final stress. This is approximated here; the override registry handles the
  // tail of cases where this heuristic is wrong.
  const last = syllables[syllables.length - 1]!;
  if (last.coda === 'j' && /[aeɛiɔuəyo]$/.test(last.nucleus)) {
    return syllables.length - 1;
  }
  return syllables.length - 2;
}
```

The heuristic is approximate; cases that don't fit (some compound forms, borrowings) are handled via the override registry rather than by adding more rules to the default.

### D3. Override registry shape

```json
[
  {
    "form": "punoj",
    "stressedSyllableIndex": 1,
    "source": "Newmark 1982 §2.4 (Class 1 -j verb lemmas carry final stress)"
  },
  {
    "form": "kafé",
    "stressedSyllableIndex": 1,
    "source": "Buchholz & Fiedler 1987 §1.2.3 (final-stressed Latin borrowing)"
  }
]
```

The registry lives at `data/stress-overrides.json`. Format is a JSON array. Lookup is by `form` (surface text). The registry doesn't currently support form-+-context disambiguation — every form is unique. If we encounter a homograph case, we extend the schema.

### D4. Stress mark placement in IPA

The marker `ˈ` (U+02C8, IPA primary stress) is inserted at the start of the stressed syllable's IPA — immediately before the syllable's onset (or before the nucleus if onset is empty).

```
Word: punoj   Syllables: [pu, nɔj]   Stressed: index 1 (override)
IPA:   p u ˈ n ɔ j
```

Output: `puˈnɔj`.

For multi-word phrases: each word independently. The space separator between words remains.

```
Phrase: kam punuar   Stressed words: [kam (idx 0), punuar (idx 1)]
IPA:    ˈ k a m   p u ˈ n u a ɾ
```

Output: `ˈkam puˈnuaɾ`.

### D5. Backward compatibility considerations

Every existing IPA assertion in tests must add a `ˈ` marker at the appropriate position. The pronunciation E2E spec (`apps/web/e2e/pronunciation.spec.ts`) and the IPA unit tests (`apps/web/lib/ipa.test.ts`) all need updates.

To avoid breaking external consumers (if any), the stress marker is part of standard IPA — any consumer parsing IPA strings should already accept `ˈ`. We don't ship a flag to disable it.

### D6. Source citations

| Decision                              | Source                                           |
|---------------------------------------|--------------------------------------------------|
| Default penultimate stress            | Newmark (1982) §2.4; Wikipedia *Albanian morphology* |
| Class 1 -j lemma exception            | Newmark (1982) §2.4; Buchholz & Fiedler (1987) §1.2.3 |
| Borrowings often final-stressed       | Paçarizi (2008) §3                              |
| IPA primary-stress convention         | Handbook of the IPA (1999), §2                  |

Each override registry entry carries its own per-form citation.

### D7. No phonological re-syllabification on derivation

Each form is syllabified independently from its surface. Albanian stress shifts are predictable from the resulting syllable count and the override registry — we don't model "the lemma's stress moves to penult when the participle suffix attaches" as a rule. We just syllabify the participle and apply the same default rule.

### D8. Test surface

```
syllabify():    pure function tests (vitest)
placeStress():  pure function tests (vitest)
toIpa():        existing tests + stress-marker assertions
verb-header:    existing E2E + stress-marker assertions
api JSON:       verify ipa.lemma contains ˈ
```

## Tradeoffs

- **The Class 1 -j-verb exception is a hard-coded heuristic in `placeStress`.** This concentrates linguistic policy in code rather than data. Mitigation: keep the heuristic to the one strongest pattern; everything else lives in the data registry.
- **The override registry is hand-curated.** Maintenance cost. Mitigation: the registry stays small (most words follow the default rule); auditable per-entry citations make scope clear.
- **Some forms in our seed corpus may have multiple plausible stress placements** (rare). Mitigation: pick the Standard Albanian convention per Newmark; document any contested cases in the registry's `notes` field.
- **No mechanism for stress-shift cross-form within a verb's paradigm.** Each conjugated cell re-applies the default rule. Acceptable: Albanian inflection rarely shifts stress across cells of the same lemma; when it does (e.g., aorist 3sg `puˈnoi` vs. imperfect 3sg `puˈnonte`), both happen to fall on the penultimate by default.
- **No support for clitic-attached forms (`puno-më`).** Out of scope; Albanian's verbal clitics are limited.

## Resolved Questions

_None._

## Open Questions

- **Q1.** Do we want stress marked on the IPA in inline conjugation cells (where each form is small), or only on the verb-header lemma + principal-parts? Recommend: ALL IPA renders with stress, since toIpa is the single source of truth.
- **Q2.** Should the override registry allow paradigm-class-level rules (e.g., "all Class 1 -j-verb lemmas")? Recommend: keep registry per-form for v1; if it grows past ~50 entries, revisit.
- **Q3.** Edge case: how do we mark stress on aorist 3sg of -j verbs like `punoi` (final stress) vs `punuar` (penult)? Default rule treats `punoi` as 2-syllable with penult on `pu` — wrong. Add `punoi`-style forms to override registry, or expand the -j heuristic. Recommend: registry, with a "Class 1 -j 3sg aorist" annotation in the notes field.
