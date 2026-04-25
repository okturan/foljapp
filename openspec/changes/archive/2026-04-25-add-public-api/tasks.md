## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and spec; confirm scope is unchanged

## 2. API shapes

- [x] 2.1 Create `apps/web/lib/api-shapes.ts` exporting `ApiVerbListResponse`, `ApiVerbDetailResponse`, `ApiErrorResponse`
- [x] 2.2 Each shape includes `engineVersion`, `corpusVersion`, and `cite`

## 3. /api/verbs route

- [x] 3.1 Create `apps/web/app/api/verbs/route.ts` with `GET` returning sorted corpus index + versions + cite
- [x] 3.2 Export `dynamic = 'force-static'`

## 4. /api/verbs/[lemma] route

- [x] 4.1 Create `apps/web/app/api/verbs/[lemma]/route.ts` with `GET` handler
- [x] 4.2 Read `format` query param; default `json`
- [x] 4.3 For `json`: return `{ engineVersion, corpusVersion, entry, table, cite }`
- [x] 4.4 For `igt`: return `formatIgtTable(verbId)` as `text/plain`
- [x] 4.5 For `conllu`: return `formatConllu(verbId)` as `text/plain`
- [x] 4.6 Unknown lemma → 404 with JSON `{ error, lemma }`
- [x] 4.7 Export `generateStaticParams` for every corpus lemma. Note: `dynamic = 'force-static'` would discard the `?format=` query, so the route is left dynamic. The JSON default is still pre-rendered via generateStaticParams; format variants compute from in-memory data per request (microseconds).

## 5. /api/openapi.json route

- [x] 5.1 Create `apps/web/app/api/openapi.json/route.ts`
- [x] 5.2 Hand-write OpenAPI 3.1 document describing the two verb endpoints with component schemas
- [x] 5.3 Export `dynamic = 'force-static'`

## 6. End-to-end tests

- [x] 6.1 Add `apps/web/e2e/api.spec.ts` covering: /api/verbs returns 20+ entries; /api/verbs/punoj has the full table; ?format=igt returns text/plain; ?format=conllu returns CoNLL-U; unknown lemma 404; /api/openapi.json is valid; /api/verbs/jam returns suppletive forms

## 7. Validation and handoff

- [x] 7.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green (81 unit + 46 E2E pass)
- [x] 7.2 Verify build emits API routes — /api/verbs and /api/openapi.json are ○ (static); /api/verbs/[lemma] is ● (SSG via generateStaticParams)
- [x] 7.3 `openspec validate add-public-api --strict` — zero errors
