## Why

`add-decomposition` shipped tooltips that explain WHAT each segment is — but not HOW the engine got there. A learner sees `do të kisha punuar` colored four ways and tooltips telling them "do is a future marker, kisha is kam in imperfect, etc." They still don't see the *recipe*: pick conditional perfect → recipe is `do të` + imperfect of kam + participle → kam imperfect 1sg is kisha → punoj's participle is punuar → concatenate.

This change adds that recipe as a returnable artifact. The engine gains `trace(verbId, options)` which, given the same input as `conjugate()`, returns an ordered `TraceStep[]` describing every decision: corpus lookup, stem selection, paradigm application, recursion into the auxiliary, phonology, particle prepending. The playground renders the trace in a collapsible "How is this built?" panel; a follow-up change can put it on the verb page too.

## What Changes

- Add `trace(verbId, options): TraceStep[]` to `@foljapp/engine`. Implementation reconstructs the trace post-hoc from the conjugation result + corpus entry + paradigm + suppletion lookups (no instrumentation of the orchestrator; the engine's existing data structures already carry everything needed).
- Define `TraceStep` as a discriminated union covering: `corpus-lookup`, `suppletive-lookup`, `paradigm-rule`, `auxiliary-recursion`, `phonology`, `particle-prepend`, `final`.
- Each step has a `summary: string` (one human-readable sentence) plus structured fields (e.g., `stem`, `ending`, `auxiliary`, `mood-tense-cell`).
- Add `<DerivationPanel>` Client Component in `apps/web/components/derivation-panel.tsx` rendering a trace as a numbered step list.
- Mount `<DerivationPanel>` on the playground beneath the form output, collapsed by default with a toggle.
- Vitest coverage of the trace generator across representative cells.

## Capabilities

### New Capabilities
_None._ Trace is part of the existing `conjugation-engine` capability surface.

### Modified Capabilities
- `conjugation-engine`: Adds the `trace()` API requirement, the TraceStep shape, and the requirement that every `conjugate()`-able cell can also be `trace()`d.
- `interactive-playground`: Adds the requirement that the playground exposes a derivation panel built from `trace()`.

## Impact

- **Code** — `packages/engine/src/trace.ts` (new), `packages/engine/src/index.ts` (export `trace`), `apps/web/components/derivation-panel.tsx` (new), updates to `apps/web/components/playground.tsx` to mount the panel.
- **Dependencies** — None.
- **APIs** — Engine gains `trace()`. Existing API stays unchanged (additive).
- **Linguistic claims** — None (pure transparency on what the engine already does).
- **Audience tier** — Primarily **learners** (the recipe is the lesson); **researchers** appreciate the auditability.

## Non-Goals

- No middle-passive trace branches (engine MP coverage is partial; trace mirrors what conjugate supports).
- No trace UI on the verb page in this change (separate follow-up to keep change tight).
- No internationalization of trace step summaries (English only).
- No "step replay" animation. Static numbered list.

## Sequence

```
PREREQ → add-conjugation-engine             (engine + decomposition data)
PREREQ → add-interactive-playground         (where the panel mounts)
THIS   → add-engine-trace
NEXT   → trace on verb pages (separate small change)
```
