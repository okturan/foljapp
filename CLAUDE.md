# Working rules for foljapp

Project context, stack, and source priorities live in `openspec/config.yaml` —
read that first. The system map (data flow, corpus-lab rescan runbook, and the
hard-won gotchas) is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

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
  after each meaningful change. Standing mismatches are decomposed there —
  they are all third-party source errors, not engine bugs; a category
  migration (match↔missing) from newly-unlocked cells must be explained in
  the landing change.

## Corpus lab

- Full-rescan **order matters** and has ordering traps (coverage-before-audit;
  target-hit sidecars are refreshed by `build:corpus-candidate-cache`, not by
  the scan). Follow the runbook in `docs/ARCHITECTURE.md` after any
  target-changing engine/data change.
- Adding a corpus source needs **three** registration points (`resources.json`
  status+localPath, `source_kind` in `sources.rs`, and `ALL_SOURCE_IDS` +
  `alias_source` in `main.rs`) — a missing one silently shows as a ~2s no-op
  in `build-candidate-cache`. Watch stage timing.
- Phrase-variant report changes must preserve output parity — verify with
  `npm run report:corpus-phrase-variants:diff <baseline.json> <candidate.json>`.

## Environment & tooling

- Rust: always build with `CARGO_TARGET_DIR=.cache/cargo-target` (npm scripts
  already set it; match it for ad-hoc `cargo` calls).
- Shell is **zsh** with `cp`/`rm` aliased to `-i` (they prompt). Use
  `cat src > dst` to copy without a prompt. Unquoted `$CMD` does NOT
  word-split in zsh, so `"$BIN $ARGS"` passes one giant argument.
- Deploy with `npm run deploy:pages` (never a bare `npx next-on-pages` — the
  script patches `_routes.json` to serve `/examples/*` statically and pins
  `legacy-peer-deps` against wrangler/workers-types drift).
- Long corpus chains: run detached with a background monitor grepping
  **anchored** patterns (`^STAGE`, not bare `error` — crate names like
  `thiserror` false-match).
