# webapp-foundation Specification

## Purpose
TBD - created by archiving change add-project-foundation. Update Purpose after archive.
## Requirements
### Requirement: Repository monorepo layout

The repository SHALL be organized as an npm workspaces monorepo with the following top-level structure: `apps/web/` (the Next.js webapp), `packages/engine/` (reserved for the conjugation engine), `packages/data/` (reserved for the verb corpus), `data/` (raw + processed verb JSON, populated by later changes), `scripts/` (build-time tooling), `openspec/` (specs and changes), and `.github/workflows/` (CI). Each workspace MUST declare itself in the root `package.json` `workspaces` array and ship a per-workspace `package.json` with a unique scoped name.

#### Scenario: Workspaces are recognized by npm

- **WHEN** the developer runs `npm install` at the repo root for the first time
- **THEN** npm SHALL hoist shared dependencies to the root `node_modules`
- **AND** npm SHALL create symlinks under `node_modules/@foljapp/*` for the local workspaces
- **AND** the command SHALL exit with code 0

#### Scenario: Cross-workspace import resolves at type-check time

- **WHEN** a TypeScript file in `apps/web` imports from `@foljapp/engine`
- **THEN** the TypeScript compiler SHALL resolve the import to the local workspace
- **AND** `npm run typecheck` SHALL exit with code 0

### Requirement: Local development boots

The project SHALL provide a `npm run dev` script that starts the Next.js development server in `apps/web` and serves a placeholder home page at `http://localhost:3000/`.

#### Scenario: Dev server serves placeholder home

- **WHEN** the developer runs `npm run dev` and waits for "Ready" output
- **AND** issues a GET request to `http://localhost:3000/`
- **THEN** the server SHALL respond with HTTP 200
- **AND** the response body SHALL contain the project name "foljapp"

### Requirement: TypeScript strict mode passes

The repository SHALL be configured with TypeScript strict mode enabled at the workspace root, inherited by all packages. A `npm run typecheck` script SHALL invoke `tsc --noEmit` across all workspaces.

#### Scenario: Typecheck passes on initial scaffold

- **WHEN** the developer runs `npm run typecheck` against the unmodified scaffold
- **THEN** the command SHALL exit with code 0
- **AND** zero TypeScript errors SHALL be reported

#### Scenario: Strict mode is actually enforced

- **WHEN** a contributor adds a function parameter with no type annotation in `apps/web`
- **AND** runs `npm run typecheck`
- **THEN** the command SHALL exit with a non-zero code
- **AND** the output SHALL reference `noImplicitAny`

### Requirement: Unit test runner is configured workspace-wide

The repository SHALL be configured with Vitest at the workspace root using the `projects` (workspace) feature, so that `npm test` discovers and runs tests across `apps/web`, `packages/engine`, and `packages/data`.

#### Scenario: Empty test run succeeds

- **WHEN** the developer runs `npm test` against the unmodified scaffold (no test files yet)
- **THEN** the command SHALL exit with code 0
- **AND** the output SHALL list each workspace project as having zero tests

#### Scenario: Tests in a leaf package are discovered

- **WHEN** a file matching `packages/engine/**/*.test.ts` exists with at least one passing test
- **AND** the developer runs `npm test`
- **THEN** Vitest SHALL execute the test
- **AND** the test result SHALL appear under the `engine` project label

### Requirement: End-to-end test runner is configured

The `apps/web` workspace SHALL include a Playwright configuration with a single browser project (Chromium) and a `npm run test:e2e` script that launches the dev server and runs `.spec.ts` files under `apps/web/e2e/`.

#### Scenario: Smoke E2E test passes against the placeholder home

- **WHEN** an `apps/web/e2e/home.spec.ts` test asserts that `/` renders the text "foljapp"
- **AND** the developer runs `npm run test:e2e`
- **THEN** Playwright SHALL spawn the dev server, run the test, and exit with code 0

### Requirement: Production build succeeds

The repository SHALL provide a `npm run build` script that produces a Next.js production build of `apps/web` and exits with code 0 against the unmodified scaffold.

#### Scenario: Build emits static HTML for the placeholder home

- **WHEN** the developer runs `npm run build`
- **THEN** the build SHALL succeed with exit code 0
- **AND** the build output SHALL include a statically-pre-rendered HTML file for `/`

### Requirement: Linting and formatting are enforced

The repository SHALL provide `npm run lint` (ESLint, Next.js + import-sort rules) and `npm run format` (Prettier write) scripts that operate across all workspaces.

#### Scenario: Lint passes on the seed code

- **WHEN** the developer runs `npm run lint` against the unmodified scaffold
- **THEN** the command SHALL exit with code 0

### Requirement: Tailwind v4 with role-coded design tokens

The `apps/web` workspace SHALL be configured with Tailwind v4 and SHALL define five named design tokens in the theme — `morph.particle`, `morph.auxiliary`, `morph.stem`, `morph.ending`, `morph.voice` — even though no UI yet consumes them. These tokens are reserved for the role-coded morphology highlighting introduced by `add-verb-reference-page`.

#### Scenario: Tokens are present in the resolved Tailwind config

- **WHEN** the build runs and emits CSS for `apps/web`
- **THEN** the generated CSS SHALL contain CSS custom properties for each of the five `morph.*` tokens

### Requirement: shadcn/ui primitives are available

The `apps/web` workspace SHALL have shadcn/ui initialized with the `new-york` style and the following primitives generated under `apps/web/components/ui/`: `button`, `card`, `input`, `tooltip`, `tabs`.

#### Scenario: Primitives import without error

- **WHEN** any TypeScript file in `apps/web` imports from `@/components/ui/button`
- **AND** the developer runs `npm run typecheck`
- **THEN** the import SHALL resolve and typecheck SHALL pass

### Requirement: MDX rendering is configured

The `apps/web` workspace SHALL support MDX content via `@next/mdx`, with `.mdx` files being rendered by the App Router.

#### Scenario: A placeholder MDX page renders

- **WHEN** an `apps/web/app/smoke/page.mdx` file exists with the content `# hello mdx`
- **AND** the developer requests `http://localhost:3000/smoke`
- **THEN** the response SHALL contain `<h1>hello mdx</h1>`

### Requirement: Continuous integration runs on every push and PR

The repository SHALL include a GitHub Actions workflow at `.github/workflows/ci.yml` that, on every push and pull request, runs in this order: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. The workflow SHALL fail the run if any step exits non-zero.

#### Scenario: CI fails when typecheck is broken on a PR

- **WHEN** a pull request introduces a TypeScript error
- **AND** GitHub Actions runs the CI workflow
- **THEN** the workflow SHALL fail at the typecheck step
- **AND** subsequent steps (lint, test, build) SHALL NOT run

#### Scenario: CI succeeds on the unmodified scaffold

- **WHEN** the initial scaffold is pushed to a branch
- **AND** GitHub Actions runs the CI workflow
- **THEN** all five steps SHALL pass and the workflow SHALL succeed

### Requirement: Node version is pinned

The repository SHALL include an `.nvmrc` file pinning the Node major version used in development and CI to a single LTS release (Node 22 LTS or later).

#### Scenario: Local Node version matches CI

- **WHEN** a developer runs `nvm use` at the repo root
- **THEN** `node --version` SHALL print the version recorded in `.nvmrc`
- **AND** the CI workflow SHALL configure the same Node version via `actions/setup-node@v4` reading `.nvmrc`

