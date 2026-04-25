# Working rules for foljapp

Project context, stack, and source priorities live in `openspec/config.yaml` —
read that first.

## Closing turns

- **Never** end a turn by asking the user to "pause", "stop here", "wrap up",
  or whether to continue. If there is remaining work in the current scope,
  propose specs and execute. The user interrupts when they want to stop;
  do not interrupt yourself.
- When a turn could end at a natural breakpoint, identify the next concrete
  action instead and start it. State results crisply and move forward.
- Do not stack hedging "want me to…" / "should I…" questions at the end of
  responses. If the action is clearly in scope, just take it.
- This rule does not override safety prompts: still confirm before destructive
  operations, force-pushes to shared branches, or actions that change shared
  state in ways the user did not authorize. The rule applies to ordinary
  forward progress.

## OpenSpec hygiene

- Every non-trivial change opens an OpenSpec change before code lands.
- For incremental refinements (e.g., paradigm fixes informed by
  `scripts/verify-engine.ts`), keep the umbrella change open and update its
  proposal/specs/tasks as work progresses. Archive only when the umbrella's
  scope is fully resolved.
- Quality bars: typecheck strict, lint clean, all unit tests pass, all E2E
  pass, `openspec validate <change> --strict` passes. CI must be green
  before any change is archived.

## Engine verification

- `npx tsx scripts/verify-engine.ts` is the canonical correctness baseline.
  Any engine or corpus change must move the match-rate up or hold it.
- Track the baseline in `packages/engine/docs/sources.md` and update it
  after each meaningful change.
