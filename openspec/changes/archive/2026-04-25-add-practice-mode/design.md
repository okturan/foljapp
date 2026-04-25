## Context

Quiz is the only Phase 3 capability that turns reference into a learning loop. Everything we need is already in place: engine, corpus, the playground demonstrates the controls UI. The novel pieces are question generation and the quiz state machine.

## Goals / Non-Goals

**Goals:**

- A self-contained 10-question quiz that uses the engine as the answer authority.
- Deterministic question selection when seeded — required for E2E.
- Focus scoping via URL so `/verb/[lemma]`'s Practice button routes meaningfully.
- Static-renderable landing + quiz pages.

**Non-Goals:**

- No persistent score / SRS / leaderboard.
- No middle-passive, negative, or interrogative cells (active+affirmative+declarative only).
- No form → cell reverse quiz.
- No hint system (defer; v1 is right-or-reveal).

## Decisions

### D1. Quiz state is React state, not URL state

Unlike the playground (where URL-driven state enables sharing), quiz state is ephemeral: the questions, current index, score. URL params drive only the *configuration* (seed, focus). State lives in `useState` inside the Client Component.

Trade-off: refresh resets the session. Acceptable; quizzes are short.

### D2. Tiny linear-congruential PRNG for seeded randomness

Implementation in `apps/web/lib/practice.ts`:

```
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
```

Used by `generateQuestions(seed)` to pick verbs and cells deterministically. When no seed is provided, use `Math.random()`.

### D3. Question generation is filter-then-pick

Build a list of all `(verbId, options)` tuples that produce a clean form (no engine throw) for active+affirmative+declarative across all six moods. Then sample N from that list with the PRNG.

Constraints applied during enumeration:
- Skip cells where `engine.conjugate(...)` throws `UnsupportedCellError` (e.g., imperative 1sg)
- Skip non-finite forms (don't have a single canonical "form" string in the same sense; cover later)
- For imperative, restrict to person=2

The full enumerated set is computed once (cached) on import. Sampling 10 questions is microseconds.

### D4. Answer comparison is exact string match

`userInput.trim() === expectedForm` — diacritic-strict. We don't fold diacritics or accept variants. The engine's output is the standard.

If the user types `punoja` instead of `punoj` (extra a), it's incorrect. If they type `Punoj` (capital P), it's incorrect. Future enhancement: case-insensitive option, but v1 holds the strict bar.

### D5. Focus scoping

`?focus=<lemma>` filters the enumerated set to only that verb's cells. If the lemma is unknown, fall back to the full set with a small notice.

### D6. UI / layout

```
   ┌──────────────────────────────────────────────────────────┐
   │  Question 3 of 10                              Score 2/2  │
   │  ─────────────────────────────────────────────            │
   │  Conjugate punoj (to work) in admirative present 1sg      │
   │                                                           │
   │  [_____________________________]                          │
   │                                                           │
   │  [Submit]    [Skip]                                       │
   └──────────────────────────────────────────────────────────┘

   After submit (correct):
   ┌──────────────────────────────────────────────────────────┐
   │  ✓ correct                                                │
   │  punuakam                                                  │
   │  [Next →]                                                 │
   └──────────────────────────────────────────────────────────┘

   After 10 questions:
   ┌──────────────────────────────────────────────────────────┐
   │  Session complete                                         │
   │  Score: 7 / 10                                            │
   │  ───────────────────────                                  │
   │  Missed:                                                  │
   │  • punoj  admirative present 1sg → punuakam (you: punokam)│
   │  • marr   indicative aorist 3sg   → mori                  │
   │  ...                                                       │
   │  [Try again]                                              │
   └──────────────────────────────────────────────────────────┘
```

## Tradeoffs

- **No SRS** — sessions are isolated. We could add IndexedDB later, but v1 is intentionally simple.
- **No hint system** — keeps the loop tight. Hints are an enhancement.
- **Active voice only** — protects against engine-MP corner cases. Once MP is verified, expand.
- **Diacritic-strict matching** — high bar but mirrors the engine. Mobile users without ë on their keyboard will fail; we'll add an input affordance for special chars in a follow-up.

## Resolved Questions

_None._
