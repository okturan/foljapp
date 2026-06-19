# foljapp

Albanian verbal system reference. Educational, reference-quality, academically rich.

## Status

Pre-alpha. The web app, conjugation engine, verb corpus, reference pages,
playground, and local corpus tooling are active.

## Layout

```
apps/web/              Next.js 15 app: UI, routes, and API handlers
packages/engine/       TypeScript Albanian morphology/conjugation engine
packages/data/         Checked-in verb data schemas and loaders
data/verbs/            Checked-in verb corpus
data/opus/             Small checked-in parallel-sentence fallback index
data/corpora/          Download ledger only; raw corpora stay in .cache/
scripts/               Narrow build/download utilities
tools/corpus-indexer/  Rust scanner for local corpus indexing
openspec/              Specs, changes, and roadmap
```

Local generated artifacts, downloaded corpora, SQLite indexes, and build caches
belong under `.cache/` and are intentionally not deployed.

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

## Local corpus indexing

The website can read local sentence examples from
`.cache/corpus-local-full.sqlite`. That file is generated locally from raw
corpora and is not committed.

```sh
npm run build:corpus-targets      # generated foljapp forms to search for
npm run scan:local-corpus         # Rust generated-form classifier over downloaded corpora
npm run build:local-corpus-index  # both steps above
npm run build:corpus-candidate-cache # optional parsed-candidate cache for reruns
npm run scan:local-corpus:cached  # classifier using the complete candidate cache
npm run build:corpus-search-index # Tantivy phrase-search index from retained examples
npm run search:corpus -- --query="të punoj"
```

See [`data/corpora/README.md`](./data/corpora/README.md) for downloaded corpus
inventory and source notes.

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
