## Why

The IGT and CoNLL-U formatters from `add-igt-export` work in the browser but require a click. Researchers and tool builders need a stable HTTP surface they can curl, fetch from a script, or wire into a pipeline. This change exposes the same content over JSON HTTP endpoints — pure routing on top of existing engine + corpus + IGT formatters.

## What Changes

- Add `apps/web/app/api/verbs/route.ts` — `GET /api/verbs` returning the full corpus index as JSON.
- Add `apps/web/app/api/verbs/[lemma]/route.ts` — `GET /api/verbs/<lemma>?format=json|igt|conllu` returning the verb's full conjugation table in the requested format. Default `format=json`.
- Add `apps/web/app/api/openapi.json/route.ts` — `GET /api/openapi.json` returning a hand-written OpenAPI 3.1 document describing the above endpoints.
- All three endpoints are statically pre-rendered via Next's route handler `dynamic = 'force-static'` mode. No runtime computation; responses cached in the build.
- All responses include `engineVersion`, `corpusVersion`, and a `cite` field with a suggested citation string.

## Capabilities

### New Capabilities
- `public-api`: Defines the HTTP contract — endpoints, response shapes, format query param semantics, OpenAPI document, citation field.

### Modified Capabilities
_None._ The API composes existing capabilities.

## Impact

- **Code** — `apps/web/app/api/verbs/route.ts`, `apps/web/app/api/verbs/[lemma]/route.ts`, `apps/web/app/api/openapi.json/route.ts`, plus `apps/web/lib/api-shapes.ts` for response types.
- **Dependencies** — None.
- **APIs** — New HTTP surface (this is the whole change).
- **Linguistic claims** — None (pure transport).
- **Audience tier** — **Researchers** primarily.

## Non-Goals

- No authentication / rate limiting / quotas (fully public, statically served).
- No POST endpoints (no writes; this is a read-only API).
- No GraphQL.
- No SDK packaging.

## Sequence

```
PREREQ → add-conjugation-engine
PREREQ → add-igt-export                (provides formatters)
THIS   → add-public-api
NEXT   → add-frequency-data            (extends API with frequency-per-cell)
```
