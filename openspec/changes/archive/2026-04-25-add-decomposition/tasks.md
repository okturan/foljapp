## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and both spec files; confirm scope is unchanged
- [x] 1.2 Confirm shadcn `<Tooltip>` primitive exists in `apps/web/components/ui/tooltip.tsx`

## 2. Explanation lookup

- [x] 2.1 Create `apps/web/lib/segment-explanations.ts` with a typed function `explain(segment): string` keyed by `role`, `meta.particleName`, `meta.tense`, `meta.mood`
- [x] 2.2 Cover every particle name the engine emits (do, të, mos, nuk, s, a, duke, pa, me-të-prefix, për, u)
- [x] 2.3 Cover the four non-particle roles (auxiliary, stem, ending, voice-marker)
- [x] 2.4 For auxiliary segments, include the auxiliary verb name (kam/jam) and tense from meta when available
- [x] 2.5 Add Vitest test `apps/web/lib/segment-explanations.test.ts` asserting that every (role, particleName) pair produced by the engine for the seed corpus has a non-empty explanation

## 3. Tooltip-aware DecomposedForm

- [x] 3.1 Mark `apps/web/components/decomposed-form.tsx` as `'use client'`
- [x] 3.2 For each segment, render a focusable `<span>` with `tabIndex={0}`, `title={explanation}`, and `aria-label={explanation}`
- [x] 3.3 Wrap each segment in shadcn `<Tooltip>` with `<TooltipTrigger>` and `<TooltipContent>`
- [x] 3.4 Mount `<TooltipProvider>` inside DecomposedForm (one per cell — keeps the verb page RSC, avoids needing a Client wrapper higher up)

## 4. End-to-end tests

- [x] 4.1 Add `apps/web/e2e/decomposition.spec.ts` covering: compound perfect, subjunctive marker, future "do" particle each carry the expected explanation in title/aria-label
- [x] 4.2 Cover keyboard accessibility: Tab focus on a segment exposes the explanation
- [x] 4.3 Cover static fallback: with JS disabled, the title attribute is present
- [x] 4.4 Update existing verb-page tests that assumed the old `aria-label="role surface"` format to use cell anchor IDs instead

## 5. Validation and handoff

- [x] 5.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green (72 unit + 23 E2E pass)
- [x] 5.2 Update specs if implementation surfaced clarifications (none required)
- [x] 5.3 `openspec validate add-decomposition --strict` — zero errors
