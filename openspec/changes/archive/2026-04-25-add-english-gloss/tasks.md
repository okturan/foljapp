## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/english-gloss/spec.md
- [x] 1.2 Inventory the corpus: which verbs need explicit `englishForms` overrides? Most likely: jam (be), kam (have), bëj (do/make), dua (want/love), shoh (see), jap (give), vij (come), them (say), shkoj (go), marr (take), ha (eat), pi (drink), fle (sleep), shkruaj (write), gjej (find), mbaj (hold), lë (leave), fitoj (win), shes (sell), blej (buy), dëgjoj (hear), mësoj (learn/teach), mendoj (think), kuptoj (understand), bie (fall), pyes (ask), pres (wait/cut), eci (walk)
- [x] 1.3 Spot-check the irregular-verb registry against the inventory; ensure 30+ entries cover the corpus

## 2. Schema extension

- [x] 2.1 Extend `packages/data/src/schema.ts` `VerbEntry` with optional `englishForms?: { base: string; past?: string; participle?: string; gerund?: string }`
- [x] 2.2 Add Zod schema validation (string min length 1 for base; optional for the others)
- [x] 2.3 Add a unit test in `packages/data/test/schema.test.ts` covering valid + partial-override cases

## 3. Irregular registry

- [x] 3.1 Create `data/english-irregulars.json` with ~30 hand-curated entries per design D3 list
- [x] 3.2 Each entry SHALL have `{ base, past, participle, gerund, source }` per spec
- [x] 3.3 Cite Cambridge Grammar of the English Language for each entry (CGEL has comprehensive irregular tables in §3.1.5)

## 4. Verb-form derivation

- [x] 4.1 Create `apps/web/lib/english-forms.ts` exporting `getEnglishForms(verb: VerbEntry): EnglishForms`
- [x] 4.2 Implement the resolution chain: per-verb override → registry match → auto-derivation rules
- [x] 4.3 Auto-derivation rules per design D3 (e→ed, y→ied, CVC→Cced; e→ing, CVC→Cing)
- [x] 4.4 First-sense picker: split on " / " and use the first sense
- [x] 4.5 Strip "to " prefix
- [x] 4.6 Vitest coverage in `apps/web/lib/english-forms.test.ts`: regular cases (work, look), e-final (love, write... wait write is irregular), y-final (try, study), CVC (stop, plan, hop), irregular registry (see, eat, give), per-verb override (jam → be), multi-sense (kërkoj → look for)

## 5. Template engine

- [x] 5.1 Create `apps/web/lib/english-gloss.ts` exporting `englishGloss(verb, options): string`
- [x] 5.2 Encode the ~30 base templates per design D7 as a `Record<string, BaseTemplate>`
- [x] 5.3 `BaseTemplate` interface: `{ aux: string; verbForm: 'base' | 'past' | 'participle' | 'gerund'; noPronoun?: boolean; suffix?: string }`
- [x] 5.4 `pronoun(person, number)` helper per design D2
- [x] 5.5 `beForm(person, number, tense)` helper for be-agreement (am/are/is, was/were, etc.)
- [x] 5.6 `auxForm(aux, person, number, tense)` resolver for slash-forms (`have/has` → `has` for 3sg)

## 6. Voice transform

- [x] 6.1 Implement `applyVoiceTransform(activeGloss, voice): string` per design D4 mapping table
- [x] 6.2 Vitest scenarios: active vs passive 1sg present, perfect, pluperfect, future, conditional, admirative

## 7. Polarity transform

- [x] 7.1 Implement `applyPolarityTransform(gloss, polarity): string` per design D5
- [x] 7.2 Detect aux presence; insert "not" after first aux OR insert "do/does/did" + "not"
- [x] 7.3 Handle imperative ("don't" or "do not")
- [x] 7.4 Vitest scenarios: simple present negation, simple past negation, perfect negation, future negation, conditional negation, imperative negation

## 8. Modality transform

- [x] 8.1 Implement `applyModalityTransform(gloss, modality): string` per design D6
- [x] 8.2 Subject/aux inversion; cap'd aux; trailing `?`
- [x] 8.3 Compose with negative: "have I not worked?"
- [x] 8.4 Vitest scenarios: simple present interrogative, simple past interrogative, perfect interrogative, future interrogative, negative+interrogative compose

## 9. Per-verb overrides

- [x] 9.1 Audit the corpus: identify verbs whose first-sense pick or auto-derivation produces a wrong English form
- [x] 9.2 Add `englishForms` to those verbs' JSON entries (suppletives + multi-sense priority)
- [x] 9.3 Re-run the gloss tests; iterate until clean
- [x] 9.4 Document per-verb override choices in their `notes` field

## 10. UI integration — playground

- [x] 10.1 Modify `apps/web/components/playground-result.tsx` to compute and render the gloss
- [x] 10.2 Render as muted second line beneath the IPA, e.g., `<p className="mt-1 text-sm italic text-stone-500">"{gloss}"</p>`
- [x] 10.3 Update reactively as controls change (already wired via React state)

## 11. UI integration — verb page

- [x] 11.1 Modify `apps/web/components/decomposed-form.tsx` (or wherever the tooltip rendering lives) to append the gloss after segment role descriptions
- [x] 11.2 Tooltip example text: `"have, kam (auxiliary, 1sg present); worked, punuar (stem); English: 'I have worked'"`

## 12. UI integration — API JSON

- [x] 12.1 Modify `apps/web/app/api/verbs/[lemma]/route.ts` to add `englishGloss` field per cell in the `table` response
- [x] 12.2 Update `apps/web/lib/api-shapes.ts` types
- [x] 12.3 Update `apps/web/app/api/openapi.json/route.ts` schema for `ApiVerbDetailResponse`

## 13. End-to-end tests

- [x] 13.1 Add `apps/web/e2e/english-gloss.spec.ts` covering: playground default `/playground` shows `"I work"`; toggling mood/tense updates gloss; verb-page `/verb/punoj` tooltip on perfect 1sg cell contains `"I have worked"`; API JSON for `/api/verbs/punoj` contains `englishGloss` field on at least one cell
- [x] 13.2 Add a scenario for a suppletive (`/verb/jam`) whose gloss uses the override (`"I am"` for 1sg present)

## 14. Audit + smoke

- [x] 14.1 Run `englishGloss` for every cell of every corpus verb (200+ verbs × ~80 cells = ~16,000 calls). Confirm zero `null`/`undefined`/empty strings
- [x] 14.2 Manual smoke: random sample of 30 forms across moods, tenses, voices, polarities, modalities; verify output looks correct

## 15. Documentation

- [x] 15.1 Update CLAUDE.md if any new working-rules emerged (unlikely)
- [x] 15.2 Update `packages/engine/docs/sources.md` if needed (unlikely, this is web-side)

## 16. Validation and archive

- [x] 16.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 16.2 `openspec validate add-english-gloss --strict` — zero errors
- [x] 16.3 Archive
