## Why

foljapp currently surfaces conjugations passively — the user *reads* tables. Learners need to *produce* forms to actually internalize them. This change adds a quiz: prompt → user types → engine scores → advance. The biggest standalone user-value addition since the verb page itself.

The quiz uses the engine as the answer authority (the same engine that hits 100% Kaikki match), so any form the user produces correctly is immediately validated against the canonical authority. No separate answer store; no drift.

## What Changes

- Add `/practice` (RSC) — landing page describing the quiz, with a "Start a session" button linking to `/practice/quiz`.
- Add `/practice/quiz` — Client Component that runs a 10-question session. Each question:
  - Picks a random corpus verb and a random supported active-voice affirmative-declarative cell.
  - Renders a prompt: `Conjugate <lemma> (<translation>) in <mood> <tense> <person><number>`.
  - Accepts a free-form text input.
  - On Submit: compares the input against `engine.conjugate(verbId, options).form`. Reports correct/incorrect and reveals the canonical form.
  - "Skip" reveals the answer without crediting the cell.
- Question generation lives in `apps/web/lib/practice.ts`:
  - `generateQuestions(seed?: number, count: number = 10)` returns `Question[]`
  - Filters out imperative non-2nd-person (engine throws) and ensures `engine.conjugate(...)` doesn't throw for the chosen cell
  - Deterministic when `seed` is provided (via a small linear-congruential PRNG); used by tests to pin a known set of questions
- Session ends with a summary: `score / total`, list of incorrect answers with the canonical form, "Try again" button.
- Update `apps/web/components/reserved-actions.tsx` on verb pages: replace the disabled "Practice" placeholder with a working link to `/practice?focus=<lemma>` (the focus param scopes the quiz to that verb's cells — light extension).
- Add `Practice` link to NavHeader.

## Capabilities

### New Capabilities
- `practice-mode`: Defines the quiz contract — landing page, quiz session lifecycle, question shape, scoring, deterministic seed for tests, focus scoping.

### Modified Capabilities
- `reference-pages`: Updates the reserved-actions row to enable the Practice link.

## Impact

- **Code** — `apps/web/lib/practice.ts`, `apps/web/components/quiz.tsx`, `apps/web/app/practice/page.tsx`, `apps/web/app/practice/quiz/page.tsx`, updates to `reserved-actions.tsx` and `nav-header.tsx`.
- **Dependencies** — None. Engine + corpus already do all the work.
- **APIs** — None.
- **Linguistic claims** — None. The engine is the answer authority.
- **Audience tier** — **Learners** primarily. Researchers can use focus= to drill specific verbs.

## Non-Goals

- No spaced repetition / SRS scheduling.
- No persistent score history (no localStorage in v1; sessions are ephemeral).
- No middle-passive cells (engine's MP coverage isn't fully verified yet).
- No negative or interrogative cells in v1 (focus on the core conjugation skill).
- No form → cell reverse quiz (separate change; would require a disambiguation UI for ambiguous forms).
- No multi-cell questions ("conjugate the full present indicative").

## Sequence

```
PREREQ → add-conjugation-engine               (engine produces correct forms)
PREREQ → add-verb-reference-page              (reserved-actions row to update)
THIS   → add-practice-mode
NEXT   → add-engine-trace                      (could power "show derivation" for misses)
LATER  → add-spaced-repetition                  (persistent learning loop, post-MVP)
```
