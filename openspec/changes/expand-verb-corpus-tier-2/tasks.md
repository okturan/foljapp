## 1. Pre-flight

- [ ] 1.1 Read proposal.md, design.md, and specs/verb-corpus/spec.md
- [ ] 1.2 Confirm `expand-verb-corpus-tier-1` has landed (50-verb base + ingestion script)
- [ ] 1.3 Optional: confirm `complete-husic-verification` has landed for stronger verification

## 2. Ingestion script extensions

- [ ] 2.1 Add Class 1 -aj derivation branch (per design D5). Add unit tests for `mbaj`, `ndaj`, `paguaj`
- [ ] 2.2 Add Class 1 -uaj derivation branch (per design D5). Add unit tests for `shkruaj`, `gatuaj`
- [ ] 2.3 Throw on Class 1 -ej without `irregular: true` flag (per design D5)
- [ ] 2.4 Add Class 2 consonant-stem branch (per design D6). Add unit tests for `prish`, `nis`, `vesh`
- [ ] 2.5 Add Class 3 vowel-stem branch (per design D7). Add unit tests for `di`, `eci`
- [ ] 2.6 Implement `maybeFlagIrregular` heuristic (per design D4): parse verify-engine output, embed mismatch summary in `notes` if any cells fail
- [ ] 2.7 End-of-run summary: scaffolded vs needs-review vs failed

## 3. Manifest

- [ ] 3.1 Create `data/sources/tier-2-manifest.json` listing 50 lemmas per design D2 distribution
- [ ] 3.2 Cross-check each lemma against Kote & Biba 2019 ranks
- [ ] 3.3 Mark `irregular: true` for known-irregular lemmas (most -ej, some -aj, some Class 3)

## 4. Sub-batch ingestion

- [ ] 4.1 Run sub-batch 1a (10 Class 1 -oj continuation): expect 10 ready, 0 needs-review
- [ ] 4.2 Run sub-batch 1b (5 Class 1 -aj): expect 1–2 ready (regulars), 3–4 needs-review (irregulars)
- [ ] 4.3 Run sub-batch 1c (5 Class 1 -ej): expect 0 ready, 5 needs-review (all flagged irregular; manual hand-craft)
- [ ] 4.4 Run sub-batch 1d (5 Class 1 -uaj/-yj): expect 1 ready, 4 needs-review
- [ ] 4.5 Run sub-batch 2a (10 Class 2 regular): expect 8–9 ready, 1–2 needs-review
- [ ] 4.6 Run sub-batch 2b (5 Class 2 mutating + irregular): expect 0 ready, 5 needs-review (hand-craft)
- [ ] 4.7 Run sub-batch 3a (5 Class 3 regular): expect 2–3 ready, 2–3 needs-review
- [ ] 4.8 Run sub-batch 3b (5 Class 3 irregular): expect 0 ready, 5 needs-review (hand-craft)

## 5. Manual curation pass

- [ ] 5.1 For each TODO-marked verb: read `notes`, consult Kaikki entry, write cellOverrides
- [ ] 5.2 Re-run `verify-engine.ts --only-verb <id>` after each fix; iterate until clean
- [ ] 5.3 Update each curated verb's `notes` to remove the TODO and replace with a "verified by Kaikki" line + Husić citation if applicable

## 6. Frequency tiers

- [ ] 6.1 Extend `data/verbs/frequency.json` with tier entries for all 50 new verbs
- [ ] 6.2 Cross-check tier assignments against Kote & Biba ranks
- [ ] 6.3 Confirm `frequency.test.ts` passes (every corpus verb has a tier)

## 7. Re-build + full verify

- [ ] 7.1 Run `npx tsx scripts/build-corpus.ts` (validates schemas, regenerates index)
- [ ] 7.2 Run `npx tsx scripts/verify-engine.ts` across all 100 verbs; confirm zero mismatches
- [ ] 7.3 Capture the new total cell count and update `packages/engine/docs/sources.md`

## 8. UI smoke test

- [ ] 8.1 Run dev server; visit `/browse` — confirm all 100 verbs in the table
- [ ] 8.2 Visit several new verb pages spanning classes (`/verb/prish`, `/verb/mbaj`, `/verb/fle`) — full conjugation tables render correctly
- [ ] 8.3 Search for tier-2 lemmas — confirm they appear in suggestions
- [ ] 8.4 Confirm playground supports new verbs

## 9. E2E coverage

- [ ] 9.1 Update `apps/web/e2e/search.spec.ts` "browse page lists all verbs" to expect ≥ 100
- [ ] 9.2 Add an e2e for one Class 2 new verb and one Class 3 new verb
- [ ] 9.3 Confirm existing e2e tests still pass (no regressions)

## 10. Documentation

- [ ] 10.1 Update `packages/engine/docs/sources.md` with the new baseline + per-class breakdown
- [ ] 10.2 Document the ingestion-script extensions in inline JSDoc

## 11. Validation and archive

- [ ] 11.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [ ] 11.2 `openspec validate expand-verb-corpus-tier-2 --strict` — zero errors
- [ ] 11.3 Archive
