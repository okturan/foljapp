## 1. Pre-flight

- [ ] 1.1 Read proposal.md, design.md, and both spec files; confirm scope is unchanged

## 2. Engine trace

- [ ] 2.1 Add `TraceStep` discriminated union to `packages/engine/src/types.ts`
- [ ] 2.2 Create `packages/engine/src/trace.ts` exporting `trace(verbId, options): TraceStep[]`
- [ ] 2.3 Implement trace re-derivation walking the same decision tree as the orchestrator (corpus lookup → cell override? → suppletion? → paradigm rule → compound recursion if applicable → particle prepend → final)
- [ ] 2.4 Each step gets a `summary` string written for learners
- [ ] 2.5 Re-export `trace` from `packages/engine/src/index.ts`
- [ ] 2.6 Vitest fixtures in `packages/engine/test/trace.test.ts` covering: simple class-1 cell, compound perfect, suppletive (jam), particle-prefixed (subjunctive), cell-override (iki), wide-sample form-equivalence test (30+ cells)

## 3. Derivation panel

- [ ] 3.1 Create `apps/web/components/derivation-panel.tsx` (Client) accepting `{ steps: TraceStep[] }`
- [ ] 3.2 Render as native `<details>` with `<summary>How is this built?</summary>` and an `<ol>` of numbered step summaries
- [ ] 3.3 If `steps` is empty or undefined, render nothing

## 4. Playground integration

- [ ] 4.1 Update `apps/web/components/playground.tsx` to call `engine.trace(...)` alongside `conjugate(...)` and pass the trace to `<DerivationPanel>`
- [ ] 4.2 If `conjugate()` threw (unsupported), don't call `trace()` (it would throw the same error); skip the panel render

## 5. End-to-end tests

- [ ] 5.1 Add `apps/web/e2e/trace.spec.ts` covering: derivation panel renders on /playground; expanding shows ≥2 steps; unsupported config hides panel; compound perfect trace surfaces auxiliary text

## 6. Validation and handoff

- [ ] 6.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green
- [ ] 6.2 Update specs if implementation surfaced clarifications
- [ ] 6.3 `openspec validate add-engine-trace --strict` — zero errors
