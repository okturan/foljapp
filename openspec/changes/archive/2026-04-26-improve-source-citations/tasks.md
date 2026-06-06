## 1. Pre-flight

- [x] 1.1 Read `proposal.md`, `design.md`, `specs/verb-corpus/spec.md` (delta + base).
- [x] 1.2 Re-confirm the audit: 100 cache files exist; 14 corpus verbs cite husic + have cache; 41 corpus verbs have cache but don't cite husic.

## 2. Add husic citations

- [x] 2.1 Create `scripts/add-husic-citations.ts` that:
  - Enumerates `.cache/husic/*.jsonl` to build the set of `id`s with cache.
  - Reads each `data/verbs/<id>.json` (skipping `index.json`, `version.json`, `frequency.json`, `_corpus.client.json`).
  - For each verb where `id ∈ cacheIds` AND no existing `sources[].source === 'husic'`, append `{ source: 'husic', reference: 'Husić 2002 — parsed cache (.cache/husic/<id>.jsonl)' }` to `sources`.
  - Writes the modified file with 2-space indentation matching existing style.
  - Logs each modification.
- [x] 2.2 Run the script. Verify it modifies exactly 41 files.
- [x] 2.3 Spot-check a modified file (e.g., `data/verbs/bashkoj.json`) — confirms the new citation is appended, existing entries untouched, JSON formatting consistent.

## 3. CI guard test

- [x] 3.1 Create `apps/web/lib/corpus-husic-citations.test.ts` with the invariant from design D5: every verb whose id matches a cache file SHALL cite husic.
- [x] 3.2 Run the test — expect green after step 2.

## 4. Corpus version bump and rebuild

- [x] 4.1 In `scripts/build-corpus.ts`, change `CORPUS_VERSION = '0.1.1'` to `'0.1.2'`.
- [x] 4.2 Run `npm run build:corpus`. Verify `data/verbs/version.json` updates to `0.1.2` and `data/verbs/_corpus.client.json` regenerates with the 41 modified entries.

## 5. Documentation refresh

- [x] 5.1 Update `packages/engine/docs/sources.md`: replace the section header to reference corpus 0.1.2; clarify the cache-vs-citation distinction (100 cache files / 55 citing verbs / 99 with verifiable Husić data via cache + cross-resolution).
- [x] 5.2 Update relaxed e2e regexes if needed (already `corpus-0\.1\.\d+`).

## 6. Validation and archive

- [x] 6.1 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green.
- [x] 6.2 Run `npx tsx scripts/verify-engine.ts` — match-rate SHALL hold at 16965/16969.
- [x] 6.3 `openspec validate improve-source-citations --strict` — zero errors.
- [x] 6.4 Manual sanity: visit `/verb/bashkoj` in dev. The Sources panel SHALL now show three sources (Kaikki + Manual + Husić).
- [x] 6.5 Archive.
