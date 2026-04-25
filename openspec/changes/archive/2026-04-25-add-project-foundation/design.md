## Context

This is a greenfield repository. Aside from the `openspec/` and `.claude/` directories, there is no code, no configuration, no dependencies, no CI. Every decision in this change is therefore unconstrained by precedent — but every decision will be inherited by the entire 14-capability roadmap. Getting the shell right matters more than usual.

The product the foundation hosts has three coupled audiences (learners, students, researchers) and three quality bars (educational, reference, academic). The shell must accommodate:

- Statically pre-rendered per-verb pages (Wiktionary-style discoverability and SEO)
- Heavy client-side interactivity for the playground (iMekMak-style sandbox)
- Pure-TypeScript engine code shared between server-side rendering and client-side widgets
- MDX-authored grammar articles that import live engine components
- A machine-readable JSON / CoNLL-U / Leipzig IGT export surface
- Eventual public REST API for researchers

These are all served well by Next.js 15 App Router + RSC. They are **not** served well by a pure SPA (kills SEO), nor by Astro (forces a context split between content and the highly-interactive playground), nor by a static site generator without a runtime (no API surface).

## Goals / Non-Goals

**Goals:**

- Boot, typecheck, lint, test, build, deploy — all green on the unmodified scaffold.
- Establish a monorepo layout that lets the engine package be consumed both server-side (for static page rendering) and client-side (for the playground), without duplication.
- Reserve design-system tokens for the role-coded morphology coloring that arrives in `add-verb-reference-page`, so the visual language is consistent from the first verb page onward.
- Configure CI on day one. No "we'll add CI later."
- Keep the placeholder home deliberately empty so we don't accumulate throwaway UI.

**Non-Goals:**

- Choosing a UI for any actual product surface. That belongs to the changes that introduce real capabilities.
- Deciding the verb data shape. `add-conjugation-engine` will define `VerbEntry`, `Paradigm`, `ConjugatedForm` etc. The `packages/data` workspace exists in this change as an empty placeholder.
- Choosing search, analytics, error reporting, telemetry vendors.
- Deciding the deployment target. CI builds the artifact; deployment is a downstream concern.
- Authoring any grammar content.

## Decisions

### D1. Next.js 15 App Router over alternatives

Considered: Next.js Pages Router, Astro + React islands, SvelteKit, Remix, Vite + React Router.

Chosen: **Next.js 15 App Router** with React Server Components.

Rationale:
- Per-verb pages are best as RSC + ISR (we'll generate ~10k stable URLs over time, with occasional revalidation when corpus updates).
- The interactive playground is a React Client Component that imports the same engine code the server uses for static rendering — App Router's RSC/Client boundary handles this cleanly.
- Native MDX support via `@next/mdx`, with the ability to import live React components into prose. Critical for grammar articles that show inline conjugation widgets.
- Route handlers cover the future public API without adding a separate backend.
- Mature ecosystem, predictable upgrade path, large hiring pool.

Alternatives rejected:
- *Astro*: Excellent for content-heavy sites, but the playground would force us to either bundle a heavy island or split context across two frameworks. Either way, complexity wins.
- *SvelteKit/Remix*: Both viable; Next.js wins on RSC maturity and MDX integration as of 2026-04.
- *Pages Router*: Deprecated in spirit; no reason to start a new project on it.

### D2. Monorepo via npm workspaces, not pnpm or Turborepo

Considered: pnpm workspaces, Turborepo, Nx, single-package layout.

Chosen: **npm workspaces** with no orchestration layer (no Turbo, no Nx) at v1.

Rationale:
- Three workspaces is small. Build orchestration overhead would exceed its value.
- npm ships with Node, no extra install required for contributors.
- We can add Turborepo later if cache invalidation becomes painful — there is nothing to migrate, just add a `turbo.json`.
- pnpm has better disk efficiency but introduces a non-default tool for new contributors. Defer until measured need.

Trade-off accepted: slower CI (no remote caching). Acceptable while CI runs in single digits of minutes.

### D3. Tailwind v4 with reserved morphology tokens

Considered: CSS modules, vanilla-extract, Panda CSS, Tailwind v3, Tailwind v4.

Chosen: **Tailwind v4** with five named tokens reserved from day one: `morph.particle`, `morph.auxiliary`, `morph.stem`, `morph.ending`, `morph.voice`.

Rationale:
- Tailwind v4 has the lowest ceremony for design-token-driven UI.
- Reserving the morphology palette in this change means every subsequent change reuses it instead of inventing inconsistent local palettes.
- The role-coded coloring is the single most important visual feature of the entire product. Encoding it as a system-level concern, not a per-page concern, is correct.

Color values are intentionally NOT decided here — they are visual-design choices that belong to `add-conjugation-tables-ui`. This change reserves the *names*; the values land later.

### D4. JSON-on-disk corpus, no database

Considered: SQLite (via libsql), Postgres, key-value (Cloudflare KV), JSON files.

Chosen: **JSON files committed to the repo** under `data/verbs/<lemma>.json`, with build-time generation from `data/sources/`.

Rationale:
- The corpus is read-only at v1.
- The corpus is small enough to ship at compile time (≤ tens of MB at full coverage).
- Static pre-rendering loves filesystem reads; SQLite would add a runtime dependency for zero functional benefit.
- Versioning verb entries via Git is more transparent than a DB migration history — every change to a verb is reviewable in a PR.
- Migration to SQLite or another store later is mechanical if user accounts arrive.

Trade-off accepted: per-verb JSON is verbose. Mitigated by a generated index manifest (also a JSON file) and by a build script that flags drift between sources.

### D5. Vitest + Playwright, no Jest

Considered: Jest, Vitest, Bun test, Node `--test`.

Chosen: **Vitest** for unit + integration; **Playwright** for E2E.

Rationale:
- Vitest is ESM-first, TS-native, and runs the engine and UI tests in the same harness.
- Workspace projects let one `npm test` run everything.
- Playwright is the contemporary default for cross-browser E2E and ships its own browser binaries — easier to pin in CI than relying on host browsers.

### D6. CI on day one, GitHub Actions

Configured to run on every push and PR. No badging, no Slack notifications, no flaky-test retries — those accrete later if needed.

## Data Shapes

### Workspace `package.json` shape

```
                      ┌───────────────────────────────────┐
                      │  / package.json                   │
                      │  ─────────────                    │
                      │  name: foljapp                    │
                      │  private: true                    │
                      │  workspaces:                      │
                      │    - apps/*                       │
                      │    - packages/*                   │
                      │  scripts:                         │
                      │    dev / build / test / lint /    │
                      │    typecheck / format / test:e2e  │
                      └───────────────┬───────────────────┘
                                      │
              ┌───────────────────────┼─────────────────────────┐
              ▼                       ▼                         ▼
   ┌─────────────────┐     ┌──────────────────┐      ┌──────────────────┐
   │ apps/web        │     │ packages/engine  │      │ packages/data    │
   │ ─────────       │     │ ───────────────  │      │ ──────────────   │
   │ name:           │     │ name:            │      │ name:            │
   │  @foljapp/web   │     │  @foljapp/engine │      │  @foljapp/data   │
   │ deps: next, …   │     │ deps: (none)     │      │ deps: zod        │
   │ peer: engine    │     │ exports: index   │      │ exports: index   │
   └─────────────────┘     └──────────────────┘      └──────────────────┘
```

### Reserved Tailwind theme tokens

```
theme:
  colors:
    morph:
      particle  : <reserved, value TBD in add-conjugation-tables-ui>
      auxiliary : <reserved>
      stem      : <reserved>
      ending    : <reserved>
      voice     : <reserved>
```

### Placeholder home wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                  foljapp                         │
│                                                  │
│       Albanian verbal system reference           │
│                                                  │
│       (no verbs loaded yet — this page exists    │
│        only to prove the dev/build/test cycle    │
│        works end-to-end)                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

That is the entire UI of this change. Deliberately boring.

## Risks / Trade-offs

- **[Risk]** Next.js 15 + Tailwind v4 + shadcn are all relatively recent at the time of this change. → **Mitigation:** Pin exact versions in `package.json`; record working versions in `design.md` notes; reproducible installs via `package-lock.json`.

- **[Risk]** Strict TypeScript surfaces friction when integrating untyped third-party packages later (some sources we'll ingest are loosely typed). → **Mitigation:** Strict mode lives at the workspace root; allow per-package overrides via local `tsconfig.json` for ingestion scripts only. Application code stays strict everywhere.

- **[Trade-off]** No remote build cache (no Turborepo). CI re-runs everything every time. → **Acceptance:** Workspace is small enough that full CI runs are minutes, not tens of minutes. Revisit if CI exceeds 5 minutes on the median PR.

- **[Trade-off]** No service worker, no offline mode. → **Acceptance:** Premature without content. Revisit after `add-verb-reference-page` ships and we have static HTML worth caching.

- **[Risk]** Reserving `morph.*` tokens without values means the colors get decided in a later change without a designer's eye on them. → **Mitigation:** That decision lives in `add-conjugation-tables-ui` with its own design.md, where palette accessibility (WCAG AA contrast against light/dark backgrounds) becomes a first-class concern. Reserving the *slot* now is what matters.

## Migration Plan

Not applicable — this is the first change. The repository has no prior state to migrate from.

## Resolved Questions

- **Q1.** Pre-commit hooks (Husky + lint-staged)? → **Resolved: NO.** CI is the only gate at v1. Hooks add per-developer-machine setup friction; CI catches everything that matters. Revisit only if PRs start regressing.
- **Q2.** `src/` vs top-level `app/` in `apps/web`? → **Resolved: top-level `app/`.** Matches Next.js docs default and removes one indirection layer.
- **Q3.** Commit-message linting (commitlint + Conventional Commits)? → **Resolved: NO.** Convention is fine in PR descriptions; commit-level enforcement is overhead before the team grows.

All three resolutions are reflected in the tasks list — no tasks for hooks, no `src/` in apps/web, no commitlint.
