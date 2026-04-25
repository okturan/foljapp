## 1. Source acquisition (human task)

- [x] 1.1 Decide on a Husić digital source: publisher PDF (most direct), library scan (ILL — KU Libraries holds the original), or hand-tabulated extract (slowest but format-controllable). Document the chosen path and any licensing constraints in `packages/engine/docs/husic-format.md`
- [x] 1.2 Acquire the digital file. Place it under a path the parser can read; do NOT commit copyrighted source content to the repo
- [x] 1.3 Confirm the file's structure: paradigm tables per verb? regular vs irregular sections? class numbering convention? Note observations in `husic-format.md`

## 2. parse-husic.ts skeleton

- [x] 2.1 Create `scripts/parse-husic.ts` with the same CLI shape as `verify-engine.ts` (single command, optional `--only-verb` flag)
- [x] 2.2 Define internal types mirroring `KaikkiForm` from verify-engine.ts
- [x] 2.3 Stub the format-specific parser: a function `parseHusicSource(input: string): HusicEntry[]` that returns `{ id, lemma, forms: HusicForm[] }`. Initial body returns `[]`
- [x] 2.4 Wire JSONL emission to `.cache/husic/<id>.jsonl`
- [x] 2.5 Add `.cache/husic/` to `.gitignore`

## 3. Tag-vocabulary mapping

- [x] 3.1 Document the Albanian-label → engine-tag mapping (from design D2) in `packages/engine/docs/husic-format.md`
- [x] 3.2 Implement `mapHusicLabelToTags(huLabel: string, persNum: { person, number }): string[]` in parse-husic.ts
- [x] 3.3 Cover edge cases: pluperfect = `past + perfect`, conditional present = `imperfect + conditional`, future-perfect = `future + perfect`, past-anterior = `past-anterior` (single tag)
- [x] 3.4 Add unit tests for the mapping function (vitest)

## 4. Format-specific parser

- [x] 4.1 Implement `parseHusicSource` for the chosen source format. Likely steps: split by verb sections, identify class headers, extract per-tense rows, derive person/number from column position
- [x] 4.2 Filter dialect variants and archaic forms; emit Standard Albanian only
- [x] 4.3 Run on the first 5 corpus verbs (punoj, flas, jam, jap, shoh); cross-validate against Kaikki and confirm tag alignment

## 5. verify-engine Husić dispatch

- [x] 5.1 Add `loadHusicForms(verbId): HusicForm[] | null` to verify-engine.ts (returns null if no cache file)
- [x] 5.2 Add `findHusicForm(forms, spec): string | null` parallel to `findKaikkiForm` (same filter logic, separate function for clarity)
- [x] 5.3 Modify `probeCell` to call Husić as fallback when Kaikki returns null. Track source provenance in `CellOutcome` (new optional `source: 'k' | 'h'` field)
- [x] 5.4 Update output renderer to annotate matches with source: `M (k)` vs `M (h)`
- [x] 5.5 Update summary block to break out per-source match counts

## 6. Cache absence handling

- [x] 6.1 Verify that missing `.cache/husic/<id>.jsonl` is a soft fallback (logged warning, no crash)
- [x] 6.2 Add a one-line per-verb absence warning at script start when Husić cache is partial

## 7. Pilot run

- [x] 7.1 With the first 5 verbs' Husić data ingested, run `npx tsx scripts/verify-engine.ts` and capture output
- [x] 7.2 Investigate any mismatches surfaced; either fix paradigm/cellOverrides or escalate to a parse-husic.ts bug
- [x] 7.3 Capture the new combined baseline (e.g., "1860 (k) + 200 (h) = 2060 / 2060")

## 8. Full corpus pass

- [x] 8.1 Run parse-husic.ts over the full Husić source for all 20 corpus verbs
- [x] 8.2 Run verify-engine.ts; confirm zero mismatches
- [x] 8.3 Update `packages/engine/docs/sources.md` baseline with combined Kaikki+Husić figure

## 9. Mismatch escalation policy

- [x] 9.1 Document in `husic-format.md`: when engine-vs-Husić disagrees, the resolution is per-cell — fix paradigm rule, add cellOverride, or (rarest) update Husić-side parsing if the print-source ambiguity is real
- [x] 9.2 Add a "Potential override candidate" warning in verify-engine output: when Husić has a form for a cell where the engine currently throws `UnsupportedCellError`, surface it for manual review

## 10. Validation and archive

- [x] 10.1 Root scripts: `typecheck`, `lint`, `test`, `build`, `test:e2e` — all green
- [x] 10.2 `openspec validate add-husic-verification-source --strict` — zero errors
- [x] 10.3 Archive
