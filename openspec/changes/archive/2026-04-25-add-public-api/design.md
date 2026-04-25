## Context

We have all the data and formatters; we need an HTTP surface. Next's route handlers (`route.ts`) cover this with minimal ceremony. By forcing static rendering, the API becomes free to host and impossible to slow down.

## Goals / Non-Goals

**Goals:**

- Stable, public, read-only endpoints for the corpus and engine output.
- Three response formats per verb: JSON, IGT, CoNLL-U.
- A machine-readable OpenAPI 3.1 document describing the surface.
- Static rendering — no runtime engine work per request.

**Non-Goals:**

- No writes / authentication / rate limiting.
- No SDK / client libraries.
- No GraphQL.
- No streaming responses.

## Decisions

### D1. Static rendering via `dynamic = 'force-static'`

Each route handler exports `dynamic = 'force-static'` and (for the `[lemma]` route) `generateStaticParams` returning every corpus lemma. Build-time, Next executes the handlers and caches the responses. Runtime serves the cache.

Trade-off: changing the corpus requires rebuild. Acceptable; we aren't doing live edits.

### D2. URL shape

```
   GET  /api/verbs                              list (JSON)
   GET  /api/verbs/{lemma}                      full table (JSON, default)
   GET  /api/verbs/{lemma}?format=igt           IGT (text)
   GET  /api/verbs/{lemma}?format=conllu        CoNLL-U (text)
   GET  /api/openapi.json                       OpenAPI document
```

The format query param drives the Content-Type and body; unknown formats fall back to JSON.

Note on caching: `?format=...` produces different responses, but Next's static cache normally keys only on path. We work around this by exporting all three formats from a single handler that branches on the URL query at request time. Since the data is identical, the handler is cheap to run; if Next's static system stores only the default, the IGT/CoNLL-U paths run dynamically. To force per-format caching we use the `dynamicParams` config and per-format URL paths if needed — see D3.

### D3. Per-format URL paths (reconsidered)

Actually simpler: split into separate routes:

```
   GET /api/verbs/{lemma}             JSON
   GET /api/verbs/{lemma}/igt         IGT
   GET /api/verbs/{lemma}/conllu      CoNLL-U
```

Each is its own route handler, each statically pre-rendered. URLs are RESTful, caching is straightforward, content negotiation is by URL not header.

This contradicts the spec's `?format=` description. Let me update the spec to match this implementation choice... actually, keep the spec's `?format=` since it's more idiomatic, and accept that the format-variant responses may run dynamically (still cheap).

Final decision: implement the **single route with `?format=`** per the spec. Document in implementation notes that format=igt and format=conllu may not be statically cached if Next's defaults don't key on query. That's fine for v0.1.x; revisit if traffic demands.

### D4. OpenAPI document is hand-written

Generating OpenAPI from Zod schemas is possible but adds tooling. For 4 endpoints, hand-writing the document is faster and easier to review.

### D5. Citation in every JSON response

Each JSON response includes a `cite` field with a recommended citation string:

```
"cite": "foljapp v0.1.0 corpus 0.1.0, https://foljapp.local/verb/punoj"
```

(Replace the URL with the deployed domain when known.) Researchers can copy this into bibliographies without re-discovering the project.

## Tradeoffs

- **Static-only**: simple, fast, but corpus changes require redeploy. Acceptable.
- **No content negotiation via Accept header**: format query param is more discoverable for casual users (curl).
- **Hand-written OpenAPI**: easy to drift; mitigated by including a CI step or unit test that asserts every defined route is described in the OpenAPI document.

## Resolved Questions

_None._
