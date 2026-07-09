## 1. Pre-flight

- [x] 1.1 Confirmed the blocker: next-on-pages errors on the nodejs
      `/api/examples` route; June deploys predate it. Confirmed the panel's
      asset fallback passes `examples.spec.ts` with no local DB
      (2026-07-07 verification).

## 2. Implementation

- [x] 2.1 `apps/web/app/api/examples/route.ts` rewritten as an Edge route:
      target derivation + parallel pairs only, `local.available: false`,
      no `node:` imports (~180 lines of SQLite plumbing removed).
- [x] 2.2 Panel takes the asset fallback (E2E asserts the table renders
      from prebuilt rows).
- [x] 2.3 `scripts/patch-pages-routes.ts` + `npm run build:pages` /
      `npm run deploy:pages`: next-on-pages' `_routes.json` routed
      `/examples/*` into the worker (404); the patch adds the static
      exclude so Pages serves the assets directly.

## 3. Validation

- [x] 3.1 typecheck clean, lint clean, 484 tests pass, build compiles.
- [x] 3.2 `examples.spec.ts` 3/3 on the asset-fallback path.
- [x] 3.3 next-on-pages build succeeds; deployed to foljapp.pages.dev
      (production, commit ebbbaa5): /verb/flas 200, /examples/punoj.json
      serves JSON, tërhiq- forms live, negative-polarity playground 200.
- [x] 3.4 `openspec validate edge-examples-api --strict` passes.
