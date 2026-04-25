## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and spec; confirm scope is unchanged

## 2. Verb picker

- [x] 2.1 Create `apps/web/components/verb-picker.tsx` — Client Component with `onSelect(lemma)` callback

## 3. Playground component

- [x] 3.1 Create `apps/web/components/playground.tsx` — Client Component reading URL search params via `useSearchParams()` and writing via `useRouter().replace()`
- [x] 3.2 Define MOOD_TENSES map for valid tense per mood
- [x] 3.3 Render verb picker on select → update URL
- [x] 3.4 Render fieldsets for: Mood, Tense, Voice, Polarity, Modality, Person, Number
- [x] 3.5 When mood is non-finite, hide tense/person/number; show Form selector
- [x] 3.6 Compute engine output via `conjugate(verbId, options)` with try/catch on `UnsupportedCellError`
- [x] 3.7 Render form with `<DecomposedForm>` for role-coded coloring + tooltips
- [x] 3.8 Show summary line below the form (translation + class + auxiliary from corpus index)
- [x] 3.9 "Copy link" button via `navigator.clipboard.writeText(window.location.href)`
- [x] 3.10 "See full table" link to `/verb/<lemma>`

## 4. Page route

- [x] 4.1 Create `apps/web/app/playground/page.tsx` as Server Component mounting `<Playground />` inside Suspense (required for useSearchParams)
- [x] 4.2 Set page metadata
- [x] 4.3 Verify static pre-rendering via build

## 5. Client-side corpus configuration

- [x] 5.1 Create `apps/web/lib/corpus-client.ts` that statically imports all 20 verb JSONs and calls `configure()` so the engine works in the browser bundle (server uses `lib/corpus.ts` separately)

## 6. NavHeader

- [x] 6.1 Add `Playground` link to `apps/web/components/nav-header.tsx`

## 7. End-to-end tests

- [x] 7.1 Add `apps/web/e2e/playground.spec.ts` covering: default load, mood change, jam aorist, imperative + 1sg unsupported, URL search params, copy-link button, shareable URL

## 8. Validation and handoff

- [x] 8.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green (72 unit + 35 E2E pass)
- [x] 8.2 Update specs if implementation surfaced clarifications — added Suspense wrapper + useEffect default URL writeback (documented inline in playground.tsx)
- [x] 8.3 `openspec validate add-interactive-playground --strict` — zero errors
