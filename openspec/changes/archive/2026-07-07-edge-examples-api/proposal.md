## Why

`/api/examples` runs `runtime = 'nodejs'` and shells out to the `sqlite3`
binary, which makes the app undeployable: `@cloudflare/next-on-pages` hard-
errors on any non-Edge route ("The following routes were not configured to
run with the Edge Runtime: /api/examples"), discovered on the first deploy
attempt since the route landed (2026-07-07). The June deploys predate it.

The prebuilt per-verb example assets (`static-playground-examples`,
archived) already carry the retained-corpus examples and the panel already
falls back to them whenever the API reports no local database — a path the
examples E2E suite passes end-to-end. The nodejs route's only unique value
is a richer dev-only view (live SQLite, up to 8 rows vs the assets' 2 per
target) at the cost of deployability and a dev/prod behavior split.

## What Changes

- **`apps/web/app/api/examples/route.ts`** becomes an Edge route: it keeps
  the target-derivation contract (`lookupForm`, `target`) and serves the
  OPUS parallel fallback, always reporting `local.available: false`. The
  SQLite shell-out, repo-root discovery, and `node:` imports are removed.
- **The prebuilt assets become the canonical corpus-example source** in
  every environment: the panel's existing fallback (API reports no local DB
  and returned no local rows → fetch `/examples/<verbId>.json`) now engages
  in dev exactly as in production, giving dev/prod parity.
- The panel and `lib/static-examples.ts` are unchanged — the fallback logic
  and shapes already handle this contract.

## Capabilities

Modifies `interactive-playground`: the examples API SHALL be
Edge-compatible; retained-corpus examples come from the prebuilt assets.

## Impact

- **Code** — one route file rewritten (smaller: ~180 lines of SQLite
  plumbing removed).
- **Dev experience** — developers see exactly what production serves
  (prebuilt assets, "prebuilt examples" label). The live-SQLite view
  disappears from the panel; the corpus lab's own tools (`search:corpus`,
  reports) remain the way to query the full DB. Refreshing panel data =
  `npm run build:static-examples`.
- **E2E** — `examples.spec.ts` expectations hold on the fallback path
  (verified both modes on 2026-07-07 before this change).
- **Deploy** — unblocks `next-on-pages`; no other non-Edge routes remain.
  Deploy discovery also surfaced that next-on-pages' `_routes.json` sends
  `/examples/*` into the worker (which 404s non-Next paths), so the change
  adds `scripts/patch-pages-routes.ts` plus `npm run build:pages` /
  `npm run deploy:pages` encoding the full working pipeline.
- **Audience tier** — all (this is what makes the examples ship at all).

## Non-Goals

- **No Tier-2 examples backend** (live SQLite behind an API) — still the
  deferred path if fresher-than-assets examples are ever needed online.
- **No richer per-target depth in the assets** (still 2 per target); bump
  the generator cap in a follow-up if the panel feels thin.

## Sequence

```
PREREQ → static-playground-examples (archived 2026-07-07)
THIS   → edge-examples-api
NEXT   → (optional) Tier-2 live examples service
```
