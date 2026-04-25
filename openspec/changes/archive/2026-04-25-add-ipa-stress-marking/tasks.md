## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/pronunciation/spec.md
- [x] 1.2 Confirm corpus IPA references in `apps/web/lib/ipa.test.ts` and `apps/web/e2e/pronunciation.spec.ts` so we know the assertions to update

## 2. Syllabifier

- [x] 2.1 Create `apps/web/lib/syllabify.ts` with `syllabify(word: string): Syllable[]`
- [x] 2.2 Define `Syllable` interface: `{ surface, onset, nucleus, coda }`
- [x] 2.3 Implement maximum-onset parser respecting digraph atomicity
- [x] 2.4 Vitest coverage in `apps/web/lib/syllabify.test.ts`: open syllables (`pu.noj`), monosyllabic (`kam`), initial-vowel (`ësh.të`), digraph-internal (verify no split), consonant-cluster split where rule requires it

## 3. Stress placer

- [x] 3.1 Create `apps/web/lib/stress.ts` with `placeStress(syllables, override?): number`
- [x] 3.2 Implement default rule: penultimate (or 0 for monosyllabic)
- [x] 3.3 Implement Class 1 -j-verb lemma exception: if last syllable has coda='j' and vowel nucleus, return final-syllable index
- [x] 3.4 Vitest coverage: 2-syllable -j lemma → final, 2-syllable non-j lemma → penult, 3-syllable → penult, monosyllabic → 0, override wins

## 4. Override registry

- [x] 4.1 Create `data/stress-overrides.json` — JSON array of `{ form, stressedSyllableIndex, source }`
- [x] 4.2 Seed entries for known irregulars in our corpus: any form where the rule misfires after the heuristic (likely few; document each with a citation)
- [x] 4.3 Schema-validate the file at build time (extend `scripts/build-corpus.ts` or add a separate validator)

## 5. toIpa stress integration

- [x] 5.1 Modify `apps/web/lib/ipa.ts` to load `stress-overrides.json` at module init
- [x] 5.2 In `toIpaWord`, call `syllabify` then `placeStress`, then insert `ˈ` at the correct position in the IPA-emitted string
- [x] 5.3 Maintain the multi-word `toIpa` behavior — each word stresses independently
- [x] 5.4 The optional `options.overrides` argument allows callers to pass ad-hoc overrides without touching the registry

## 6. Update existing IPA tests

- [x] 6.1 Add `ˈ` markers to all assertions in `apps/web/lib/ipa.test.ts`
- [x] 6.2 Update `apps/web/e2e/pronunciation.spec.ts` similarly
- [x] 6.3 Add new vitest scenarios specifically for stress placement: `puˈnɔj` (final via override), `ˈkam` (monosyllabic), `ˈʃɔh` (monosyllabic), `puˈnuaɾ` (penult), `ˈθaʃə` (penult)

## 7. Verb-header rendering

- [x] 7.1 Confirm `VerbHeader` already calls `toIpaBracketed` — no code change required, but visually verify that `/puˈnɔj/` renders correctly (the `ˈ` is rendered by the same monospace font as the rest of the IPA)
- [x] 7.2 Add an e2e check that the rendered `/verb/punoj` page contains `puˈnɔj`

## 8. API JSON

- [x] 8.1 Confirm `/api/verbs/punoj` JSON response's `ipa.lemma` contains `puˈnɔj`
- [x] 8.2 Add an e2e API check (in `apps/web/e2e/api.spec.ts`) for the stress marker

## 9. Documentation

- [x] 9.1 Update `apps/web/lib/ipa.ts` docstring to mention stress
- [x] 9.2 Optional: extend an existing grammar article (or add a new short one) describing Albanian stress rules and the override mechanism — defer if scope creep

## 10. Validation and archive

- [x] 10.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 10.2 `openspec validate add-ipa-stress-marking --strict` — zero errors
- [x] 10.3 Archive
