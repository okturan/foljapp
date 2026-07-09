## 1. Pre-flight

- [x] 1.1 Sources and evidence confirmed: Newmark et al. 1982 / FGJSH
      (flit-/tërhiq- MP stems); engine emits \*flaset/\*tërheqet today;
      retained DB contains 91 *flitet* / 23 *tërhiqet* sentences; MP aorist
      (*u fol*, *u tërhoq*) already correct; `djeg` proves the two
      override blocks also drive subjunctive MP.
- [x] 1.2 MP-review context recorded: 28,193 MP misses = 99% textbook-only
      compound shapes + 324 plain-indicative cells across 87 rare verbs;
      flas/tërheq are the only fixable paradigm defect.

## 2. Data

- [x] 2.1 `data/verbs/flas.json`: MP present + imperfect cellOverrides
      (flit- stem) + Newmark `manual` source row.
- [x] 2.2 `data/verbs/terheq.json`: MP present + imperfect cellOverrides
      (tërhiq- stem) + Newmark `manual` source row.
- [x] 2.3 `scripts/build-corpus.ts`: corpus 0.1.5 → 0.1.6;
      `npm run build:corpus` rebuilt bundles.

## 3. Tests

- [x] 3.1 `flas` fixture extended + `terheq` fixture added (both mirroring
      the corpus overrides); `mp-stems.test.ts` pins all spec scenarios
      (full flit- present paradigm, `të flitet` derivation, unchanged
      `u fol`/`u tërhoq`, suppletive control `thuhet`).
- [x] 3.2 `npm test`: 484 passed (was 474).

## 4. Verification + corpus lab

- [x] 4.1 verify-engine before AND after: 19,639 matches / 230 mismatches —
      identical, as predicted (Kaikki lacks these MP cells).
- [x] 4.2 Full rescan chain completed (~19 min): 282 flas/tërheq MP targets
      now attested with 729 canonical occurrences — including compound
      cells like *nuk do të tërhiqeshe* matched exactly in real sentences.
      Corpus-wide: 55,581 attested / 50,266 missing (June: 55,270/50,577).
      Static examples regenerated (109,229 rows).
- [x] 4.3 typecheck clean, lint clean, build compiles; real-corpus spot
      check: *flitet*, *të mos flitet*, *tërhiqej*, *u fol*, *thuhet*.
- [x] 4.4 `packages/engine/docs/sources.md` corpus 0.1.6 note recorded;
      MP-review conclusion recorded in `data/corpora/README.md`.
- [x] 4.5 `openspec validate fix-flas-terheq-mp-stems --strict` passes.
