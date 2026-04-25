## Why

The `pronunciation` capability ships phonemic IPA but no stress marking — `toIpa("punoj")` returns `"punɔj"`, not `"puˈnɔj"`. Without stress, learners can't tell where to put primary emphasis. Stress is also part of the standard reference quality bar and the foundation for any future TTS or rhythm-aware practice modes.

Albanian stress is mostly predictable: penultimate syllable in most polysyllabic words, with patterned exceptions for Latin/Greek borrowings (often final-stressed) and a small set of native irregular-stress words. The `add-pronunciation` design (D1) explicitly deferred stress marking, noting "rule-based but with edge cases that benefit from review." The 18 months since pronunciation shipped have given us a corpus to test against, so encoding the rules is now well-grounded.

## What Changes

- **Add** `apps/web/lib/syllabify.ts` exporting `syllabify(word: string): Syllable[]` — splits a word into syllables using a maximum-onset-principle parser over Albanian phonotactics.
- **Add** `apps/web/lib/stress.ts` exporting `placeStress(syllables: Syllable[], overrides?: StressOverride): number` — returns the index of the stressed syllable. Default rule: penultimate (or final for monosyllabic). Override mechanism for per-form irregular stress.
- **Modify** `apps/web/lib/ipa.ts`:
  - `toIpa(text)` SHALL insert the IPA primary-stress marker `ˈ` before the stressed syllable's onset.
  - For multi-word phrases (e.g., `kam punuar`), each word's stress is computed independently.
  - The function gains a second argument `toIpa(text, options?)` where options can carry stress overrides.
- **Add** `data/stress-overrides.json` — a small registry of per-form irregular stress overrides for words we encounter in the corpus where the rule misfires.
- **Update** all existing IPA scenarios to expect stress markers (e.g., `"puˈnɔj"` not `"punɔj"`).
- **Extend** `apps/web/components/verb-header.tsx` and any other IPA surfaces to display the stress-marked output.

## Capabilities

### Modified Capabilities

- `pronunciation`: The `toIpa` requirement gains stress-marking obligations. The "no stress marking in v1" non-goal from `add-pronunciation` is rescinded. New requirements cover syllabification, default-stress placement, and the override mechanism.

## Impact

- **Code** — `apps/web/lib/syllabify.ts` (new), `apps/web/lib/stress.ts` (new), `apps/web/lib/ipa.ts` (extend), `apps/web/components/verb-header.tsx` (likely no change — uses toIpa output directly).
- **Data** — `data/stress-overrides.json` (small, hand-curated).
- **Dependencies** — None.
- **APIs** — `/api/verbs/[lemma]` JSON `ipa` field changes content (now contains stress marks). Additive in spirit; consumers parsing IPA strings should already accept any phoneme sequence.
- **Linguistic claims** — Each stress rule is sourced. References listed in design D6.
- **Audience tier** — Learners benefit most directly. Researchers gain a more usable phonemic representation.

## Non-Goals

- **No phonetic detail.** Allophonic stress-induced changes (vowel reduction, length shifts in unstressed syllables) are not modeled. Stress marker only.
- **No secondary stress.** Some long compound words have a secondary stress (`ˌ`); we mark only primary stress (`ˈ`).
- **No prosodic phrasing.** Multi-word phrases get one primary-stress mark per word, not per phrase.
- **No automatic stress-shift on derivation.** Where Albanian morphology shifts stress predictably across derived forms, we re-syllabify and re-place stress per form (not via an explicit "shift" rule). Each form's stress is computed from scratch.
- **No Gheg-specific stress.** Standard Albanian (Tosk-based) only, consistent with the rest of the project.
- **No user-facing stress-toggle in the UI.** Stress marks are always shown.

## Sequence

```
PREREQ → add-pronunciation                     (toIpa pipeline + IPA UI surfaces)
THIS   → add-ipa-stress-marking
NEXT   → could-extend-to-secondary-stress      (if interest emerges)
```
