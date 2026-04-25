## 1. Pre-flight

- [ ] 1.1 Read proposal.md, design.md, and both spec files; confirm scope is unchanged

## 2. IPA helper

- [ ] 2.1 Create `apps/web/lib/ipa.ts` with `toIpa(text)` digraph-first tokenizer + per-token mapping
- [ ] 2.2 Cover every character + every digraph in the design D4 table
- [ ] 2.3 Multi-word forms preserve word boundaries
- [ ] 2.4 Handles uppercase by lowercasing first
- [ ] 2.5 Vitest coverage: lemma transcriptions for ≥ 12 representative corpus verbs (each digraph touched at least once across the sample)

## 3. Verb header IPA

- [ ] 3.1 Update `apps/web/components/verb-header.tsx` to render `/lemma-ipa/` beneath the lemma
- [ ] 3.2 Render IPA next to each principal part in the metadata `<dl>`

## 4. API JSON gains ipa field

- [ ] 4.1 Update `apps/web/app/api/verbs/[lemma]/route.ts` to include `ipa: { lemma, principalParts: { present, aorist, participle } }` on the JSON detail response
- [ ] 4.2 Update `apps/web/lib/api-shapes.ts` types
- [ ] 4.3 Update `apps/web/app/api/openapi.json/route.ts` schema for ApiVerbDetailResponse to mention ipa

## 5. End-to-end tests

- [ ] 5.1 Add `apps/web/e2e/pronunciation.spec.ts` covering: /verb/punoj contains /punɔj/; /verb/pjek shows aorist IPA `pɔc`; /verb/jam shows /jam/; /verb/laj shows /laj/

## 6. Validation and handoff

- [ ] 6.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green
- [ ] 6.2 Update specs if implementation surfaced clarifications
- [ ] 6.3 `openspec validate add-pronunciation --strict` — zero errors
