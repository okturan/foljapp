## Why

The reference page already shows role-coded coloring — every cell decomposes into particle / auxiliary / stem / ending / voice-marker segments, each visibly distinct. That is the *visual* layer. The *educational* layer is missing: a learner sees `do të kisha punuar` colored four ways but doesn't know **why** any segment exists. This change adds the why.

Two surfaces:

1. **Hover tooltips** — pointing at any segment of any form reveals a one-line explanation: `"do — future-in-the-past marker"`, `"kisha — kam in imperfect indicative 1sg"`, `"punu — past-active stem of punoj"`, `"ar — Class 1 participle ending"`.
2. **Derivation panel** — a click-to-expand "How is this built?" accordion under each table that walks through the construction step-by-step:
   ```
   1. Start with the verb's principal parts:
      present puno · aorist punua · participle punuar
   2. Conditional perfect = "do të" + imperfect-of-aux + participle
   3. Aux is "kam" (declared in corpus). Imperfect 1sg of kam = "kisha"
   4. Participle of punoj = "punuar"
   5. Concatenate: do të kisha punuar
   ```

Together these turn the reference page into a learning tool without reflowing the layout or hiding any of the visual tables.

## What Changes

- Add `apps/web/components/segment-tooltip.tsx` — a Client Component using shadcn `Tooltip` that wraps each `<span>` in `DecomposedForm`. Tooltip content is derived from the segment's `role`, `meta.particleName`, `meta.tense`, etc., via a lookup table.
- Add `apps/web/lib/segment-explanations.ts` — the lookup that maps `(role, meta) → { english: string, sq: string }`. Returns short, learner-friendly explanations.
- Add `apps/web/components/derivation-panel.tsx` — a Client Component that takes a `ConjugationResult` and renders the construction recipe. It uses a small "tracer" engine helper that emits the construction steps.
- Add `engine.trace(verbId, options): TraceStep[]` — a new engine function that returns the same form/decomposition as `conjugate()` plus an ordered array of `TraceStep` records describing how the form was built. Pure addition; no breakage.
- Update `apps/web/components/conjugation-table.tsx` to wrap each `DecomposedForm` in a `<SegmentTooltip>` and to add a `<DerivationPanel>` toggle under each table.
- Update each tense row to include a "show derivation" affordance for users who want the long form without hover.

### What "trace" looks like

```
TraceStep =
  | { kind: 'principal-parts'; entry: VerbEntry }
  | { kind: 'recipe'; mood: Mood; tense: Tense; description: string }
  | { kind: 'aux-conjugation'; aux: 'kam' | 'jam'; tenseKey: AuxiliaryTenseKey; cell: CellLabel; result: string }
  | { kind: 'participle-lookup'; verbId: string; result: string }
  | { kind: 'paradigm-rule'; rule: CellRule; stem: string; ending: string; result: string }
  | { kind: 'phonology'; rule: 'palatalization' | 'vowel-collision'; before: string; after: string }
  | { kind: 'particle-prepend'; particle: string; reason: string }
  | { kind: 'final'; form: string }
```

The orchestrator already does all this work internally; this change just exposes the trace as a returnable artifact.

## Capabilities

### New Capabilities
- `decomposition`: Defines the contract for hover tooltips (every visible segment SHALL surface a tooltip with a learner-readable explanation; explanations SHALL be deterministic from segment role + meta), the derivation panel (every form SHALL be reconstructable from a list of trace steps), and the engine `trace()` function.

### Modified Capabilities
- `conjugation-engine`: Adds a `trace(verbId, options)` requirement. Existing `conjugate()` and `table()` are unchanged.
- `reference-pages`: Adds requirements that every form be hover-explorable and that each table has a click-to-expand derivation panel. Static-only fallback: when JS is disabled, the tooltip content is encoded as the segment's `title` attribute and the derivation panel renders open by default.

## Impact

- **Code** — `packages/engine/src/trace.ts` (engine surface), updates to `conjugate.ts` to expose trace as a side product, `apps/web/components/segment-tooltip.tsx`, `apps/web/components/derivation-panel.tsx`, `apps/web/lib/segment-explanations.ts`, table component update.
- **Dependencies** — None added. `@radix-ui/react-tooltip` is already a dep via the shadcn primitive.
- **APIs** — Engine gains `trace()`. Page gains client-rendered tooltip + accordion behavior.
- **Linguistic claims** — Each `segment-explanations.ts` entry needs a one-line description that is accurate. These explanations are the most "learner-facing" prose in the product — they need a fluent reviewer's eye but are not the same kind of paradigm-correctness audit as `refine-conjugation-engine`.
- **Audience tier** — Primarily **learners** (the entire point), with secondary value to **students** wanting to understand why a form looks the way it does.

## Non-Goals

- No "play with switches" interactivity — that is the playground (`add-interactive-playground`, Phase 3).
- No spaced-repetition or quiz mechanics — that is `add-practice-mode` (Phase 3).
- No animation when expanding the derivation panel.
- No localization of the explanations beyond English. Translation pass deferred.

## Sequence

```
PREREQ → add-verb-reference-page              (provides DecomposedForm + table layout)
PREREQ → add-conjugation-engine                (provides decomposition data)
THIS   → add-decomposition                     (creates decomposition capability;
                                                 modifies conjugation-engine + reference-pages)
PARALLEL → add-search-and-browse               (independent; can ship in either order)
NEXT   → add-grammar-articles                   (Phase 3, links from tooltip "learn more" affordance)
```
