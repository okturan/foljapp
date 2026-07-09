## 1. Pre-flight

- [x] 1.1 Full-corpus scan (1,907 partitions): udhëtohet 4,967 /
      udhëtohej 296 / folded 225 / udhëtohen 38 / udhëtohesh 62 /
      udhëtoheshin 8. rrihet 12,995 but sense-mixed with `rrah`
      (stay: "s'rrihet pa komentuar"; beat: "rrihet një maturant … me
      lopata").

## 2. Data + docs

- [x] 2.1 `noMiddlePassive` removed from `data/verbs/udhetoj.json` (flags
      block now empty → dropped); corpus 0.1.8; bundles rebuilt.
- [x] 2.2 Both decisions recorded in `data/corpora/README.md` (udhetoj
      evidence + rri/vij/jam/duhet rationale).
- [x] 2.3 Spot check: `udhëtohet`, `udhëtohesh` conjugate; `rri` MP
      refuses; `thuhet`/`piqet` controls intact.

## 3. Verification + corpus lab

- [x] 3.1 verify-engine: 19,517 / 168 / 12,763, flag-suppressed 766 —
      udhetoj's 104 suppressed cells migrated (102 → missing, 2 → both-
      null), mismatches + probed total unchanged; recorded in sources.md.
- [x] 3.2 484 tests pass, typecheck clean, lint clean, build compiles.
- [x] 3.3 Rescan chain complete: attested 55,660 → 55,707 (udhetoj MP =
      47 targets / 121 occurrences, e.g. *udhëtohet me orë të tëra*);
      static examples 160,775 rows / 41.1MB.
- [x] 3.4 `openspec validate restore-udhetoj-middle-passive --strict`
      passes.
