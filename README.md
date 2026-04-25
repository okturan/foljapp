# foljapp

Albanian verbal system reference. Educational, reference-quality, academically rich.

## Status

Pre-alpha — Phase 1 (foundation) only. No verb data ships yet.

## Layout

```
apps/web/          Next.js 15 webapp (App Router, RSC)
packages/engine/   Pure-TypeScript conjugation engine (placeholder)
packages/data/     Verb-corpus schemas and loaders (placeholder)
data/verbs/        Verb JSON entries (populated by add-conjugation-engine)
scripts/           Build-time tooling
openspec/          Specs, changes, roadmap (canonical project plan)
```

## Roadmap

The full roadmap and per-capability specs live in [`openspec/`](./openspec/).
See [`openspec/config.yaml`](./openspec/config.yaml) for the project context
and 14-capability roadmap across 5 phases.

Active changes:
```
openspec list
```

## Local development

```sh
nvm use         # activates Node version pinned in .nvmrc
npm install
npm run dev     # boots the webapp at http://localhost:3000
```

## Quality gates

```sh
npm run typecheck   # TypeScript strict mode across all workspaces
npm run lint        # ESLint (Next.js + import-sort)
npm test            # Vitest across all workspaces
npm run build       # Next.js production build
npm run test:e2e    # Playwright E2E (requires browsers installed)
```

## License

MIT.
