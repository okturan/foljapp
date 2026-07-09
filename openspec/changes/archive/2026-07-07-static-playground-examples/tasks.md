## 1. Pre-flight

- [x] 1.1 Read the examples flow end-to-end (`/api/examples` route,
      `lib/parallel-examples.ts`, `CorpusExamples`, `PlaygroundResult`,
      retained-DB schema) and confirm scope: playground panel only, assets
      from `.cache/corpus-local-full.sqlite`.
- [x] 1.2 Measure the export: 159,613 quality-passing occurrences / 55,271
      targets; cap-2 keeps 108,645 rows; field weights justify
      dictionary+tuple encoding (sentences 13.9MB, urls 6.6MB, sigs 6.1MB).

## 2. Generator

- [x] 2.1 `scripts/build-static-examples.ts`: quality filter (mirrors the
      API WHERE, cross-referenced comments), cap 2 per target with the API's
      ordering, dictionary+tuple encoding, `--frozen-time`, deterministic
      output, `index.json` manifest.
- [x] 2.2 `package.json`: `build:static-examples` script.
- [x] 2.3 Generated all 203 verbs + manifest: 108,645 example rows, 28.7MB
      total, largest `bej` at 253KB. Two consecutive `--frozen-time` runs
      are byte-identical across all 204 files.

## 3. Web app

- [x] 3.1 `apps/web/lib/static-examples.ts`: typed decoder + lookup
      (signature-first, key-fallback) + `ApiExample` shaping; 4 unit tests
      with a fixture covering both lookup modes, -1 dictionary indexes,
      limits, and unknown keys.
- [x] 3.2 `CorpusExamples`: `verbId` prop; static fallback on API failure or
      DB-unavailable-with-no-local-rows; parallel pairs appended
      client-side; "prebuilt examples" source label.
- [x] 3.3 `PlaygroundResult`: threads `verbSlug` into `CorpusExamples`.

## 4. Validation

- [x] 4.1 `npm run typecheck` (clean), `npm run lint` (clean), `npm test`
      (462 passed incl. the new tests), `npm run build` (compiles).
- [x] 4.2 E2E `examples.spec.ts`: 3/3 on the normal API path AND 3/3 with
      `FOLJAPP_LOCAL_EXAMPLES_DB=/nonexistent/nope.sqlite` — the fallback
      path renders retained examples and translated pairs end-to-end.
- [x] 4.3 `openspec validate static-playground-examples --strict` passes.
