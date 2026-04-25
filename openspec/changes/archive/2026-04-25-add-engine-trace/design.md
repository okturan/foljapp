## Context

The decomposition data already carries enough information to reconstruct *what* segments exist in a form. Trace adds *why* — the recipe. Implementation can re-derive the trace from existing data structures without instrumenting the orchestrator's hot path.

## Goals / Non-Goals

**Goals:**

- Single new function `engine.trace()` returning ordered step records.
- Steps are deterministic: same input → same output (mirrors `conjugate()`).
- Trace agrees with conjugate on the final form.
- Playground exposes the trace in a collapsible panel.

**Non-Goals:**

- No instrumentation of the orchestrator (we re-derive post-hoc).
- No trace UI on the verb page in this change.
- No localization.

## Decisions

### D1. Post-hoc reconstruction over instrumentation

Trace reads the same inputs `conjugate()` reads — corpus entry, paradigm rules, suppletion table, options — and walks the same decision tree, emitting a TraceStep at each branch. The orchestrator's actual code stays untouched.

Trade-off: the trace generator must mirror the orchestrator's logic. Drift is possible. Mitigation: a unit test asserts trace's final step's `form` equals conjugate's `form` for a wide sample (30+ cells).

### D2. TraceStep shape

```ts
type TraceStep =
  | { kind: 'corpus-lookup'; verbId: string; entry: VerbEntry; summary: string }
  | { kind: 'suppletive-lookup'; verbId: string; cell: string; result: string; summary: string }
  | { kind: 'cell-override'; key: string; cell: string; result: string; summary: string }
  | { kind: 'paradigm-rule'; stem: string; ending: string; result: string; summary: string }
  | { kind: 'auxiliary-recursion'; auxiliary: 'kam' | 'jam'; tenseKey: string; cell: string; result: string; summary: string }
  | { kind: 'phonology'; rule: string; before: string; after: string; summary: string }
  | { kind: 'particle-prepend'; particle: string; reason: string; summary: string }
  | { kind: 'final'; form: string; summary: string };
```

Each step's `summary` is a human-readable sentence the UI can render verbatim.

### D3. UI is a Client Component

`<DerivationPanel>` takes the trace as a prop and renders a `<details>` element with a `<summary>` (auto-collapsible per HTML semantics) and an ordered list inside. No JS needed for the toggle — `<details>` works without it.

The playground passes the trace it gets from `engine.trace(...)` to the panel. When the engine throws (unsupported cell), the panel renders nothing.

## Tradeoffs

- **Drift risk**: trace duplicates the orchestrator's decision tree. The wide sample test catches drift on the final form, but step content could subtly diverge. Mitigation: keep the trace generator small and obvious.
- **Step verbosity**: long traces for compound tenses. Mitigated by the panel being collapsible — user opts in.

## Resolved Questions

_None._
