## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and specs/webapp-foundation/spec.md and confirm scope is unchanged from this commit
- [x] 1.2 Resolve the three Open Questions in design.md (pre-commit hooks Y/N, src/ vs app/, commitlint Y/N) and update design.md with decisions

## 2. Repo bootstrap

- [x] 2.1 Create root package.json with name `foljapp`, private true, and workspaces array `["apps/*", "packages/*"]`
- [x] 2.2 Add `.nvmrc` pinning Node 22 LTS
- [x] 2.3 Add `.gitignore` covering Next.js, macOS, Vitest, Playwright, and node_modules
- [x] 2.4 Add `.editorconfig` with two-space indent, LF line endings, UTF-8
- [x] 2.5 Add a minimal root `README.md` linking to openspec/ for the canonical roadmap

## 3. Next.js 15 webapp scaffold

- [x] 3.1 Initialize `apps/web` as a Next.js 15 App Router project using top-level `app/` (no `src/`)
- [x] 3.2 Pin Next.js, React, and React DOM to exact versions in `apps/web/package.json`
- [x] 3.3 Add root `tsconfig.json` with strict mode and `apps/web/tsconfig.json` extending it
- [x] 3.4 Replace the default home with the placeholder home that renders "foljapp" plus the empty-state message from design.md
- [x] 3.5 Verify `npm run dev` boots the server and `/` returns HTTP 200 containing "foljapp"

## 4. Tailwind v4 with reserved morphology tokens

- [x] 4.1 Install Tailwind v4 in `apps/web` and wire its CSS into `app/layout.tsx`
- [x] 4.2 Define `morph.particle`, `morph.auxiliary`, `morph.stem`, `morph.ending`, `morph.voice` as theme color tokens with placeholder CSS-variable values
- [x] 4.3 Verify the built CSS contains a custom property for each of the five tokens via `npm run build` and grep on the output

## 5. shadcn/ui setup

- [x] 5.1 Run `shadcn init` in `apps/web` selecting the `new-york` style
- [x] 5.2 Generate the seeded primitives: button, card, input, tooltip, tabs into `apps/web/components/ui/`
- [x] 5.3 Add a typecheck-only smoke import of each primitive in a `_internal_/probe.ts` and verify `npm run typecheck` passes

## 6. MDX content support

- [x] 6.1 Install `@next/mdx` and configure `next.config.mjs` to recognize `.md` and `.mdx` page extensions
- [x] 6.2 Add `apps/web/app/smoke/page.mdx` containing the single line `# hello mdx`
- [x] 6.3 Verify `/smoke` renders `<h1>hello mdx</h1>` via Playwright (the smoke test added in step 9.3 covers this)

## 7. packages/engine placeholder

- [x] 7.1 Create `packages/engine/package.json` with name `@foljapp/engine`, type `module`, exports field pointing to `./src/index.ts`
- [x] 7.2 Create `packages/engine/tsconfig.json` extending the root and emitting types
- [x] 7.3 Create `packages/engine/src/index.ts` exporting a single placeholder symbol so the package is importable
- [x] 7.4 Add `@foljapp/engine` as a workspace dependency in `apps/web/package.json` and verify cross-workspace typecheck

## 8. packages/data placeholder

- [x] 8.1 Create `packages/data/package.json` with name `@foljapp/data`, type `module`, exports field pointing to `./src/index.ts`
- [x] 8.2 Create `packages/data/tsconfig.json` extending the root
- [x] 8.3 Create `packages/data/src/index.ts` exporting a single placeholder symbol
- [x] 8.4 Install `zod` in `packages/data` (reserved for the verb-corpus schema in `add-conjugation-engine`)

## 9. Vitest workspace configuration

- [x] 9.1 Install Vitest at the workspace root with the `@vitest/coverage-v8` reporter
- [x] 9.2 Configure Vitest workspace projects so `apps/web`, `packages/engine`, and `packages/data` each appear as a project label
- [x] 9.3 Add root `npm test` script invoking `vitest run` (with `--passWithNoTests` per spec scenario 9.4)
- [x] 9.4 Verify `npm test` against the empty scaffold exits 0 and reports zero tests across three projects

## 10. Playwright E2E configuration

- [x] 10.1 Install Playwright in `apps/web` and run `npx playwright install chromium`
- [x] 10.2 Configure `apps/web/playwright.config.ts` with a single Chromium project and a webServer block that boots `npm run dev`
- [x] 10.3 Add `apps/web/e2e/home.spec.ts` asserting `/` contains "foljapp" and `/smoke` contains "hello mdx"
- [x] 10.4 Add root `npm run test:e2e` script and verify it passes locally

## 11. ESLint + Prettier

- [x] 11.1 Install ESLint with `eslint-config-next` and `eslint-plugin-import`
- [x] 11.2 Install Prettier with `prettier-plugin-tailwindcss` for class sorting
- [x] 11.3 Add `eslint.config.mjs` at root and `.prettierrc` at root
- [x] 11.4 Add root `npm run lint` and `npm run format` scripts
- [x] 11.5 Verify `npm run lint` passes on the entire seeded codebase

## 12. Continuous integration

- [x] 12.1 Create `.github/workflows/ci.yml` triggered on `push` and `pull_request`
- [x] 12.2 Configure the workflow to use `actions/setup-node@v4` reading `.nvmrc`, then run `npm ci`
- [x] 12.3 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` as separate steps so failures pinpoint the broken stage
- [ ] 12.4 Push a smoke branch and verify the CI workflow goes green — **DEFERRED**: the project is not yet a git repository and has no GitHub remote. Run `git init`, push to GitHub, and verify the workflow on first push to satisfy this task.

## 13. Validation and handoff

- [x] 13.1 Run all root scripts locally end-to-end: `npm run dev` (smoke), `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`
- [x] 13.2 Update `specs/webapp-foundation/spec.md` if implementation surfaced any clarifications worth pinning to a requirement or scenario — renamed `_smoke` route to `smoke` (Next.js treats underscore-prefixed folders as private and excludes them from routing); updated all spec references
- [x] 13.3 Run `openspec validate add-project-foundation --strict` and confirm zero errors before handoff to the next change
