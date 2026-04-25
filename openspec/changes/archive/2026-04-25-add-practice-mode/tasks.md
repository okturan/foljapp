## 1. Pre-flight

- [ ] 1.1 Read proposal.md, design.md, and both spec files; confirm scope is unchanged

## 2. Question generation

- [ ] 2.1 Create `apps/web/lib/practice.ts` exporting `Question` type and `generateQuestions(opts)` function
- [ ] 2.2 Implement a small LCG PRNG factory `makeRng(seed)` per design D2
- [ ] 2.3 Enumerate the full set of valid `(verbId, options)` tuples once (cached at module load): active + affirmative + declarative across all six moods, respecting `engine.conjugate()` throws (skip cells that throw `UnsupportedCellError`)
- [ ] 2.4 `generateQuestions({ seed?, count?, focus? })` samples from the enumerated set
- [ ] 2.5 Add Vitest coverage: deterministic sampling with same seed; unseeded calls produce N questions; every generated question's expectedForm matches `engine.conjugate(...)`; focus restricts to the named verb

## 3. Quiz Client Component

- [ ] 3.1 Create `apps/web/components/quiz.tsx` (Client) reading URL search params for `seed` and `focus`
- [ ] 3.2 Generate questions on mount via `useMemo`
- [ ] 3.3 Manage state: currentIndex, answers (array of `{ correct, userInput }`), phase ('answering' | 'reviewing' | 'done')
- [ ] 3.4 Render the prompt, input field, Submit + Skip buttons
- [ ] 3.5 On Submit: compare against `expectedForm`; show correct/incorrect; reveal canonical form; show Next button
- [ ] 3.6 On final question Next: switch phase to 'done' and render the summary panel (score + missed list + Try Again button)
- [ ] 3.7 Try Again button generates a fresh session (with a fresh seed if not pinned)

## 4. Pages

- [ ] 4.1 Create `apps/web/app/practice/page.tsx` (RSC) with landing copy and the Start button
- [ ] 4.2 Create `apps/web/app/practice/quiz/page.tsx` wrapping `<Quiz />` in `<Suspense>` (required for useSearchParams)
- [ ] 4.3 Set page metadata for both

## 5. Reserved-actions update

- [ ] 5.1 Update `apps/web/components/reserved-actions.tsx`: replace the disabled "Practice" button with an enabled `<Link>` to `/practice/quiz?focus=<lemma>`
- [ ] 5.2 Frequency placeholder remains disabled

## 6. NavHeader

- [ ] 6.1 Add `Practice` link to `apps/web/components/nav-header.tsx` (between Browse and Playground)

## 7. End-to-end tests

- [ ] 7.1 Add `apps/web/e2e/practice.spec.ts` covering:
  - /practice landing renders Start button
  - /practice/quiz?seed=1 produces a deterministic first question
  - Submitting the correct answer scores as correct and advances
  - Submitting a wrong answer reveals the canonical form
  - After answering 10 questions, the summary appears with score
  - /practice/quiz?focus=punoj only asks punoj cells (sample multiple questions, all reference punoj)
  - Practice link on /verb/punoj routes to /practice/quiz?focus=punoj

## 8. Validation and handoff

- [ ] 8.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green
- [ ] 8.2 Update specs if implementation surfaced clarifications
- [ ] 8.3 `openspec validate add-practice-mode --strict` — zero errors
