## Why

foljapp does not yet exist as a runnable codebase — only OpenSpec scaffolding lives in this repo. Before any linguistic capability can be built, we need a working webapp that boots, type-checks, tests, builds, and deploys. This change establishes that foundation. It introduces no Albanian linguistic content; its sole purpose is to make subsequent changes (`add-conjugation-engine`, `add-verb-reference-page`, and the rest of the 14-capability roadmap) implementable.

## What Changes

- Add an npm-workspaces monorepo at the repo root with three workspaces:
  - `apps/web` — the Next.js 15 webapp (App Router, React Server Components)
  - `packages/engine` — placeholder for the pure-TypeScript conjugation engine
  - `packages/data` — placeholder for the verb-corpus data shape and loader
- Configure TypeScript in strict mode at the workspace root, inherited by all packages.
- Install and configure Tailwind v4 in `apps/web`, with a base design-token palette reserved for role-coded morphology highlighting (particle / auxiliary / stem / ending / voice marker).
- Initialize shadcn/ui in `apps/web` with the `new-york` style and a small set of seeded primitives (button, card, input, tooltip, tabs).
- Configure MDX support in `apps/web` via `@next/mdx`, with a custom-component slot reserved for grammar-article components.
- Configure Vitest at the workspace root with workspace-aware projects, so `npm test` runs across all packages.
- Configure Playwright in `apps/web` for end-to-end browser tests.
- Add ESLint (Next.js + import-sort rules) and Prettier configurations.
- Add root npm scripts: `dev`, `build`, `test`, `test:e2e`, `typecheck`, `lint`, `format`.
- Add a placeholder home route at `/` that renders the project name and a deliberately empty state ("foljapp — no verbs yet"), so we can verify the build/dev cycle end-to-end without inventing UI we will throw away.
- Add a GitHub Actions CI workflow at `.github/workflows/ci.yml` that runs `typecheck`, `lint`, `test`, and `build` on every push and PR.
- Add `.nvmrc`, `.editorconfig`, `.gitignore` (Next.js + macOS + Vitest defaults), and a minimal root `README.md`.

## Capabilities

### New Capabilities
- `webapp-foundation`: The runnable, testable, buildable shell that hosts every future capability. Defines the requirement that the project boots locally, passes typecheck/lint/test/build, follows the documented monorepo layout, and runs CI on every PR.

### Modified Capabilities
_None — this is the first change._

## Impact

- **Code** — Creates `apps/web/`, `packages/engine/`, `packages/data/`, `.github/workflows/`, and root configuration files. No code yet exists to modify.
- **Dependencies** — Introduces Next.js 15, React 19, TypeScript 5.x, Tailwind v4, shadcn/ui, MDX, Vitest, Playwright, ESLint, Prettier. All MIT-licensed.
- **APIs** — None. No HTTP endpoints, no engine functions, no data shapes locked in beyond placeholder workspace `package.json` fields.
- **Linguistic claims** — None. This change makes no morphological assertions; therefore no linguistic source citations apply.
- **Audience tier** — Foundational across **all three** tiers (learners, students, researchers). No tier is served directly by this change; all are unblocked by it.

## Non-Goals

- No conjugation logic. Engine internals are deferred to `add-conjugation-engine`.
- No verb data. Corpus shape, sourcing, and seed verbs are deferred to `add-conjugation-engine` (engine + corpus arrive together).
- No reference pages, search, playground, articles, practice, IGT, API, or pronunciation. Each is a separately-scoped change.
- No internationalization framework. English-only UI strings in v1; i18n is a Phase 5 concern.
- No authentication, user accounts, or persistence beyond static files. The product is read-only static at this stage.
- No service worker / offline mode. Deferred until there is content worth caching.
- No analytics, telemetry, or feature flags. Premature.

## Sequence

```
THIS  →  add-project-foundation       (creates webapp-foundation)
NEXT  →  add-conjugation-engine       (creates conjugation-engine, verb-corpus)
THEN  →  add-verb-reference-page      (creates reference-pages)
```

Each subsequent change names this change in its own `## Why` and references the capabilities created here without modifying the `webapp-foundation` spec — they live alongside it as new capabilities, not modifications of it.
