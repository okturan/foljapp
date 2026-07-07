## 1. Pre-flight

- [x] 1.1 Confirmed the blocker: next-on-pages errors on the nodejs
      `/api/examples` route; June deploys predate it. Confirmed the panel's
      asset fallback passes `examples.spec.ts` with no local DB
      (2026-07-07 verification).

## 2. Implementation

- [ ] 2.1 Rewrite `apps/web/app/api/examples/route.ts` as an Edge route:
      target derivation + parallel pairs only, `local.available: false`,
      no `node:` imports.
- [ ] 2.2 Verify the panel takes the asset fallback in dev (label shows
      "prebuilt examples").

## 3. Validation

- [ ] 3.1 `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`.
- [ ] 3.2 `examples.spec.ts` green (asset-fallback path).
- [ ] 3.3 next-on-pages build succeeds; deploy to Pages; live spot check.
- [ ] 3.4 `openspec validate edge-examples-api --strict`.
