## Why

The reference page already shows role-coded coloring — every cell decomposes into particle / auxiliary / stem / ending / voice-marker segments, each visibly distinct. That is the *visual* layer. The *educational* layer is missing: a learner sees `do të kisha punuar` colored four ways but does not know **why** any segment exists. This change adds short, learner-readable hover tooltips on every segment.

A more elaborate "click-to-expand derivation panel" with engine `trace()` instrumentation is real follow-up work, scoped in `add-engine-trace`. Tooltips ship first because they are the highest-leverage UX win for the smallest engineering cost.

## What Changes

- Add `apps/web/lib/segment-explanations.ts` — pure-data lookup that maps a `DecompositionSegment`'s `(role, meta.particleName, meta.tense, meta.mood)` to a one-line English explanation. Examples:
  - `do` → `"do — future / conditional marker"`
  - `të` → `"të — subjunctive marker"`
  - `mos` → `"mos — negation in imperative / subjunctive"`
  - `nuk` → `"nuk — negation"`
  - `u` → `"u — middle-passive marker (aorist)"`
  - `duke` → `"duke — gerund marker"`
  - `kam` (auxiliary) → `"kam — present indicative of 'to have'"`
  - `kisha` (auxiliary) → `"kisha — imperfect indicative of 'to have'"`
  - stem → `"verb stem"`
  - ending → `"-ja — Class 2 imperfect 1sg"` (parameterized by tense + cell when meta is present)
- Update `apps/web/components/decomposed-form.tsx` to wrap each segment in a tooltip-aware element. Static fallback uses the native `title` attribute (works without JavaScript). When JavaScript is available, a `<Tooltip>` from shadcn provides a richer presentation.
- Tooltips SHALL surface on focus as well as hover (keyboard accessibility).

## Capabilities

### New Capabilities
- `decomposition`: Defines the contract for hover/focus tooltips: every segment-rendering element SHALL expose a learner-readable explanation derivable from `(role, meta)`. Static fallback via `title` attribute. Optional richer rendering via `<Tooltip>` when JS is available.

### Modified Capabilities
- `reference-pages`: Adds a requirement that every form's segments are tooltip-explorable. Backwards-compatible: pages without JS still get explanations via `title`.

## Impact

- **Code** — `apps/web/lib/segment-explanations.ts` (new), `apps/web/components/decomposed-form.tsx` (wraps each segment with tooltip), no engine change.
- **Dependencies** — None (`@radix-ui/react-tooltip` already a dep via shadcn).
- **APIs** — None.
- **Linguistic claims** — Each explanation needs a one-line description that is accurate. The set of mappings is small (~30 entries); reviewable in a single PR.
- **Audience tier** — **Learners** primarily; **students** secondarily.

## Non-Goals

- No engine `trace()` function. Deferred to `add-engine-trace`.
- No "click-to-expand derivation panel". Deferred to `add-engine-trace`.
- No localization of explanations beyond English.
- No animations, transitions, or motion.

## Sequence

```
PREREQ → add-verb-reference-page              (provides DecomposedForm)
PREREQ → add-conjugation-engine               (provides decomposition data + meta)
THIS   → add-decomposition                     (creates decomposition capability)
NEXT   → add-engine-trace                      (engine trace + derivation panel)
```
