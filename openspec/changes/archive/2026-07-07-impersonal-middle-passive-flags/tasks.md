## 1. Pre-flight

- [x] 1.1 Evidence gathered: *iket* ×14 / *gjezdiset* ×3 incidental corpus
      sentences; qendroj FGJSH + 132 Husić middle rows; homograph
      contamination rules out *vihet*/*rrihet* as evidence;
      *udhëtohet*/*qëndrohet* ×0 incidental (weak negatives — flagged
      verbs have no MP targets so incidence is luck).
- [x] 1.2 Confirmed the engine concept exists: `middlePassiveThirdPersonOnly`
      guard (conjugate.ts), zod schema field, guard tests, `caloj`/`duhet`/
      `ekzistoj`/`fabrikoj` precedent. No engine code needed.

## 2. Data + verifier

- [x] 2.1 `iki`, `gjezdis`, `qendroj` flipped to
      `middlePassiveThirdPersonOnly`; corpus 0.1.7; bundles rebuilt.
- [x] 2.2 `scripts/verify-engine.ts`: flag-suppressed rule + counter
      (`matchSource: 'f'`; summary reports totals and with-source count).
- [x] 2.3 Spot check: `iket`, `qëndrohet`, `qëndrohej`, `gjezdiset`
      conjugate; `ikem` refuses with `UnsupportedCellError`;
      `thuhem`/`digjem` controls unaffected.

## 3. Verification + corpus lab

- [x] 3.1 verify-engine: mismatches 230 → 168 (qendroj's 62 = +20
      Husić-derived matches + 42 flag-suppressed); matches 19,639 → 19,619
      because 82 newly-unlocked 3rd-person MP cells moved
      match-as-unsupported → missing (12,579 → 12,661); probed total
      constant at 32,448; flag-suppressed 870 (42 with source rows).
      Baseline decomposition re-recorded in sources.md with the migration
      arithmetic and an updated regression rule.
- [x] 3.2 484 tests pass, typecheck clean, lint clean, build compiles.
- [x] 3.3 Rescan chain complete (~20 min): targets 105,847 → 106,111
      (+264 third-person MP targets incl. compounds/polarities); attested
      55,581 → 55,660 — 79 of the ~82 newly-unlocked base cells found real
      evidence (iki 38 targets/108 occ, qendroj 35/100, gjezdis 6/14, e.g.
      "Nga implikimet tani po iket…"). Static examples regenerated at the
      deepened cap: 160,654 rows / 41.2MB.
- [x] 3.4 `openspec validate impersonal-middle-passive-flags --strict`
      passes.
